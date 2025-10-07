// Client-side document processing using specialized libraries

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Tag } from './types'
// @ts-ignore
import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import PizZip from 'pizzip'
import { buildTagGenerationPrompt } from './tagPromptBuilder'
import { sanitizeTagName, isJunkTagName } from './tagUtils'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'your-gemini-api-key'


// Helper function to determine subject area from file name and content
function determineSubjectArea(fileName: string, content: string): string {
  const lowerFileName = fileName.toLowerCase()
  const lowerContent = content.toLowerCase().substring(0, 500) // First 500 chars for quick analysis
  
  // Check file name patterns
  if (lowerFileName.includes('web') || lowerFileName.includes('html') || lowerFileName.includes('css') || lowerFileName.includes('js')) {
    return 'Web Development'
  }
  if (lowerFileName.includes('architecture') || lowerFileName.includes('building') || lowerFileName.includes('design')) {
    return 'Architecture'
  }
  if (lowerFileName.includes('business') || lowerFileName.includes('market') || lowerFileName.includes('finance')) {
    return 'Business'
  }
  if (lowerFileName.includes('science') || lowerFileName.includes('research') || lowerFileName.includes('study')) {
    return 'Science'
  }
  
  // Check content patterns
  const patterns = {
    'Computer Science': ['programming', 'algorithm', 'software', 'code', 'development', 'javascript', 'python', 'react', 'api'],
    'Architecture': ['building', 'design', 'construction', 'architectural', 'structure', 'tower', 'monument'],
    'Business': ['business', 'market', 'financial', 'revenue', 'profit', 'strategy', 'management', 'analysis'],
    'Engineering': ['engineering', 'technical', 'system', 'process', 'methodology', 'implementation'],
    'Healthcare': ['health', 'medical', 'treatment', 'patient', 'clinical', 'therapeutic'],
    'Education': ['learning', 'student', 'academic', 'educational', 'curriculum', 'teaching']
  }
  
  for (const [area, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => lowerContent.includes(keyword))) {
      return area
    }
  }
  
  return 'General'
}

export async function processDocumentClientSide(file: File, autoTags: boolean = true): Promise<{
  extractedText: string
  summary: string
  tags: Tag[]
}> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file')
  }

  console.log(`Processing ${file.type} file: ${file.name}`)

  // Extract text or content using appropriate method
  let extractedText: string
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.toLowerCase().endsWith('.docx')) {
    extractedText = await extractTextFromDocx(file)
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    extractedText = await extractTextFromPdf(file)
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
             file.name.toLowerCase().endsWith('.pptx')) {
    extractedText = await extractTextFromPptx(file)
  } else if (file.type.startsWith('image/')) {
    extractedText = await processImage(file)
  } else if (file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')) {
    extractedText = await processAudio(file)
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, PPTX, image, or audio files.')
  }

  if (!extractedText.trim()) {
    throw new Error('No text could be extracted from the document')
  }

  console.log(`Extracted ${extractedText.length} characters of text`)

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // Generate summary
  const summaryPrompt = `
    Please create a comprehensive but concise summary of the following text. 
    The summary should:
    - Capture the main points and key information
    - Be well-structured and easy to read
    - Be approximately 200-400 words
    - Use clear, professional language
    
    Text to summarize:
    ${extractedText}
  `

  const summaryResult = await model.generateContent(summaryPrompt)
  const summary = summaryResult.response.text()

  // Extract categorized tags (only if autoTags is enabled)
  let tags: Tag[] = []
  if (autoTags) {
    try {
      // Determine subject area from file name or content
      const subjectArea = determineSubjectArea(file.name, extractedText)
      const tagsPrompt = buildTagGenerationPrompt(extractedText, { contentType: file.type, subjectArea, academicLevel: 'Undergraduate' })

      const tagsResult = await model.generateContent(tagsPrompt)
      let tagsText = tagsResult.response.text().trim()

      // If code-fenced, strip fences
      const fenceMatch = tagsText.match(/```(?:json)?\n([\s\S]*?)```/)
      if (fenceMatch) {
        tagsText = fenceMatch[1].trim()
      }
      
      // Parse the JSON response with resilience
      const tryParse = (text: string) => {
        try {
          return JSON.parse(text)
        } catch {
          return null
        }
      }
      let parsedTags = tryParse(tagsText)
      if (!parsedTags) {
        const jsonMatch = tagsText.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsedTags = tryParse(jsonMatch[0])
      }
      if (!parsedTags) throw new Error('Invalid tag JSON')
      
      // Convert to Tag objects with sanitization
      const generalTags: Tag[] = (parsedTags.general || [])
        .map((name: string) => sanitizeTagName(name))
        .filter((name: string) => !!name && !isJunkTagName(name))
        .map((name: string) => ({ name, type: 'general' as const }))
      
      const specificTags: Tag[] = (parsedTags.specific || [])
        .map((name: string) => sanitizeTagName(name))
        .filter((name: string) => !!name && !isJunkTagName(name))
        .map((name: string) => ({ name, type: 'specific' as const }))
      // Apply max caps: up to 5 general and 7 specific (12 total)
      const MAX_GENERAL = 5
      const MAX_SPECIFIC = 7
      const generalCapped = generalTags.slice(0, MAX_GENERAL)
      const specificCapped = specificTags.slice(0, MAX_SPECIFIC)
      tags = [...generalCapped, ...specificCapped]
    } catch (error) {
      console.error('Error parsing tag generation response:', error)
      // Fallback to simple tag generation if JSON parsing fails
      const fallbackPrompt = `Extract 5-8 relevant keywords from this text, return as comma-separated lowercase terms: ${extractedText.substring(0, 1000)}`
      const fallbackResult = await model.generateContent(fallbackPrompt)
      const MAX_TAGS = 12
      const fallbackTags = fallbackResult.response.text().trim().split(/[\n,]+/)
        .map(tag => sanitizeTagName(tag))
        .filter(tag => tag.length > 0 && !isJunkTagName(tag))
        .slice(0, MAX_TAGS)
        .map(name => ({ name, type: 'general' as const }))
      
      tags = fallbackTags
    }
  }

  return {
    extractedText,
    summary,
    tags
  }
}

