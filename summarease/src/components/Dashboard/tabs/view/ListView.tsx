import React, { useState, useEffect } from 'react'
import { FileText, Tag, Calendar, Edit3, Trash2, Filter, X, Settings, FolderPlus, Move } from 'lucide-react'
import { getUserFiles, deleteFile, type FileWithMetadata, getUserFolders, createFolder, updateFolder, deleteFolder, moveFileToFolder, type Folder } from '../../../../lib/api'
import './ListView.css'
import { sanitizeTagName, isJunkTagName } from '../../../../lib/tagUtils'

interface ListViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  onEditFile?: (fileId: string) => void
  onEditLocalNotebook?: (localNotebook: any) => void
  searchResults?: FileWithMetadata[]
  isSearching?: boolean
  // State management props
  selectedFolderFilter?: string | null
  onFolderFilterChange?: (filter: string | null) => void
  showFolderManagement?: boolean
  onShowFolderManagementChange?: (show: boolean) => void
  editingFolder?: { id: string; name: string } | null
  onEditingFolderChange?: (folder: { id: string; name: string } | null) => void
  newFolderName?: string
  onNewFolderNameChange?: (name: string) => void
  showMoveModal?: { fileId: string; fileName: string } | null
  onShowMoveModalChange?: (modal: { fileId: string; fileName: string } | null) => void
  selectedTargetFolder?: string | null
  onSelectedTargetFolderChange?: (folderId: string | null) => void
}

