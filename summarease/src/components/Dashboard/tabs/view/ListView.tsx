import React, { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Edit3, FileText, Folder, FolderOpen, Move, Tag, Trash2 } from 'lucide-react'
import {
  createFolder,
  deleteFile,
  deleteFiles,
  deleteFolderAndFiles,
  deleteFolderKeepFiles,
  getFolderFileCount,
  getUserFiles,
  getUserFolders,
  moveFileToFolder,
  moveFilesToFolder,
  type FileWithMetadata,
  type Folder as FolderType,
  updateFolder,
} from '../../../../lib/api'
import './ListView.css'
import { sanitizeTagName, isJunkTagName } from '../../../../lib/tagUtils'
import { useToast } from '../../../../hooks/useToast'
import { clearLocalNotebookCache, getLatestLocalNotebookDraft } from '../../../../lib/localNotebookDraft'
import { ListViewSidebar, type FolderFilterOption } from './ListViewSidebar'

interface ListViewProps {
  onFileSelect: (file: FileWithMetadata) => void
  selectedFileId?: string
  onEditLocalNotebook?: (localNotebook: any) => void
  searchResults?: FileWithMetadata[]
  isSearching?: boolean
  // State management props
  selectedFolderFilter?: string | null
  onFolderFilterChange?: (filter: string | null) => void
  editingFolder?: { id: string; name: string } | null
  onEditingFolderChange?: (folder: { id: string; name: string } | null) => void
  newFolderName?: string
  onNewFolderNameChange?: (name: string) => void
  showMoveModal?: { fileId: string; fileName: string } | null
  onShowMoveModalChange?: (modal: { fileId: string; fileName: string } | null) => void
  selectedTargetFolder?: string | null
  onSelectedTargetFolderChange?: (folderId: string | null) => void
  showTags?: boolean
  onShowTagsChange?: (show: boolean) => void

  // Layout + persistence
  scrollPosition?: number
  onScrollPositionChange?: (position: number) => void
  sidebarCollapsed?: boolean
  onSidebarCollapsedChange?: (collapsed: boolean) => void

  // Bulk selection + bulk move
  bulkSelectMode?: boolean
  onBulkSelectModeChange?: (enabled: boolean) => void
  bulkSelectedFileIds?: string[]
  onBulkSelectedFileIdsChange?: (ids: string[]) => void
  showBulkMoveModal?: boolean
  onShowBulkMoveModalChange?: (show: boolean) => void
  bulkSelectedTargetFolder?: string | null
  onBulkSelectedTargetFolderChange?: (folderId: string | null) => void
}

