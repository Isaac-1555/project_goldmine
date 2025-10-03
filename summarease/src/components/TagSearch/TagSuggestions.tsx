import React, { forwardRef } from 'react'
import { Tag, File } from 'lucide-react'
import { type SearchSuggestion } from '../../lib/tagSearchService'
import './TagSuggestions.css'

interface TagSuggestionsProps {
  suggestions: SearchSuggestion[]
  onSuggestionSelect: (suggestion: SearchSuggestion) => void
  searchTerm: string
  isLoading?: boolean
  activeIndex?: number
  onHoverItem?: (index: number) => void
}

export const TagSuggestions = forwardRef<HTMLDivElement, TagSuggestionsProps>(
  ({ suggestions, onSuggestionSelect, searchTerm, isLoading = false, activeIndex = -1, onHoverItem }, ref) => {
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

    const getSuggestionIcon = (type: 'tag' | 'filename') => {
      return type === 'tag' ? <Tag className="suggestion-icon" /> : <File className="suggestion-icon filename-icon" />
    }

    const getSuggestionTypeLabel = (type: 'tag' | 'filename') => {
      return type === 'tag' ? 'Tag' : 'File'
    }

    return (
      <div ref={ref} className="tag-suggestions" role="listbox" aria-label="Search suggestions">
        {isLoading ? (
          <div className="suggestions-loading" role="status">Loading...</div>
        ) : suggestions.length === 0 ? (
          <div className="suggestions-empty">No matching results</div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.name}-${index}`}
                id={`suggestion-${index}`}
                className={`suggestion-item ${suggestion.type === 'filename' ? 'filename-suggestion' : 'tag-suggestion'} ${activeIndex === index ? 'active' : ''}`}
                onMouseEnter={() => onHoverItem?.(index)}
                onClick={() => onSuggestionSelect(suggestion)}
                role="option"
                aria-selected={activeIndex === index}
                title={`${getSuggestionTypeLabel(suggestion.type)}: ${suggestion.name}`}
              >
                {getSuggestionIcon(suggestion.type)}
                <span className="suggestion-name">
                  {highlightMatch(suggestion.name, searchTerm)}
                </span>
                <span className="suggestion-meta">
                  <span className="suggestion-count">
                    {suggestion.usageCount}
                  </span>
                  <span className="suggestion-type-badge">
                    {suggestion.type === 'tag' ? 'Tag' : 'File'}
                  </span>
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
