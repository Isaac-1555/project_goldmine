import React, { useState, useEffect } from 'react'
import { File, Folder, Search, Plus, MoreVertical } from 'lucide-react'
import { StatusIndicator } from '../FileStatus/StatusIndicator'
import { getUserFiles, type FileWithMetadata } from '../../lib/api'
import './FileList.css'

interface FileListProps {
  onFileSelect?: (file: FileWithMetadata) => void
  selectedFileId?: string
}

export const FileList: React.FC<FileListProps> = ({ onFileSelect, selectedFileId }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const userFiles = await getUserFiles()
      setFiles(userFiles)
    } catch (err: any) {
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const filteredFiles = files.filter(file =>
    file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'audio':
        return '🎵'
      case 'pdf':
        return '📄'
      case 'docx':
        return '📝'
      default:
        return '📄'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="file-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading files...</p>
      </div>
    )
  }

  return (
    <div className="file-list">
      <div className="file-list-header">
        <div className="header-title">
          <Folder className="header-icon" />
          <span>Your Files</span>
        </div>
        <button className="add-folder-button" title="Create folder">
          <Plus className="icon" />
        </button>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search files and tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="files-container">
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={loadFiles} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {filteredFiles.length === 0 && !error ? (
          <div className="empty-state">
            <File className="empty-icon" />
            <p>No files found</p>
            <span>
              {searchTerm ? 'Try a different search term' : 'Upload or record content to get started'}
            </span>
          </div>
        ) : (
          <div className="files-list">
            {filteredFiles.map((file, fileIndex) => (
              <div
                key={file.id || `file-${fileIndex}`}
                className={`file-item ${selectedFileId === file.id ? 'selected' : ''}`}
                onClick={() => onFileSelect?.(file)}
              >
                <div className="file-main">
                  <div className="file-icon">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="file-details">
                    <h4 className="file-title">{file.title}</h4>
                    <div className="file-meta">
                      <span className="file-date">{formatDate(file.created_at)}</span>
                      <StatusIndicator status={file.status} size="small" showText={false} />
                    </div>
                  </div>
                  <button className="file-menu-button">
                    <MoreVertical className="icon" />
                  </button>
                </div>

                {file.tags && file.tags.length > 0 && (
                  <div className="file-tags">
                    {file.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span key={`file-${fileIndex}-tag-${tagIndex}-${tag}`} className="tag">
                        {tag}
                      </span>
                    ))}
                    {file.tags.length > 3 && (
                      <span key={`file-${fileIndex}-more-tags`} className="tag-more">
                        +{file.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {file.summary_text && (
                  <div className="file-preview">
                    {file.summary_text.substring(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}