import { supabase } from './supabase'
import { processDocumentClientSide, extractTextOnly } from './documentProcessor'
import { processAudioTranscript } from './audioProcessor'
import type { Tag } from './types'

function getDocumentsTableFileType(file: File): string {
  // `documents.file_type` is VARCHAR(50) and expects short values like "pdf", "docx", etc.
  // Some MIME types (e.g. DOCX/PPTX) exceed 50 chars and will fail inserts.
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext && ext.trim()) return ext.trim().slice(0, 50)
  if (file.type && file.type.trim()) return file.type.trim().slice(0, 50)
  return 'file'
}

function getStorageUploadPath(userId: string, fileName: string): string {
  const safeName = fileName.replace(/\s+/g, '_')
  const rand = Math.random().toString(36).slice(2, 10)
  return `${userId}/${Date.now()}_${rand}_${safeName}`
}

// Re-export Tag for backwards compatibility
export type { Tag } from './types'

export interface FileWithMetadata {
  id: string
  file_id?: string // From RPC function
  title: string
  filename?: string // Optional - might be derived from storage_path
  file_type: 'audio' | 'pdf' | 'docx' | 'mixed' | 'notebook'
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  storage_path?: string
  folder_id?: string | null
  folder_name?: string
  summary_text?: string
  summary?: string
  tags?: Tag[] // Updated to use Tag interface
  // For local notebooks
  localNotebookData?: {
    notes: string
    audioTranscript: string
    uploadedFiles: any[]
    recordingTime: number
  }
}

