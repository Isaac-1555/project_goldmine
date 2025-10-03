import { supabase } from './supabase'
import { type FileWithMetadata, getUserFiles } from './api'

export interface TagSuggestion {
  name: string
  usageCount: number
  type: 'tag'
}

export interface FileSuggestion {
  name: string
  usageCount: number
  type: 'filename'
}

export type SearchSuggestion = TagSuggestion | FileSuggestion

export interface SearchCriteria {
  tags: string[]
  filenames: string[]
  tagLogic: 'AND' | 'OR'
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

    return (data || []).map((item: any) => ({
      name: item.name,
      usageCount: item.usage_count,
      type: 'tag' as const
    }))
  } catch (error) {
    console.error('Error in getTagSuggestions:', error)
    return []
  }
}

/**
 * Get filename suggestions based on search term
 */
export async function getFileSuggestions(searchTerm: string): Promise<FileSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_filename_suggestions', {
        search_term: searchTerm.toLowerCase()
      })

    if (error) {
      console.error('Error fetching filename suggestions:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      name: item.name,
      usageCount: item.usage_count,
      type: 'filename' as const
    }))
  } catch (error) {
    console.error('Error in getFileSuggestions:', error)
    return []
  }
}

/**
 * Get combined suggestions (tags and filenames) based on search term
 */
export async function getCombinedSuggestions(searchTerm: string): Promise<SearchSuggestion[]> {
  try {
    const [tagSuggestions, fileSuggestions] = await Promise.all([
      getTagSuggestions(searchTerm),
      getFileSuggestions(searchTerm)
    ])

    // Combine and sort by usage count, with tags prioritized over filenames when counts are equal
    const combined = [...tagSuggestions, ...fileSuggestions]
    return combined.sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount
      }
      // If usage counts are equal, prioritize tags
      if (a.type !== b.type) {
        return a.type === 'tag' ? -1 : 1
      }
      // If same type and usage count, sort alphabetically
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('Error in getCombinedSuggestions:', error)
    return []
  }
}

/**
 * Helper: client-side filtering using file metadata (fallback when RPC yields no results)
 */
async function clientFilterFilesByTags(tags: string[], logic: 'AND' | 'OR'): Promise<FileWithMetadata[]> {
  if (tags.length === 0) return []
  const lcTags = tags.map(t => t.toLowerCase())
  const files = await getUserFiles()
  return files.filter(f => {
    const fileTags = (f.tags || []).map(t => (t || '').toLowerCase())
    if (logic === 'AND') {
      return lcTags.every(t => fileTags.includes(t))
    }
    return lcTags.some(t => fileTags.includes(t))
  })
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

    // Ensure tags are lowercase for consistent searching
    const lowerCaseTags = tags.map(tag => tag.toLowerCase())

    const { data, error } = await supabase
      .rpc('search_files_by_tags', {
        user_uuid: user.user.id,
        tag_names: lowerCaseTags,
        search_logic: logic.toLowerCase()
      })

    if (error) {
      console.error('Error searching files by tags:', error)
      // Fallback to client-side filtering
      return clientFilterFilesByTags(tags, logic)
    }

    const mapped = (data || []).map((file: any) => ({
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

    // If RPC unexpectedly returns no rows, fall back to client-side filtering
    if (mapped.length === 0) {
      return clientFilterFilesByTags(tags, logic)
    }

    return mapped
  } catch (error) {
    console.error('Error in searchFilesByTags:', error)
    return []
  }
}

/**
 * Search files by mixed criteria (tags and/or filenames)
 */
export async function searchFilesByMixedCriteria(
  searchCriteria: SearchCriteria
): Promise<FileWithMetadata[]> {
  try {
    const { tags, filenames, tagLogic } = searchCriteria
    
    if (tags.length === 0 && filenames.length === 0) {
      return []
    }

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Ensure tags are lowercase for consistent searching
    const lowerCaseTags = tags.map(tag => tag.toLowerCase())
    
    const { data, error } = await supabase
      .rpc('search_files_by_mixed_criteria', {
        user_uuid: user.user.id,
        tag_names: lowerCaseTags.length > 0 ? lowerCaseTags : [],
        filename_terms: filenames.length > 0 ? filenames : [],
        tag_search_logic: tagLogic.toLowerCase()
      })

    if (error) {
      console.error('Error searching files by mixed criteria:', error)
      // If only tags are provided, fall back client-side; otherwise return empty for now
      if (lowerCaseTags.length > 0 && filenames.length === 0) {
        return clientFilterFilesByTags(lowerCaseTags, tagLogic)
      }
      return []
    }

    const mapped = (data || []).map((file: any) => ({
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

    // If RPC returns no rows but we do have tags (and no filename terms), use client-side filtering
    if (mapped.length === 0 && lowerCaseTags.length > 0 && filenames.length === 0) {
      return clientFilterFilesByTags(lowerCaseTags, tagLogic)
    }

    return mapped
  } catch (error) {
    console.error('Error in searchFilesByMixedCriteria:', error)
    return []
  }
}
