import React, { useState, useEffect } from 'react'
import { Edit3, Save, X, FileText, MessageSquare, Tag, Clock, ArrowLeft, Trash2, File as FileIcon, Eye } from 'lucide-react'
import { StatusIndicator } from '../FileStatus/StatusIndicator'
import { getFileDetails, updateSummary, deleteFile, regenerateSummary, type FileWithMetadata } from '../../lib/api'
import { supabase } from '../../lib/supabase'
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
    created_at?: string
  } | null
  summaries?: Array<{
    id: string
    summary_text: string
    created_at?: string
  }>
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
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'notes' | 'tags' | 'docs'>('summary')
  const [isEditing, setIsEditing] = useState(false)
  const [editedSummary, setEditedSummary] = useState('')
  // Render summary text with proper formatting for college students
  const renderSummaryText = (text: string) => {
    const rawLines = (text || '').split('\n')

    // Helper: split lines that accidentally include section headers inline
    const splitOnKnownHeaders = (line: string): string[] => {
      const parts = line.split(/(KEY CONCEPTS:|DETAILS & EXAMPLES:|APPLICATIONS & REFLECTIONS:)/)
      const out: string[] = []
      for (const part of parts) {
        const t = (part || '').trim()
        if (!t) continue
        out.push(t)
      }
      return out
    }

    const lines: string[] = []
    for (const l of rawLines) {
      const segments = splitOnKnownHeaders(l)
      for (const s of segments) lines.push(s)
    }

    const blocks: Array<{ 
      type: 'section-header' | 'list' | 'p'
      items?: string[]
      text?: string
      sectionTitle?: string
    }> = []
    let currentList: string[] | null = null

    // Patterns to identify different elements
    // Normalize different bullet styles to a standard dot and space
    const listPattern = /^\s*(?:[-*•]|\u2022|\d+\.)\s+/
    const sectionHeaderPattern = /^[A-Z][A-Z\s&]+:$/

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) {
        currentList = null
        continue
      }
      
      // Check if it's a section header (e.g., "KEY CONCEPTS:", "DETAILS & EXAMPLES:")
      if (sectionHeaderPattern.test(trimmedLine)) {
        currentList = null
        blocks.push({ type: 'section-header', sectionTitle: trimmedLine })
      }
      // Check if it's a bullet point
      else if (listPattern.test(trimmedLine)) {
        // Remove leading bullet and split any inline bullets into separate items
        const content = trimmedLine.replace(listPattern, '').trim()
        const splitItems = content.split(/\s*•\s+/).map(s => s.trim()).filter(Boolean)
        if (!currentList) {
          currentList = []
          blocks.push({ type: 'list', items: currentList })
        }
        for (const it of splitItems) currentList.push(it)
      }
      // Paragraphs that contain inline bullets → convert to a list
      else if (/•/.test(trimmedLine)) {
        const items = trimmedLine.split(/\s*•\s+/).map(s => s.trim()).filter(Boolean)
        if (items.length > 1) {
          currentList = []
          blocks.push({ type: 'list', items: currentList })
          for (const it of items) currentList.push(it)
        } else {
          currentList = null
          blocks.push({ type: 'p', text: trimmedLine })
        }
      }
      // Regular paragraph
      else {
        currentList = null
        blocks.push({ type: 'p', text: trimmedLine })
      }
    }

    return (
      <div className="formatted-summary">
        {blocks.map((block, idx) => {
          if (block.type === 'section-header') {
            return (
              <h3 key={`section-${idx}`} className="summary-section-header">
                {block.sectionTitle}
              </h3>
            )
          } else if (block.type === 'list') {
            return (
              <ul key={`list-${idx}`} className="summary-bullet-list">
                {(block.items || []).map((item, i) => (
                  <li key={`item-${idx}-${i}`} className="summary-bullet-item">
                    {item}
                  </li>
                ))}
              </ul>
            )
          } else {
            return (
              <p key={`para-${idx}`} className="summary-paragraph">
                {block.text}
              </p>
            )
          }
        })}
      </div>
    )
  }
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
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
    // Save changes to the latest summary
    const latestSummaryId = fileDetails?.summary?.id || fileDetails?.summaries?.[0]?.id
    if (!latestSummaryId) return

    try {
      setSaving(true)
      const success = await updateSummary(latestSummaryId, editedSummary)
      
      if (success) {
        setFileDetails(prev => prev ? {
          ...prev,
          summary: prev.summary ? { ...prev.summary, summary_text: editedSummary } : prev.summary,
          summaries: prev.summaries ? [{ ...(prev.summaries[0] || {}), summary_text: editedSummary }, ...prev.summaries.slice(1)] : prev.summaries
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
        <button
          className={`tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <FileIcon className="tab-icon" />
          Docs {(fileDetails.documents?.length ?? 0) > 0 ? `(${fileDetails.documents!.length})` : '(0)'}
        </button>
      </div>

      <div className="content-body">
        {activeTab === 'summary' && (
          <div className="summary-content">
            {fileDetails.summary ? (
              <>
                <div className="content-actions">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="edit-button"
                      >
                        <Edit3 className="icon" />
                        Edit Summary
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            setRegenerating(true)
                            const res = await regenerateSummary(fileDetails!.file.id)
                            if (res.success && res.summary_text) {
                              setFileDetails(prev => prev ? {
                                ...prev,
                                summary: prev.summary ? { ...prev.summary, summary_text: res.summary_text } : prev.summary
                              } : null)
                              setEditedSummary(res.summary_text)
                            } else {
                              setError(res.error || 'Failed to regenerate summary')
                            }
                          } catch (e) {
                            setError('Failed to regenerate summary')
                          } finally {
                            setRegenerating(false)
                          }
                        }}
                        className="save-button"
                        disabled={regenerating}
                        title="Regenerate summary using latest transcript, notes, and documents"
                      >
                        <Save className="icon" />
                        {regenerating ? 'Regenerating...' : 'Regenerate Summary'}
                      </button>
                    </>
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
                    {renderSummaryText(fileDetails.summary.summary_text)}
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

        {activeTab === 'docs' && (
          <div className="docs-content">
            {(fileDetails.documents?.length || 0) === 0 ? (
              <div className="no-content">
                <p>No uploaded documents.</p>
              </div>
            ) : (
              <ul className="doc-list">
                {fileDetails.documents!.map((doc: any, index: number) => {
                  // Support both local DocumentItem and DB document rows
                  const name = doc.name || doc.original_filename || (doc.storage_path ? String(doc.storage_path).split('/').pop() : `Document ${index+1}`)
                  const createdAt = doc.timestamp ? (doc.timestamp instanceof Date ? doc.timestamp.toISOString() : String(doc.timestamp)) : (doc.created_at || new Date().toISOString())
                  const size = doc.file?.size || doc.size || undefined

                  const deriveBadge = () => {
                    const n = (name || '').toLowerCase()
                    const ft = String(doc.file_type || doc.type || '')
                    if (n.endsWith('.pdf') || ft.includes('pdf')) return 'PDF'
                    if (n.endsWith('.docx') || ft.includes('word')) return 'DOCX'
                    if (n.endsWith('.doc')) return 'DOC'
                    return 'FILE'
                  }

                  const handleOpen = async () => {
                    try {
                      // If it's a database-backed document with storage_path, open signed URL
                      if (doc.storage_path) {
                        const { data, error } = await supabase.storage
                          .from('files')
                          .createSignedUrl(String(doc.storage_path), 60)
                        if (error) throw error
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
                        return
                      }
                      // If it's a local File object (from local notebook), open object URL
                      if (doc.file instanceof window.File) {
                        const url = URL.createObjectURL(doc.file)
                        window.open(url, '_blank', 'noopener,noreferrer')
                        // Release after a while
                        setTimeout(() => URL.revokeObjectURL(url), 30_000)
                      }
                    } catch (e) {
                      console.error('Failed to open document', e)
                    }
                  }

                  return (
                    <li
                      key={`doc-${doc.id || index}`}
                      className="doc-item clickable"
                      onClick={handleOpen}
                      role="button"
                      aria-label={`Open ${name}`}
                    >
                      <div className="doc-main">
                        <FileIcon className="doc-icon" />
                        <span className="doc-name" title={name}>{name}</span>
                        <span className="doc-badge">{deriveBadge()}</span>
                        <span className="doc-date">{formatDate(createdAt)}</span>
                        {size ? <span className="doc-size">{`${Math.round((size/1024/1024)*100)/100} MB`}</span> : null}
                        <button className="doc-view" onClick={(e) => { e.stopPropagation(); handleOpen() }} title="View document">
                          <Eye size={16} />
                          <span>View</span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
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