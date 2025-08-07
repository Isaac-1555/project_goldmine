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
      extractedText = await extractTextFromPDF(fileData)
    } else if (fileRecord.file_type === 'docx') {
      extractedText = await extractTextFromDocx(fileData)
    }

    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the file')
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
  // Convert audio blob to base64
  const arrayBuffer = await audioData.arrayBuffer()
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
    Please transcribe the following audio content. Provide only the transcribed text without any additional commentary or formatting.
    
    Audio data: ${base64Audio}
  `

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

async function extractTextFromPDF(pdfData: Blob): Promise<string> {
  // For now, return a placeholder. In production, you'd use a PDF parsing library
  // like pdf-parse or similar that works in Deno
  return "PDF text extraction not yet implemented. Please use the Gemini API with document parsing capabilities."
}

async function extractTextFromDocx(docxData: Blob): Promise<string> {
  // For now, return a placeholder. In production, you'd use a DOCX parsing library
  return "DOCX text extraction not yet implemented. Please use the Gemini API with document parsing capabilities."
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
    // Check if tag exists, create if not
    let { data: existingTag, error: tagSelectError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName)
      .single()

    if (tagSelectError && tagSelectError.code !== 'PGRST116') {
      throw tagSelectError
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
        throw tagInsertError
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
  }
}