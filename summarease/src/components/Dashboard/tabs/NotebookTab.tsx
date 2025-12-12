import React, { useState, useEffect, useRef } from 'react'
import { Mic, Upload, Save, Check, Play, Pause, Square, Plus, X as XIcon, Brain } from 'lucide-react'
import { FileUploadModal } from '../../Upload/FileUploadModal'
import { createUnifiedContent, updateNotebookContent, addTagsToSummary } from '../../../lib/api'
import { sanitizeTagName, isJunkTagName } from '../../../lib/tagUtils'
import { supabase } from '../../../lib/supabase'
import { processAudioTranscript } from '../../../lib/audioProcessor'
import type { SummaryConfig } from '../../../types/summaryTypes'
import { LiveTranscriber, getFallbackTranscript } from '../../../lib/webSpeechTranscription'
import { transcribeLecture } from '../../../lib/transcriptionService'
import { useSettingsConfig } from '../../../hooks/useSettingsConfig'
import { useNotebookState } from '../../../hooks/useNotebookState'
import { ResizableDivider } from '../../ResizableDivider'
import { NoteTaking } from '../../NoteTaking'
import { DocumentList, type DocumentItem } from '../../DocumentList'
import { FolderSelector } from '../../FolderSelector'
import './RecordTab.css'

// Helper function to save summary and tags
async function saveProcessedContent(fileId: string, summary: string, tags: string[]) {
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
  mode?: 'create' | 'edit'
  editingFileId?: string
  initialTitle?: string
  initialNotesHtml?: string
  initialTranscriptText?: string
  initialDocuments?: DocumentItem[]
  initialTags?: string[]
  initialSummaryId?: string
  initialFolderId?: string | null
  onExitEdit?: () => void
}

