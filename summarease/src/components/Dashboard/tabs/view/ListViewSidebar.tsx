import React from 'react'
import { Folder, FolderOpen, Filter, Move, Plus, Settings, Trash2 } from 'lucide-react'
import type { Folder as FolderType } from '../../../../lib/api'

export interface FolderFilterOption {
  name: string
  count: number
}

interface ListViewSidebarProps {
  // Tags
  showTags: boolean
  onShowTagsChange: (show: boolean) => void

  // Folder management
  folders: FolderType[]
  newFolderName: string
  onNewFolderNameChange: (name: string) => void
  onCreateFolder: () => void
  editingFolder: { id: string; name: string } | null
  renamingFolderId: string | null
  onEditingFolderChange: (folder: { id: string; name: string } | null) => void
  onUpdateFolder: (folderId: string, newName: string) => void
  onRequestDeleteFolder: (folder: FolderType) => void

  // Folder filter
  selectedFolderFilter: string | null
  onFolderFilterChange: (filter: string | null) => void
  folderFilterOptions: FolderFilterOption[]
  totalFileCount: number

  // Bulk actions
  bulkSelectMode: boolean
  selectedBulkCount: number
  onEnterBulkSelectMode: () => void
  onExitBulkSelectMode: () => void
  onOpenBulkMoveModal: () => void
}

