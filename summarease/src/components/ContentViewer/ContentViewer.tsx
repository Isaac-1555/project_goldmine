import React, { useState, useEffect } from 'react'
import { Edit3, Save, X, FileText, MessageSquare, Tag, Clock, ArrowLeft, Trash2 } from 'lucide-react'
import { StatusIndicator } from '../FileStatus/StatusIndicator'
import { getFileDetails, updateSummary, deleteFile, type FileWithMetadata } from '../../lib/api'
import './ContentViewer.css'

interface ContentViewerProps {
  file: FileWithMetadata
  onBack?: () => void
  onDelete?: (fileId: string) => void
}

interface FileDetails {
  file: {
    id: string
    title: string
    file_type: string
    status: string
    created_at: string
  }
  transcript: {
    id: string
    content: string
  } | null
  summary: {
    id: string
    summary_text: string
  } | null
  tags: Array<{
    id: string
    name: string
  }>
  notes?: {
    id: string
    content: string
    html_content: string
  } | null
  documents?: any[]
}

export const ContentViewer: React.FC<ContentViewerProps> = ({ file, onBack, onDelete }) => {
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'notes' | 'tags'>('summary')
  const [isEditing, setIsEditing] = useState(false)
  const [editedSummary, setEditedSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (file?.id) {
      // If it's a local notebook, don't fetch from API
      if (file.localNotebookData) {
        console.log('Local notebook data:', file.localNotebookData)
        console.log('Notes content:', file.localNotebookData.notes)
        
        setFileDetails({
          file: {
            id: file.id,
            title: file.title,
            file_type: file.file_type,
            status: file.status,
            created_at: file.created_at
          },
          transcript: file.localNotebookData.audioTranscript && file.localNotebookData.audioTranscript.trim() ? {
            id: 'local',
            content: file.localNotebookData.audioTranscript
          } : null,
          summary: null,
          tags: [],
          notes: file.localNotebookData.notes && file.localNotebookData.notes.trim() ? {
            id: 'local',
            content: file.localNotebookData.notes,
            html_content: file.localNotebookData.notes
          } : null,
          documents: file.localNotebookData.uploadedFiles || []
        })
        setLoading(false)
      } else {
        loadFileDetails(file.id)
      }
    } else {
      setFileDetails(null)
    }
  }, [file?.id, file?.localNotebookData])

  const loadFileDetails = async (id: string) => {
    try {
      setLoading(true)
      setError('')
      const details = await getFileDetails(id)
      console.log('Loaded file details from database:', details)
      setFileDetails(details)
      setEditedSummary(details.summary?.summary_text || '')
    } catch (err: any) {
      setError('Failed to load file details')
      console.error('Error loading file details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSummary = async () => {
    if (!fileDetails?.summary?.id) return

    try {
      setSaving(true)
      const success = await updateSummary(fileDetails.summary.id, editedSummary)
      
      if (success) {
        setFileDetails(prev => prev ? {
          ...prev,
          summary: prev.summary ? {
            ...prev.summary,
            summary_text: editedSummary
          } : null
        } : null)
        setIsEditing(false)
      } else {
        setError('Failed to save summary')
      }
    } catch (err: any) {
      setError('Failed to save summary')
      console.error('Error saving summary:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditedSummary(fileDetails?.summary?.summary_text || '')
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!file?.id) return

    try {
      setDeleting(true)
      const success = await deleteFile(file.id)
      
      if (success) {
        setShowDeleteConfirm(false)
        onDelete?.(file.id)
        onBack?.()
      } else {
        setError('Failed to delete file')
      }
    } catch (err: any) {
      setError('Failed to delete file')
      console.error('Error deleting file:', err)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'audio':
        return 'Audio Recording'
      case 'pdf':
        return 'PDF Document'
      case 'docx':
        return 'Word Document'
      default:
        return 'Document'
    }
  }

  if (!file) {
    return (
      <div className="content-viewer">
        <div className="empty-content">
          <FileText className="empty-icon" />
          <h3>Select a file to view</h3>
          <p>Choose a file from the sidebar to see its summary, transcript, and tags</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="content-viewer">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    )
  }

  if (error || !fileDetails) {
    return (
      <div className="content-viewer">
        <div className="error-content">
          <p>{error || 'Failed to load content'}</p>
          <button onClick={() => file?.id && loadFileDetails(file.id)} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="content-viewer">
      <div className="content-header">
        {onBack && (
          <button onClick={onBack} className="back-button">
            <ArrowLeft className="back-icon" />
            Back
          </button>
        )}
        <div className="file-info">
          <h1 className="file-title">{fileDetails.file.title}</h1>
          <div className="file-meta">
            <span className="file-type">{getFileTypeLabel(fileDetails.file.file_type)}</span>
            <span className="file-date">
              <Clock className="icon" />
              {formatDate(fileDetails.file.created_at)}
            </span>
            <StatusIndicator status={fileDetails.file.status as any} size="small" />
          </div>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="delete-button"
          title="Delete this file"
        >
          <Trash2 className="icon" />
        </button>
      </div>

      <div className="content-tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <FileText className="tab-icon" />
          Summary
        </button>
        <button
          className={`tab ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
          disabled={!fileDetails.transcript}
        >
          <MessageSquare className="tab-icon" />
          Transcript
        </button>
        <button
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
          disabled={!fileDetails.notes}
        >
          <Edit3 className="tab-icon" />
          Notes {fileDetails.notes ? '(has content)' : '(empty)'}
        </button>
        <button
          className={`tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <Tag className="tab-icon" />
          Tags ({fileDetails.tags.length})
        </button>
      </div>

      <div className="content-body">
        {activeTab === 'summary' && (
          <div className="summary-content">
            {fileDetails.summary ? (
              <>
                <div className="content-actions">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="edit-button"
                    >
                      <Edit3 className="icon" />
                      Edit Summary
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button
                        onClick={handleSaveSummary}
                        disabled={saving}
                        className="save-button"
                      >
                        <Save className="icon" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="cancel-button"
                      >
                        <X className="icon" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="summary-editor"
                    placeholder="Enter your summary..."
                  />
                ) : (
                  <div className="summary-text">
                    {fileDetails.summary.summary_text.split('\n').map((paragraph, index) => (
                      <p key={`summary-p-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-content">
                <p>No summary available yet.</p>
                {fileDetails.file.status === 'processing' && (
                  <span>Summary is being generated...</span>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="transcript-content">
            {fileDetails.transcript ? (
              <div className="transcript-text">
                {fileDetails.transcript.content.split('\n').map((paragraph, index) => (
                  <p key={`transcript-p-${index}`}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="no-content">
                <p>No transcript available.</p>
                {fileDetails.file.status === 'processing' && (
                  <span>Transcript is being generated...</span>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-content">
            {fileDetails.notes ? (
              <div className="notes-text">
                {fileDetails.notes.html_content ? (
                  <div dangerouslySetInnerHTML={{ __html: fileDetails.notes.html_content }} />
                ) : (
                  fileDetails.notes.content.split('\n').map((paragraph, index) => (
                    <p key={`notes-p-${index}`}>{paragraph}</p>
                  ))
                )}
              </div>
            ) : (
              <div className="no-content">
                <p>No notes available.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-content">
            {fileDetails.tags.length > 0 ? (
              <div className="tags-grid">
                {fileDetails.tags.map((tag) => (
                  <div key={tag.id} className="tag-item">
                    <Tag className="tag-icon" />
                    <span className="tag-name">{tag.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-content">
                <p>No tags available yet.</p>
                {fileDetails.file.status === 'processing' && (
                  <span>Tags are being generated...</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Delete File</h3>
            <p>Are you sure you want to delete "{fileDetails?.file.title}"? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="cancel-button"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="delete-confirm-button"
                disabled={deleting}
              >
                <Trash2 className="icon" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}