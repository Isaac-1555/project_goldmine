import React, { useState, useEffect, useRef } from 'react'
import { Search, X, ToggleLeft, ToggleRight } from 'lucide-react'
import { TagChip } from './TagChip'
import { TagSuggestions } from './TagSuggestions'
import { getCombinedSuggestions, searchFilesByMixedCriteria, type SearchSuggestion, type SearchCriteria } from '../../lib/tagSearchService'
import { type FileWithMetadata } from '../../lib/api'
import './TagSearchBar.css'

interface TagSearchBarProps {
  onResultsChange: (results: FileWithMetadata[], resultCount: number) => void
  onSearchStateChange: (isSearching: boolean) => void
  onSearchTagsChange?: (tags: string[]) => void
}

interface SelectedItem {
  name: string
  type: 'tag' | 'filename'
}

export const TagSearchBar: React.FC<TagSearchBarProps> = ({ 
  onResultsChange, 
  onSearchStateChange,
  onSearchTagsChange
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedFilenames, setSelectedFilenames] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchLogic, setSearchLogic] = useState<'AND' | 'OR'>('AND')
  const [resultCount, setResultCount] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      const term = searchInput.trim()
      if (term.length >= 1) {
        setIsLoading(true)
        try {
          const combinedSuggestions = await getCombinedSuggestions(term)
          // Filter out already selected tags and filenames
          const filteredSuggestions = combinedSuggestions.filter(
            suggestion => {
              if (suggestion.type === 'tag') {
                return !selectedTags.includes(suggestion.name)
              } else {
                return !selectedFilenames.includes(suggestion.name)
              }
            }
          )
          setSuggestions(filteredSuggestions)
          setShowSuggestions(true)
          setActiveIndex(filteredSuggestions.length > 0 ? 0 : -1)
        } catch (error) {
          console.error('Error fetching suggestions:', error)
          setSuggestions([])
          setActiveIndex(-1)
        } finally {
          setIsLoading(false)
        }
      } else {
        setSuggestions([])
        setShowSuggestions(false)
        setActiveIndex(-1)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchInput, selectedTags, selectedFilenames])

  // Search for files when tags, filenames, or logic changes
  useEffect(() => {
    const performSearch = async () => {
      if (selectedTags.length === 0 && selectedFilenames.length === 0) {
        onResultsChange([], 0)
        onSearchStateChange(false)
        setResultCount(0)
        return
      }

      setIsLoading(true)
      onSearchStateChange(true)
      
      try {
        const searchCriteria: SearchCriteria = {
          tags: selectedTags,
          filenames: selectedFilenames,
          tagLogic: searchLogic
        }
        const results = await searchFilesByMixedCriteria(searchCriteria)
        onResultsChange(results, results.length)
        setResultCount(results.length)
      } catch (error) {
        console.error('Error searching files:', error)
        onResultsChange([], 0)
        setResultCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [selectedTags, selectedFilenames, searchLogic])

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
    if (!showSuggestions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => {
        const next = prev + 1
        return next >= suggestions.length ? 0 : next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => {
        const next = prev - 1
        return next < 0 ? Math.max(0, suggestions.length - 1) : next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = suggestions[activeIndex] || suggestions[0]
      if (chosen) handleSuggestionSelect(chosen)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tag') {
      // Ensure tag is lowercase for consistency
      const tagName = suggestion.name.toLowerCase()
      if (!selectedTags.includes(tagName)) {
        const newTags = [...selectedTags, tagName]
        setSelectedTags(newTags)
        onSearchTagsChange?.(newTags)
      }
    } else {
      if (!selectedFilenames.includes(suggestion.name)) {
        setSelectedFilenames(prev => [...prev, suggestion.name])
      }
    }
    setSearchInput('')
    setShowSuggestions(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const handleItemRemove = (name: string, type: 'tag' | 'filename') => {
    if (type === 'tag') {
      const newTags = selectedTags.filter(tag => tag !== name)
      setSelectedTags(newTags)
      onSearchTagsChange?.(newTags)
    } else {
      setSelectedFilenames(prev => prev.filter(filename => filename !== name))
    }
  }

  const handleClearAll = () => {
    setSelectedTags([])
    setSelectedFilenames([])
    setSearchInput('')
    setShowSuggestions(false)
    setActiveIndex(-1)
    onSearchTagsChange?.([])
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
              placeholder={(selectedTags.length > 0 || selectedFilenames.length > 0) ? "Add another search term..." : "Search by tags or filenames..."}
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => searchInput.trim() && setShowSuggestions(true)}
              className="search-input"
              aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
              aria-expanded={showSuggestions}
              aria-controls="suggestion-list"
              role="combobox"
            />
            {isLoading && <div className="search-loading-spinner" />}
          </div>

          {showSuggestions && (
            <TagSuggestions
              ref={suggestionsRef}
              suggestions={suggestions}
              onSuggestionSelect={handleSuggestionSelect}
              searchTerm={searchInput}
              isLoading={isLoading}
              activeIndex={activeIndex}
              onHoverItem={setActiveIndex}
            />
          )}
        </div>

        <div className="search-controls">
          {selectedTags.length > 1 && (
            <button
              className="logic-toggle"
              onClick={toggleSearchLogic}
              title={`Switch to ${searchLogic === 'AND' ? 'OR' : 'AND'} logic for tags`}
            >
              {searchLogic === 'AND' ? (
                <ToggleRight className="toggle-icon active" />
              ) : (
                <ToggleLeft className="toggle-icon" />
              )}
              <span className="logic-label">{searchLogic}</span>
            </button>
          )}

          {(selectedTags.length > 0 || selectedFilenames.length > 0) && (
            <button
              className="clear-all-button"
              onClick={handleClearAll}
              title="Clear all search criteria"
            >
              <X className="clear-icon" />
              Clear
            </button>
          )}
        </div>
      </div>

      {(selectedTags.length > 0 || selectedFilenames.length > 0) && (
        <div className="selected-tags">
          {selectedTags.map((tag, index) => (
            <TagChip
              key={`tag-${tag}-${index}`}
              name={tag}
              type="tag"
              onRemove={handleItemRemove}
            />
          ))}
          {selectedFilenames.map((filename, index) => (
            <TagChip
              key={`filename-${filename}-${index}`}
              name={filename}
              type="filename"
              onRemove={handleItemRemove}
            />
          ))}
        </div>
      )}

      {(selectedTags.length > 0 || selectedFilenames.length > 0) && (
        <div className="search-results-info">
          <span className="results-count">
            Found {resultCount} {resultCount === 1 ? 'summary' : 'summaries'}
            {selectedTags.length > 1 && (
              <span className="logic-info">
                {searchLogic === 'AND' ? ' with all tags' : ' with any tag'}
              </span>
            )}
            {selectedFilenames.length > 0 && (
              <span className="logic-info">
                {selectedTags.length > 0 ? ' or ' : ''}matching filename{selectedFilenames.length > 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
