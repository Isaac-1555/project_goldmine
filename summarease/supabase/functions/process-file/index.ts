import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessFileRequest {
  fileId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize Gemini AI
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
    const genAI = new GoogleGenerativeAI(geminiApiKey)

    const { fileId } = await req.json() as ProcessFileRequest

    // Get file record from database
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !fileRecord) {
      throw new Error('File not found')
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('files')
      .download(fileRecord.storage_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file')
    }

    let extractedText = ''

    // Process based on file type
    if (fileRecord.file_type === 'audio') {
      extractedText = await transcribeAudio(fileData, genAI)
    } else if (fileRecord.file_type === 'pdf') {
      extractedText = await extractTextFromPDF(fileData, genAI)
    } else if (fileRecord.file_type === 'docx') {
      extractedText = await extractTextFromDocx(fileData, genAI)
    }

    console.log(`Extracted text length: ${extractedText.length} characters`)
    
    if (!extractedText.trim()) {
      throw new Error(`No text could be extracted from the ${fileRecord.file_type} file`)
    }

    // Save transcript
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        file_id: fileId,
        content: extractedText
      })
      .select()
      .single()

    if (transcriptError) {
      throw new Error('Failed to save transcript')
    }

    // Generate summary using Gemini
    const summary = await generateSummary(extractedText, genAI)

    // Save summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        file_id: fileId,
        summary_text: summary
      })
      .select()
      .single()

    if (summaryError) {
      throw new Error('Failed to save summary')
    }

    // Extract and save tags
    const tags = await extractTags(summary, genAI)
    await saveTags(summaryData.id, tags, supabase)

    // Update file status to completed
    await supabase
      .from('files')
      .update({ status: 'completed' })
      .eq('id', fileId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcriptId: transcriptData.id,
        summaryId: summaryData.id,
        tags: tags
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Processing error:', error)

    // Update file status to failed if we have the fileId
    try {
      const { fileId } = await req.json() as ProcessFileRequest
      if (fileId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        await supabase
          .from('files')
          .update({ status: 'failed' })
          .eq('id', fileId)
      }
    } catch (updateError) {
      console.error('Failed to update file status:', updateError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function transcribeAudio(audioData: Blob, genAI: GoogleGenerativeAI): Promise<string> {
  try {
    console.log(`Processing audio file, size: ${audioData.size} bytes`)
    
    // Convert audio blob to base64
    const arrayBuffer = await audioData.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    
    console.log(`Audio converted to base64, length: ${base64Audio.length}`)

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
      Please transcribe the audio content from this audio file. 
      Return only the transcribed text without any formatting, headers, or additional commentary.
      If no speech is detected, return "No speech detected in audio file."
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio
        }
      }
    ])
    
    const response = await result.response
    const transcribedText = response.text()
    
    console.log(`Audio transcribed, length: ${transcribedText.length}`)
    
    return transcribedText
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw new Error(`Failed to transcribe audio: ${error.message}`)
  }
}

async function extractTextFromPDF(pdfData: Blob, genAI: GoogleGenerativeAI): Promise<string> {
  try {
    console.log(`Processing PDF file, size: ${pdfData.size} bytes`)
    
    // Convert PDF blob to base64
    const arrayBuffer = await pdfData.arrayBuffer()
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    
    console.log(`PDF converted to base64, length: ${base64Data.length}`)

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
      Please extract all text content from this PDF document. 
      Return only the extracted text without any formatting, headers, or additional commentary.
      Preserve paragraph breaks but remove any special formatting.
      Do not include any instructions or explanations, just the document content.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      }
    ])
    
    const response = await result.response
    const extractedText = response.text()
    
    console.log(`PDF text extracted, length: ${extractedText.length}`)
    
    return extractedText
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error(`Failed to extract text from PDF: ${error.message}`)
  }
}

async function extractTextFromDocx(docxData: Blob, genAI: GoogleGenerativeAI): Promise<string> {
  try {
    console.log(`Processing DOCX file, size: ${docxData.size} bytes`)
    
    // Convert DOCX blob to base64
    const arrayBuffer = await docxData.arrayBuffer()
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    
    console.log(`DOCX converted to base64, length: ${base64Data.length}`)

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
      Please extract all text content from this DOCX document. 
      Return only the extracted text without any formatting, headers, or additional commentary.
      Preserve paragraph breaks but remove any special formatting.
      Do not include any instructions or explanations, just the document content.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          data: base64Data
        }
      }
    ])
    
    const response = await result.response
    const extractedText = response.text()
    
    console.log(`DOCX text extracted, length: ${extractedText.length}`)
    
    return extractedText
  } catch (error) {
    console.error('Error extracting text from DOCX:', error)
    throw new Error(`Failed to extract text from DOCX: ${error.message}`)
  }
}

async function generateSummary(text: string, genAI: GoogleGenerativeAI): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
    Please create a comprehensive but concise summary of the following text. 
    The summary should:
    - Capture the main points and key information
    - Be well-structured and easy to read
    - Be approximately 200-400 words
    - Use clear, professional language
    
    Text to summarize:
    ${text}
  `

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

async function extractTags(text: string, genAI: GoogleGenerativeAI): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
    Extract 3-7 relevant keywords or tags from the following text. 
    These should be:
    - Single words or short phrases (2-3 words max)
    - Relevant to the main topics and themes
    - Useful for categorization and search
    - Lowercase
    
    Return only the tags separated by commas, nothing else.
    
    Text: ${text}
  `

  const result = await model.generateContent(prompt)
  const response = await result.response
  const tagsText = response.text().trim()
  
  return tagsText.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
}

async function saveTags(summaryId: string, tags: string[], supabase: any): Promise<void> {
  for (const tagName of tags) {
    try {
      // Check if tag exists, create if not
      let { data: existingTag, error: tagSelectError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .maybeSingle()

      if (tagSelectError) {
        console.error('Error checking tag:', tagSelectError)
        continue
      }

      let tagId: string

      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag, error: tagInsertError } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single()

        if (tagInsertError) {
          console.error('Error creating tag:', tagInsertError)
          continue
        }
        tagId = newTag.id
      }

      // Link tag to summary
      await supabase
        .from('summary_tags')
        .insert({
          summary_id: summaryId,
          tag_id: tagId
        })
    } catch (error) {
      console.error('Error saving tag:', tagName, error)
    }
  }
}