import React, { useState, useEffect } from 'react'
import { FileText, Tag, Calendar } from 'lucide-react'
import { getUserFiles, type FileWithMetadata } from '../../../../lib/api'
import './ListView.css'

interface ListViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
}

export const ListView: React.FC<ListViewProps> = ({ onFileSelect, selectedFileId }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const filesData = await getUserFiles()
      setFiles(filesData)
    } catch (err) {
      setError('Failed to load files')
      console.error('Error loading files:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="list-view-loading">
        <div className="loading-spinner"></div>
        <p>Loading your content...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="list-view-error">
        <p>{error}</p>
        <button onClick={loadFiles} className="retry-button">
          Try Again
        </button>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="list-view-empty">
        <FileText className="empty-icon" />
        <h3>No content yet</h3>
        <p>Start by recording audio or uploading documents to see them here.</p>
      </div>
    )
  }

  return (
    <div className="list-view">
      <div className="file-list">
        {files.map((file, index) => (
          <div
            key={file.id || `file-${index}`}
            className={`file-card ${selectedFileId === file.id ? 'selected' : ''}`}
            onClick={() => onFileSelect(file)}
          >
            <div className="file-header">
              <div className="file-icon">
                <FileText />
              </div>
              <div className="file-info">
                <h3 className="file-title">{file.title || file.filename}</h3>
                <div className="file-meta">
                  <span className="file-date">
                    <Calendar className="meta-icon" />
                    {formatDate(file.created_at)}
                  </span>
                  <span className="file-status">
                    {file.status === 'completed' ? 'Processed' : 'Processing...'}
                  </span>
                </div>
              </div>
            </div>
            
            {file.tags && file.tags.length > 0 && (
              <div className="file-tags">
                <Tag className="tags-icon" />
                <div className="tags-list">
                  {file.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {file.summary && (
              <div className="file-summary">
                <p>{file.summary.substring(0, 150)}...</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}