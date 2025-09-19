import React, { useState, useEffect, useRef } from 'react'
import { Search, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { TagChip } from './TagChip'
import { TagSuggestions } from './TagSuggestions'
import { getTagSuggestions, searchFilesByTags, type TagSuggestion } from '../../lib/tagSearchService'
import { type FileWithMetadata } from '../../lib/api'
import './TagSearchBar.css'

interface TagSearchBarProps {
  onResultsChange: (results: FileWithMetadata[], resultCount: number) => void
  onSearchStateChange: (isSearching: boolean) => void
}

export const TagSearchBar: React.FC<TagSearchBarProps> = ({ 
  onResultsChange, 
  onSearchStateChange 
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchLogic, setSearchLogic] = useState<'AND' | 'OR'>('AND')
  const [resultCount, setResultCount] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchInput.trim()) {
        setIsLoading(true)
        try {
          const tagSuggestions = await getTagSuggestions(searchInput.trim())
          // Filter out already selected tags
          const filteredSuggestions = tagSuggestions.filter(
            suggestion => !selectedTags.includes(suggestion.name)
          )
          setSuggestions(filteredSuggestions)
          setShowSuggestions(true)
        } catch (error) {
          console.error('Error fetching tag suggestions:', error)
          setSuggestions([])
        } finally {
          setIsLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, selectedTags])

  // Search for files when tags or logic changes
  useEffect(() => {
    const performSearch = async () => {
      if (selectedTags.length === 0) {
        onResultsChange([], 0)
        onSearchStateChange(false)
        setResultCount(0)
        return
      }

      setIsLoading(true)
      onSearchStateChange(true)
      
      try {
        const results = await searchFilesByTags(selectedTags, searchLogic)
        onResultsChange(results, results.length)
        setResultCount(results.length)
      } catch (error) {
        console.error('Error searching files by tags:', error)
        onResultsChange([], 0)
        setResultCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [selectedTags, searchLogic, onResultsChange, onSearchStateChange])

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      e.preventDefault()
      // Add the typed tag if it exists in suggestions
      const exactMatch = suggestions.find(
        suggestion => suggestion.name.toLowerCase() === searchInput.trim().toLowerCase()
      )
      if (exactMatch) {
        handleTagSelect(exactMatch.name)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleTagSelect = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags(prev => [...prev, tagName])
    }
    setSearchInput('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleTagRemove = (tagName: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagName))
  }

  const handleClearAll = () => {
    setSelectedTags([])
    setSearchInput('')
    setShowSuggestions(false)
  }

  const toggleSearchLogic = () => {
    setSearchLogic(prev => prev === 'AND' ? 'OR' : 'AND')
  }

  return (
    <div className="tag-search-bar">
      <div className="search-header">
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder={selectedTags.length > 0 ? "Add another tag..." : "Search by tags..."}
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => searchInput.trim() && setShowSuggestions(true)}
              className="search-input"
            />
            {isLoading && <div className="search-loading-spinner" />}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <TagSuggestions
              ref={suggestionsRef}
              suggestions={suggestions}
              onTagSelect={handleTagSelect}
              searchTerm={searchInput}
            />
          )}
        </div>

        <div className="search-controls">
          {selectedTags.length > 1 && (
            <button
              className="logic-toggle"
              onClick={toggleSearchLogic}
              title={`Switch to ${searchLogic === 'AND' ? 'OR' : 'AND'} logic`}
            >
              {searchLogic === 'AND' ? (
                <ToggleRight className="toggle-icon active" />
              ) : (
                <ToggleLeft className="toggle-icon" />
              )}
              <span className="logic-label">{searchLogic}</span>
            </button>
          )}

          {selectedTags.length > 0 && (
            <button
              className="clear-all-button"
              onClick={handleClearAll}
              title="Clear all tags"
            >
              <X className="clear-icon" />
              Clear
            </button>
          )}
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="selected-tags">
          {selectedTags.map((tag, index) => (
            <TagChip
              key={`${tag}-${index}`}
              tag={tag}
              onRemove={handleTagRemove}
            />
          ))}
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="search-results-info">
          <span className="results-count">
            Found {resultCount} {resultCount === 1 ? 'summary' : 'summaries'}
            {selectedTags.length > 1 && (
              <span className="logic-info">
                {searchLogic === 'AND' ? ' with all tags' : ' with any tag'}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}