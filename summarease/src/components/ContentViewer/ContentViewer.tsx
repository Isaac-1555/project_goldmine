import React, { useState, useEffect } from 'react'
import { Edit3, Pencil, Sparkles, Save, X, FileText, MessageSquare, Tag, Clock, ArrowLeft, Trash2, File as FileIcon, Eye } from 'lucide-react'
import { StatusIndicator } from '../FileStatus/StatusIndicator'
import { getFileDetails, updateSummary, deleteFile, regenerateSummary, type FileWithMetadata } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { CodeBlockRenderer } from '../ContentBlocks/CodeBlockRenderer'
import { MathBlockRenderer } from '../ContentBlocks/MathBlockRenderer'
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
  // Only actual code/math segments are displayed in copyable boxes.
  const renderSummaryText = (text: string) => {
    if (!text) return null

    // Helper to convert plain text segment into structured blocks (headers, lists, paragraphs)
    const renderPlainTextSegment = (segment: string, keyPrefix: string) => {
      if (!segment) return null

      // Normalize: ensure markdown-style headings (#, ##, ###) start on their own line
      let normalized = segment
        // Insert a newline before a heading token that appears inline
        .replace(/([^\n])\s*(#{1,3})\s+(?=\S)/g, '$1\n$2 ')
        // Collapse multiple blank lines
        .replace(/\n{3,}/g, '\n\n')

      const lines = normalized.split(/\n+/)

      type Block = { 
        type: 'h1' | 'h2' | 'h3' | 'list' | 'p'
        items?: string[]
        text?: string
        title?: string
      }
      const blocks: Block[] = []
      let currentList: string[] | null = null

      // Patterns
      const headingRegex = /^(#{1,3})\s*(.+)$/
      const legacyHeaderRegex = /^(KEY CONCEPTS:|DETAILS\s*&\s*EXAMPLES:|APPLICATIONS\s*&\s*REFLECTIONS:|KEY TERMS.*|SUMMARY)$/i
      const bulletRegex = /^\s*(?:•|\-|\*|\d+\.)\s+(.+)$/

      for (const raw of lines) {
        const line = raw.trim()
        if (!line) { currentList = null; continue }
        // Ignore stray heading markers with no title
        if (/^#{1,6}\s*$/.test(line)) { currentList = null; continue }

        // Markdown headings
        const hMatch = line.match(headingRegex)
        if (hMatch) {
          currentList = null
          const level = hMatch[1].length
          const title = hMatch[2].trim()
          blocks.push({ type: (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'), title })
          continue
        }

        // Legacy ALL-CAPS section headers ending with colon
        if (legacyHeaderRegex.test(line)) {
          currentList = null
          blocks.push({ type: 'h2', title: line.replace(/:$/, '') })
          continue
        }

        // Bullet items starting at line-begin
        const bMatch = line.match(bulletRegex)
        if (bMatch) {
          if (!currentList) {
            currentList = []
            blocks.push({ type: 'list', items: currentList })
          }
          const content = bMatch[1].trim()
          // If the remaining content itself contains additional inline bullets, split them
          const splitItems = content.split(/\s*•\s+/).map(s => s.trim()).filter(Boolean)
          if (splitItems.length > 1) {
            splitItems.forEach(it => currentList!.push(it))
          } else {
            currentList.push(content)
          }
          continue
        }

        // Inline bullets inside a single line (split into separate list items)
        if (/(?:^|\s)•\s+/.test(line) && line.split(/\s*•\s+/).length > 1) {
          const items = line.split(/\s*•\s+/).map(s => s.trim()).filter(Boolean)
          if (items.length) {
            currentList = []
            blocks.push({ type: 'list', items: currentList })
            items.forEach(it => currentList!.push(it))
            continue
          }
        }

        // Paragraph text
        currentList = null
        blocks.push({ type: 'p', text: line })
      }

      // Inline emphasis renderer: ***bold-italic***, **bold**, *italic*
      const renderInline = (text: string): React.ReactNode[] => {
        if (!text) return []
        const parts: React.ReactNode[] = []
        const regex = /(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*[^*]+\*)/g
        let lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = regex.exec(text)) !== null) {
          if (m.index > lastIndex) {
            parts.push(text.slice(lastIndex, m.index))
          }
          const token = m[0]
          if (token.startsWith('***')) {
            const inner = token.slice(3, -3)
            parts.push(<strong key={`b-i-${lastIndex}`}><em>{inner}</em></strong>)
          } else if (token.startsWith('**')) {
            const inner = token.slice(2, -2)
            parts.push(<strong key={`b-${lastIndex}`}>{inner}</strong>)
          } else if (token.startsWith('*')) {
            const inner = token.slice(1, -1)
            parts.push(<em key={`i-${lastIndex}`}>{inner}</em>)
          }
          lastIndex = m.index + token.length
        }
        if (lastIndex < text.length) parts.push(text.slice(lastIndex))
        return parts
      }

      return (
        <>
          {blocks.map((block, idx) => {
            switch (block.type) {
              case 'h1':
                return <h2 key={`${keyPrefix}-h1-${idx}`} className="summary-section-header">{block.title}</h2>
              case 'h2':
                return <h3 key={`${keyPrefix}-h2-${idx}`} className="summary-section-header">{block.title}</h3>
              case 'h3':
                return <h4 key={`${keyPrefix}-h3-${idx}`} className="summary-section-header">{block.title}</h4>
              case 'list':
                return (
                  <ul key={`${keyPrefix}-list-${idx}`} className="summary-bullet-list">
                    {(block.items || []).map((item, i) => (
                      <li key={`${keyPrefix}-item-${idx}-${i}`} className="summary-bullet-item">{renderInline(item)}</li>
                    ))}
                  </ul>
                )
              default:
                return <p key={`${keyPrefix}-p-${idx}`} className="summary-paragraph">{renderInline(block.text || '')}</p>
            }
          })}
        </>
      )
    }

    // Parse the text, extracting fenced blocks for code and math only
    const fenceRegex = /```(\w+)?\n([\s\S]*?)```/g
    const nodes: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let segIndex = 0

    while ((match = fenceRegex.exec(text)) !== null) {
      const [full, langRaw, content] = match
      const lang = (langRaw || 'plaintext').toLowerCase()

      // Render preceding plain text segment
      if (match.index > lastIndex) {
        const pre = text.substring(lastIndex, match.index)
        nodes.push(
          <div key={`seg-${segIndex++}`} className="formatted-summary">
            {renderPlainTextSegment(pre, `seg-${segIndex}`)}
          </div>
        )
      }

      // Render the fenced block appropriately
      if (lang === 'math') {
        nodes.push(
          <MathBlockRenderer 
            key={`math-${segIndex++}`} 
            block={{ type: 'math', latex: content.trim(), displayMode: 'block' }} 
          />
        )
      } else {
        nodes.push(
          <CodeBlockRenderer 
            key={`code-${segIndex++}`} 
            block={{ type: 'code', language: lang as any, content: content.trim(), lineNumbers: content.split('\n').length > 5 }} 
          />
        )
      }

      lastIndex = match.index + full.length
    }

    // Render any trailing plain text
    if (lastIndex < text.length) {
      const tail = text.substring(lastIndex)
      nodes.push(
        <div key={`seg-${segIndex++}`} className="formatted-summary">
          {renderPlainTextSegment(tail, `seg-${segIndex}`)}
        </div>
      )
    }

    return <>{nodes}</>
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
                        className="action-icon-btn edit-icon-btn"
                        title="Edit summary"
                      >
                        <Pencil className="icon" />
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
                        className="action-icon-btn regen-icon-btn"
                        disabled={regenerating}
                        title="Regenerate summary"
                      >
                        <Sparkles className="icon" />
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