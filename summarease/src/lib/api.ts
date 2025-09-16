import { supabase } from './supabase'
import { processDocumentClientSide, extractTextOnly } from './documentProcessor'
import { processAudioTranscript } from './audioProcessor'

export interface FileWithMetadata {
  id: string
  file_id?: string // From RPC function
  title: string
  filename?: string // Optional - might be derived from storage_path
  file_type: 'audio' | 'pdf' | 'docx' | 'mixed' | 'notebook'
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  storage_path?: string
  folder_name?: string
  summary_text?: string
  summary?: string
  tags?: string[]
  // For local notebooks
  localNotebookData?: {
    notes: string
    audioTranscript: string
    uploadedFiles: any[]
    recordingTime: number
  }
}

export interface ProcessingResult {
  success: boolean
  transcriptId?: string
  summaryId?: string
  tags?: string[]
  error?: string
}

/**
 * Trigger file processing for a given file ID
 */
export async function processFile(fileId: string): Promise<ProcessingResult> {
  try {
    const { data, error } = await supabase.functions.invoke('process-file', {
      body: { fileId }
    })

    if (error) {
      throw error
    }

    return data
  } catch (error: any) {
    console.error('Error processing file:', error)
    return {
      success: false,
      error: error.message || 'Failed to process file'
    }
  }
}

/**
 * Get user's files with metadata including summaries and tags
 */
export async function getUserFiles(): Promise<FileWithMetadata[]> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase.rpc('get_user_files_with_metadata', {
      user_uuid: user.user.id
    })

    if (error) {
      throw error
    }

    // Map the RPC results to our interface
    return (data || []).map((file: any) => ({
      id: file.file_id,
      title: file.title,
      file_type: file.file_type,
      status: file.status,
      created_at: file.created_at,
      folder_name: file.folder_name,
      summary_text: file.summary_text,
      summary: file.summary_text, // Alias for compatibility
      tags: file.tags || [],
      filename: file.title // Use title as filename fallback
    }))
  } catch (error: any) {
    console.error('Error fetching user files:', error)
    return []
  }
}

/**
 * Get file details including transcript and summary
 */
export async function getFileDetails(fileId: string) {
  try {
    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError) throw fileError

    // For notebook files, get separate content types
    if (file.file_type === 'audio' || file.file_type === 'notebook') {
      return getNotebookDetails(fileId)
    }

    // Legacy support for other file types
    // Get transcript (might not exist)
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('*')
      .eq('file_id', fileId)
      .maybeSingle()

    // Get all summaries with tags (might be 0..n)
    const { data: summariesArr } = await supabase
      .from('summaries')
      .select(`
        *,
        summary_tags (
          tags (
            id,
            name
          )
        )
      `)
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })

    const latestSummary = (summariesArr && summariesArr.length > 0) ? summariesArr[0] : null
    const latestTags = latestSummary?.summary_tags?.map((st: any) => st.tags) || []

    return {
      file,
      transcript: transcript || null,
      summary: latestSummary || null,
      summaries: summariesArr || [],
      tags: latestTags
    }
  } catch (error: any) {
    console.error('Error fetching file details:', error)
    throw error
  }
}

/**
 * Get notebook details with separate content types
 */
export async function getNotebookDetails(fileId: string) {
  try {
    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError) throw fileError

    // Get audio transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('*')
      .eq('file_id', fileId)
      .maybeSingle()

    // Get notes
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('file_id', fileId)
      .maybeSingle()

    // Get documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

    // Get summary with tags
    const { data: summariesArr } = await supabase
      .from('summaries')
      .select(`
        *,
        summary_tags (
          tags (
            id,
            name
          )
        )
      `)
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })

    const latestSummary = (summariesArr && summariesArr.length > 0) ? summariesArr[0] : null
    const latestTags = latestSummary?.summary_tags?.map((st: any) => st.tags) || []

    return {
      file,
      transcript: transcript || null,
      notes: notes || null,
      documents: documents || [],
      summary: latestSummary || null,
      summaries: summariesArr || [],
      tags: latestTags
    }
  } catch (error: any) {
    console.error('Error fetching notebook details:', error)
    throw error
  }
}

/**
 * Update summary text (user editing)
 */
export async function updateSummary(summaryId: string, newText: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('summaries')
      .update({ summary_text: newText })
      .eq('id', summaryId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('Error updating summary:', error)
    return false
  }
}

/**
 * Get knowledge graph data for visualization
 */
export async function getKnowledgeGraphData() {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase.rpc('get_knowledge_graph_data', {
      user_uuid: user.user.id
    })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('Error fetching knowledge graph data:', error)
    return []
  }
}

/**
 * Upload a file and create a file record
 */