export const ListView: React.FC<ListViewProps> = ({ 
  onFileSelect, 
  selectedFileId, 
  onEditLocalNotebook,
  searchResults, 
  isSearching,
  // State management props with fallback to internal state for backward compatibility
  selectedFolderFilter: externalSelectedFolderFilter,
  onFolderFilterChange,
  editingFolder: externalEditingFolder,
  onEditingFolderChange,
  newFolderName: externalNewFolderName,
  onNewFolderNameChange,
  showMoveModal: externalShowMoveModal,
  onShowMoveModalChange,
  selectedTargetFolder: externalSelectedTargetFolder,
  onSelectedTargetFolderChange,
  showTags: externalShowTags,
  onShowTagsChange,
  scrollPosition: externalScrollPosition,
  onScrollPositionChange,
  sidebarCollapsed: externalSidebarCollapsed,
  onSidebarCollapsedChange,
  bulkSelectMode: externalBulkSelectMode,
  onBulkSelectModeChange,
  bulkSelectedFileIds: externalBulkSelectedFileIds,
  onBulkSelectedFileIdsChange,
  showBulkMoveModal: externalShowBulkMoveModal,
  onShowBulkMoveModalChange,
  bulkSelectedTargetFolder: externalBulkSelectedTargetFolder,
  onBulkSelectedTargetFolderChange
}) => {
  const toast = useToast()
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const didRestoreScrollRef = useRef(false)

  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [localNotebooks, setLocalNotebooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<{ id: string; title: string; isLocal?: boolean } | null>(null)

  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState<{ id: string; name: string; fileCount: number } | null>(null)
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)

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
  const [internalEditingFolder, setInternalEditingFolder] = useState<{ id: string; name: string } | null>(null)
  const [internalNewFolderName, setInternalNewFolderName] = useState('')
  const [internalShowMoveModal, setInternalShowMoveModal] = useState<{ fileId: string; fileName: string } | null>(null)
  const [internalSelectedTargetFolder, setInternalSelectedTargetFolder] = useState<string | null>(null)
  const [internalShowTags, setInternalShowTags] = useState(true)
  const [internalScrollPosition, setInternalScrollPosition] = useState(0)
  const [internalSidebarCollapsed, setInternalSidebarCollapsed] = useState(false)
  const [internalBulkSelectMode, setInternalBulkSelectMode] = useState(false)
  const [internalBulkSelectedFileIds, setInternalBulkSelectedFileIds] = useState<string[]>([])
  const [internalShowBulkMoveModal, setInternalShowBulkMoveModal] = useState(false)
  const [internalBulkSelectedTargetFolder, setInternalBulkSelectedTargetFolder] = useState<string | null>(null)

  // Local-only bulk UI state
  const [bulkActionType, setBulkActionType] = useState<'move' | 'delete'>('move')
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkDeleteInProgress, setBulkDeleteInProgress] = useState(false)
  
  // Folder management state
  const [folders, setFolders] = useState<FolderType[]>([])
  
  // Use external state if available, otherwise use internal state
  const selectedFolderFilter = externalSelectedFolderFilter !== undefined ? externalSelectedFolderFilter : internalSelectedFolderFilter
  const setSelectedFolderFilter = onFolderFilterChange || setInternalSelectedFolderFilter
  const editingFolder = externalEditingFolder !== undefined ? externalEditingFolder : internalEditingFolder
  const setEditingFolder = onEditingFolderChange || setInternalEditingFolder
  const newFolderName = externalNewFolderName !== undefined ? externalNewFolderName : internalNewFolderName
  const setNewFolderName = onNewFolderNameChange || setInternalNewFolderName
  const showMoveModal = externalShowMoveModal !== undefined ? externalShowMoveModal : internalShowMoveModal
  const setShowMoveModal = onShowMoveModalChange || setInternalShowMoveModal
  const selectedTargetFolder = externalSelectedTargetFolder !== undefined ? externalSelectedTargetFolder : internalSelectedTargetFolder
  const setSelectedTargetFolder = onSelectedTargetFolderChange || setInternalSelectedTargetFolder
  const showTags = externalShowTags !== undefined ? externalShowTags : internalShowTags
  const setShowTags = onShowTagsChange || setInternalShowTags
  const scrollPosition = externalScrollPosition !== undefined ? externalScrollPosition : internalScrollPosition
  const setScrollPosition = onScrollPositionChange || setInternalScrollPosition
  const sidebarCollapsed = externalSidebarCollapsed !== undefined ? externalSidebarCollapsed : internalSidebarCollapsed
  const setSidebarCollapsed = onSidebarCollapsedChange || setInternalSidebarCollapsed
  const bulkSelectMode = externalBulkSelectMode !== undefined ? externalBulkSelectMode : internalBulkSelectMode
  const setBulkSelectMode = onBulkSelectModeChange || setInternalBulkSelectMode
  const bulkSelectedFileIds = externalBulkSelectedFileIds !== undefined ? externalBulkSelectedFileIds : internalBulkSelectedFileIds
  const setBulkSelectedFileIds = onBulkSelectedFileIdsChange || setInternalBulkSelectedFileIds
  const showBulkMoveModal = externalShowBulkMoveModal !== undefined ? externalShowBulkMoveModal : internalShowBulkMoveModal
  const setShowBulkMoveModal = onShowBulkMoveModalChange || setInternalShowBulkMoveModal
  const bulkSelectedTargetFolder = externalBulkSelectedTargetFolder !== undefined ? externalBulkSelectedTargetFolder : internalBulkSelectedTargetFolder
  const setBulkSelectedTargetFolder = onBulkSelectedTargetFolderChange || setInternalBulkSelectedTargetFolder

  useEffect(() => {
    if (!showTags) setOpenTagsFor(null)
  }, [showTags])

  useEffect(() => {
    const el = mainScrollRef.current
    if (!el) return
    if (didRestoreScrollRef.current) return

    if (typeof scrollPosition === 'number' && scrollPosition > 0) {
      el.scrollTop = scrollPosition
    }

    didRestoreScrollRef.current = true
  }, [scrollPosition])
  
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

  // Keep bulk selection scoped to what's currently visible.
  useEffect(() => {
    if (!bulkSelectMode) return

    const visibleIds = new Set(filteredFiles.map((f) => f.id))
    const pruned = bulkSelectedFileIds.filter((id) => visibleIds.has(id))

    if (pruned.length !== bulkSelectedFileIds.length) {
      setBulkSelectedFileIds(pruned)
    }

    // If selection becomes empty, close bulk modals for safety.
    if (showBulkMoveModal && pruned.length === 0) {
      setShowBulkMoveModal(false)
      setBulkSelectedTargetFolder(null)
    }

    if (showBulkDeleteConfirm && pruned.length === 0) {
      setShowBulkDeleteConfirm(false)
    }
  }, [
    bulkSelectMode,
    filteredFiles,
    bulkSelectedFileIds,
    showBulkMoveModal,
    showBulkDeleteConfirm,
    setBulkSelectedFileIds,
    setShowBulkMoveModal,
    setBulkSelectedTargetFolder,
  ])
  
  const folderFilterOptions: FolderFilterOption[] = React.useMemo(() => {
    const counts = new Map<string, number>()

    files.forEach((file) => {
      const folderKey = file.folder_name || 'No Folder'
      counts.set(folderKey, (counts.get(folderKey) ?? 0) + 1)
    })

    const options: FolderFilterOption[] = [
      ...folders.map((folder) => ({
        name: folder.name,
        count: counts.get(folder.name) ?? 0,
      })),
      { name: 'No Folder', count: counts.get('No Folder') ?? 0 },
    ]

    options.sort((a, b) => a.name.localeCompare(b.name))
    return options
  }, [folders, files])

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
      const latest = getLatestLocalNotebookDraft()
      setLocalNotebooks(latest ? [latest] : [])
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
    // Derive transcript text from stored documents if not already present
    let audioTranscript = localNotebook.audioTranscript as string | undefined
    if (!audioTranscript && Array.isArray(localNotebook.documents)) {
      const transcriptDocs = localNotebook.documents.filter((doc: any) => doc.type === 'transcript' && doc.content)
      audioTranscript = transcriptDocs
        .map((doc: any) => (doc.content ?? '').toString())
        .filter((text: string) => text.trim().length > 0)
        .join('\n\n')
    }

    // Derive uploaded file metadata list from documents if not already present
    let uploadedFiles = localNotebook.uploadedFiles as any[] | undefined
    if (!uploadedFiles && Array.isArray(localNotebook.documents)) {
      uploadedFiles = localNotebook.documents
        .filter((doc: any) => doc.type === 'file')
        .map((doc: any) => ({
          ...doc,
          // File blobs are not persisted; they can be re-attached later in the Notebook tab
          file: undefined,
          timestamp: doc.timestamp ? new Date(doc.timestamp) : new Date()
        }))
    }

    const localTags = Array.isArray(localNotebook.customTags)
      ? localNotebook.customTags
          .map((t: any) => sanitizeTagName(String(t)))
          .filter((t: string) => t && !isJunkTagName(t))
          .map((name: string) => ({ name, type: 'user_added' as const }))
      : []

    // Convert local notebook to FileWithMetadata format with all content
    const mockFile: FileWithMetadata = {
      id: localNotebook.id,
      title: localNotebook.title || 'Local notebook',
      file_type: 'notebook',
      status: 'completed',
      created_at: localNotebook.lastSaved || new Date().toISOString(),
      summary: 'Local notebook (not uploaded)',
      tags: localTags,
      // Add local notebook content
      localNotebookData: {
        notes: (localNotebook.notes ?? '').toString(),
        audioTranscript: audioTranscript ?? '',
        uploadedFiles: uploadedFiles ?? [],
        recordingTime: typeof localNotebook.recordingTime === 'number' ? localNotebook.recordingTime : 0
      }
    }
    onFileSelect(mockFile)
  }

  const handleConfirmDelete = async (fileId: string, isLocal: boolean = false) => {
    try {
      setDeletingId(fileId)
      if (isLocal) {
        // Wipe all local notebook drafts/cache (this app only supports a single "latest" local draft).
        clearLocalNotebookCache()
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

  const isReservedFolderName = (name: string) => {
    return name === 'No Folder' || name === 'All Folders'
  }

  const handleCreateFolder = async () => {
    const name = newFolderName
    if (!name.trim()) {
      toast.error('Folder name required')
      return
    }

    if (isReservedFolderName(name)) {
      toast.error('Invalid folder name', 'Please choose a different name.')
      return
    }

    const dup = folders.some((f) => f.name.toLowerCase() === name.toLowerCase())
    if (dup) {
      toast.error('Folder already exists', 'Please choose a different name.')
      return
    }

    const folder = await createFolder(name)
    if (folder) {
      await loadFolders()
      setNewFolderName('')
    } else {
      toast.error('Failed to create folder', 'Please try again.')
    }
  }
  
  const handleUpdateFolder = async (folderId: string, newName: string) => {
    const nextName = newName
    if (!nextName.trim()) {
      toast.error('Folder name required')
      return
    }

    if (isReservedFolderName(nextName)) {
      toast.error('Invalid folder name', 'Please choose a different name.')
      return
    }

    const current = folders.find((f) => f.id === folderId)
    if (!current) return

    const dup = folders.some((f) => f.id !== folderId && f.name.toLowerCase() === nextName.toLowerCase())
    if (dup) {
      toast.error('Folder name already exists', 'Please choose a different name.')
      return
    }

    // No-op rename: just close the editor.
    if (current.name === nextName) {
      setEditingFolder(null)
      return
    }

    try {
      setRenamingFolderId(folderId)
      const success = await updateFolder(folderId, nextName)
      if (success) {
        // If the user is filtering on this folder, keep the view stable.
        if (selectedFolderFilter === current.name) {
          setSelectedFolderFilter(nextName)
        }

        await loadFolders()
        await loadFiles() // Refresh files to get updated folder names
        setEditingFolder(null)
      } else {
        toast.error('Rename failed', 'Please try again.')
      }
    } finally {
      setRenamingFolderId(null)
    }
  }
  
  const handleRequestDeleteFolder = async (folder: FolderType) => {
    try {
      const fileCount = await getFolderFileCount(folder.id)

      // Only confirm when the folder actually contains files
      if (fileCount > 0) {
        setFolderDeleteConfirm({ id: folder.id, name: folder.name, fileCount })
        return
      }

      // Empty folder: delete immediately (no confirmation)
      const result = await deleteFolderKeepFiles(folder.id)
      if (result.success) {
        if (selectedFolderFilter === folder.name) {
          setSelectedFolderFilter(null)
        }
        await loadFolders()
        await loadFiles()
      } else {
        toast.error('Failed to delete folder', result.error || 'Please try again.')
      }
    } catch (error: any) {
      console.error('Error deleting folder:', error)
      toast.error('Failed to delete folder', error?.message || 'Please try again.')
    }
  }

  const handleConfirmDeleteFolder = async (mode: 'keepFiles' | 'deleteFiles') => {
    if (!folderDeleteConfirm) return

    const { id: folderId, name: folderName } = folderDeleteConfirm

    try {
      setDeletingFolderId(folderId)

      const result = mode === 'deleteFiles'
        ? await deleteFolderAndFiles(folderId)
        : await deleteFolderKeepFiles(folderId)

      if (!result.success) {
        toast.error('Failed to delete folder', result.error || 'Please try again.')
        return
      }

      // If the user was filtering on this folder, keep the view sensible after deletion.
      if (selectedFolderFilter === folderName) {
        setSelectedFolderFilter(mode === 'deleteFiles' ? null : 'No Folder')
      }

      await loadFolders()
      await loadFiles()
      setFolderDeleteConfirm(null)
    } finally {
      setDeletingFolderId(null)
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

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const enterBulkSelect = (action: 'move' | 'delete') => {
    setBulkActionType(action)
    setBulkSelectMode(true)
    setBulkSelectedFileIds([])
    setShowBulkMoveModal(false)
    setBulkSelectedTargetFolder(null)
    setShowBulkDeleteConfirm(false)
    setShowMoveModal(null)
    setSelectedTargetFolder(null)
  }

  const exitBulkSelect = () => {
    setBulkSelectMode(false)
    setBulkSelectedFileIds([])
    setShowBulkMoveModal(false)
    setBulkSelectedTargetFolder(null)
    setShowBulkDeleteConfirm(false)
    setBulkActionType('move')
  }

  const toggleBulkSelectedFile = (fileId: string) => {
    const isSelected = bulkSelectedFileIds.includes(fileId)
    const next = isSelected
      ? bulkSelectedFileIds.filter((id) => id !== fileId)
      : [...bulkSelectedFileIds, fileId]
    setBulkSelectedFileIds(next)
  }

  const handleBulkMove = async () => {
    if (bulkSelectedFileIds.length === 0) return

    const ok = await moveFilesToFolder(bulkSelectedFileIds, bulkSelectedTargetFolder)
    if (!ok) {
      toast.error('Failed to move files', 'Please try again.')
      return
    }

    await loadFiles()
    exitBulkSelect()
  }

  const handleBulkDelete = async () => {
    if (bulkSelectedFileIds.length === 0) return

    try {
      setBulkDeleteInProgress(true)
      const { deleted, failed } = await deleteFiles(bulkSelectedFileIds)

      if (deleted > 0) {
        toast.success(
          'Files deleted',
          `Deleted ${deleted} file${deleted === 1 ? '' : 's'}${failed ? ` • ${failed} failed` : ''}.`
        )
      }

      if (failed > 0 && deleted === 0) {
        toast.error(
          'Delete failed',
          `${failed} file${failed === 1 ? '' : 's'} could not be deleted. Please try again.`
        )
      } else if (failed > 0) {
        toast.error(
          'Some files could not be deleted',
          `${failed} file${failed === 1 ? '' : 's'} could not be deleted. Please try again.`
        )
      }

      await loadFiles()
    } finally {
      setBulkDeleteInProgress(false)
      setShowBulkDeleteConfirm(false)
      exitBulkSelect()
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
      <div className="list-view-layout">
        <aside className={`list-view-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {!sidebarCollapsed && (
            <ListViewSidebar
              showTags={showTags}
              onShowTagsChange={setShowTags}
              folders={folders}
              newFolderName={newFolderName}
              onNewFolderNameChange={setNewFolderName}
              onCreateFolder={() => void handleCreateFolder()}
              editingFolder={editingFolder}
              renamingFolderId={renamingFolderId}
              onEditingFolderChange={setEditingFolder}
              onUpdateFolder={(folderId, name) => void handleUpdateFolder(folderId, name)}
              onRequestDeleteFolder={(folder) => void handleRequestDeleteFolder(folder)}
              selectedFolderFilter={selectedFolderFilter}
              onFolderFilterChange={(filter) => {
                setSelectedFolderFilter(filter)
              }}
              folderFilterOptions={folderFilterOptions}
              totalFileCount={files.length}
              bulkSelectMode={bulkSelectMode}
              onEnterBulkMoveSelectMode={() => enterBulkSelect('move')}
              onEnterBulkDeleteSelectMode={() => enterBulkSelect('delete')}
            />
          )}
        </aside>

        <button
          type="button"
          className={`list-view-sidebar-handle ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={toggleSidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="list-view-main">
          <div
            ref={mainScrollRef}
            className="list-view-main-scroll"
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
          >
            {bulkSelectMode && (
              <div className="lv-bulk-bar">
                <div className="lv-bulk-bar-left">
                  {bulkActionType === 'delete' ? <Trash2 size={14} /> : <Move size={14} />}
                  <span>Selection mode</span>
                  <span className="lv-bulk-bar-count">{bulkSelectedFileIds.length} selected</span>
                  {selectedFolderFilter && (
                    <span className="lv-bulk-bar-scope">(current folder only)</span>
                  )}
                </div>
                <div className="lv-bulk-bar-actions">
                  <button className="btn btn-outline btn-sm" onClick={exitBulkSelect}>
                    Cancel
                  </button>
                  {bulkActionType === 'delete' ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                      disabled={bulkSelectedFileIds.length === 0}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowBulkMoveModal(true)}
                      disabled={bulkSelectedFileIds.length === 0}
                    >
                      <Move size={14} />
                    </button>
                  )}
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
                      {folderName === 'No Folder' ? <FolderOpen size={18} /> : <Folder size={18} />}
                      {folderName} ({folderFiles.length})
                    </h3>
                    <div className="file-list">
                      {folderFiles.map((file, index) => {
                        const isBulkSelected = bulkSelectedFileIds.includes(file.id)
                        return (
                          <div
                            key={file.id || `file-${index}`}
                            className={`file-card ${selectedFileId === file.id ? 'selected' : ''} ${isBulkSelected ? 'bulk-selected' : ''}`}
                            onClick={(e) => {
                              const target = e.target as HTMLElement
                              if (target.closest('.file-actions')) return
                              if (target.closest('.file-select-checkbox')) return

                              if (bulkSelectMode) {
                                toggleBulkSelectedFile(file.id)
                                return
                              }

                              onFileSelect(file)
                            }}
                          >
                            <div className="file-header">
                              {bulkSelectMode && (
                                <div className="file-select-checkbox" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isBulkSelected}
                                    onChange={() => toggleBulkSelectedFile(file.id)}
                                    aria-label={`Select ${file.title || file.filename || 'file'}`}
                                  />
                                </div>
                              )}

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

                              {!bulkSelectMode && (
                                <div className="file-actions">
                                  <button
                                    className="action-btn move"
                                    title="Move to folder"
                                    onClick={() => setShowMoveModal({ fileId: file.id, fileName: file.title || file.filename || 'Untitled' })}
                                  >
                                    <Move size={16} />
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    title="Delete"
                                    onClick={() => setShowConfirm({ id: file.id, title: file.title || file.filename || 'Untitled' })}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {showTags && file.tags && file.tags.length > 0 && (
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
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <div className="modal-overlay">
          <div className="move-modal">
            <h3>Move Files</h3>
            <p>
              Move {bulkSelectedFileIds.length} file{bulkSelectedFileIds.length === 1 ? '' : 's'} to:
            </p>
            <div className="folder-options">
              <label className="folder-option">
                <input
                  type="radio"
                  name="bulkTargetFolder"
                  value=""
                  checked={bulkSelectedTargetFolder === null}
                  onChange={() => setBulkSelectedTargetFolder(null)}
                />
                <FolderOpen size={14} />
                No Folder
              </label>
              {folders.map((folder) => (
                <label key={folder.id} className="folder-option">
                  <input
                    type="radio"
                    name="bulkTargetFolder"
                    value={folder.id}
                    checked={bulkSelectedTargetFolder === folder.id}
                    onChange={() => setBulkSelectedTargetFolder(folder.id)}
                  />
                  <Folder size={14} />
                  {folder.name}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowBulkMoveModal(false)
                  setBulkSelectedTargetFolder(null)
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleBulkMove} disabled={bulkSelectedFileIds.length === 0}>
                <Move className="icon" />
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Delete Files</h3>
            <p>
              {`Are you sure you want to delete ${bulkSelectedFileIds.length} file${bulkSelectedFileIds.length === 1 ? '' : 's'}? This action cannot be undone.`}
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleteInProgress}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void handleBulkDelete()}
                disabled={bulkDeleteInProgress || bulkSelectedFileIds.length === 0}
              >
                <Trash2 className="icon" />
                {bulkDeleteInProgress ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <FolderOpen size={14} />
                No Folder
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
                  <Folder size={14} />
                  {folder.name}
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

      {folderDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <h3>Delete Folder</h3>
            <p>
              {`“${folderDeleteConfirm.name}” contains ${folderDeleteConfirm.fileCount} file${folderDeleteConfirm.fileCount === 1 ? '' : 's'}.`}
            </p>
            <p>
              Do you want to delete just the folder (files will be moved to “No Folder”), or delete the folder and all files inside it?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setFolderDeleteConfirm(null)}
                disabled={!!deletingFolderId}
              >
                Cancel
              </button>
              <button
                className="btn btn-warning"
                onClick={() => void handleConfirmDeleteFolder('keepFiles')}
                disabled={!!deletingFolderId}
              >
                {deletingFolderId ? 'Deleting...' : 'Delete folder'}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void handleConfirmDeleteFolder('deleteFiles')}
                disabled={!!deletingFolderId}
              >
                <Trash2 className="icon" />
                {deletingFolderId ? 'Deleting...' : 'Delete folder & files'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