export const ListViewSidebar: React.FC<ListViewSidebarProps> = ({
  showTags,
  onShowTagsChange,
  folders,
  newFolderName,
  onNewFolderNameChange,
  onCreateFolder,
  editingFolder,
  renamingFolderId,
  onEditingFolderChange,
  onUpdateFolder,
  onRequestDeleteFolder,
  selectedFolderFilter,
  onFolderFilterChange,
  folderFilterOptions,
  totalFileCount,
  bulkSelectMode,
  selectedBulkCount,
  onEnterBulkSelectMode,
  onExitBulkSelectMode,
  onOpenBulkMoveModal,
}) => {
  const [folderEditMode, setFolderEditMode] = React.useState(false)
  const [showCreateFolderInput, setShowCreateFolderInput] = React.useState(false)
  const [createAttempted, setCreateAttempted] = React.useState(false)

  const folderByName = React.useMemo(() => {
    const map = new Map<string, FolderType>()
    folders.forEach((f) => map.set(f.name, f))
    return map
  }, [folders])

  React.useEffect(() => {
    if (createAttempted && newFolderName === '') {
      setShowCreateFolderInput(false)
      setCreateAttempted(false)
    }
  }, [createAttempted, newFolderName])

  const activateOnKey = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }

  const handleCreate = () => {
    setCreateAttempted(true)
    onCreateFolder()
  }

  return (
    <div className="list-view-sidebar-content">
      {/* Folder filter (and folder management) */}
      <div className="lv-sidebar-section">
        <div className="lv-sidebar-section-header">
          <Filter size={14} />
          <span>Filter by folder</span>
          <div className="lv-sidebar-section-header-actions">
            <button
              type="button"
              className={`lv-sidebar-icon-btn ${showCreateFolderInput ? 'active' : ''}`}
              onClick={() => {
                setShowCreateFolderInput((v) => !v)
                setCreateAttempted(false)
              }}
              title="Create folder"
              aria-label="Create folder"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className={`lv-sidebar-icon-btn ${folderEditMode ? 'active' : ''}`}
              onClick={() => setFolderEditMode((v) => !v)}
              title="Folder settings"
              aria-label="Folder settings"
              aria-pressed={folderEditMode}
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {showCreateFolderInput && (
          <div className="create-folder lv-sidebar-create-folder" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              placeholder="New folder name"
              className="folder-input"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setShowCreateFolderInput(false)
              }}
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newFolderName.trim()}
              className="btn btn-primary btn-sm"
              title="Create folder"
              aria-label="Create folder"
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        <div className="lv-sidebar-filter-list">
          <div
            className={`filter-btn lv-sidebar-filter-btn ${!selectedFolderFilter ? 'active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onFolderFilterChange(null)}
            onKeyDown={(e) => activateOnKey(e, () => onFolderFilterChange(null))}
          >
            <span className="lv-sidebar-filter-label">
              <span className="lv-sidebar-filter-label-text">All Folders</span>
            </span>
            {!folderEditMode && <span className="lv-sidebar-filter-count">{totalFileCount}</span>}
          </div>

          {folderFilterOptions.map(({ name, count }) => {
            const isNoFolder = name === 'No Folder'
            const folder = folderByName.get(name)
            const isRenamingThis = !!folder && editingFolder?.id === folder.id

            if (isRenamingThis && folder) {
              return (
                <div
                  key={name}
                  className="filter-btn lv-sidebar-filter-btn lv-sidebar-filter-edit"
                  title="Double-click to rename"
                >
                  <div className="lv-sidebar-folder-edit" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingFolder.name}
                      onChange={(e) => onEditingFolderChange({ ...editingFolder, name: e.target.value })}
                      className="folder-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onUpdateFolder(folder.id, editingFolder.name)
                        if (e.key === 'Escape') onEditingFolderChange(null)
                      }}
                      onBlur={() => {
                        if (renamingFolderId === folder.id) return
                        if (editingFolder.name !== folder.name) {
                          onUpdateFolder(folder.id, editingFolder.name)
                        } else {
                          onEditingFolderChange(null)
                        }
                      }}
                      disabled={renamingFolderId === folder.id}
                    />
                    <div className="lv-sidebar-folder-rename-hint">Enter/blur to save • Esc to cancel</div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={name}
                className={`filter-btn lv-sidebar-filter-btn ${selectedFolderFilter === name ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onFolderFilterChange(name)}
                onKeyDown={(e) => activateOnKey(e, () => onFolderFilterChange(name))}
                onDoubleClick={() => {
                  if (!folder) return
                  if (isNoFolder) return
                  onEditingFolderChange({ id: folder.id, name: folder.name })
                }}
                title={!isNoFolder && folder ? 'Double-click to rename' : undefined}
              >
                <span className="lv-sidebar-filter-label">
                  {isNoFolder ? <FolderOpen size={14} /> : <Folder size={14} />}
                  <span className="lv-sidebar-filter-label-text">{name}</span>
                </span>

                {folderEditMode ? (
                  !isNoFolder && folder ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void onRequestDeleteFolder(folder)
                      }}
                      className="btn btn-soft-danger btn-sm"
                      title="Delete folder"
                      aria-label={`Delete folder ${folder.name}`}
                      style={{ width: 32, height: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null
                ) : (
                  <span className="lv-sidebar-filter-count">{count}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tags toggle */}
      <div className="lv-sidebar-section">
        <div className="lv-sidebar-section-header">
          <span>Display</span>
        </div>

        <div className="tags-toggle lv-sidebar-tags-toggle">
          <span className="tags-toggle-label">Tags</span>
          <label className="lv-toggle" aria-label="Show tags">
            <input
              type="checkbox"
              checked={showTags}
              onChange={(e) => onShowTagsChange(e.target.checked)}
            />
            <span className="lv-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="lv-sidebar-section">
        <div className="lv-sidebar-section-header">
          <span>Bulk actions</span>
        </div>

        {!bulkSelectMode ? (
          <button className="filter-btn lv-sidebar-filter-btn active" onClick={onEnterBulkSelectMode}>
            Move files
          </button>
        ) : (
          <div className="lv-bulk-actions">
            <div className="lv-bulk-actions-meta">
              {selectedBulkCount} selected
            </div>
            <div className="lv-bulk-actions-buttons">
              <button className="btn btn-outline btn-sm" onClick={onExitBulkSelectMode}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={onOpenBulkMoveModal}
                disabled={selectedBulkCount === 0}
              >
                Move selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
