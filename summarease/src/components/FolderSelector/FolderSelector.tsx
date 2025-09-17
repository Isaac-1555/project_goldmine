import React, { useState, useEffect } from 'react'
import { Folder, Plus, X } from 'lucide-react'
import { getUserFolders, createFolder, type Folder as FolderType } from '../../lib/api'
import './FolderSelector.css'

interface FolderSelectorProps {
  selectedFolderId?: string | null
  onFolderSelect: (folderId: string | null) => void
  className?: string
  label?: string
  placeholder?: string
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  selectedFolderId,
  onFolderSelect,
  className = '',
  label = 'Folder',
  placeholder = 'Select a folder...'
}) => {
  const [folders, setFolders] = useState<FolderType[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creating, setCreating] = useState(false)

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

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'CREATE_NEW') {
      setShowNewFolderInput(true)
      return
    }
    onFolderSelect(value === '' ? null : value)
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
            <button
              onClick={handleCreateFolder}
              disabled={creating || !newFolderName.trim()}
              className="btn btn-primary btn-sm"
              title="Create folder"
            >
              {creating ? '...' : <Plus size={14} />}
            </button>
            <button
              onClick={handleCancelCreate}
              className="btn btn-gray btn-sm"
              title="Cancel"
              disabled={creating}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <select
          value={selectedFolderId || ''}
          onChange={handleFolderChange}
          className="folder-selector-dropdown"
          disabled={loading}
        >
          <option value="">{loading ? 'Loading folders...' : placeholder}</option>
          <option value="">📁 No Folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              📁 {folder.name}
            </option>
          ))}
          <option value="CREATE_NEW">+ Create New Folder</option>
        </select>
      )}
    </div>
  )
}