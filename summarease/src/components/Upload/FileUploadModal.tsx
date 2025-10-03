import React, { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { uploadFile } from '../../lib/api'
import './FileUploadModal.css'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (fileId: string) => void
  onFilesSelected?: (files: File[]) => void // New prop for notebook use
  mode?: 'upload' | 'select' // New prop to determine behavior
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onFilesSelected,
  mode = 'upload' 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'audio/mpeg',
      'audio/mp3'
    ]
    
    const isValidType = allowedTypes.includes(file.type) || 
                        file.name.toLowerCase().endsWith('.pptx') ||
                        file.name.toLowerCase().endsWith('.mp3')
    
    if (!isValidType) {
      setError('Please select a PDF, DOCX, PPTX, image (PNG/JPG), or audio (MP3) file')
      return
    }

    // Different size limits for different file types
    const maxSize = file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3') 
      ? 30 * 1024 * 1024  // 30MB for audio
      : 10 * 1024 * 1024  // 10MB for documents and images
    
    if (file.size > maxSize) {
      const limitText = maxSize === 30 * 1024 * 1024 ? '30MB' : '10MB'
      setError(`File size must be less than ${limitText}`)
      return
    }

    setSelectedFile(file)
    setTitle(file.name.replace(/\.[^/.]+$/, '')) // Remove extension for default title
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    // If in select mode, just return the files
    if (mode === 'select' && onFilesSelected) {
      onFilesSelected([selectedFile])
      handleClose()
      return
    }

    // Otherwise, upload normally
    try {
      setUploading(true)
      setError('')
      
      const fileId = await uploadFile(selectedFile, title.trim())
      
      if (fileId) {
        onSuccess?.(fileId)
        handleClose()
      } else {
        setError('Failed to upload file. Please try again.')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setTitle('')
    setError('')
    setUploading(false)
    setDragActive(false)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="upload-modal">
        <div className="modal-header">
          <h3>Upload Document</h3>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              <AlertCircle className="error-icon" />
              {error}
            </div>
          )}

          {!selectedFile ? (
            <div 
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="upload-icon" />
              <h4>Upload Document, Image, or Audio</h4>
              <p>Drag and drop your file here, or click to browse</p>
              <p className="file-info">PDF, DOCX, PPTX, PNG, JPG, MP3 • Max: 10MB (30MB for audio)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.png,.jpg,.jpeg,.mp3"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-info-card">
                <FileText className="file-icon" />
                <div className="file-details">
                  <h4>{selectedFile.name}</h4>
                  <p>{formatFileSize(selectedFile.size)}</p>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="remove-file"
                  disabled={uploading}
                  title="Remove file"
                >
                  ×
                </button>
              </div>

              {mode === 'upload' && (
                <div className="form-group">
                  <label htmlFor="file-title">Title</label>
                  <input
                    id="file-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for your document"
                    disabled={uploading}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            onClick={handleClose} 
            className="btn btn-outline"
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            className="btn btn-primary"
            disabled={!selectedFile || (mode === 'upload' && !title.trim()) || uploading}
          >
            {uploading ? 'Uploading...' : mode === 'select' ? 'Add to Notebook' : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  )
}