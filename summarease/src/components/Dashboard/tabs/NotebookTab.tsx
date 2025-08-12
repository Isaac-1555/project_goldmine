import React, { useState, useEffect } from 'react'
import { Mic, Square, Pause, Play, Upload, Save, X, Check } from 'lucide-react'
import { FileUploadModal } from '../../Upload/FileUploadModal'
import { createUnifiedContent } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { AudioTranscriber, processAudioTranscript } from '../../../lib/audioProcessor'
import { ResizableDivider } from '../../ResizableDivider'
import { NoteTaking } from '../../NoteTaking'
import { useNotebookState, type NotebookState } from '../../../hooks/useNotebookState'
import './RecordTab.css'

// Helper function to save summary and tags
async function saveProcessedAudio(fileId: string, summary: string, tags: string[]) {
  // Save summary
  const { data: summaryData, error: summaryError } = await supabase
    .from('summaries')
    .insert({
      file_id: fileId,
      summary_text: summary,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (summaryError) {
    throw new Error('Failed to save summary')
  }

  // Save tags
  for (const tagName of tags) {
    try {
      // Check if tag exists, create if not
      let { data: existingTag, error: tagSelectError } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .maybeSingle()

      if (tagSelectError) {
        console.error('Error checking tag:', tagSelectError)
        continue
      }

      let tagId: string

      if (existingTag) {
        tagId = existingTag.id
      } else {
        const { data: newTag, error: tagInsertError } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select('id')
          .single()

        if (tagInsertError) {
          console.error('Error creating tag:', tagInsertError)
          continue
        }
        tagId = newTag.id
      }

      // Link tag to summary
      await supabase
        .from('summary_tags')
        .insert({
          summary_id: summaryData.id,
          tag_id: tagId
        })
    } catch (error) {
      console.error('Error saving tag:', tagName, error)
    }
  }

  // Update file status to completed
  await supabase
    .from('files')
    .update({ status: 'completed' })
    .eq('id', fileId)
}

interface NotebookTabProps {
  // Optional props for external state management (for backward compatibility)
  state?: NotebookState
  updateState?: (updates: Partial<NotebookState>) => void
}

export const NotebookTab: React.FC<NotebookTabProps> = ({ 
  state: externalState, 
  updateState: externalUpdateState 
}) => {
  // Use internal state management if no external state is provided
  const [internalState, internalActions] = useNotebookState()
  
  // Use external state if provided, otherwise use internal state
  const state = externalState || internalState
  const {
    setTitle,
    setNotes,
    setAudioTranscript,
    addUploadedFiles,
    removeUploadedFile,
    startRecording,
    pauseRecording,
    stopRecording,
    updateRecordingTime,
    setLeftPanelWidth,
    updateState: internalUpdateState,
    saveLocally,
    clearLocalStorage,
    resetNotebook
  } = internalActions
  
  // Use external updateState if provided, otherwise use internal
  const updateState = externalUpdateState || internalUpdateState
  // Extract state values
  const {
    title,
    notes,
    audioTranscript,
    uploadedFiles,
    recordingTime,
    isRecording,
    isPaused,
    leftPanelWidth,
    saving,
    localSaving,
    isLocalSave,
    localSaveId
  } = state
  
  // Local state for components that don't need persistence
  const [transcriber] = useState(() => new AudioTranscriber())
  const [speechSupported, setSpeechSupported] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Check speech recognition support
  useEffect(() => {
    setSpeechSupported(transcriber.isSupported())
  }, [transcriber])

  // Recording timer (only if using external state management)
  useEffect(() => {
    if (!externalState) return // Skip if using internal state management
    
    let interval: NodeJS.Timeout
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        updateRecordingTime(recordingTime + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused, recordingTime, updateRecordingTime, externalState])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    if (!title.trim()) {
      alert('Please enter a notebook title before recording. The notebook won\'t start saving without a title.')
      return
    }
    
    startRecording()
    
    // Start live transcription if supported
    if (speechSupported) {
      try {
        transcriber.startListening((newTranscript) => {
          setAudioTranscript(newTranscript)
        })
      } catch (error) {
        console.error('Failed to start transcription:', error)
      }
    }
  }

  const handlePauseRecording = () => {
    pauseRecording()
  }

  const handleStopRecording = () => {
    stopRecording()
    
    // Stop transcription and get final transcript
    if (speechSupported) {
      const finalTranscript = transcriber.stopListening()
      setAudioTranscript(finalTranscript)
    }
  }

  const handleFileUpload = (files: File[]) => {
    if (!title.trim()) {
      alert('Please enter a notebook title before uploading files. The notebook won\'t start saving without a title.')
      return
    }
    addUploadedFiles(files)
  }

  const handleRemoveFile = (index: number) => {
    removeUploadedFile(index)
  }

  const handleLocalSave = async () => {
    if (localSaving || !title.trim()) return
    
    // Use the hook's saveLocally method if available, otherwise fallback to manual save
    if (!externalState) {
      await saveLocally()
      return
    }
    
    // Fallback for external state management
    try {
      updateState({ localSaving: true })
      
      const localData = {
        id: localSaveId || `local_${Date.now()}`,
        title: title.trim(),
        notes: notes,
        audioTranscript: audioTranscript,
        uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
        recordingTime: recordingTime,
        lastSaved: new Date().toISOString(),
        isLocalSave: true
      }
      
      // Save to localStorage
      const existingLocal = JSON.parse(localStorage.getItem('summarease-local-notebooks') || '[]')
      const existingIndex = existingLocal.findIndex((item: any) => item.id === localData.id)
      
      if (existingIndex >= 0) {
        existingLocal[existingIndex] = localData
      } else {
        existingLocal.push(localData)
      }
      
      localStorage.setItem('summarease-local-notebooks', JSON.stringify(existingLocal))
      
      updateState({ 
        isLocalSave: true, 
        localSaveId: localData.id 
      })
      
    } catch (error) {
      console.error('Error saving locally:', error)
    } finally {
      updateState({ localSaving: false })
    }
  }

  const handleDoneContent = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your content.')
      return
    }

    // Check if there's any content to save
    const hasContent = audioTranscript.trim() || notes.trim() || uploadedFiles.length > 0
    if (!hasContent) {
      alert('Please add some content before saving.')
      return
    }

    try {
      updateState({ saving: true })
      
      // Create unified content with all sources
      const fileId = await createUnifiedContent(title.trim(), {
        audioTranscript: audioTranscript.trim() || undefined,
        uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        notes: notes.trim() || undefined,
        recordingDuration: recordingTime || undefined
      })
      
      if (fileId) {
        console.log('Content saved successfully with ID:', fileId)
        
        // Generate summary from all content sources
        const contentSources = []
        if (audioTranscript.trim()) contentSources.push(audioTranscript.trim())
        if (notes.trim()) contentSources.push(notes.replace(/<[^>]*>/g, '').trim())
        
        // Add document content (will be processed in createUnifiedContent)
        const allContent = contentSources.join('\n\n')
        
        if (allContent) {
          try {
            const { summary, tags } = await processAudioTranscript(allContent)
            await saveProcessedAudio(fileId, summary, tags)
            console.log('Summary generated and saved successfully')
          } catch (error) {
            console.error('Failed to generate summary:', error)
          }
        }
        
        // Clear local storage and reset form
        if (!externalState) {
          clearLocalStorage()
          resetNotebook()
        } else {
          // Fallback for external state management
          if (localSaveId) {
            try {
              const existingLocal = JSON.parse(localStorage.getItem('summarease-local-notebooks') || '[]')
              const filtered = existingLocal.filter((item: any) => item.id !== localSaveId)
              localStorage.setItem('summarease-local-notebooks', JSON.stringify(filtered))
            } catch (error) {
              console.error('Error removing local save:', error)
            }
          }
          
          // Reset form
          updateState({
            title: '',
            audioTranscript: '',
            notes: '',
            uploadedFiles: [],
            recordingTime: 0,
            isLocalSave: false,
            localSaveId: undefined
          })
          
          // Clear localStorage
          try {
            localStorage.removeItem('summarease-notebook-state')
          } catch (error) {
            console.error('Error clearing notebook state:', error)
          }
        }
        
        alert('Content saved successfully!')
      } else {
        alert('Failed to save content. Please try again.')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content. Please try again.')
    } finally {
      updateState({ saving: false })
    }
  }

  const handleUploadSuccess = (files: File[]) => {
    addUploadedFiles(files)
    setShowUploadModal(false)
  }

  const renderLeftPanel = () => (
    <div className="notebook-left-panel">
      {/* Title Input and Save Buttons */}
      <div className="title-section">
        <div className="title-controls">
          <input
            type="text"
            className="title-input"
            placeholder="Enter notebook title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="save-buttons">
            <button 
              className="save-button local-save"
              onClick={handleLocalSave}
              disabled={localSaving}
              title="Save locally"
            >
              <Save className="save-icon" />
              {localSaving ? 'Saving...' : 'Save'}
            </button>
            <button 
              className="save-button done-save"
              onClick={handleDoneContent}
              disabled={saving || !title.trim()}
              title="Upload to database"
            >
              <Check className="save-icon" />
              {saving ? 'Uploading...' : 'Done'}
            </button>
          </div>
        </div>
        {isLocalSave && (
          <div className="local-save-indicator">
            <span className="save-status">Saved locally - Auto-saving every 5s</span>
          </div>
        )}
      </div>

      {/* Recording Section */}
      <div className="recording-section">
        <div className="section-header">
          <Mic className="section-icon" />
          <h3>Audio Recording</h3>
        </div>
        
        {!isRecording ? (
          <div className="recording-controls">
            <button 
              className="record-button icon-only" 
              onClick={handleStartRecording}
              title="Start Recording"
            >
              <Mic className="record-icon" />
            </button>
            <p className="recording-hint">
              {speechSupported 
                ? "Live transcription will appear below as you speak"
                : "Live transcription not supported in this browser"
              }
            </p>
          </div>
        ) : (
          <div className="recording-active">
            <div className="recording-controls">
              <button 
                className="control-button pause-button"
                onClick={handlePauseRecording}
                title={isPaused ? "Resume Recording" : "Pause Recording"}
              >
                {isPaused ? <Play /> : <Pause />}
              </button>
              <button 
                className="control-button stop-button"
                onClick={handleStopRecording}
                title="Stop Recording"
              >
                <Square />
              </button>
            </div>
            <div className="recording-info">
              <div className="record-timer">{formatTime(recordingTime)}</div>
              <div className="recording-status">
                {isPaused ? 'Recording Paused' : 'Recording...'}
              </div>
            </div>
          </div>
        )}

        {/* Audio Transcript */}
        <div className="transcript-section">
          <label className="transcript-label">Audio Transcript</label>
          <textarea
            className="transcript-area"
            value={audioTranscript}
            placeholder={
              !speechSupported 
                ? "Live transcription not supported. You can manually enter transcript here."
                : isRecording 
                  ? "Transcript will appear here as you speak..." 
                  : "Start recording to see live transcript"
            }
            readOnly={speechSupported && isRecording}
            onChange={!speechSupported || !isRecording ? (e) => setAudioTranscript(e.target.value) : undefined}
          />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="upload-section">
        <div className="section-header">
          <Upload className="section-icon" />
          <h3>Documents</h3>
        </div>
        
        <div className="upload-button-container">
          <button 
            className="upload-button icon-only"
            onClick={() => setShowUploadModal(true)}
            title="Add Documents"
          >
            <Upload className="upload-icon" />
          </button>
        </div>
        
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <button 
                  className="remove-file-button"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderRightPanel = () => (
    <div className="notebook-right-panel">
      <div className="notes-header">
        <h3>Notes</h3>
        <p>Take notes while recording or reviewing content</p>
      </div>
      <NoteTaking
        initialContent={notes}
        onChange={(newNotes) => {
          if (!title.trim() && newNotes.trim() && !notes.trim()) {
            alert('Please enter a notebook title before taking notes. The notebook won\'t start saving without a title.')
            return
          }
          console.log('Notes changed:', newNotes) // Debug log
          setNotes(newNotes)
        }}
        placeholder="Start typing your notes here..."
      />
    </div>
  )

  return (
    <div className="record-tab">
      <ResizableDivider
        leftContent={renderLeftPanel()}
        rightContent={renderRightPanel()}
        initialLeftWidth={leftPanelWidth}
        onResize={(width) => setLeftPanelWidth(width)}
        minLeftWidth={30}
        maxLeftWidth={70}
      />

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFilesSelected={handleUploadSuccess}
        mode="select"
      />
    </div>
  )
}