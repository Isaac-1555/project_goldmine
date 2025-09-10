// Client-side document processing using specialized libraries

import { GoogleGenerativeAI } from '@google/generative-ai'
// @ts-ignore
import * as mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'your-gemini-api-key'

export async function processDocumentClientSide(file: File): Promise<{
  extractedText: string
  summary: string
  tags: string[]
}> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file')
  }

  console.log(`Processing ${file.type} file: ${file.name}`)

  // Extract text using appropriate library
  let extractedText: string
  
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.name.toLowerCase().endsWith('.docx')) {
    extractedText = await extractTextFromDocx(file)
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    extractedText = await extractTextFromPdf(file)
  } else {
    throw new Error('Unsupported file type. Please upload PDF or DOCX files.')
  }

  if (!extractedText.trim()) {
    throw new Error('No text could be extracted from the document')
  }

  console.log(`Extracted ${extractedText.length} characters of text`)

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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

  // Extract tags
  const tagsPrompt = `
    Extract 3-7 relevant keywords or tags from the following text. 
    These should be:
    - Single words or short phrases (2-3 words max)
    - Relevant to the main topics and themes
    - Useful for categorization and search
    - Lowercase
    
    Return only the tags separated by commas, nothing else.
    
    Text: ${extractedText}
  `

  const tagsResult = await model.generateContent(tagsPrompt)
  const tagsText = tagsResult.response.text().trim()
  const tags = tagsText.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)

  return {
    extractedText,
    summary,
    tags
  }
}

export async function extractTextOnly(file: File): Promise<string> {
  // Extract text only without requiring the Gemini API key
  let extractedText = ''
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
    extractedText = await extractTextFromDocx(file)
  } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    extractedText = await extractTextFromPdf(file)
  } else {
    throw new Error('Unsupported file type. Please upload PDF or DOCX files.')
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