import React, { useState } from 'react'
import { Plus, AlertCircle, CheckCircle, X } from 'lucide-react'
import { addCustomTagsToFile } from '../../lib/api'
import './TagEditor.css'

interface TagEditorProps {
  fileId: string
  existingTags: { id: string; name: string }[]
  onTagsAdded: (newTags: { id: string; name: string }[]) => void
  disabled?: boolean
}

export const TagEditor: React.FC<TagEditorProps> = ({
  fileId,
  existingTags,
  onTagsAdded,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const validateTagName = (name: string): string | null => {
    const trimmed = name.trim()
    
    if (!trimmed) {
      return 'Tag name cannot be empty'
    }
    
    if (trimmed.length < 2) {
      return 'Tag name must be at least 2 characters long'
    }
    
    if (trimmed.length > 50) {
      return 'Tag name must be less than 50 characters'
    }
    
    // Check for invalid characters - only allow alphanumeric, spaces, hyphens, underscores
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
    
    // Check if tag already exists (case insensitive)
    if (existingTags.some(tag => tag.name.toLowerCase() === trimmed.toLowerCase())) {
      return 'This tag already exists'
    }
    
    return null
  }

  const clearFeedback = () => {
    if (feedback.type) {
      setTimeout(() => {
        setFeedback({ type: null, message: '' })
      }, 3000)
    }
  }

  const handleAddTag = async () => {
    const tagName = inputValue.trim()
    
    const validationError = validateTagName(tagName)
    if (validationError) {
      setFeedback({ type: 'error', message: validationError })
      clearFeedback()
      return
    }

    setIsLoading(true)
    setFeedback({ type: null, message: '' })

    try {
      const result = await addCustomTagsToFile(fileId, [tagName])
      
      if (result.success && result.addedTags) {
        setInputValue('')
        setFeedback({ 
          type: 'success', 
          message: `Added tag "${tagName}" successfully!` 
        })
        onTagsAdded(result.addedTags)
        clearFeedback()
      } else {
        setFeedback({ 
          type: 'error', 
          message: result.error || 'Failed to add tag' 
        })
        clearFeedback()
      }
    } catch (error) {
      console.error('Error adding tag:', error)
      setFeedback({ 
        type: 'error', 
        message: 'Failed to add tag. Please try again.' 
      })
      clearFeedback()
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    // Clear feedback when user starts typing
    if (feedback.type) {
      setFeedback({ type: null, message: '' })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && !disabled) {
      e.preventDefault()
      handleAddTag()
    }
  }

  const dismissFeedback = () => {
    setFeedback({ type: null, message: '' })
  }

  return (
    <div className="tag-editor">
      <div className="tag-editor-header">
        <h4 className="tag-editor-title">Add New Tags</h4>
        <p className="tag-editor-description">
          Create custom tags to organize and categorize this content.
        </p>
      </div>

      <div className="tag-editor-input-section">
        <div className="tag-editor-input-wrapper">
          <input
            type="text"
            className="tag-editor-input"
            placeholder="Enter a tag name..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading || disabled}
            maxLength={50}
          />
          <button
            className="tag-editor-add-button"
            onClick={handleAddTag}
            disabled={isLoading || disabled || !inputValue.trim()}
            title="Add tag"
          >
            {isLoading ? (
              <div className="tag-editor-spinner" />
            ) : (
              <Plus className="tag-editor-add-icon" />
            )}
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>

        {feedback.type && (
          <div className={`tag-editor-feedback ${feedback.type}`}>
            <div className="feedback-content">
              {feedback.type === 'success' ? (
                <CheckCircle className="feedback-icon" />
              ) : (
                <AlertCircle className="feedback-icon" />
              )}
              <span className="feedback-message">{feedback.message}</span>
            </div>
            <button
              className="feedback-dismiss"
              onClick={dismissFeedback}
              aria-label="Dismiss feedback"
            >
              <X className="dismiss-icon" />
            </button>
          </div>
        )}
      </div>

      <div className="tag-editor-tips">
        <p className="tip-text">
          <strong>Tips:</strong> Use descriptive tags like "meeting notes", "project ideas", or "research". 
          Tags help you find content faster using the search feature.
        </p>
      </div>
    </div>
  )
}