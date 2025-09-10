import React, { useState, useEffect } from 'react'
import { Mic, Upload, Save, Check, Play, Pause, Square, Plus, X as XIcon } from 'lucide-react'
import { FileUploadModal } from '../../Upload/FileUploadModal'
import { createUnifiedContent, updateNotebookContent, addTagsToSummary } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import { processAudioTranscript } from '../../../lib/audioProcessor'
import { transcribeAudio } from '../../../lib/transcriptionService'
import { ResizableDivider } from '../../ResizableDivider'
import { NoteTaking } from '../../NoteTaking'
import { DocumentList, type DocumentItem } from '../../DocumentList'
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
  onExitEdit,
}) => {
  // State management
  const [title, setTitle] = useState(initialTitle || '')
  const [notes, setNotes] = useState(initialNotesHtml || '')
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localSaving, setLocalSaving] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(40)
  const [isLocalSave, setIsLocalSave] = useState(false)
  const [localSaveId, setLocalSaveId] = useState<string | undefined>(undefined)

  // Custom tags state
  const [customTagInput, setCustomTagInput] = useState('')
  const [customTags, setCustomTags] = useState<string[]>(initialTags)
  const [existingSummaryId] = useState<string | undefined>(initialSummaryId)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingChunks, setRecordingChunks] = useState<Blob[]>([])

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
  }, [mode, initialTitle, initialNotesHtml, initialDocuments, initialTranscriptText, initialTags])

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      setRecordingChunks([])
      setMediaRecorder(recorder)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordingChunks(prev => [...prev, event.data])
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(recordingChunks, { type: 'audio/webm' })
        await processRecording(audioBlob)
        stream.getTracks().forEach(track => track.stop())
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
    }
  }

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      setIsPaused(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }

  const processRecording = async (audioBlob: Blob) => {
    const recordingName = `Recording ${new Date().toLocaleTimeString()}`
    
    // Transcribe the audio
    const transcriptionResult = await transcribeAudio(audioBlob)
    
    let transcriptContent = ''
    if (transcriptionResult.success) {
      transcriptContent = transcriptionResult.transcript
    } else {
      transcriptContent = `[Transcription failed: ${transcriptionResult.error}]\n\nPlease manually add the transcript for this ${Math.round(recordingTime / 60)} minute recording.`
    }
    
    // Add transcript as a document
    const transcriptDocument: DocumentItem = {
      id: `transcript_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      name: `${recordingName} - Transcript`,
      type: 'transcript',
      content: transcriptContent,
      timestamp: new Date()
    }
    
    setDocuments(prev => [...prev, transcriptDocument])
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handler functions
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
      const existingLocal = JSON.parse(localStorage.getItem('summarease-local-notebooks') || '[]')
      const existingIndex = existingLocal.findIndex((item: any) => item.id === localData.id)
      
      if (existingIndex >= 0) {
        existingLocal[existingIndex] = localData
      } else {
        existingLocal.push(localData)
      }
      
      localStorage.setItem('summarease-local-notebooks', JSON.stringify(existingLocal))
      
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
        // Update existing notebook
        const updateResult = await updateNotebookContent(editingFileId, {
          notesHtml: notes || '',
          notesText: plainNotes,
          transcriptText: transcripts || undefined,
          newFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        })

        if (!updateResult.success) {
          alert('Failed to update content. Please try again.')
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
            const { summary, tags } = await processAudioTranscript(allContent)
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

            const finalTags = Array.from(new Set([...(tags || []), ...customTags]))
            if (summaryId && finalTags.length) {
              await addTagsToSummary(summaryId, finalTags)
            }
          } catch (error) {
            console.error('Failed to generate/update summary:', error)
          }
        }

        alert('Content updated successfully!')
        onExitEdit?.()
        return
      }

      // Create unified content with all sources (create mode)
      const { id: fileId, documentsExtractedText } = await createUnifiedContent(title.trim(), {
        audioTranscript: transcripts || undefined,
        uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        notes: notes?.trim() ? notes : undefined
      })
      
      if (fileId) {
        console.log('Content saved successfully with ID:', fileId)
        
        // Generate summary from all content sources (notes, transcript, uploaded docs)
        const contentSources: string[] = []
        if (transcripts.trim()) contentSources.push(transcripts.trim())
        if (plainNotes) contentSources.push(plainNotes)
        if (documentsExtractedText && documentsExtractedText.trim()) contentSources.push(documentsExtractedText.trim())
        
        const allContent = contentSources.join('\n\n')
        
        if (allContent) {
          try {
            const { summary, tags } = await processAudioTranscript(allContent)
            const finalTags = Array.from(new Set([...(tags || []), ...customTags]))
            await saveProcessedContent(fileId, summary, finalTags)
            console.log('Summary generated and saved successfully')
          } catch (error) {
            console.error('Failed to generate summary:', error)
          }
        }
        
        // Clear local storage and reset form
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
        setTitle('')
        setNotes('')
        setDocuments([])
        setIsLocalSave(false)
        setLocalSaveId(undefined)
        setCustomTags([])
        
        alert('Content saved successfully!')
      } else {
        alert('Failed to save content. Please try again.')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content. Please try again.')
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
                    const v = customTagInput.trim()
                    if (v && !customTags.includes(v)) setCustomTags((prev) => [...prev, v])
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
                  if (v && !customTags.includes(v)) setCustomTags((prev) => [...prev, v])
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
        <p>Take notes while reviewing content</p>
      </div>
      <NoteTaking
        initialContent={notes}
        onChange={(newNotes) => {
          if (!title.trim() && newNotes.trim() && !notes.trim()) {
            alert('Please enter a notebook title before taking notes.')
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
        onFilesSelected={handleFileUpload}
        mode="select"
      />
    </div>
  )
}