export async function uploadFile(file: File, title?: string): Promise<string | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Determine file type based on file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    let fileType: 'pdf' | 'docx' | 'audio'
    
    if (fileExtension === 'pdf') {
      fileType = 'pdf'
    } else if (fileExtension === 'docx' || fileExtension === 'doc') {
      fileType = 'docx'
    } else {
      throw new Error('Unsupported file type. Please upload PDF or DOCX files.')
    }

    // Process document client-side as temporary workaround
    console.log('Processing document client-side...')
    const { extractedText, summary, tags } = await processDocumentClientSide(file)

    // Upload file to Supabase Storage
    const fileName = `${user.user.id}/${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Create file record in database
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert([
        {
          title: title || file.name.replace(/\.[^/.]+$/, ''), // Remove extension if no title provided
          file_type: fileType,
          status: 'completed', // Set as completed since we processed it
          user_id: user.user.id,
          storage_path: uploadData.path
        }
      ])
      .select()
      .single()

    if (fileError) throw fileError

    // Save transcript (extracted text)
    await supabase.from('transcripts').insert([
      {
        file_id: fileData.id,
        content: extractedText,
        created_at: new Date().toISOString()
      }
    ])

    // Save summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('summaries')
      .insert([
        {
          file_id: fileData.id,
          summary_text: summary,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (summaryError) {
      console.error('Error saving summary:', summaryError)
    } else {
      // Save tags
      await saveTags(summaryData.id, tags)
    }

    return fileData.id
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return null
  }
}

/**
 * Create a unified content entry with multiple sources
 */
export async function createUnifiedContent(
  title: string, 
  sources: {
    audioTranscript?: string
    uploadedFiles?: File[]
    notes?: string
    recordingDuration?: number
  }
): Promise<{ id: string | null, documentsExtractedText: string }> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Create main file record
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert([
        {
          title,
          file_type: 'audio',
          status: 'completed', // Set as completed since we're processing client-side
          user_id: user.user.id,
          storage_path: `notebooks/${user.user.id}/${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}`
        }
      ])
      .select()
      .single()

    if (fileError) throw fileError

    // Handle audio transcript
    if (sources.audioTranscript?.trim()) {
      await supabase.from('transcripts').insert([
        {
          file_id: fileData.id,
          content: sources.audioTranscript,
          duration: sources.recordingDuration || null,
          created_at: new Date().toISOString()
        }
      ])
    }

    // Handle uploaded files as separate documents
    let docsExtractedText: string[] = []
    if (sources.uploadedFiles && sources.uploadedFiles.length > 0) {
      for (const file of sources.uploadedFiles) {
        try {
          // Extract text client-side (no API key required)
          const extractedText = await extractTextOnly(file)
          if (extractedText) docsExtractedText.push(extractedText)
          
          // Upload file to storage
          const fileName = `${user.user.id}/${Date.now()}_${file.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(fileName, file)
          
          if (uploadError) throw uploadError
          
          // Save to documents table
          const { error: docInsertError } = await supabase.from('documents').insert([
            {
              file_id: fileData.id,
              original_filename: file.name,
              file_type: file.type,
              storage_path: uploadData.path,
              extracted_text: extractedText,
              created_at: new Date().toISOString()
            }
          ])
          if (docInsertError) {
            console.error('Error inserting document row:', docInsertError)
          }
        } catch (error) {
          console.error('Error processing uploaded file:', file.name, error)
        }
      }
    }

    // Handle notes
    if (sources.notes?.trim()) {
      console.log('Saving notes to database:', sources.notes)
      const { error: notesError } = await supabase.from('notes').insert([
        {
          file_id: fileData.id,
          content: sources.notes.replace(/<[^>]*>/g, '').trim(), // Plain text
          html_content: sources.notes, // Rich text HTML
          created_at: new Date().toISOString()
        }
      ])
      
      if (notesError) {
        console.error('Error saving notes:', notesError)
      } else {
        console.log('Notes saved successfully')
      }
    }

    return { id: fileData.id, documentsExtractedText: docsExtractedText.join('\n\n') }
  } catch (error: any) {
    console.error('Error creating unified content:', error)
    return { id: null, documentsExtractedText: '' }
  }
}

/**
 * Create a new file record for a recording (legacy function)
 */
export async function createRecording(title: string, transcriptText: string = ''): Promise<string | null> {
  const res = await createUnifiedContent(title, { audioTranscript: transcriptText })
  return res.id
}

/**
 * Save tags for a summary (internal helper)
 */
async function saveTags(summaryId: string, tags: string[]): Promise<void> {
  for (const tagName of tags) {
    const name = (tagName || '').trim()
    if (!name) continue
    try {
      // Check if tag exists, create if not
      let { data: existingTag, error: tagSelectError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', name)
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
          .insert({ name })
          .select('id')
          .single()

        if (tagInsertError) {
          console.error('Error creating tag:', tagInsertError)
          continue
        }
        tagId = newTag.id
      }

      // Link tag to summary (ignore duplicates)
      await supabase
        .from('summary_tags')
        .insert({
          summary_id: summaryId,
          tag_id: tagId
        })
        .select()
        .maybeSingle()
        .catch(() => {})
    } catch (error) {
      console.error('Error saving tag:', name, error)
    }
  }
}

