import React, { useState, useRef } from 'react'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../Auth/AuthProvider'
import { useSettingsConfig } from '../../hooks/useSettingsConfig'
import { supabase } from '../../lib/supabase'
import './FileUpload.css'

interface FileUploadProps {
  onUploadComplete?: (fileId: string) => void
  onClose?: () => void
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete, onClose }) => {
  const { user } = useAuth()
  const { settings } = useSettingsConfig()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    setError('')
    
    // Validate file type
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
      setError('Please upload a PDF, DOCX, PPTX, image (PNG/JPG), or audio (MP3) file')
      return
    }
    
    // Validate file size - different limits for audio
    const maxSize = file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3')
      ? 30 * 1024 * 1024  // 30MB for audio
      : 10 * 1024 * 1024  // 10MB for documents and images
    
    if (file.size > maxSize) {
      const limitText = maxSize === 30 * 1024 * 1024 ? '30MB' : '10MB'
      setError(`File size must be less than ${limitText}`)
      return
    }
    
    setSelectedFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const uploadFile = async () => {
    if (!selectedFile || !user) return

    setUploading(true)
    setError('')

    try {
      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Determine file type
      let fileType: 'pdf' | 'docx' | 'pptx' | 'image' | 'audio' = 'pdf'
      if (selectedFile.type.includes('word') || selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.doc')) {
        fileType = 'docx'
      } else if (selectedFile.type.includes('presentation') || selectedFile.name.endsWith('.pptx')) {
        fileType = 'pptx'
      } else if (selectedFile.type.startsWith('image/')) {
        fileType = 'image'
      } else if (selectedFile.type.startsWith('audio/') || selectedFile.name.endsWith('.mp3')) {
        fileType = 'audio'
      }

      // Create file record in database
      const { data: fileData, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          title: selectedFile.name.replace(/\.[^/.]+$/, ''), // Remove extension
          file_type: fileType,
          storage_path: filePath,
          status: 'processing'
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Trigger processing
      console.log('File uploaded successfully, starting processing:', fileData)
      
      // Start processing in background
      import('../../lib/api').then(({ processFile }) => {
        processFile(fileData.id, settings.autoTags).then(result => {
          console.log('Processing result:', result)
        })
      })
      
      onUploadComplete?.(fileData.id)
      onClose?.()
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="file-upload-modal">
      <div className="file-upload-content">
        <div className="upload-header">
          <h2>Upload Document</h2>
          <button onClick={onClose} className="close-button">
            <X />
          </button>
        </div>

        {!selectedFile ? (
          <div
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="upload-icon" />
            <h3>Drop your file here</h3>
            <p>or click to browse files</p>
            <div className="supported-formats">
              <span>Supported: PDF, DOCX, PPTX, PNG, JPG, MP3</span>
              <span>Max size: 10MB (30MB for audio)</span>
            </div>
            
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
            <div className="file-info">
              <File className="file-icon" />
              <div className="file-details">
                <h4>{selectedFile.name}</h4>
                <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={clearSelection} className="remove-file">
                <X />
              </button>
            </div>
            
            <div className="upload-actions">
              <button onClick={clearSelection} className="cancel-button">
                Choose Different File
              </button>
              <button 
                onClick={uploadFile} 
                className="upload-button"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}