export interface Folder {
  id: string
  user_id: string
  name: string
  created_at: string
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
export async function processFile(fileId: string, autoTags: boolean = true): Promise<ProcessingResult> {
  try {
    const { data, error } = await supabase.functions.invoke('process-file', {
      body: { fileId, autoTags }
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
    return (data || []).map((file: any) => {
      // Handle both old format (string[]) and new format (Tag[])
      const tags = file.tags || []
      let processedTags: Tag[] = []
      
      if (Array.isArray(tags)) {
        if (tags.length > 0 && typeof tags[0] === 'object' && tags[0].name) {
          // New format: array of Tag objects from JSONB
          processedTags = tags
        } else {
          // Old format: array of strings, convert to general tags
          processedTags = tags.map((tagName: string) => ({
            name: tagName,
            type: 'general' as const
          }))
        }
      }
      
      return {
        id: file.file_id,
        title: file.title,
        file_type: file.file_type,
        status: file.status,
        created_at: file.created_at,
        folder_name: file.folder_name,
        summary_text: file.summary_text,
        summary: file.summary_text, // Alias for compatibility
        tags: processedTags,
        filename: file.title // Use title as filename fallback
      }
    })
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

    // Get notes (might not exist)
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('file_id', fileId)
      .maybeSingle()

    // Get documents (might not exist)
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

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
    const latestTags: Tag[] = latestSummary?.summary_tags?.map((st: any) => ({
      name: st.tags.name,
      type: st.tags.type || 'general'
    })) || []

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
    const latestTags: Tag[] = latestSummary?.summary_tags?.map((st: any) => ({
      name: st.tags.name,
      type: st.tags.type || 'general'
    })) || []

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
export async function uploadFile(file: File, title?: string, folderId?: string | null, autoTags: boolean = true): Promise<string | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Determine file type based on file extension and MIME type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    let fileType: 'pdf' | 'docx' | 'pptx' | 'image' | 'audio'
    
    if (fileExtension === 'pdf') {
      fileType = 'pdf'
    } else if (fileExtension === 'docx' || fileExtension === 'doc') {
      fileType = 'docx'
    } else if (fileExtension === 'pptx' || file.type.includes('presentation')) {
      fileType = 'pptx'
    } else if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg'].includes(fileExtension || '')) {
      fileType = 'image'
    } else if (file.type.startsWith('audio/') || fileExtension === 'mp3') {
      fileType = 'audio'
    } else {
      throw new Error('Unsupported file type. Please upload PDF, DOCX, PPTX, image, or audio files.')
    }

    // Process document client-side as temporary workaround
    console.log('Processing document client-side...')
    const { extractedText, summary, tags } = await processDocumentClientSide(file, autoTags)

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
          folder_id: folderId,
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
    } else if (autoTags) {
      // Save tags (only if autoTags is enabled)
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
  },
  folderId?: string | null
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
          folder_id: folderId,
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
    const docsExtractedText: string[] = []
    if (sources.uploadedFiles && sources.uploadedFiles.length > 0) {
      for (const file of sources.uploadedFiles) {
        try {
          // Extract text best-effort; don't block uploads if extraction fails.
          let extractedText: string | null = null
          try {
            extractedText = await extractTextOnly(file)
          } catch (e) {
            console.warn('Failed to extract text from uploaded file (continuing without extracted_text):', file.name, e)
          }

          // Upload file to storage
          const filePath = getStorageUploadPath(user.user.id, file.name)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          // Save to documents table
          const { error: docInsertError } = await supabase.from('documents').insert([
            {
              file_id: fileData.id,
              original_filename: file.name,
              file_type: getDocumentsTableFileType(file),
              storage_path: uploadData.path,
              extracted_text: extractedText,
              created_at: new Date().toISOString()
            }
          ])
          if (docInsertError) {
            throw docInsertError
          }

          if (extractedText) docsExtractedText.push(extractedText)
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
export async function createRecording(title: string, transcriptText: string = '', folderId?: string | null): Promise<string | null> {
  const res = await createUnifiedContent(title, { audioTranscript: transcriptText }, folderId)
  return res.id
}

/**
 * Save tags for a summary (internal helper)
 */
import { sanitizeTagName, isJunkTagName } from './tagUtils'

async function saveTags(summaryId: string, tags: Tag[]): Promise<void> {
  for (const tag of tags) {
    const rawName = (tag.name || '').trim()
    const name = sanitizeTagName(rawName)
    const type = tag.type || 'general'
    if (!name || isJunkTagName(name)) continue
    try {
      // Use the new RPC function to create tags with type
      const { data: tagId, error: tagCreateError } = await supabase
        .rpc('create_tag_with_type', {
          tag_name: name,
          tag_type: type
        })

      if (tagCreateError) {
        console.error('Error creating/getting tag:', tagCreateError)
        continue
      }

      // Link tag to summary (ignore duplicates)
      const { error: linkError } = await supabase
        .from('summary_tags')
        .insert({
          summary_id: summaryId,
          tag_id: tagId
        })
        .select()
        .maybeSingle()
      
      // Ignore duplicate errors
      if (linkError && !linkError.message.includes('duplicate')) {
        console.error('Error linking tag to summary:', linkError)
      }
    } catch (error) {
      console.error('Error saving tag:', name, error)
    }
  }
}

/**
 * Public: add (custom) tags to an existing summary
 */
export async function addTagsToSummary(summaryId: string, tags: Tag[]): Promise<void> {
  await saveTags(summaryId, tags)
}

/**
 * Add custom tags to a file by finding its latest summary
 */
export async function addCustomTagsToFile(fileId: string, tagNames: string[]): Promise<{ success: boolean; error?: string; addedTags?: Tag[] }> {
  try {
    // Get the latest summary for this file
    const { data: latestSummary, error: summaryError } = await supabase
      .from('summaries')
      .select('id')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (summaryError) {
      throw summaryError
    }

    if (!latestSummary) {
      return { success: false, error: 'No summary found for this file. Tags can only be added to files with summaries.' }
    }

    // Get existing tags for this summary to prevent duplicates
    const { data: existingTagsData } = await supabase
      .from('summary_tags')
      .select(`
        tags (
          id,
          name
        )
      `)
      .eq('summary_id', latestSummary.id)

    const existingTagNames = new Set(
      (existingTagsData || []).map((st: any) => st.tags.name.toLowerCase())
    )

    // Filter out tags that already exist
    const newTagNames = tagNames.filter(name => 
      !existingTagNames.has(name.trim().toLowerCase())
    )

    if (newTagNames.length === 0) {
      return { success: false, error: 'All provided tags already exist for this file.' }
    }

    const addedTags: Tag[] = []

    // Process each new tag
    for (const tagName of newTagNames) {
      const name = tagName.trim()
      if (!name) continue

      try {
        // Check if tag exists in the global tags table
        const { error: tagSelectError } = await supabase
          .from('tags')
          .select('id, name')
          .eq('name', name)
          .maybeSingle()

        if (tagSelectError) {
          console.error('Error checking tag:', tagSelectError)
          continue
        }

        // Use the RPC function to create user-added tag with type
        const { data: tagId, error: tagCreateError } = await supabase
          .rpc('create_tag_with_type', {
            tag_name: name,
            tag_type: 'user_added'
          })

        if (tagCreateError) {
          console.error('Error creating tag:', tagCreateError)
          continue
        }

        const tagRecord: Tag = { name, type: 'user_added' }

        // Link tag to summary
        const { error: linkError } = await supabase
          .from('summary_tags')
          .insert({
            summary_id: latestSummary.id,
            tag_id: tagId
          })

        if (linkError) {
          console.error('Error linking tag to summary:', linkError)
          continue
        }

        addedTags.push(tagRecord)
      } catch (error) {
        console.error('Error processing tag:', name, error)
      }
    }

    return { success: true, addedTags }
  } catch (error: any) {
    console.error('Error adding custom tags to file:', error)
    return { success: false, error: error.message || 'Failed to add tags' }
  }
}

/**
 * Remove a tag from a file's latest summary
 */
export async function removeTagFromFile(fileId: string, tagName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the latest summary for this file
    const { data: latestSummary, error: summaryError } = await supabase
      .from('summaries')
      .select('id')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (summaryError) {
      throw summaryError
    }

    if (!latestSummary) {
      return { success: false, error: 'No summary found for this file.' }
    }

    // Find the tag by name to get its ID
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('name', tagName.trim().toLowerCase())
      .maybeSingle()

    if (tagError) {
      throw tagError
    }

    if (!tag) {
      return { success: false, error: 'Tag not found.' }
    }

    // Remove the tag link
    const { error: deleteError } = await supabase
      .from('summary_tags')
      .delete()
      .eq('summary_id', latestSummary.id)
      .eq('tag_id', tag.id)

    if (deleteError) {
      throw deleteError
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error removing tag from file:', error)
    return { success: false, error: error.message || 'Failed to remove tag' }
  }
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
    folderId?: string | null
  }
): Promise<{ success: boolean; newDocsExtractedText?: string }> {
  try {
    // Update folder if specified
    if (changes.folderId !== undefined) {
      const { error: folderError } = await supabase
        .from('files')
        .update({ folder_id: changes.folderId })
        .eq('id', fileId)

      if (folderError) throw folderError
    }

    // Update or insert notes
    if (changes.notesHtml || changes.notesText) {
      const { data: existingNotes, error: notesLookupError } = await supabase
        .from('notes')
        .select('id')
        .eq('file_id', fileId)
        .maybeSingle()

      if (notesLookupError) throw notesLookupError

      if (existingNotes?.id) {
        const { error: notesUpdateError } = await supabase
          .from('notes')
          .update({
            content: (changes.notesText || '').trim(),
            html_content: changes.notesHtml || '',
          })
          .eq('id', existingNotes.id)

        if (notesUpdateError) throw notesUpdateError
      } else {
        const { error: notesInsertError } = await supabase
          .from('notes')
          .insert({
            file_id: fileId,
            content: (changes.notesText || '').trim(),
            html_content: changes.notesHtml || '',
            created_at: new Date().toISOString(),
          })

        if (notesInsertError) throw notesInsertError
      }
    }

    // Update or insert transcript
    if (changes.transcriptText && changes.transcriptText.trim()) {
      const { data: existingTranscript, error: transcriptLookupError } = await supabase
        .from('transcripts')
        .select('id')
        .eq('file_id', fileId)
        .maybeSingle()

      if (transcriptLookupError) throw transcriptLookupError

      if (existingTranscript?.id) {
        const { error: transcriptUpdateError } = await supabase
          .from('transcripts')
          .update({
            content: changes.transcriptText,
            duration: changes.recordingDuration || null,
          })
          .eq('id', existingTranscript.id)

        if (transcriptUpdateError) throw transcriptUpdateError
      } else {
        const { error: transcriptInsertError } = await supabase
          .from('transcripts')
          .insert({
            file_id: fileId,
            content: changes.transcriptText,
            duration: changes.recordingDuration || null,
            created_at: new Date().toISOString(),
          })

        if (transcriptInsertError) throw transcriptInsertError
      }
    }

    // Append any newly uploaded files to documents
    const newDocsExtractedText: string[] = []
    let insertedDocs = 0

    if (changes.newFiles && changes.newFiles.length > 0) {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      for (const file of changes.newFiles) {
        try {
          // Extract text best-effort; don't block uploads if extraction fails.
          let extractedText: string | null = null
          try {
            extractedText = await extractTextOnly(file)
          } catch (e) {
            console.warn(
              'Failed to extract text from appended document (continuing without extracted_text):',
              file.name,
              e
            )
          }

          const filePath = getStorageUploadPath(user.user.id, file.name)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          const { error: docInsertError } = await supabase.from('documents').insert({
            file_id: fileId,
            original_filename: file.name,
            file_type: getDocumentsTableFileType(file),
            storage_path: uploadData.path,
            extracted_text: extractedText,
            created_at: new Date().toISOString(),
          })

          if (docInsertError) throw docInsertError

          insertedDocs += 1
          if (extractedText) newDocsExtractedText.push(extractedText)
        } catch (e) {
          console.error('Error appending uploaded file to documents:', file.name, e)
        }
      }

      // If the caller attempted to add documents but none were actually inserted, treat as failure.
      if (insertedDocs === 0) {
        return { success: false }
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
 * Updates the existing summary instead of creating a new one to avoid duplicates.
 * Optionally generates infographics if enabled in config.
 */
import type { SummaryConfig } from '../types/summaryTypes'
import { generateMindMap, generateInfographic } from './infographicService'
import { saveInfographicSpec } from './infographicStorage'

export async function regenerateSummary(fileId: string, configIn?: Partial<SummaryConfig>): Promise<{ success: boolean; summaryId?: string; summary_text?: string; tags?: Tag[]; error?: string }> {
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

// Use provided config or sensible defaults
    const shouldGenerateTags = configIn?.autoTags !== undefined ? configIn.autoTags : true
    const config = { ...configIn, autoTags: shouldGenerateTags }
    const { summary, tags } = await processAudioTranscript(combined, config)
    const MAX_TAGS = 12
    const typedTags: Tag[] = (tags || [])
      .slice(0, MAX_TAGS)
      .map((name: string) => ({ name, type: 'general' as const }))

    // Find existing summary to update instead of creating new one
    const { data: existingSummaries, error: fetchError } = await supabase
      .from('summaries')
      .select('id')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) throw fetchError

    let summaryId: string
    let isNewSummary = false
    let originalSummaryText: string | null = null
    
    if (existingSummaries && existingSummaries.length > 0) {
      // Update existing summary
      summaryId = existingSummaries[0].id
      
      // Get original summary text for potential rollback
      const { data: originalSummary } = await supabase
        .from('summaries')
        .select('summary_text')
        .eq('id', summaryId)
        .single()
      
      originalSummaryText = originalSummary?.summary_text || null
      
      const { error: updateError } = await supabase
        .from('summaries')
        .update({ 
          summary_text: summary,
          created_at: new Date().toISOString() // Update timestamp to reflect regeneration
        })
        .eq('id', summaryId)

      if (updateError) throw updateError

      // Remove existing tags for this summary before adding new ones
      if (shouldGenerateTags) {
        const { error: deleteTagsError } = await supabase
          .from('summary_tags')
          .delete()
          .eq('summary_id', summaryId)

        if (deleteTagsError) {
          // Rollback summary update
          if (originalSummaryText) {
            await supabase
              .from('summaries')
              .update({ summary_text: originalSummaryText })
              .eq('id', summaryId)
          }
          throw deleteTagsError
        }
      }
    } else {
      // No existing summary, create new one
      isNewSummary = true
      const { data: summaryRow, error: summaryInsertError } = await supabase
        .from('summaries')
        .insert({ file_id: fileId, summary_text: summary, created_at: new Date().toISOString() })
        .select('id')
        .single()

      if (summaryInsertError) throw summaryInsertError
      summaryId = summaryRow.id
    }

    // Save new tags (only if tags were generated)
    if (shouldGenerateTags && typedTags.length) {
      try {
        await addTagsToSummary(summaryId, typedTags)
      } catch (tagError) {
        // Rollback on tag creation failure
        if (isNewSummary) {
          // Delete the newly created summary
          await supabase
            .from('summaries')
            .delete()
            .eq('id', summaryId)
        } else if (originalSummaryText) {
          // Restore original summary text
          await supabase
            .from('summaries')
            .update({ summary_text: originalSummaryText })
            .eq('id', summaryId)
        }
        throw tagError
      }
    }

    // Generate infographic if enabled
    if (configIn?.includeInfographics || configIn?.autoGenerateInfographic) {
      try {
        console.log('Generating infographic for summary...', summaryId);
        
        let infographicResult;
        if (configIn?.preferredInfographicType && configIn.preferredInfographicType !== 'auto') {
          // Generate specific type
          infographicResult = await generateInfographic(summary, {
            summaryId,
            preferredType: configIn.preferredInfographicType as any
          });
        } else {
          // Auto-detect best type (mind map is default)
          infographicResult = await generateMindMap(summary, summaryId);
        }
        
        if (infographicResult.success && infographicResult.spec) {
          saveInfographicSpec(infographicResult.spec);
          console.log('Infographic generated:', infographicResult.spec.type, infographicResult.spec.title);
        } else {
          console.warn('Infographic generation failed:', infographicResult.error);
        }
      } catch (infographicError) {
        // Don't fail the entire summary regeneration if infographic fails
        console.error('Error generating infographic (non-fatal):', infographicError);
      }
    }

    return { success: true, summaryId, summary_text: summary, tags: typedTags }
  } catch (error: any) {
    console.error('Error regenerating summary:', error)
    return { success: false, error: error.message || 'Failed to regenerate summary' }
  }
}

/**
 * Clean up orphaned summaries (optional utility function)
 * Removes old summaries for a file, keeping only the most recent one
 */
export async function cleanupOrphanedSummaries(fileId: string): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    // Get all summaries for the file, ordered by creation date (newest first)
    const { data: summaries, error: fetchError } = await supabase
      .from('summaries')
      .select('id, created_at')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError
    
    if (!summaries || summaries.length <= 1) {
      return { success: true, deletedCount: 0 }
    }

    // Keep the first (newest) summary, delete the rest
    const summariesToDelete = summaries.slice(1)
    const idsToDelete = summariesToDelete.map(s => s.id)

    if (idsToDelete.length > 0) {
      // Delete associated tags first
      const { error: deleteTagsError } = await supabase
        .from('summary_tags')
        .delete()
        .in('summary_id', idsToDelete)

      if (deleteTagsError) throw deleteTagsError

      // Delete the orphaned summaries
      const { error: deleteSummariesError } = await supabase
        .from('summaries')
        .delete()
        .in('id', idsToDelete)

      if (deleteSummariesError) throw deleteSummariesError
    }

    return { success: true, deletedCount: idsToDelete.length }
  } catch (error: any) {
    console.error('Error cleaning up orphaned summaries:', error)
    return { success: false, error: error.message || 'Failed to cleanup summaries' }
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

export async function deleteFiles(fileIds: string[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0
  let failed = 0

  try {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return { deleted: 0, failed: 0 }
    }

    // Avoid overly large IN filters (Supabase/Postgres limits can vary)
    const chunkSize = 100
    for (let i = 0; i < fileIds.length; i += chunkSize) {
      const chunk = fileIds.slice(i, i + chunkSize)

      const { data, error } = await supabase
        .from('files')
        .delete()
        .in('id', chunk)
        .select('id')

      if (error) {
        console.error('Error deleting file chunk:', error)
        failed += chunk.length
        continue
      }

      const deletedInChunk = Array.isArray(data) ? data.length : 0
      deleted += deletedInChunk
      failed += Math.max(0, chunk.length - deletedInChunk)
    }

    return { deleted, failed }
  } catch (error: any) {
    console.error('Error deleting files:', error)
    return { deleted, failed: failed + (fileIds.length - deleted - failed) }
  }
}

// =============================================================================
// FOLDER MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Get all folders for the current user
 */
export async function getUserFolders(): Promise<Folder[]> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.user.id)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('Error fetching user folders:', error)
    return []
  }
}

/**
 * Create a new folder
 */
export async function createFolder(name: string): Promise<Folder | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Preserve the user's whitespace as typed, but prevent blank/whitespace-only names.
    if (!name.trim()) {
      throw new Error('Folder name cannot be empty')
    }

    const { data, error } = await supabase
      .from('folders')
      .insert([
        {
          user_id: user.user.id,
          name
        }
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('Error creating folder:', error)
    return null
  }
}

/**
 * Update folder name
 */
export async function updateFolder(folderId: string, name: string): Promise<boolean> {
  try {
    // Preserve the user's whitespace as typed, but prevent blank/whitespace-only names.
    if (!name.trim()) {
      throw new Error('Folder name cannot be empty')
    }

    const { error } = await supabase
      .from('folders')
      .update({ name })
      .eq('id', folderId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('Error updating folder:', error)
    return false
  }
}

/**
 * Delete a folder (only if it's empty)
 *
 * Note: This is a legacy helper used by older UI flows. If you need to delete a folder
 * that contains files, use `getFolderFileCount` + `deleteFolderKeepFiles` / `deleteFolderAndFiles`.
 */
export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if folder has any files
    const { data: filesInFolder, error: filesError } = await supabase
      .from('files')
      .select('id')
      .eq('folder_id', folderId)
      .limit(1)

    if (filesError) throw filesError

    if (filesInFolder && filesInFolder.length > 0) {
      return {
        success: false,
        error: 'Cannot delete folder that contains files. Please move or delete the files first.'
      }
    }

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting folder:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete folder'
    }
  }
}

/**
 * Get a count of files in a folder (RLS-scoped to the current user)
 */
export async function getFolderFileCount(folderId: string): Promise<number> {
  const { count, error } = await supabase
    .from('files')
    .select('id', { count: 'exact', head: true })
    .eq('folder_id', folderId)

  if (error) throw error
  if (typeof count !== 'number') {
    throw new Error('Failed to determine folder file count')
  }
  return count
}

/**
 * Delete a folder and keep the files (they will be moved to "No Folder" via FK ON DELETE SET NULL)
 */
export async function deleteFolderKeepFiles(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting folder (keep files):', error)
    return { success: false, error: error.message || 'Failed to delete folder' }
  }
}

/**
 * Delete a folder and all files in it
 */
export async function deleteFolderAndFiles(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: deleteFilesError } = await supabase
      .from('files')
      .delete()
      .eq('folder_id', folderId)

