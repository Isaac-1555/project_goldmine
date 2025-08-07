import React, { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { uploadFile } from '../../lib/api'
import './FileUploadModal.css'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (fileId: string) => void
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a PDF or DOCX file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB')
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
          <button onClick={handleClose} className="close-button">
            <X />
          </button>
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
              <h4>Upload PDF or DOCX</h4>
              <p>Drag and drop your file here, or click to browse</p>
              <p className="file-info">Maximum file size: 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
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
                >
                  <X />
                </button>
              </div>

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
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            onClick={handleClose} 
            className="cancel-button"
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            onClick={handleUpload}
            className="upload-button"
            disabled={!selectedFile || !title.trim() || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  )
}