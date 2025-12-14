import React from 'react'
import { FileText, AudioWaveform, X, Eye } from 'lucide-react'
import { AppTooltip } from '../ui/AppTooltip'
import './DocumentList.css'

export interface DocumentItem {
  id: string
  name: string
  type: 'file' | 'transcript'
  size?: number
  content?: string // For transcripts
  file?: File // For uploaded files
  timestamp: Date
}

interface DocumentListProps {
  documents: DocumentItem[]
  onRemoveDocument: (id: string) => void
  onViewDocument?: (document: DocumentItem) => void
  className?: string
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onRemoveDocument,
  onViewDocument,
  className = ''
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDocumentIcon = (document: DocumentItem) => {
    if (document.type === 'transcript') {
      return <AudioWaveform className="document-icon transcript-icon" />
    }
    return <FileText className="document-icon file-icon" />
  }

  const getDocumentSize = (document: DocumentItem): string => {
    if (document.type === 'transcript' && document.content) {
      return `${document.content.length} chars`
    }
    if (document.file) {
      return formatFileSize(document.file.size)
    }
    if (document.size) {
      return formatFileSize(document.size)
    }
    return ''
  }

  if (documents.length === 0) {
    return (
      <div className={`document-list empty ${className}`}>
        <div className="empty-state">
          <FileText className="empty-icon" />
          <p>No documents added yet</p>
          <small>Upload files or record audio to add documents</small>
        </div>
      </div>
    )
  }

  return (
    <div className={`document-list ${className}`}>
      <div className="document-list-header">
        <h3>Documents ({documents.length})</h3>
      </div>
      
      <div className="document-items">
        {documents.map((document) => (
          <div key={document.id} className="document-item">
            <div className="document-info">
              {getDocumentIcon(document)}
              <div className="document-details">
                <div className="document-name" title={document.name}>
                  {document.name}
                </div>
                <div className="document-meta">
                  <span className="document-size">{getDocumentSize(document)}</span>
                  <span className="document-time">{formatTimestamp(document.timestamp)}</span>
                  {document.type === 'transcript' && (
                    <span className="document-type">Transcript</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="document-actions">
              {onViewDocument && (
                <AppTooltip content="View document">
                  <button
                    type="button"
                    className="btn btn-soft-primary btn-sm"
                    onClick={() => onViewDocument(document)}
                  >
                    <Eye size={16} />
                  </button>
                </AppTooltip>
              )}
              <AppTooltip content="Remove document">
                <button
                  type="button"
                  className="btn btn-soft-danger btn-sm"
                  onClick={() => onRemoveDocument(document.id)}
                >
                  <X size={16} />
                </button>
              </AppTooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
