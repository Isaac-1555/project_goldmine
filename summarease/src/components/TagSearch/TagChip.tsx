import React from 'react'
import { X, File, Hash, Zap, User } from 'lucide-react'
import './TagChip.css'

export type TagType = 'general' | 'specific' | 'user_added'
export type ChipType = 'tag' | 'filename'

interface TagChipProps {
  name: string
  type: ChipType
  tagType?: TagType // For tags, specifies if it's general, specific, or user_added
  onRemove: (name: string, type: ChipType) => void
}

export const TagChip: React.FC<TagChipProps> = ({ name, type, tagType, onRemove }) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(name, type)
  }

  const getIcon = () => {
    if (type === 'filename') {
      return <File className="chip-icon filename-chip-icon" />
    }
    
    // For tags, use different icons based on tag type
    switch (tagType) {
      case 'specific':
        return <Zap className="chip-icon" />
      case 'user_added':
        return <User className="chip-icon" />
      case 'general':
      default:
        return <Hash className="chip-icon" />
    }
  }

  const getTypeLabel = () => {
    if (type === 'filename') return 'filename'
    return `${tagType || 'general'} tag`
  }
  
  const getClassName = () => {
    if (type === 'filename') {
      return 'tag-chip filename-chip'
    }
    
    // For tags, use different classes based on tag type
    switch (tagType) {
      case 'specific':
        return 'tag-chip specific-tag-chip'
      case 'user_added':
        return 'tag-chip user-added-tag-chip'
      case 'general':
      default:
        return 'tag-chip general-tag-chip'
    }
  }

  return (
    <div className={getClassName()}>
      {getIcon()}
      <span className="tag-text">{name}</span>
      <button
        className="tag-remove-button"
        onClick={handleRemove}
        title={`Remove ${name} ${getTypeLabel()}`}
        aria-label={`Remove ${name} ${getTypeLabel()}`}
      >
        <X className="remove-icon" />
      </button>
    </div>
  )
}