/**
 * Public: add (custom) tags to an existing summary
 */
export async function addTagsToSummary(summaryId: string, tags: string[]): Promise<void> {
  await saveTags(summaryId, tags)
}

/**
 * Update existing notebook content: notes/transcript, and append newly uploaded documents
 */
export async function updateNotebookContent(
  fileId: string,
  changes: {
    notesHtml?: string
    notesText?: string
    transcriptText?: string
    newFiles?: File[]
    recordingDuration?: number
  }
): Promise<{ success: boolean; newDocsExtractedText?: string }> {
  try {
    // Update or insert notes
    if (changes.notesHtml || changes.notesText) {
      const { data: existingNotes } = await supabase
        .from('notes')
        .select('id')
        .eq('file_id', fileId)
        .maybeSingle()

      if (existingNotes?.id) {
        await supabase
          .from('notes')
          .update({
            content: (changes.notesText || '').trim(),
            html_content: changes.notesHtml || '',
          })
          .eq('id', existingNotes.id)
      } else {
        await supabase
          .from('notes')
          .insert({
            file_id: fileId,
            content: (changes.notesText || '').trim(),
            html_content: changes.notesHtml || '',
            created_at: new Date().toISOString()
          })
      }
    }

    // Update or insert transcript
    if (changes.transcriptText && changes.transcriptText.trim()) {
      const { data: existingTranscript } = await supabase
        .from('transcripts')
        .select('id')
        .eq('file_id', fileId)
        .maybeSingle()

      if (existingTranscript?.id) {
        await supabase
          .from('transcripts')
          .update({
            content: changes.transcriptText,
            duration: changes.recordingDuration || null,
          })
          .eq('id', existingTranscript.id)
      } else {
        await supabase
          .from('transcripts')
          .insert({
            file_id: fileId,
            content: changes.transcriptText,
            duration: changes.recordingDuration || null,
            created_at: new Date().toISOString()
          })
      }
    }

    // Append any newly uploaded files to documents
    let newDocsExtractedText: string[] = []
    if (changes.newFiles && changes.newFiles.length > 0) {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      for (const file of changes.newFiles) {
        try {
          const extractedText = await extractTextOnly(file)
          if (extractedText) newDocsExtractedText.push(extractedText)
          const fileName = `${user.user.id}/${Date.now()}_${file.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(fileName, file)
          if (uploadError) throw uploadError

          const { error: docInsertError } = await supabase.from('documents').insert({
            file_id: fileId,
            original_filename: file.name,
            file_type: file.type,
            storage_path: uploadData.path,
            extracted_text: extractedText,
            created_at: new Date().toISOString()
          })
          if (docInsertError) {
            console.error('Error inserting document row:', file.name, docInsertError)
          }
        } catch (e) {
          console.error('Error appending uploaded file to documents:', file.name, e)
        }
      }
    }

    return { success: true, newDocsExtractedText: newDocsExtractedText.join('\n\n') }
  } catch (error: any) {
    console.error('Error updating notebook content:', error)
    return { success: false }
  }
}

/**
 * Delete a file and all its associated data
 */
/**
 * Regenerate the latest summary for a file by recomputing from current transcript, notes, and documents.
 * Inserts a new row in summaries and returns the new summary content and tags.
 */
export async function regenerateSummary(fileId: string): Promise<{ success: boolean; summaryId?: string; summary_text?: string; tags?: string[]; error?: string }> {
  try {
    // Fetch latest notebook-style details (works for audio/notebook files)
    const details = await getNotebookDetails(fileId)

    let combined = ''
    if (details.notes?.content?.trim()) {
      combined += `Notes:\n${details.notes.content.trim()}\n\n`
    }
    if (details.transcript?.content?.trim()) {
      combined += `Transcript:\n${details.transcript.content.trim()}\n\n`
    }
    if (Array.isArray(details.documents)) {
      for (const d of details.documents) {
        const name = d.original_filename || 'Document'
        const text = (d.extracted_text || '').toString().trim()
        if (text) {
          combined += `${name}:\n${text}\n\n`
        }
      }
    }

    if (!combined.trim()) {
      return { success: false, error: 'No content available to summarize' }
    }

    const { summary, tags } = await processAudioTranscript(combined)

    // Insert new summary row
    const { data: summaryRow, error: summaryInsertError } = await supabase
      .from('summaries')
      .insert({ file_id: fileId, summary_text: summary, created_at: new Date().toISOString() })
      .select('*')
      .single()

    if (summaryInsertError) throw summaryInsertError

    // Save tags links
    if (tags?.length) {
      await addTagsToSummary(summaryRow.id, tags)
    }

    return { success: true, summaryId: summaryRow.id, summary_text: summary, tags }
  } catch (error: any) {
    console.error('Error regenerating summary:', error)
    return { success: false, error: error.message || 'Failed to regenerate summary' }
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('Error deleting file:', error)
    return false
  }
}
