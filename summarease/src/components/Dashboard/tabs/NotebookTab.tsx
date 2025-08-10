import React, { useState, useEffect } from 'react'
import { Mic, Square, Pause, Play, Upload, Save, X } from 'lucide-react'
import { FileUploadModal } from '../../Upload/FileUploadModal'
import { createUnifiedContent } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { AudioTranscriber, processAudioTranscript } from '../../../lib/audioProcessor'
import { ResizableDivider } from '../../ResizableDivider'
import { NoteTaking } from '../../NoteTaking'
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

interface NotebookState {
  title: string
  notes: string
  audioTranscript: string
  uploadedFiles: File[]
  recordingTime: number
  isRecording: boolean
  isPaused: boolean
  leftPanelWidth: number
  saving: boolean
}

interface NotebookTabProps {
  state: NotebookState
  updateState: (updates: Partial<NotebookState>) => void
}

export const NotebookTab: React.FC<NotebookTabProps> = ({ state, updateState }) => {
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
    saving
  } = state
  
  // Local state for components that don't need persistence
  const [transcriber] = useState(() => new AudioTranscriber())
  const [speechSupported, setSpeechSupported] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Check speech recognition support
  useEffect(() => {
    setSpeechSupported(transcriber.isSupported())
  }, [transcriber])

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        updateState({ recordingTime: recordingTime + 1 })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused, recordingTime, updateState])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    updateState({
      isRecording: true,
      isPaused: false,
      recordingTime: 0,
      audioTranscript: ''
    })
    
    // Start live transcription if supported
    if (speechSupported) {
      try {
        transcriber.startListening((newTranscript) => {
          updateState({ audioTranscript: newTranscript })
        })
      } catch (error) {
        console.error('Failed to start transcription:', error)
      }
    }
  }

  const handlePauseRecording = () => {
    updateState({ isPaused: !isPaused })
  }

  const handleStopRecording = () => {
    updateState({ isRecording: false, isPaused: false })
    
    // Stop transcription and get final transcript
    if (speechSupported) {
      const finalTranscript = transcriber.stopListening()
      updateState({ audioTranscript: finalTranscript })
    }
  }

  const handleFileUpload = (files: File[]) => {
    updateState({ uploadedFiles: [...uploadedFiles, ...files] })
  }

  const handleRemoveFile = (index: number) => {
    updateState({ uploadedFiles: uploadedFiles.filter((_, i) => i !== index) })
  }

  const handleSaveContent = async () => {
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
        
        // Reset form
        updateState({
          title: '',
          audioTranscript: '',
          notes: '',
          uploadedFiles: [],
          recordingTime: 0
        })
        
        // Clear localStorage
        try {
          localStorage.removeItem('summarease-notebook-state')
        } catch (error) {
          console.error('Error clearing notebook state:', error)
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
    updateState({ uploadedFiles: [...uploadedFiles, ...files] })
    setShowUploadModal(false)
  }

  const renderLeftPanel = () => (
    <div className="notebook-left-panel">
      {/* Title Input */}
      <div className="title-section">
        <input
          type="text"
          className="title-input"
          placeholder="Enter notebook title..."
          value={title}
          onChange={(e) => updateState({ title: e.target.value })}
        />
      </div>

      {/* Recording Section */}
      <div className="recording-section">
        <div className="section-header">
          <Mic className="section-icon" />
          <h3>Audio Recording</h3>
        </div>
        
        {!isRecording ? (
          <div className="recording-controls">
            <button className="record-button" onClick={handleStartRecording}>
              <Mic className="record-icon" />
              Start Recording
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
              >
                {isPaused ? <Play /> : <Pause />}
              </button>
              <button 
                className="control-button stop-button"
                onClick={handleStopRecording}
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
            onChange={!speechSupported || !isRecording ? (e) => updateState({ audioTranscript: e.target.value }) : undefined}
          />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="upload-section">
        <div className="section-header">
          <Upload className="section-icon" />
          <h3>Documents</h3>
        </div>
        
        <button 
          className="upload-button"
          onClick={() => setShowUploadModal(true)}
        >
          <Upload className="upload-icon" />
          Add Documents
        </button>
        
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

      {/* Save Button */}
      <div className="save-section">
        <button 
          className="save-content-button"
          onClick={handleSaveContent}
          disabled={saving || !title.trim()}
        >
          <Save className="save-icon" />
          {saving ? 'Saving...' : 'Save Notebook'}
        </button>
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
        onChange={(newNotes) => updateState({ notes: newNotes })}
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
        onResize={(width) => updateState({ leftPanelWidth: width })}
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