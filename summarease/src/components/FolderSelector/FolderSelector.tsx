import React, { useState, useEffect } from 'react'
import { Folder, FolderOpen, FolderPlus, Plus, X } from 'lucide-react'
import { getUserFolders, createFolder, updateFolder, type Folder as FolderType } from '../../lib/api'
import { useToast } from '../../hooks/useToast'
import { AppTooltip } from '../ui/AppTooltip'
import { CustomSelect, type SelectOption } from '../CustomSelect'
import './FolderSelector.css'

interface FolderSelectorProps {
  selectedFolderId?: string | null
  onFolderSelect: (folderId: string | null) => void
  className?: string
  label?: string
  placeholder?: string
  enableTooltips?: boolean
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  selectedFolderId,
  onFolderSelect,
  className = '',
  label = 'Folder',
  placeholder = 'Select a folder...',
  enableTooltips = false,
}) => {
  const toast = useToast()

  const [folders, setFolders] = useState<FolderType[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)

  // Rename inside dropdown (double click)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    loadFolders()
  }, [])

  const loadFolders = async () => {
    setLoading(true)
    try {
      const userFolders = await getUserFolders()
      setFolders(userFolders)
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderChange = (value: string) => {
    if (value === 'CREATE_NEW') {
      setShowNewFolderInput(true)
      return
    }
    // Handle special placeholder values
    if (value === '__PLACEHOLDER__' || value === '__NO_FOLDER__' || value === '') {
      onFolderSelect(null)
      return
    }
    onFolderSelect(value)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    setCreating(true)
    try {
      const newFolder = await createFolder(newFolderName.trim())
      if (newFolder) {
        setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.localeCompare(b.name)))
        onFolderSelect(newFolder.id)
        setNewFolderName('')
        setShowNewFolderInput(false)
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleCancelCreate = () => {
    setNewFolderName('')
    setShowNewFolderInput(false)
  }

  const beginRenameFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return
    setEditingFolderId(folderId)
    setEditingFolderName(folder.name)
  }

  const cancelRenameFolder = () => {
    setEditingFolderId(null)
    setEditingFolderName('')
    setRenaming(false)
  }

  const commitRenameFolder = async () => {
    if (!editingFolderId) return
    const nextName = editingFolderName.trim()
    if (!nextName) {
      toast.error('Folder name required')
      return
    }

    setRenaming(true)
    try {
      const ok = await updateFolder(editingFolderId, nextName)
      if (!ok) {
        toast.error('Rename failed', 'Please try again.')
        return
      }

      toast.success('Folder renamed')
      await loadFolders()
    } finally {
      setRenaming(false)
      setEditingFolderId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder()
    } else if (e.key === 'Escape') {
      handleCancelCreate()
    }
  }

  return (
    <div className={`folder-selector ${className}`}>
      {label && (
        <label className="folder-selector-label">
          <Folder className="folder-label-icon" />
          {label}
        </label>
      )}
      
      {showNewFolderInput ? (
        <div className="new-folder-input-container">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter folder name..."
            className="new-folder-input"
            autoFocus
            disabled={creating}
          />
          <div className="new-folder-actions">
            {enableTooltips ? (
              <AppTooltip content="Create folder">
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creating || !newFolderName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {creating ? '...' : <Plus size={14} />}
                </button>
              </AppTooltip>
            ) : (
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
                className="btn btn-primary btn-sm"
                title="Create folder"
              >
                {creating ? '...' : <Plus size={14} />}
              </button>
            )}

            {enableTooltips ? (
              <AppTooltip content="Cancel">
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="btn btn-gray btn-sm"
                  disabled={creating}
                >
                  <X size={14} />
                </button>
              </AppTooltip>
            ) : (
              <button
                type="button"
                onClick={handleCancelCreate}
                className="btn btn-gray btn-sm"
                title="Cancel"
                disabled={creating}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <CustomSelect
          value={selectedFolderId || '__NO_FOLDER__'}
          onChange={handleFolderChange}
          closeOnSelect={false}
          onOptionDoubleClick={(opt) => {
            const v = String(opt.value)
            if (v === '__PLACEHOLDER__' || v === '__NO_FOLDER__' || v === 'CREATE_NEW') return
            beginRenameFolder(v)
          }}
          renderOption={(opt) => {
            const v = String(opt.value)

            if (v === '__PLACEHOLDER__') {
              return <span className="custom-select-option-label">{opt.label}</span>
            }

            if (v === '__NO_FOLDER__') {
              return (
                <span className="folder-option-label">
                  <FolderOpen size={14} />
                  <span className="folder-option-text">{opt.label}</span>
                </span>
              )
            }

            if (v === 'CREATE_NEW') {
              return (
                <span className="folder-option-label">
                  <FolderPlus size={14} />
                  <span className="folder-option-text">{opt.label}</span>
                </span>
              )
            }

            if (editingFolderId === v) {
              return (
                <span className="folder-option-edit" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    className="folder-rename-input"
                    value={editingFolderName}
                    disabled={renaming}
                    autoFocus
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void commitRenameFolder()
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelRenameFolder()
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => {
                      if (!renaming) {
                        cancelRenameFolder()
                      }
                    }}
                  />
                  <span className="folder-rename-hint">Enter to save</span>
                </span>
              )
            }

            return (
              <span className="folder-option-label">
                <Folder size={14} />
                <span className="folder-option-text">{opt.label}</span>
              </span>
            )
          }}
          options={[
            { value: '__PLACEHOLDER__', label: loading ? 'Loading folders...' : placeholder, disabled: true },
            { value: '__NO_FOLDER__', label: 'No Folder' },
            ...folders.map((folder): SelectOption => ({
              value: folder.id,
              label: folder.name,
            })),
            { value: 'CREATE_NEW', label: 'Create New Folder' }
          ]}
          disabled={loading}
          ariaLabel={label || 'Select folder'}
          className="folder-selector-dropdown"
        />
      )}
    </div>
  )
}