export async function extractTextOnly(file: File): Promise<string> {
  // Extract text only without requiring the Gemini API key (for some file types)
  let extractedText = ''
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
    extractedText = await extractTextFromDocx(file)
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    extractedText = await extractTextFromPdf(file)
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
             file.name.toLowerCase().endsWith('.pptx')) {
    extractedText = await extractTextFromPptx(file)
  } else if (file.type.startsWith('image/')) {
    // Images require Gemini API, so call processImage
    extractedText = await processImage(file)
  } else if (file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')) {
    // Audio requires Gemini API, so call processAudio
    extractedText = await processAudio(file)
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, PPTX, image, or audio files.')
  }
  return extractedText
}

async function extractTextFromDocx(file: File): Promise<string> {
  try {
    console.log('Extracting text from DOCX using Mammoth...')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    console.log(`DOCX extraction successful: ${result.value.length} characters`)
    return result.value
  } catch (error) {
    console.error('Error extracting text from DOCX:', error)
    throw new Error('Failed to extract text from DOCX file')
  }
}

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    console.log('Extracting text from PDF using PDF.js...')
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const textItems = textContent.items.map((item: any) => item.str).join(' ')
      fullText += textItems + '\n'
    }
    
    console.log(`PDF extraction successful: ${fullText.length} characters`)
    return fullText.trim()
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error('Failed to extract text from PDF file')
  }
}

async function extractTextFromPptx(file: File): Promise<string> {
  try {
    console.log('Extracting text from PPTX using PizZip...')
    const arrayBuffer = await file.arrayBuffer()
    const zip = new PizZip(arrayBuffer)
    
    let fullText = ''
    let slideNumber = 0
    
    // PPTX files store slides in ppt/slides/slide{n}.xml
    // We'll extract text from slide XML files
    Object.keys(zip.files).forEach((filename) => {
      if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
        slideNumber++
        const slideXml = zip.files[filename].asText()
        
        // Extract text from <a:t> tags (text runs in PowerPoint)
        const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g)
        
        if (textMatches) {
          const slideText = textMatches
            .map(match => match.replace(/<[^>]+>/g, ''))
            .join(' ')
            .trim()
          
          if (slideText) {
            fullText += `\n\n--- Slide ${slideNumber} ---\n${slideText}`
          }
        }
      }
    })
    
    console.log(`PPTX extraction successful: ${fullText.length} characters from ${slideNumber} slides`)
    return fullText.trim()
  } catch (error) {
    console.error('Error extracting text from PPTX:', error)
    throw new Error('Failed to extract text from PPTX file')
  }
}

async function processImage(file: File): Promise<string> {
  try {
    console.log('Processing image with Gemini Vision API...')
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
      throw new Error('Gemini API key not configured')
    }
    
    // Convert image to base64
    const base64Image = await fileToBase64(file)
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Please analyze this image and provide a detailed description of its content. If the image contains text, transcribe it. If it contains diagrams, charts, or other visual information, describe them in detail. Be comprehensive and specific."
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Image.split(',')[1] // Remove data URL prefix
                }
              }
            ]
          }]
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const description = data.candidates[0].content.parts[0].text.trim()
      console.log(`Image processing successful: ${description.length} characters`)
      return description
    } else {
      throw new Error('No description generated from image')
    }
  } catch (error) {
    console.error('Error processing image:', error)
    throw new Error('Failed to process image file')
  }
}

async function processAudio(file: File): Promise<string> {
  try {
    console.log('Processing audio with Gemini API...')
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
      throw new Error('Gemini API key not configured')
    }
    
    // Convert audio to base64
    const base64Audio = await fileToBase64(file)
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Please transcribe this audio file. Provide only the transcript text without any additional commentary or formatting."
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Audio.split(',')[1] // Remove data URL prefix
                }
              }
            ]
          }]
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const transcript = data.candidates[0].content.parts[0].text.trim()
      console.log(`Audio transcription successful: ${transcript.length} characters`)
      return transcript
    } else {
      throw new Error('No transcript generated from audio')
    }
  } catch (error) {
    console.error('Error processing audio:', error)
    throw new Error('Failed to transcribe audio file')
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
