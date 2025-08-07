import { supabase } from './supabase'

export interface FileWithMetadata {
  id: string
  title: string
  file_type: 'audio' | 'pdf' | 'docx'
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  folder_name?: string
  summary_text?: string
  tags?: string[]
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

    return data || []
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

    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('file_id', fileId)
      .single()

    // Get summary with tags
    const { data: summary, error: summaryError } = await supabase
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
      .single()

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