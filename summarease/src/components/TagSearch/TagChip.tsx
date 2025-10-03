import React from 'react'
import { X, Tag, File } from 'lucide-react'
import './TagChip.css'

interface TagChipProps {
  name: string
  type: 'tag' | 'filename'
  onRemove: (name: string, type: 'tag' | 'filename') => void
}

export const TagChip: React.FC<TagChipProps> = ({ name, type, onRemove }) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(name, type)
  }

  const getIcon = () => {
    return type === 'tag' ? <Tag className="chip-icon" /> : <File className="chip-icon filename-chip-icon" />
  }

  const getTypeLabel = () => {
    return type === 'tag' ? 'tag' : 'filename'
  }

  return (
    <div className={`tag-chip ${type === 'filename' ? 'filename-chip' : 'tag-chip-type'}`}>
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