    if (deleteFilesError) throw deleteFilesError

    const { error: deleteFolderError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (deleteFolderError) throw deleteFolderError

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting folder and files:', error)
    return { success: false, error: error.message || 'Failed to delete folder and files' }
  }
}

/**
 * Move a file to a different folder (or remove from folder if folderId is null)
 */
export async function moveFileToFolder(fileId: string, folderId: string | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('files')
      .update({ folder_id: folderId })
      .eq('id', fileId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('Error moving file to folder:', error)
    return false
  }
}

/**
 * Move many files to a folder (or remove from folder if folderId is null)
 */
export async function moveFilesToFolder(fileIds: string[], folderId: string | null): Promise<boolean> {
  try {
    if (!Array.isArray(fileIds) || fileIds.length === 0) return true

    // Avoid overly large IN filters (Supabase/Postgres limits can vary)
    const chunkSize = 100
    for (let i = 0; i < fileIds.length; i += chunkSize) {
      const chunk = fileIds.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .in('id', chunk)

      if (error) throw error
    }

    return true
  } catch (error: any) {
    console.error('Error moving files to folder:', error)
    return false
  }
}

// =============================================================================
// CHART SPECS PERSISTENCE (SUPABASE)
// =============================================================================

export interface ChartSpecRow {
  id: string
  summary_id: string
  recommended_type: string | null
  chosen_type: string
  spec_json: any
  dataset_json: any | null
  theme: string | null
  created_at: string
  updated_at: string
}