export const ListView: React.FC<ListViewProps> = ({ 
  onFileSelect, 
  selectedFileId, 
  onEditFile, 
  onEditLocalNotebook, 
  searchResults, 
  isSearching,
  // State management props with fallback to internal state for backward compatibility
  selectedFolderFilter: externalSelectedFolderFilter,
  onFolderFilterChange,
  showFolderManagement: externalShowFolderManagement,
  onShowFolderManagementChange,
  editingFolder: externalEditingFolder,
  onEditingFolderChange,
  newFolderName: externalNewFolderName,
  onNewFolderNameChange,
  showMoveModal: externalShowMoveModal,
  onShowMoveModalChange,
  selectedTargetFolder: externalSelectedTargetFolder,
  onSelectedTargetFolderChange
}) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [localNotebooks, setLocalNotebooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<{ id: string; title: string; isLocal?: boolean } | null>(null)

  // Tag popover state
  const [openTagsFor, setOpenTagsFor] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState('')
  const [maxVisibleTags, setMaxVisibleTags] = useState(8)

  useEffect(() => {
    const calc = () => {
      if (typeof window === 'undefined') return
      const w = window.innerWidth
      setMaxVisibleTags(w <= 768 ? 3 : w <= 1024 ? 5 : 8)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  useEffect(() => {
    if (!openTagsFor) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenTagsFor(null) }
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const popover = document.querySelector(`.tags-popover[data-file-id="${openTagsFor}"]`)
      const clickedInsidePopover = popover ? popover.contains(target) : false
      const moreBtn = target.closest('.tag-more-chip') as HTMLElement | null
      const clickedMoreForSame = moreBtn?.getAttribute('data-file-id') === openTagsFor
      if (!clickedInsidePopover && !clickedMoreForSame) {
        setOpenTagsFor(null)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [openTagsFor])
  
  // Use external state management if provided, otherwise fall back to internal state
  const [internalSelectedFolderFilter, setInternalSelectedFolderFilter] = useState<string | null>(null)
  const [internalShowFolderManagement, setInternalShowFolderManagement] = useState(false)
  const [internalEditingFolder, setInternalEditingFolder] = useState<{ id: string; name: string } | null>(null)
  const [internalNewFolderName, setInternalNewFolderName] = useState('')
  const [internalShowMoveModal, setInternalShowMoveModal] = useState<{ fileId: string; fileName: string } | null>(null)
  const [internalSelectedTargetFolder, setInternalSelectedTargetFolder] = useState<string | null>(null)
  
  // Folder management state
  const [folders, setFolders] = useState<Folder[]>([])
  
  // Use external state if available, otherwise use internal state
  const selectedFolderFilter = externalSelectedFolderFilter !== undefined ? externalSelectedFolderFilter : internalSelectedFolderFilter
  const setSelectedFolderFilter = onFolderFilterChange || setInternalSelectedFolderFilter
  const showFolderManagement = externalShowFolderManagement !== undefined ? externalShowFolderManagement : internalShowFolderManagement
  const setShowFolderManagement = onShowFolderManagementChange || setInternalShowFolderManagement
  const editingFolder = externalEditingFolder !== undefined ? externalEditingFolder : internalEditingFolder
  const setEditingFolder = onEditingFolderChange || setInternalEditingFolder
  const newFolderName = externalNewFolderName !== undefined ? externalNewFolderName : internalNewFolderName
  const setNewFolderName = onNewFolderNameChange || setInternalNewFolderName
  const showMoveModal = externalShowMoveModal !== undefined ? externalShowMoveModal : internalShowMoveModal
  const setShowMoveModal = onShowMoveModalChange || setInternalShowMoveModal
  const selectedTargetFolder = externalSelectedTargetFolder !== undefined ? externalSelectedTargetFolder : internalSelectedTargetFolder
  const setSelectedTargetFolder = onSelectedTargetFolderChange || setInternalSelectedTargetFolder
  
  // Filter files by selected folder and search results
  const filteredFiles = React.useMemo(() => {
    // If searching, use search results instead of all files
    const sourceFiles = isSearching ? (searchResults || []) : files
    
    if (!selectedFolderFilter) return sourceFiles // Show all files
    
    return sourceFiles.filter(file => {
      const folderKey = file.folder_name || 'No Folder'
      return folderKey === selectedFolderFilter
    })
  }, [files, selectedFolderFilter, searchResults, isSearching])
  
  // Group files by folder
  const groupedFiles = React.useMemo(() => {
    const groups: { [key: string]: FileWithMetadata[] } = {}
    
    filteredFiles.forEach(file => {
      const folderKey = file.folder_name || 'No Folder'
      if (!groups[folderKey]) {
        groups[folderKey] = []
      }
      groups[folderKey].push(file)
    })
    
    // Sort files within each folder by creation date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })
    
    return groups
  }, [filteredFiles])
  
  // Get unique folder names for filter options
  const availableFolders = React.useMemo(() => {
    const folders = new Set<string>()
    files.forEach(file => {
      folders.add(file.folder_name || 'No Folder')
    })
    return Array.from(folders).sort()
  }, [files])

  useEffect(() => {
    loadFiles()
    loadLocalNotebooks()
    loadFolders()
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
      const localData = JSON.parse(localStorage.getItem('sat-brain-local-notebooks') || '[]')
      // Show only the latest local notebook
      const latestNotebook = localData.length > 0 
        ? [localData.sort((a: any, b: any) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime())[0]]
        : []
      setLocalNotebooks(latestNotebook)
    } catch (error) {
      console.error('Error loading local notebooks:', error)
    }
  }
  
  const loadFolders = async () => {
    try {
      const userFolders = await getUserFolders()
      setFolders(userFolders)
    } catch (error) {
      console.error('Error loading folders:', error)
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
        const existingLocal = JSON.parse(localStorage.getItem('sat-brain-local-notebooks') || '[]')
        const filtered = existingLocal.filter((item: any) => item.id !== fileId)
        localStorage.setItem('sat-brain-local-notebooks', JSON.stringify(filtered))
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    
    const folder = await createFolder(newFolderName.trim())
    if (folder) {
      await loadFolders()
      setNewFolderName('')
    }
  }
  
  const handleUpdateFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return
    
    const success = await updateFolder(folderId, newName.trim())
    if (success) {
      await loadFolders()
      await loadFiles() // Refresh files to get updated folder names
      setEditingFolder(null)
    }
  }
  
  const handleDeleteFolder = async (folderId: string) => {
    const result = await deleteFolder(folderId)
    if (result.success) {
      await loadFolders()
    } else {
      alert(result.error || 'Failed to delete folder')
    }
  }
  
  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {
    const success = await moveFileToFolder(fileId, targetFolderId)
    if (success) {
      await loadFiles() // Refresh files to get updated folder assignments
      setShowMoveModal(null)
      setSelectedTargetFolder(null)
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
      {/* Folder Filter */}
      {files.length > 0 && (
        <div className="folder-filter">
          <div className="filter-header">
            <Filter className="filter-icon" />
            <span>Filter by folder:</span>
            <button
              className="manage-folders-btn"
              onClick={() => setShowFolderManagement(!showFolderManagement)}
              title="Manage folders"
            >
              <Settings size={14} />
              Manage
            </button>
          </div>
          <div className="filter-options">
            <button
              className={`filter-btn ${!selectedFolderFilter ? 'active' : ''}`}
              onClick={() => setSelectedFolderFilter(null)}
            >
              All Folders ({files.length})
            </button>
            {availableFolders.map(folder => {
              const count = files.filter(f => (f.folder_name || 'No Folder') === folder).length
              return (
                <button
                  key={folder}
                  className={`filter-btn ${selectedFolderFilter === folder ? 'active' : ''}`}
                  onClick={() => setSelectedFolderFilter(folder)}
                >
                  {folder === 'No Folder' ? '📋' : '📁'} {folder} ({count})
                </button>
              )
            })}
            {selectedFolderFilter && (
              <button
                className="filter-btn clear-filter"
                onClick={() => setSelectedFolderFilter(null)}
                title="Clear filter"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Folder Management Panel (moved near filter for visibility) */}
      {showFolderManagement && (
        <div className="folder-management">
          <h4>Manage Folders</h4>
          
          {/* Create New Folder */}
          <div className="create-folder">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="folder-input"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="btn btn-primary btn-sm"
              title="Create folder"
              aria-label="Create folder"
            >
              <FolderPlus size={14} />
            </button>
          </div>
          
          {/* Existing Folders */}
          <div className="folders-list">
            {folders.map(folder => (
              <div key={folder.id} className="folder-item">
                {editingFolder?.id === folder.id ? (
                  <div className="folder-edit">
                    <input
                      type="text"
                      value={editingFolder.name}
                      onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                      className="folder-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateFolder(folder.id, editingFolder.name)
                        if (e.key === 'Escape') setEditingFolder(null)
                      }}
                    />
                    <button
                      onClick={() => handleUpdateFolder(folder.id, editingFolder.name)}
                      className="btn btn-primary btn-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingFolder(null)}
                      className="btn btn-gray btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="folder-display">
                    <span className="folder-name">📁 {folder.name}</span>
                    <div className="folder-actions">
                      <button
                        onClick={() => setEditingFolder({ id: folder.id, name: folder.name })}
                        className="btn btn-soft-primary btn-sm"
                        title="Rename folder"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="btn btn-soft-danger btn-sm"
                        title="Delete folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {localNotebooks.length > 0 && (
        <div className="local-notebooks-section">
          <h3 className="section-title">Latest Local Notebook</h3>
          <div className="file-list">
            {localNotebooks.map((notebook) => (
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
          {Object.entries(groupedFiles).map(([folderName, folderFiles]) => (
            <div key={folderName} className="folder-section">
              <h3 className="folder-title">
                📁 {folderName} ({folderFiles.length})
              </h3>
              <div className="file-list">
                {folderFiles.map((file, index) => (
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
                          className="action-btn move"
                          title="Move to folder"
                          onClick={() => setShowMoveModal({ fileId: file.id, fileName: file.title || file.filename || 'Untitled' })}
                        >
                          <Move size={16} />
                        </button>
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
                          onClick={() => setShowConfirm({ id: file.id, title: file.title || file.filename || 'Untitled' })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {file.tags && file.tags.length > 0 && (
                      <div className="file-tags" onClick={(e) => e.stopPropagation()}>
                        <Tag className="tags-icon" />
                        {(() => {
                          const allTags = file.tags
                            .map((tag) => {
                              const rawName = typeof tag === 'string' ? tag : tag.name
                              const tagName = sanitizeTagName(rawName)
                              const tagType = typeof tag === 'string' ? 'general' : tag.type
                              return { name: tagName, type: tagType as 'general' | 'specific' | 'user_added' }
                            })
                            .filter(({ name }) => name && !isJunkTagName(name))
                          const visible = allTags.slice(0, maxVisibleTags)
                          const hidden = allTags.slice(maxVisibleTags)
                          return (
                            <div className="tags-list with-more">
                              {visible.map((t, i) => (
                                <span key={i} className={`tag tag-${t.type}`}>{t.name}</span>
                              ))}
                              {hidden.length > 0 && (
                                <button
                                  className="tag tag-more-chip"
                                  data-file-id={file.id}
                                  onClick={(e) => { e.stopPropagation(); setOpenTagsFor(file.id); setTagFilter('') }}
                                  aria-haspopup="dialog"
                                  aria-expanded={openTagsFor === file.id}
                                  title={hidden.map(t => t.name).join(', ')}
                                >
                                  +{hidden.length} more
                                </button>
                              )}
                              {/* Popover */}
                              {openTagsFor === file.id && (
                                <div className="tags-popover" data-file-id={file.id} role="dialog" aria-label="All tags" onClick={(e) => e.stopPropagation()}>
                                  <div className="tags-popover-header">
                                    <input
                                      className="tags-popover-search"
                                      placeholder="Filter tags..."
                                      value={tagFilter}
                                      onChange={(e) => setTagFilter(e.target.value)}
                                      autoFocus
                                    />
                                    <button className="tags-popover-close" aria-label="Close" onClick={() => setOpenTagsFor(null)}>×</button>
                                  </div>
                                  {(() => {
                                    const list = tagFilter ? allTags.filter(t => t.name.includes(tagFilter.toLowerCase())) : allTags
                                    const general = list.filter(t => t.type === 'general')
                                    const specific = list.filter(t => t.type === 'specific')
                                    const userAdded = list.filter(t => t.type === 'user_added')
                                    return (
                                      <div className="tags-popover-list">
                                        {general.length > 0 && (
                                          <div className="tags-section">
                                            <div className="tags-section-title">General ({general.length})</div>
                                            <div className="tags-section-grid">
                                              {general.map((t, i) => <span key={`g-${i}`} className={`tag tag-${t.type}`}>{t.name}</span>)}
                                            </div>
                                          </div>
                                        )}
                                        {specific.length > 0 && (
                                          <div className="tags-section">
                                            <div className="tags-section-title">Specific ({specific.length})</div>
                                            <div className="tags-section-grid">
                                              {specific.map((t, i) => <span key={`s-${i}`} className={`tag tag-${t.type}`}>{t.name}</span>)}
                                            </div>
                                          </div>
                                        )}
                                        {userAdded.length > 0 && (
                                          <div className="tags-section">
                                            <div className="tags-section-title">Custom ({userAdded.length})</div>
                                            <div className="tags-section-grid">
                                              {userAdded.map((t, i) => <span key={`u-${i}`} className={`tag tag-${t.type}`}>{t.name}</span>)}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                              )}
                            </div>
                          )
                        })()}
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
          ))}

          {/* Move File Modal */}
          {showMoveModal && (
            <div className="modal-overlay">
              <div className="move-modal">
                <h3>Move File</h3>
                <p>Move "{showMoveModal.fileName}" to:</p>
                <div className="folder-options">
                  <label className="folder-option">
                    <input
                      type="radio"
                      name="targetFolder"
                      value=""
                      checked={selectedTargetFolder === null}
                      onChange={() => setSelectedTargetFolder(null)}
                    />
                    📋 No Folder
                  </label>
                  {folders.map(folder => (
                    <label key={folder.id} className="folder-option">
                      <input
                        type="radio"
                        name="targetFolder"
                        value={folder.id}
                        checked={selectedTargetFolder === folder.id}
                        onChange={() => setSelectedTargetFolder(folder.id)}
                      />
                      📁 {folder.name}
                    </label>
                  ))}
                </div>
                <div className="modal-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setShowMoveModal(null)
                      setSelectedTargetFolder(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleMoveFile(showMoveModal.fileId, selectedTargetFolder)}
                  >
                    <Move className="icon" />
                    Move
                  </button>
                </div>
              </div>
            </div>
          )}

          {showConfirm && (
            <div className="modal-overlay">
              <div className="delete-modal">
                <h3>Delete Item</h3>
                <p>{`Are you sure you want to delete "${showConfirm.title}"? This action cannot be undone.`}</p>
                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={() => setShowConfirm(null)} disabled={!!deletingId}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
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