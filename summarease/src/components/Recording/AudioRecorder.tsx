import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, X, AlertCircle, Brain } from 'lucide-react'
import { LiveTranscriber } from '../../lib/webSpeechTranscription'
import { transcribeLecture } from '../../lib/transcriptionService'
import './AudioRecorder.css'

export interface AudioRecording {
  id: string
  name: string
  blob: Blob
  duration: number
  timestamp: Date
  transcript?: string
  cleanTranscript?: string
  studyNotes?: string
  summary?: string
}

interface AudioRecorderProps {
  onRecordingComplete?: (recording: AudioRecording) => void
  onClose?: () => void
  /**
   * When true, run the lecture transcription pipeline (Gemini STT + cleanup)
   * before invoking onRecordingComplete. Falls back to live transcript on error.
   */
  useLectureTranscription?: boolean
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, onClose, useLectureTranscription }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [liveTranscriber, setLiveTranscriber] = useState<LiveTranscriber | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [isLectureProcessing, setIsLectureProcessing] = useState(false)
  const [lectureProcessingError, setLectureProcessingError] = useState<string | null>(null)

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

      // Initialize Web Speech API transcriber
      const transcriber = new LiveTranscriber(
        (transcript, isFinal) => {
          setLiveTranscript(transcript)
        },
        (error) => {
          console.error('Transcription error:', error)
          // Don't show error to user, transcription is optional
        }
      )
      
      // Start transcription if supported
      if (transcriber.isSupported()) {
        try {
          transcriber.start()
          setLiveTranscriber(transcriber)
          setShowTranscript(true)
        } catch (err) {
          console.error('Failed to start transcription:', err)
        }
      }

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
        
        // Stop transcription and get final transcript
        if (liveTranscriber) {
          const finalTranscript = liveTranscriber.stop()
          setLiveTranscript(finalTranscript)
          setLiveTranscriber(null)
        }
        
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
      // Pause transcription
      if (liveTranscriber) {
        liveTranscriber.pause()
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
      
      // Resume transcription
      if (liveTranscriber) {
        liveTranscriber.resume()
      }
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

  const saveRecording = async () => {
    if (!audioBlob || !title.trim() || isLectureProcessing) return

    try {
      setError('')
      setLectureProcessingError(null)

      let transcript = liveTranscript || ''
      let cleanTranscript: string | undefined
      let studyNotes: string | undefined
      let summary: string | undefined

      if (useLectureTranscription) {
        try {
          setIsLectureProcessing(true)
          const { raw, processed } = await transcribeLecture(audioBlob, {
            language: 'en-US',
            isLecture: true,
          })

          cleanTranscript = processed.cleanTranscript?.trim() || raw.text?.trim() || undefined
          studyNotes = processed.studyNotes?.trim() || undefined
          summary = processed.summary?.trim() || undefined

          if (cleanTranscript) {
            transcript = cleanTranscript
          } else if (raw.text?.trim()) {
            transcript = raw.text.trim()
          }
        } catch (err) {
          console.error('Lecture transcription failed, falling back to live transcript:', err)
          setLectureProcessingError(
            err instanceof Error
              ? err.message
              : 'Lecture transcription failed. Using live transcript instead.'
          )
        } finally {
          setIsLectureProcessing(false)
        }
      }

      const recording: AudioRecording = {
        id: `recording_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        name: title.trim(),
        blob: audioBlob,
        duration: recordingTime,
        timestamp: new Date(),
        transcript: transcript || undefined,
        cleanTranscript,
        studyNotes,
        summary,
      }

      onRecordingComplete?.(recording)
      onClose?.()
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save recording')
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
    setLiveTranscript('')
    setShowTranscript(false)
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
                {showTranscript && liveTranscript && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    maxHeight: '100px',
                    overflowY: 'auto',
                    fontSize: '14px',
                    color: '#666',
                    textAlign: 'left'
                  }}>
                    <small style={{ color: '#999' }}>Live transcript:</small>
                    <div style={{ marginTop: '4px' }}>{liveTranscript}</div>
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
              
              {liveTranscript && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <strong>Transcript:</strong>
                  <div style={{ marginTop: '4px' }}>{liveTranscript}</div>
                </div>
              )}

              {isLectureProcessing && (
                <div className="lecture-processing-banner">
                  <Brain className="lecture-processing-icon" />
                  <span>Processing lecture audio with AI. This may take a moment…</span>
                </div>
              )}

              {lectureProcessingError && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '12px',
                  }}
                >
                  ⚠️ {lectureProcessingError}
                </div>
              )}

              <div className="upload-actions">
                <button onClick={resetRecording} className="cancel-button">
                  Record Again
                </button>
                <button 
                  onClick={saveRecording} 
                  className="upload-button"
                  disabled={!title.trim() || isLectureProcessing}
                >
                  Save Recording
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