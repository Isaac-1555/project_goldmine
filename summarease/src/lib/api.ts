import { supabase } from './supabase'
import { processDocumentClientSide } from './documentProcessor'

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

    // Get summary with tags (might not exist)
    const { data: summary } = await supabase
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
      .maybeSingle()

    return {
      file,
      transcript: transcript || null,
      summary: summary || null,
      tags: summary?.summary_tags?.map((st: any) => st.tags) || []
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
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('file_id', fileId)

    // Get summary with tags
    const { data: summary } = await supabase
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
      .maybeSingle()

    return {
      file,
      transcript: transcript || null,
      notes: notes || null,
      documents: documents || [],
      summary: summary || null,
      tags: summary?.summary_tags?.map((st: any) => st.tags) || []
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
): Promise<string | null> {
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
    if (sources.uploadedFiles && sources.uploadedFiles.length > 0) {
      for (const file of sources.uploadedFiles) {
        try {
          // Process document client-side
          const { extractedText } = await processDocumentClientSide(file)
          
          // Upload file to storage
          const fileName = `${user.user.id}/${Date.now()}_${file.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(fileName, file)
          
          if (uploadError) throw uploadError
          
          // Save to documents table
          await supabase.from('documents').insert([
            {
              file_id: fileData.id,
              original_filename: file.name,
              file_type: file.type,
              storage_path: uploadData.path,
              extracted_text: extractedText,
              created_at: new Date().toISOString()
            }
          ])
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

    return fileData.id
  } catch (error: any) {
    console.error('Error creating unified content:', error)
    return null
  }
}

/**
 * Create a new file record for a recording (legacy function)
 */
export async function createRecording(title: string, transcriptText: string = ''): Promise<string | null> {
  return createUnifiedContent(title, { audioTranscript: transcriptText })
}

/**
 * Save tags for a summary
 */
async function saveTags(summaryId: string, tags: string[]): Promise<void> {
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

/**
 * Delete a file and all its associated data
 */
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