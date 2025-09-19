import { supabase } from './supabase'
import { type FileWithMetadata } from './api'

export interface TagSuggestion {
  name: string
  usageCount: number
}

/**
 * Get tag suggestions based on search term
 */
export async function getTagSuggestions(searchTerm: string): Promise<TagSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_tag_suggestions', {
        search_term: searchTerm.toLowerCase()
      })

    if (error) {
      console.error('Error fetching tag suggestions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getTagSuggestions:', error)
    return []
  }
}

/**
 * Search files by selected tags with AND/OR logic
 */
export async function searchFilesByTags(
  tags: string[], 
  logic: 'AND' | 'OR' = 'AND'
): Promise<FileWithMetadata[]> {
  try {
    if (tags.length === 0) {
      return []
    }

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .rpc('search_files_by_tags', {
        user_uuid: user.user.id,
        tag_names: tags,
        search_logic: logic.toLowerCase()
      })

    if (error) {
      console.error('Error searching files by tags:', error)
      return []
    }

    // Map the RPC results to our FileWithMetadata interface
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
  } catch (error) {
    console.error('Error in searchFilesByTags:', error)
    return []
  }
}