/** Fetch chart spec for a summary (null if none). */
export async function getChartSpecForSummary(summaryId: string) {
  try {
    const { data, error } = await supabase
      .from('chart_specs')
      .select('*')
      .eq('summary_id', summaryId)
      .maybeSingle()

    if (error) throw error
    return data as ChartSpecRow | null
  } catch (e) {
    console.warn('getChartSpecForSummary failed (table may not exist yet):', e)
    return null
  }
}

/** Upsert chart spec for a summary. */
export async function upsertChartSpecForSummary(params: {
  summaryId: string
  recommendedType?: string
  chosenType: string
  spec: any
  dataset?: any
  theme?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      summary_id: params.summaryId,
      recommended_type: params.recommendedType || null,
      chosen_type: params.chosenType,
      spec_json: params.spec,
      dataset_json: params.dataset || null,
      theme: params.theme || null,
      updated_at: new Date().toISOString(),
    }

    // Use upsert on unique(summary_id)
    const { error } = await supabase
      .from('chart_specs')
      .upsert(payload, { onConflict: 'summary_id' })

    if (error) throw error
    return { success: true }
  } catch (e: any) {
    console.warn('upsertChartSpecForSummary failed (table may not exist yet):', e?.message || e)
    return { success: false, error: e?.message || 'Failed to save chart spec' }
  }
}
