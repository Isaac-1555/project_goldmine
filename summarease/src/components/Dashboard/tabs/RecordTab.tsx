import React, { useState, useEffect } from 'react'
import { Mic, Square, Pause, Play, Upload } from 'lucide-react'
import { AudioRecorder } from '../../Recording/AudioRecorder'
import { FileUploadModal } from '../../Upload/FileUploadModal'
import { createRecording } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { AudioTranscriber, processAudioTranscript } from '../../../lib/audioProcessor'
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

export const RecordTab: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [transcriber] = useState(() => new AudioTranscriber())
  const [speechSupported, setSpeechSupported] = useState(false)

  // Check speech recognition support
  useEffect(() => {
    setSpeechSupported(transcriber.isSupported())
  }, [transcriber])

  // Recording timer
  useEffect(() => {
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
    
    // Start live transcription if supported
    if (speechSupported) {
      try {
        transcriber.startListening((newTranscript) => {
          setTranscript(newTranscript)
        })
      } catch (error) {
        console.error('Failed to start transcription:', error)
      }
    }
  }

  const handlePauseRecording = () => {
    setIsPaused(!isPaused)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setIsPaused(false)
    
    // Stop transcription and get final transcript
    if (speechSupported) {
      const finalTranscript = transcriber.stopListening()
      setTranscript(finalTranscript)
    }
    
    setShowSaveModal(true)
  }

  const handleSaveSummary = async () => {
    if (title.trim()) {
      try {
        setSaving(true)
        
        // First create the recording with transcript
        const fileId = await createRecording(title.trim(), transcript)
        
        if (fileId) {
          console.log('Recording saved successfully with ID:', fileId)
          
          // If we have transcript content, process it to generate summary
          if (transcript.trim()) {
            console.log('Processing transcript to generate summary...')
            try {
              const { summary, tags } = await processAudioTranscript(transcript)
              
              // Save the summary and tags to the database
              await saveProcessedAudio(fileId, summary, tags)
              console.log('Summary generated and saved successfully')
            } catch (error) {
              console.error('Failed to generate summary:', error)
              // Don't fail the whole operation if summary generation fails
            }
          }
          
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
            placeholder={
              !speechSupported 
                ? "Live transcription not supported in this browser. You can manually enter transcript after recording."
                : isRecording 
                  ? "Transcript will appear here as you speak..." 
                  : "Start recording to see live transcript"
            }
            readOnly={speechSupported}
            onChange={!speechSupported ? (e) => setTranscript(e.target.value) : undefined}
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