import React, { forwardRef } from 'react'
import { Tag } from 'lucide-react'
import { type TagSuggestion } from '../../lib/tagSearchService'
import './TagSuggestions.css'

interface TagSuggestionsProps {
  suggestions: TagSuggestion[]
  onTagSelect: (tagName: string) => void
  searchTerm: string
  isLoading?: boolean
  activeIndex?: number
  onHoverItem?: (index: number) => void
}

export const TagSuggestions = forwardRef<HTMLDivElement, TagSuggestionsProps>(
  ({ suggestions, onTagSelect, searchTerm, isLoading = false, activeIndex = -1, onHoverItem }, ref) => {
    const highlightMatch = (text: string, searchTerm: string) => {
      if (!searchTerm) return text
      
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const parts = text.split(regex)
      
      return parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="highlight">{part}</mark>
        ) : (
          part
        )
      )
    }

    return (
      <div ref={ref} className="tag-suggestions" role="listbox" aria-label="Tag suggestions">
        {isLoading ? (
          <div className="suggestions-loading" role="status">Loading...</div>
        ) : suggestions.length === 0 ? (
          <div className="suggestions-empty">No matching tags</div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.name}-${index}`}
                id={`tag-suggestion-${index}`}
                className={`suggestion-item ${activeIndex === index ? 'active' : ''}`}
                onMouseEnter={() => onHoverItem?.(index)}
                onClick={() => onTagSelect(suggestion.name)}
                role="option"
                aria-selected={activeIndex === index}
              >
                <Tag className="suggestion-icon" />
                <span className="suggestion-name">
                  {highlightMatch(suggestion.name, searchTerm)}
                </span>
                <span className="suggestion-count">
                  {suggestion.usageCount}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

TagSuggestions.displayName = 'TagSuggestions'
