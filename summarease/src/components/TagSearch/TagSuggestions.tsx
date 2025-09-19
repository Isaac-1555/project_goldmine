import React, { forwardRef } from 'react'
import { Tag } from 'lucide-react'
import { type TagSuggestion } from '../../lib/tagSearchService'
import './TagSuggestions.css'

interface TagSuggestionsProps {
  suggestions: TagSuggestion[]
  onTagSelect: (tagName: string) => void
  searchTerm: string
}

export const TagSuggestions = forwardRef<HTMLDivElement, TagSuggestionsProps>(
  ({ suggestions, onTagSelect, searchTerm }, ref) => {
    const highlightMatch = (text: string, searchTerm: string) => {
      if (!searchTerm) return text
      
      const regex = new RegExp(`(${searchTerm})`, 'gi')
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
      <div ref={ref} className="tag-suggestions">
        <div className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.name}-${index}`}
              className="suggestion-item"
              onClick={() => onTagSelect(suggestion.name)}
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
      </div>
    )
  }
)

TagSuggestions.displayName = 'TagSuggestions'