export const NotebookTab: React.FC<NotebookTabProps> = ({
  mode = 'create',
  editingFileId,
  initialTitle,
  initialNotesHtml,
  initialTranscriptText,
  initialDocuments = [],
  initialTags = [],
  initialSummaryId,
  initialFolderId,
  onExitEdit,
}) => {
  // Hooks
  const { getSummaryConfig } = useSettingsConfig()
  const [notebookState, notebookActions] = useNotebookState()
  
  // State management
  const [title, setTitle] = useState(initialTitle || '')
  const [notes, setNotes] = useState(initialNotesHtml || '')
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localSaving, setLocalSaving] = useState(false)
  const [isLocalSave, setIsLocalSave] = useState(false)
  const [localSaveId, setLocalSaveId] = useState<string | undefined>(undefined)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null)

  // Track whether we've already attempted to restore from local cache in this session
  const hasRestoredFromLocalRef = useRef(false)

  // Custom tags state
  const [customTagInput, setCustomTagInput] = useState('')
  const [customTags, setCustomTags] = useState<string[]>(initialTags)
  const [existingSummaryId] = useState<string | undefined>(initialSummaryId)
  
  // Toast notification state
  const [notification, setNotification] = useState<string | null>(null)
  const [confirmNewNotebookOpen, setConfirmNewNotebookOpen] = useState(false)
  
  // Restore latest local notebook draft on initial mount (create mode only)
  useEffect(() => {
    if (mode !== 'create') return
    if (hasRestoredFromLocalRef.current) return

    // If we're prefilled from an editing context or explicit initial props, don't override
    const hasInitialContent = Boolean(
      initialTitle ||
      initialNotesHtml ||
      (initialDocuments && initialDocuments.length > 0)
    )
    if (hasInitialContent) return

    try {
      const raw = localStorage.getItem('sat-brain-local-notebooks')
      if (!raw) return

      const all = JSON.parse(raw)
      if (!Array.isArray(all) || all.length === 0) return

      // Pick the most recently saved local notebook
      const latest = [...all].sort((a: any, b: any) => {
        const aTime = new Date(a.lastSaved || a.last_saved || 0).getTime()
        const bTime = new Date(b.lastSaved || b.last_saved || 0).getTime()
        return bTime - aTime
      })[0]

      if (!latest) return

      const hasAnyContent = Boolean(
        (latest.title && latest.title.trim()) ||
        (latest.notes && latest.notes.trim()) ||
        (latest.documents && latest.documents.length > 0)
      )
      if (!hasAnyContent) return

      // Restore core notebook content
      setTitle(latest.title || '')
      setNotes(latest.notes || '')

      if (Array.isArray(latest.documents)) {
        const restoredDocs: DocumentItem[] = latest.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          size: doc.size,
          content: doc.content,
          // File blobs are not persisted in localStorage; they must be re-attached before upload
          file: undefined,
          timestamp: doc.timestamp ? new Date(doc.timestamp) : new Date()
        }))
        setDocuments(restoredDocs)
      } else {
        // Backward compatibility for older shapes that stored audioTranscript/uploadedFiles separately
        const fallbackDocs: DocumentItem[] = []

        if (typeof (latest as any).audioTranscript === 'string' && (latest as any).audioTranscript.trim()) {
          fallbackDocs.push({
            id: `transcript_local_${Date.now()}`,
            name: 'Transcript',
            type: 'transcript',
            content: (latest as any).audioTranscript,
            size: undefined,
            file: undefined,
            timestamp: new Date(latest.lastSaved || Date.now())
          })
        }

        if (Array.isArray((latest as any).uploadedFiles)) {
          (latest as any).uploadedFiles.forEach((f: any, index: number) => {
            fallbackDocs.push({
              id: f.id || `file_local_${Date.now()}_${index}`,
              name: f.name || 'File',
              type: 'file',
              size: f.size,
              content: undefined,
              file: undefined,
              timestamp: f.timestamp ? new Date(f.timestamp) : new Date(latest.lastSaved || Date.now())
            })
          })
        }

        if (fallbackDocs.length > 0) {
          setDocuments(fallbackDocs)
        }
      }

      setIsLocalSave(true)
      setLocalSaveId(latest.id)
      hasRestoredFromLocalRef.current = true
    } catch (error) {
      console.error('Error restoring notebook from local cache:', error)
    }
  }, [mode, initialTitle, initialNotesHtml, initialDocuments])

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const [liveTranscriber, setLiveTranscriber] = useState<LiveTranscriber | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const [isLectureProcessing, setIsLectureProcessing] = useState(false)
  const [lectureProcessingError, setLectureProcessingError] = useState<string | null>(null)
  const finalTranscriptRef = useRef<string>('')

  // Notification utility
  const showNotification = (message: string, duration: number = 4000) => {
    setNotification(message)
    setTimeout(() => setNotification(null), duration)
  }

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

  // If entering edit mode later, sync initial props
  useEffect(() => {
    if (mode === 'edit') {
      if (initialTitle) setTitle(initialTitle)
      if (initialNotesHtml) setNotes(initialNotesHtml)
      if (initialDocuments?.length) setDocuments(initialDocuments)
      if (initialTags?.length) setCustomTags(initialTags)
      if (initialFolderId !== undefined) setSelectedFolderId(initialFolderId)
      // If transcript text exists but not present as a DocumentItem, add it
      if (initialTranscriptText && !initialDocuments.some(d => d.type === 'transcript')) {
        const transcriptDocument: DocumentItem = {
          id: `transcript_prefill_${Date.now()}`,
          name: 'Transcript',
          type: 'transcript',
          content: initialTranscriptText,
          timestamp: new Date(),
        }
        setDocuments(prev => [transcriptDocument, ...prev])
      }
    }
  }, [mode, initialTitle, initialNotesHtml, initialDocuments, initialTranscriptText, initialTags, initialFolderId])

  // Auto-save locally every 5 seconds if there's content
  useEffect(() => {
    if (!title.trim() && !notes.trim() && documents.length === 0) return
    
    const interval = setInterval(() => {
      handleLocalSave()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [title, notes, documents])

  // Recording functions
  const startRecording = async () => {
    try {
      // Request microphone permission explicitly
      console.log('Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      console.log('Microphone permission granted')
      
      const recorder = new MediaRecorder(stream)
      
      recordingChunksRef.current = []
      setMediaRecorder(recorder)
      setTranscriptionError(null)
      
      // Initialize Web Speech API transcriber
      const transcriber = new LiveTranscriber(
        (transcript, isFinal) => {
          console.log('📝 Live transcript update:', {
            transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
            length: transcript.length,
            isFinal
          })
          setLiveTranscript(transcript)
          // Also store in ref to preserve value
          if (transcript && transcript.trim()) {
            finalTranscriptRef.current = transcript
          }
        },
        (error) => {
          console.error('❌ Transcription error:', error)
          setTranscriptionError(error)
        }
      )
      
      // Check if Web Speech API is supported
      const isSupported = transcriber.isSupported()
      console.log('Checking Web Speech API support:', isSupported)
      
      if (isSupported) {
        try {
          console.log('Attempting to start Web Speech API...')
          transcriber.start()
          setLiveTranscriber(transcriber)
          console.log('Web Speech API started successfully')
        } catch (err) {
          console.error('Failed to start Web Speech API:', err)
          setTranscriptionError('Speech recognition failed to start')
          // Set a more informative error message
          setLiveTranscript('[Speech recognition failed to initialize. Error: ' + (err as Error).message + ']')
        }
      } else {
        console.warn('Web Speech API not supported in this browser')
        setTranscriptionError('Speech recognition not supported in this browser')
        // Don't set liveTranscript to error here - let it remain empty
        // The error will be handled in processRecording
      }
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        // Use ref directly to avoid closure issues
        console.log('🎤 Recorder stopped, finalTranscriptRef:', finalTranscriptRef.current?.substring(0, 100))
        
        // Small delay to ensure any final transcript updates are captured
        setTimeout(async () => {
          console.log('🔍 Processing with finalTranscriptRef:', finalTranscriptRef.current?.substring(0, 100))
          await processRecording(audioBlob)
          stream.getTracks().forEach(track => track.stop())
        }, 200)
      }
      
      recorder.start()
      setIsRecording(true)
      setRecordingTime(0)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Unable to access microphone. Please check permissions.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      setIsPaused(true)
      // Pause transcription
      if (liveTranscriber) {
        liveTranscriber.pause()
      }
    }
  }

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      setIsPaused(false)
      // Resume transcription
      if (liveTranscriber) {
        liveTranscriber.resume()
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      setIsRecording(false)
      setIsPaused(false)
      
      // Stop transcription and save final transcript before stopping media recorder
      if (liveTranscriber) {
        const finalTranscript = liveTranscriber.stop()
        console.log('Final transcript from Web Speech API:', finalTranscript)
        // Store transcript in ref to preserve it through the async flow
        if (finalTranscript && finalTranscript.trim()) {
          finalTranscriptRef.current = finalTranscript
          setLiveTranscript(finalTranscript)
        }
      }
      
      // Stop media recorder after saving transcript
      mediaRecorder.stop()
    }
  }

  const processRecording = async (audioBlob: Blob) => {
    const recordingName = `Recording ${new Date().toLocaleTimeString()}`

    let transcriptContent = ''
    let isValidTranscript = false

    // Use ref value which is more reliable than state
    const capturedTranscript = finalTranscriptRef.current || liveTranscript

    console.log('🎯 Processing recording - initial transcript state:', {
      hasLiveTranscript: !!liveTranscript,
      hasFinalTranscript: !!finalTranscriptRef.current,
      transcriptPreview:
        capturedTranscript?.substring(0, 100) +
        (capturedTranscript && capturedTranscript.length > 100 ? '...' : ''),
      transcriptLength: capturedTranscript?.length || 0,
      hasError: !!transcriptionError,
      error: transcriptionError,
    })

    // First, try Jarvis-style lecture transcription (Gemini STT + cleanup)
    setIsLectureProcessing(true)
    setLectureProcessingError(null)
    try {
      const { raw, processed } = await transcribeLecture(audioBlob, {
        language: 'en-US',
        isLecture: true,
      })

      const clean = processed.cleanTranscript?.trim()
      if (clean) {
        transcriptContent = clean
        isValidTranscript = true
        console.log('✅ Using cleaned lecture transcript from Gemini:', {
          preview: transcriptContent.substring(0, 120) +
            (transcriptContent.length > 120 ? '...' : ''),
          length: transcriptContent.length,
        })
      } else if (raw.text?.trim()) {
        transcriptContent = raw.text.trim()
        isValidTranscript = true
        console.log('✅ Using raw Gemini transcript (no separate clean transcript returned).')
      }
    } catch (err) {
      console.error(
        '❌ Lecture transcription pipeline failed, falling back to Web Speech transcript:',
        err
      )
      setLectureProcessingError(
        err instanceof Error
          ? err.message
          : 'Lecture transcription failed. Using browser transcript instead.'
      )
    } finally {
      setIsLectureProcessing(false)
    }

    // Fall back to Web Speech transcript if provider did not give a usable one
    if (!isValidTranscript) {
      console.log('⚠️ Falling back to Web Speech API transcript.')

      console.log('🎯 Web Speech transcript state:', {
        hasLiveTranscript: !!liveTranscript,
        hasFinalTranscript: !!finalTranscriptRef.current,
        transcriptPreview:
          capturedTranscript?.substring(0, 100) +
          (capturedTranscript && capturedTranscript.length > 100 ? '...' : ''),
        transcriptLength: capturedTranscript?.length || 0,
        hasError: !!transcriptionError,
        error: transcriptionError,
      })

      if (capturedTranscript && capturedTranscript.trim() && !capturedTranscript.startsWith('[')) {
        transcriptContent = capturedTranscript
        isValidTranscript = true
        console.log('✅ Using Web Speech API transcript:', {
          preview: transcriptContent.substring(0, 100) + '...',
          length: transcriptContent.length,
        })
      } else {
        // No valid transcript captured
        console.log('⚠️ No valid transcript captured')
        console.log('capturedTranscript:', capturedTranscript)
        console.log('finalTranscriptRef.current:', finalTranscriptRef.current)
        console.log('liveTranscript:', liveTranscript)

        if (transcriptionError) {
          console.log('Transcription had an error:', transcriptionError)
          transcriptContent = `[Transcription Error: ${transcriptionError}]\n\nPlease type your transcript manually.`
        } else {
          console.log('No transcript captured - speech may not have been detected')
          transcriptContent =
            '[No speech detected]\n\nThe Web Speech API did not capture any speech. Please ensure:\n1. You spoke clearly into the microphone\n2. Your microphone is working\n3. You allowed microphone permissions\n\nTry recording again or type your transcript manually.'
        }
        isValidTranscript = false // Don't try to generate summary from error messages
      }
    }

    // Add transcript as a document
    const transcriptDocument: DocumentItem = {
      id: `transcript_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      name: `${recordingName} - Transcript`,
      type: 'transcript',
      content: transcriptContent,
      timestamp: new Date(),
    }

    setDocuments(prev => [...prev, transcriptDocument])
    setRecordingTime(0)

    // Reset transcription state after using it
    // Use setTimeout to avoid race conditions with state updates
    setTimeout(() => {
      setLiveTranscript('')
      setLiveTranscriber(null)
      setTranscriptionError(null)
      finalTranscriptRef.current = '' // Clear the ref as well
    }, 500)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handler functions
  const hasNotebookContent = () => {
    return Boolean(title.trim() || notes.trim() || documents.length > 0)
  }

  const startNewNotebook = () => {
    // Remove this draft from localStorage collections
    try {
      if (localSaveId) {
        const existingRaw = localStorage.getItem('sat-brain-local-notebooks') || '[]'
        const existingLocal = JSON.parse(existingRaw)
        if (Array.isArray(existingLocal)) {
          const filtered = existingLocal.filter((item: any) => item.id !== localSaveId)
          localStorage.setItem('sat-brain-local-notebooks', JSON.stringify(filtered))
        }
      }
      // Also clear any working notebook state used by hooks
      localStorage.removeItem('sat-brain-notebook-state')
    } catch (error) {
      console.error('Error clearing local notebook state:', error)
    }

    // Stop any active recording and reset recording-related state
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    } catch (err) {
      console.error('Error stopping media recorder during reset:', err)
    }
    recordingChunksRef.current = []
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)

    if (liveTranscriber) {
      try {
        liveTranscriber.stop()
      } catch (err) {
        console.error('Error stopping live transcriber during reset:', err)
      }
    }
    setLiveTranscriber(null)
    setLiveTranscript('')
    setTranscriptionError(null)
    setIsLectureProcessing(false)
    setLectureProcessingError(null)
    finalTranscriptRef.current = ''

    // Reset core notebook content and local save state
    setTitle('')
    setNotes('')
    setDocuments([])
    setCustomTags([])
    setCustomTagInput('')
    setSelectedFolderId(null)
    setIsLocalSave(false)
    setLocalSaveId(undefined)
    setShowUploadModal(false)

    showNotification('Started a new notebook')
  }

  const handleNewNotebook = () => {
    if (mode !== 'create') return

    if (hasNotebookContent()) {
      setNotification(null)
      setConfirmNewNotebookOpen(true)
      return
    }

    startNewNotebook()
  }

  const handleFileUpload = (files: File[]) => {
    const newDocuments: DocumentItem[] = files.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      name: file.name,
      type: 'file' as const,
      file,
      size: file.size,
      timestamp: new Date()
    }))
    
    setDocuments(prev => [...prev, ...newDocuments])
    setShowUploadModal(false)
  }


  const handleRemoveDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }

  const handleLocalSave = async () => {
    if (localSaving || !title.trim()) return
    
    try {
      setLocalSaving(true)
      
      const localData = {
        id: localSaveId || `local_${Date.now()}`,
        title: title.trim(),
        notes: notes,
        documents: documents.map(doc => ({
          ...doc,
          // Don't store file blob in localStorage for performance
          file: undefined
        })),
        lastSaved: new Date().toISOString(),
        isLocalSave: true
      }
      
      // Save to localStorage
      const existingLocal = JSON.parse(localStorage.getItem('sat-brain-local-notebooks') || '[]')
      const existingIndex = existingLocal.findIndex((item: any) => item.id === localData.id)
      
      if (existingIndex >= 0) {
        existingLocal[existingIndex] = localData
      } else {
        existingLocal.push(localData)
      }
      
      localStorage.setItem('sat-brain-local-notebooks', JSON.stringify(existingLocal))
      
      setIsLocalSave(true)
      setLocalSaveId(localData.id)
      
    } catch (error) {
      console.error('Error saving locally:', error)
    } finally {
      setLocalSaving(false)
    }
  }

  const handleDoneContent = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your content.')
      return
    }

    // Check if there's any content to save
    const hasContent = (notes && notes.trim()) || documents.length > 0
    if (!hasContent) {
      alert('Please add some content before saving.')
      return
    }

    // Warn if there are "metadata-only" file documents that were restored from a previous session
    const missingFileDocs = documents.filter(doc => doc.type === 'file' && !doc.file)
    if (missingFileDocs.length > 0) {
      const names = missingFileDocs.map(doc => doc.name).join(', ')
      const proceed = window.confirm(
        `Some attached files came from a previous session and cannot be uploaded automatically.\n\n` +
        `${names}\n\n` +
        'You can reattach them using the Upload button before clicking Done.\n\n' +
        'Press OK to continue without these files, or Cancel to go back and reattach them.'
      )
      if (!proceed) {
        return
      }
    }

    try {
      setSaving(true)
      
      // Prepare content sources
      const uploadedFiles = documents.filter(doc => doc.type === 'file' && doc.file).map(doc => doc.file!)
      const transcripts = documents
        .filter(doc => doc.type === 'transcript')
        .map(doc => (doc.content || '').toString())
        .join('\n\n')

      const plainNotes = (notes || '').replace(/<[^>]*>/g, '').trim()

      if (mode === 'edit' && editingFileId) {
        // Check if this is a local notebook (ID starts with 'local_')
        if (editingFileId.startsWith('local_')) {
          // Update local notebook
          const localData = {
            id: editingFileId,
            title: title.trim(),
            notes: notes,
            documents: documents.map(doc => ({
              ...doc,
              // Don't store file blob in localStorage for performance
              file: undefined
            })),
            lastSaved: new Date().toISOString(),
            isLocalSave: true
          }
          
          // Update in localStorage
          const existingLocal = JSON.parse(localStorage.getItem('sat-brain-local-notebooks') || '[]')
          const existingIndex = existingLocal.findIndex((item: any) => item.id === editingFileId)
          
          if (existingIndex >= 0) {
            existingLocal[existingIndex] = localData
          } else {
            existingLocal.push(localData)
          }
          
          localStorage.setItem('sat-brain-local-notebooks', JSON.stringify(existingLocal))
          
          alert('Local notebook updated successfully!')
          onExitEdit?.()
          return
        }

        // Update existing cloud notebook
        const updateResult = await updateNotebookContent(editingFileId, {
          notesHtml: notes || '',
          notesText: plainNotes,
          transcriptText: transcripts || undefined,
          newFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          folderId: selectedFolderId,
        })

        if (!updateResult.success) {
          showNotification('Failed to update content. Please try again.')
          return
        }

        // Re-generate summary from combined sources
        const contentSources: string[] = []
        if (transcripts.trim()) contentSources.push(transcripts.trim())
        if (plainNotes) contentSources.push(plainNotes)
        if (updateResult.newDocsExtractedText && updateResult.newDocsExtractedText.trim()) contentSources.push(updateResult.newDocsExtractedText.trim())
        const allContent = contentSources.join('\n\n')

        if (allContent) {
          try {
            // Use summary configuration from settings
            const summaryConfig = getSummaryConfig()
            
            const { summary, tags } = await processAudioTranscript(allContent, summaryConfig)
            // Update or insert summary
            let summaryId = existingSummaryId
            if (summaryId) {
              const { error } = await supabase
                .from('summaries')
                .update({ summary_text: summary })
                .eq('id', summaryId)
              if (error) throw error
            } else {
              const { data: newSummary, error: summaryInsertError } = await supabase
                .from('summaries')
                .insert({ file_id: editingFileId, summary_text: summary, created_at: new Date().toISOString() })
                .select('id')
                .single()
              if (summaryInsertError) throw summaryInsertError
              summaryId = newSummary.id
            }

            const MAX_TAGS = 12
            const finalTags = Array.from(new Set([...(tags || []), ...customTags]
              .map(t => sanitizeTagName(t))
              .filter(t => t && !isJunkTagName(t))
            )).slice(0, MAX_TAGS)
            if (summaryId && finalTags.length) {
              await addTagsToSummary(summaryId, finalTags as any)
            }
          } catch (error) {
            console.error('Failed to generate/update summary:', error)
          }
        }

        showNotification('Content updated successfully!')
        onExitEdit?.()
        return
      }

      // Create unified content with all sources (create mode)
      const { id: fileId, documentsExtractedText } = await createUnifiedContent(title.trim(), {
        audioTranscript: transcripts || undefined,
        uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        notes: notes?.trim() ? notes : undefined
      }, selectedFolderId)
      
      if (fileId) {
        console.log('✅ Content saved successfully with ID:', fileId)
        
        // Generate summary from all content sources (notes, transcript, uploaded docs)
        const contentSources: string[] = []
        if (transcripts.trim()) {
          contentSources.push(transcripts.trim())
          console.log('📄 Including transcript in summary:', transcripts.substring(0, 100) + '...')
        }
        if (plainNotes) contentSources.push(plainNotes)
        if (documentsExtractedText && documentsExtractedText.trim()) contentSources.push(documentsExtractedText.trim())
        
        const allContent = contentSources.join('\n\n')
        console.log('📊 Total content for summary:', {
          length: allContent.length,
          preview: allContent.substring(0, 200) + '...'
        })
        
        if (allContent) {
          try {
            console.log('🤖 Calling processAudioTranscript with content...')
            
            // Use summary configuration from settings
            const summaryConfig = getSummaryConfig()
            
            const { summary, tags } = await processAudioTranscript(allContent, summaryConfig)
            console.log('📝 Summary generated:', summary.substring(0, 100) + '...')
            const MAX_TAGS = 12
            const finalTags = Array.from(new Set([...(tags || []), ...customTags]
              .map(t => sanitizeTagName(t))
              .filter(t => t && !isJunkTagName(t))
            )).slice(0, MAX_TAGS)
            await saveProcessedContent(fileId, summary, finalTags)
            console.log('✅ Summary generated and saved successfully')
          } catch (error) {
            console.error('Failed to generate summary:', error)
          }
        }
        
        // Clear local storage and reset form
        if (localSaveId) {
          try {
            const existingLocal = JSON.parse(localStorage.getItem('sat-brain-local-notebooks') || '[]')
            const filtered = existingLocal.filter((item: any) => item.id !== localSaveId)
            localStorage.setItem('sat-brain-local-notebooks', JSON.stringify(filtered))
          } catch (error) {
            console.error('Error removing local save:', error)
          }
        }
        
        // Reset form
        setTitle('')
        setNotes('')
        setDocuments([])
        setIsLocalSave(false)
        setLocalSaveId(undefined)
        setCustomTags([])
        setSelectedFolderId(null)
        
        showNotification('Content saved successfully!')
      } else {
        showNotification('Failed to save content. Please try again.')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      showNotification('Failed to save content. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const renderLeftPanel = () => (
    <div className="notebook-left-panel">
      {/* Title Input and Save Buttons */}
      <div className="title-section">
        <input
          type="text"
          className="title-input"
          placeholder="Enter notebook title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 8,
          }}
        >
          <FolderSelector
            selectedFolderId={selectedFolderId}
            onFolderSelect={setSelectedFolderId}
            label="Save to folder"
            placeholder="Select folder (optional)"
          />
          {mode === 'create' && (
            <button
              type="button"
              className="btn new-notebook-button"
              onClick={handleNewNotebook}
            >
              New Notebook
            </button>
          )}
        </div>
        <div className="save-buttons">
          <button 
            className="btn btn-primary"
            onClick={handleLocalSave}
            disabled={localSaving}
          >
            <Save className="save-icon" />
            {localSaving ? 'Saving...' : 'Save'}
          </button>
          <button 
            className="btn btn-success"
            onClick={handleDoneContent}
            disabled={saving || !title.trim()}
          >
            <Check className="save-icon" />
            {mode === 'edit' ? (saving ? 'Updating...' : 'Update') : (saving ? 'Uploading...' : 'Done')}
          </button>
        </div>
        {isLocalSave && mode !== 'edit' && (
          <div className="local-save-indicator">
            ✓ Saved locally - Auto-saving every 5s
          </div>
        )}

        {/* Custom Tags Input */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Tags</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {customTags.map((tag) => (
              <span key={tag} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {tag}
                <button
                  type="button"
                  onClick={() => setCustomTags((prev) => prev.filter((t) => t !== tag))}
                  className="btn btn-soft-danger btn-sm"
                  title="Remove tag"
                  style={{ width: 20, height: 20, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ))}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = customTagInput.trim()
                    if (v && v.length > 0 && !customTags.includes(v)) {
                      setCustomTags((prev) => [...prev, v])
                    }
                    setCustomTagInput('')
                  }
                }}
                placeholder="Add a tag and press Enter"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className="btn btn-soft-primary btn-sm"
                onClick={() => {
                  const v = customTagInput.trim()
                  if (v && v.length > 0 && !customTags.includes(v)) {
                    setCustomTags((prev) => [...prev, v])
                  }
                  setCustomTagInput('')
                }}
                title="Add tag"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        {!isRecording ? (
<button className="btn btn-danger" onClick={startRecording}>
            <Mic className="btn-icon" />
            Record
          </button>
        ) : (
          <div className="recording-controls">
<button 
              className="btn btn-warning" 
              onClick={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? <Play className="btn-icon" /> : <Pause className="btn-icon" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
<button className="btn btn-gray" onClick={stopRecording}>
              <Square className="btn-icon" />
              Stop
            </button>
          </div>
        )}
        
<button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
          <Upload className="btn-icon" />
          Upload
        </button>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          <span className="recording-text">
            {isPaused ? 'Recording Paused' : 'Recording...'} {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Live Transcript Display */}
      {isRecording && liveTranscript && (
        <div className="live-transcript-preview" style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Live Transcript (Web Speech API):
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
            {liveTranscript || 'Listening...'}
          </div>
        </div>
      )}

      {/* Lecture processing status */}
      {isLectureProcessing && (
        <div className="lecture-processing-banner">
          <Brain className="lecture-processing-icon" />
          <span>Processing lecture audio with AI. This may take a moment…</span>
        </div>
      )}

      {/* Transcription Error Display (Web Speech) */}
      {transcriptionError && (
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
          ⚠️ {transcriptionError}
        </div>
      )}

      {/* Lecture transcription pipeline error */}
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

      {/* Documents List */}
      <div className="documents-container">
        <DocumentList
          documents={documents}
          onRemoveDocument={handleRemoveDocument}
          className="documents-list"
        />
      </div>
    </div>
  )

  const renderRightPanel = () => (
    <div className="notebook-right-panel">
      <div className="notes-header">
        <h3>Notes</h3>
      </div>
      <NoteTaking
        initialContent={notes}
        onChange={(newNotes) => {
          if (!title.trim() && newNotes.trim() && !notes.trim()) {
            showNotification('Please enter a notebook title before taking notes.')
            return
          }
          setNotes(newNotes)
        }}
        placeholder="Start typing your notes here..."
      />
    </div>
  )

  return (
    <div className="record-tab">
      {/* Notification Toasts */}
      {confirmNewNotebookOpen ? (
        <div className="notification-toast notification-toast--confirm" role="alertdialog" aria-live="polite">
          <div className="notification-toast__message">Start a new notebook?</div>
          <div className="notification-toast__subtext">
            This will clear the current title, notes, transcripts, and locally saved attachments for this draft.
          </div>
          <div className="notification-toast__actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setConfirmNewNotebookOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setConfirmNewNotebookOpen(false)
                startNewNotebook()
              }}
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        notification && (
          <div className="notification-toast">
            {notification}
          </div>
        )
      )}
      
      <ResizableDivider
        leftContent={renderLeftPanel()}
        rightContent={renderRightPanel()}
        initialLeftWidth={notebookState.leftPanelWidth}
        onResize={(width) => notebookActions.setLeftPanelWidth(width)}
        minLeftWidth={30}
        maxLeftWidth={70}
      />

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFilesSelected={handleFileUpload}
        mode="select"
      />
    </div>
  )
}
