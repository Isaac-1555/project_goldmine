import React, { useState } from 'react'
import { Mic, Square, Pause, Play, Upload } from 'lucide-react'
import { AudioRecorder } from '../../Recording/AudioRecorder'
import { FileUploadModal } from '../../Upload/FileUploadModal'
import { createRecording } from '../../../lib/api'
import './RecordTab.css'

export const RecordTab: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Simulate recording timer
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    setIsRecording(true)
    setIsPaused(false)
    setRecordingTime(0)
    setTranscript('')
  }

  const handlePauseRecording = () => {
    setIsPaused(!isPaused)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setIsPaused(false)
    setShowSaveModal(true)
  }

  const handleSaveSummary = async () => {
    if (title.trim()) {
      try {
        setSaving(true)
        const fileId = await createRecording(title.trim(), transcript)
        
        if (fileId) {
          console.log('Recording saved successfully with ID:', fileId)
          setShowSaveModal(false)
          setTitle('')
          setRecordingTime(0)
          setTranscript('')
        } else {
          console.error('Failed to save recording')
          alert('Failed to save recording. Please try again.')
        }
      } catch (error) {
        console.error('Error saving recording:', error)
        alert('Failed to save recording. Please try again.')
      } finally {
        setSaving(false)
      }
    }
  }

  const handleCancelSave = () => {
    setShowSaveModal(false)
    setTitle('')
  }

  const handleUploadSuccess = (fileId: string) => {
    console.log('File uploaded successfully with ID:', fileId)
    // You could show a success message or redirect to the view tab
  }

  return (
    <div className="record-tab">
      <div className="record-container">
        {!isRecording ? (
          <div className="record-initial">
            <div className="action-options">
              <div className="action-card">
                <button className="record-button" onClick={handleStartRecording}>
                  <Mic className="record-icon" />
                </button>
                <h3>Record Audio</h3>
                <p>Click to start recording your lecture or meeting</p>
              </div>
              
              <div className="divider">
                <span>or</span>
              </div>
              
              <div className="action-card">
                <button className="upload-button" onClick={() => setShowUploadModal(true)}>
                  <Upload className="upload-icon" />
                </button>
                <h3>Upload Document</h3>
                <p>Upload a PDF or DOCX file to get a summary</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="record-active">
            <div className="record-controls">
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
            <div className="record-timer">
              {formatTime(recordingTime)}
            </div>
            <div className="recording-status">
              {isPaused ? 'Recording Paused' : 'Recording...'}
            </div>
          </div>
        )}

        <div className="transcript-section">
          <label htmlFor="transcript" className="transcript-label">
            Live Transcript
          </label>
          <textarea
            id="transcript"
            className="transcript-area"
            value={transcript}
            placeholder={isRecording ? "Transcript will appear here as you speak..." : "Start recording to see live transcript"}
            readOnly
          />
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="save-modal">
            <h3>Save Recording</h3>
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your recording"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={handleCancelSave}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={handleSaveSummary}
                disabled={!title.trim() || saving}
              >
                {saving ? 'Saving...' : 'Save Summary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}