import React, { useState, useEffect } from 'react'
import { FileText, Tag, Calendar, Edit3, Trash2 } from 'lucide-react'
import { getUserFiles, deleteFile, type FileWithMetadata } from '../../../../lib/api'
import './ListView.css'

interface ListViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  onEditFile?: (fileId: string) => void
  onEditLocalNotebook?: (localNotebook: any) => void
}

export const ListView: React.FC<ListViewProps> = ({ onFileSelect, selectedFileId, onEditFile, onEditLocalNotebook }) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [localNotebooks, setLocalNotebooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<{ id: string; title: string; isLocal?: boolean } | null>(null)

  useEffect(() => {
    loadFiles()
    loadLocalNotebooks()
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

  const loadLocalNotebooks = () => {
    try {
      const localData = JSON.parse(localStorage.getItem('summarease-local-notebooks') || '[]')
      // Show only the latest local notebook
      const latestNotebook = localData.length > 0 
        ? [localData.sort((a: any, b: any) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime())[0]]
        : []
      setLocalNotebooks(latestNotebook)
    } catch (error) {
      console.error('Error loading local notebooks:', error)
    }
  }

  const handleLocalNotebookSelect = (localNotebook: any) => {
    // Convert local notebook to FileWithMetadata format with all content
    const mockFile: FileWithMetadata = {
      id: localNotebook.id,
      title: localNotebook.title,
      file_type: 'notebook',
      status: 'completed',
      created_at: localNotebook.lastSaved,
      summary: 'Local notebook (not uploaded)',
      tags: [],
      // Add local notebook content
      localNotebookData: {
        notes: localNotebook.notes,
        audioTranscript: localNotebook.audioTranscript,
        uploadedFiles: localNotebook.uploadedFiles,
        recordingTime: localNotebook.recordingTime
      }
    }
    onFileSelect(mockFile)
  }

  const handleConfirmDelete = async (fileId: string, isLocal: boolean = false) => {
    try {
      setDeletingId(fileId)
      if (isLocal) {
        // Delete from localStorage
        const existingLocal = JSON.parse(localStorage.getItem('summarease-local-notebooks') || '[]')
        const filtered = existingLocal.filter((item: any) => item.id !== fileId)
        localStorage.setItem('summarease-local-notebooks', JSON.stringify(filtered))
        loadLocalNotebooks()
      } else {
        const ok = await deleteFile(fileId)
        if (ok) {
          await loadFiles()
        }
      }
    } finally {
      setDeletingId(null)
      setShowConfirm(null)
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

  if (files.length === 0 && localNotebooks.length === 0) {
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
      {localNotebooks.length > 0 && (
        <div className="local-notebooks-section">
          <h3 className="section-title">Latest Local Notebook</h3>
          <div className="file-list">
            {localNotebooks.map((notebook, index) => (
              <div
                key={notebook.id}
                className={`file-card local-notebook ${selectedFileId === notebook.id ? 'selected' : ''}`}
                onClick={(e) => {
                  // Avoid card click when clicking actions
                  const target = e.target as HTMLElement
                  if (target.closest('.file-actions')) return
                  handleLocalNotebookSelect(notebook)
                }}
              >
                <div className="file-header">
                  <div className="file-icon">
                    <FileText />
                  </div>
                  <div className="file-info">
                    <h3 className="file-title">{notebook.title}</h3>
                    <div className="file-meta">
                      <span className="file-date">
                        <Calendar className="meta-icon" />
                        {formatDate(notebook.lastSaved)}
                      </span>
                      <span className="file-status local-status">Local Save</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      className="action-btn edit"
                      title="Edit in Notebook"
                      onClick={() => onEditLocalNotebook?.(notebook)}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      title="Delete"
                      onClick={() => setShowConfirm({ id: notebook.id, title: notebook.title, isLocal: true })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="file-summary">
                  <p>Local notebook - not uploaded to database</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="uploaded-files-section">
          <h3 className="section-title">Uploaded Content</h3>
          <div className="file-list">
            {files.map((file, index) => (
              <div
                key={file.id || `file-${index}`}
                className={`file-card ${selectedFileId === file.id ? 'selected' : ''}`}
                onClick={(e) => {
                  // Avoid card click when clicking actions
                  const target = e.target as HTMLElement
                  if (target.closest('.file-actions')) return
                  onFileSelect(file)
                }}
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
                      <span className={`file-status ${file.status}`}>
                        {file.status === 'completed' ? 'Processed' : 'Processing...'}
                      </span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button
                      className="action-btn edit"
                      title="Edit in Notebook"
                      onClick={() => onEditFile?.(file.id)}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      title="Delete"
                      onClick={() => setShowConfirm({ id: file.id, title: file.title || file.filename })}
                    >
                      <Trash2 size={16} />
                    </button>
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

          {showConfirm && (
            <div className="modal-overlay">
              <div className="delete-modal">
                <h3>Delete Item</h3>
                <p>{`Are you sure you want to delete "${showConfirm.title}"? This action cannot be undone.`}</p>
                <div className="modal-actions">
                  <button className="cancel-button" onClick={() => setShowConfirm(null)} disabled={!!deletingId}>
                    Cancel
                  </button>
                  <button
                    className="delete-confirm-button"
                    onClick={() => handleConfirmDelete(showConfirm.id, showConfirm.isLocal)}
                    disabled={!!deletingId}
                  >
                    <Trash2 className="icon" />
                    {deletingId ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}