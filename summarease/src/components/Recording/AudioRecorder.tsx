import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../Auth/AuthProvider'
import { supabase } from '../../lib/supabase'
import './AudioRecorder.css'

interface AudioRecorderProps {
  onRecordingComplete?: (fileId: string) => void
  onClose?: () => void
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onClose }) => {
  const { user } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Unable to access microphone. Please check your permissions.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const uploadRecording = async () => {
    if (!audioBlob || !user || !title.trim()) return

    setUploading(true)
    setError('')

    try {
      // Generate unique file path
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.webm`
      const filePath = `${user.id}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, audioBlob)

      if (uploadError) throw uploadError

      // Create file record in database
      const { data: fileData, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          title: title.trim(),
          file_type: 'audio',
          storage_path: filePath,
          status: 'processing'
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Trigger processing
      console.log('Recording uploaded successfully, starting transcription:', fileData)
      
      // Start processing in background
      import('../../lib/api').then(({ processFile }) => {
        processFile(fileData.id).then(result => {
          console.log('Processing result:', result)
        })
      })
      
      onRecordingComplete?.(fileData.id)
      onClose?.()
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload recording')
    } finally {
      setUploading(false)
    }
  }

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setTitle('')
    chunksRef.current = []
  }

  return (
    <div className="audio-recorder-modal">
      <div className="audio-recorder-content">
        <div className="recorder-header">
          <h2>Record Audio</h2>
          <button onClick={onClose} className="close-button">
            <X />
          </button>
        </div>

        <div className="recorder-body">
          {!audioBlob ? (
            <div className="recording-controls">
              <div className="recording-display">
                <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
                  <Mic className="mic-icon" />
                </div>
                <div className="recording-time">
                  {formatTime(recordingTime)}
                </div>
                {isRecording && (
                  <div className="recording-status">
                    {isPaused ? 'Paused' : 'Recording...'}
                  </div>
                )}
              </div>

              <div className="control-buttons">
                {!isRecording ? (
                  <button onClick={startRecording} className="start-button">
                    <Mic />
                    Start Recording
                  </button>
                ) : (
                  <div className="recording-buttons">
                    {!isPaused ? (
                      <button onClick={pauseRecording} className="pause-button">
                        <Pause />
                        Pause
                      </button>
                    ) : (
                      <button onClick={resumeRecording} className="resume-button">
                        <Play />
                        Resume
                      </button>
                    )}
                    <button onClick={stopRecording} className="stop-button">
                      <Square />
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="recording-preview">
              <div className="audio-player">
                <audio
                  ref={audioRef}
                  src={audioUrl || undefined}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                <div className="player-controls">
                  <button
                    onClick={isPlaying ? pauseAudio : playAudio}
                    className="play-button"
                  >
                    {isPlaying ? <Pause /> : <Play />}
                  </button>
                  <span className="recording-duration">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              </div>

              <div className="title-input">
                <label htmlFor="recording-title">Recording Title</label>
                <input
                  id="recording-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your recording"
                  maxLength={100}
                />
              </div>

              <div className="upload-actions">
                <button onClick={resetRecording} className="cancel-button">
                  Record Again
                </button>
                <button 
                  onClick={uploadRecording} 
                  className="upload-button"
                  disabled={uploading || !title.trim()}
                >
                  {uploading ? 'Uploading...' : 'Save & Transcribe'}
                </button>
              </div>
            </div>
          )}
        </div>

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