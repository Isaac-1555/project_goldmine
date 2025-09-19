import React from 'react'
import { X } from 'lucide-react'
import './TagChip.css'

interface TagChipProps {
  tag: string
  onRemove: (tag: string) => void
}

export const TagChip: React.FC<TagChipProps> = ({ tag, onRemove }) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove(tag)
  }

  return (
    <div className="tag-chip">
      <span className="tag-text">{tag}</span>
      <button
        className="tag-remove-button"
        onClick={handleRemove}
        title={`Remove ${tag} tag`}
        aria-label={`Remove ${tag} tag`}
      >
        <X className="remove-icon" />
      </button>
    </div>
  )
}