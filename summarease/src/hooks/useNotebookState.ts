import { useState, useEffect, useCallback, useRef } from 'react'

export interface NotebookState {
  // Content
  title: string
  notes: string
  audioTranscript: string
  uploadedFiles: File[]
  
  // Recording state
  recordingTime: number
  isRecording: boolean
  isPaused: boolean
  
  // UI state
  leftPanelWidth: number
  
  // Save state
  saving: boolean
  localSaving: boolean
  isLocalSave: boolean
  localSaveId?: string
  
  // Metadata
  lastModified: string
  hasUnsavedChanges: boolean
}

interface NotebookActions {
  updateState: (updates: Partial<NotebookState>) => void
  resetNotebook: () => void
  saveLocally: () => Promise<void>
  loadFromLocalStorage: (id: string) => void
  clearLocalStorage: () => void
  setTitle: (title: string) => void
  setNotes: (notes: string) => void
  setAudioTranscript: (transcript: string) => void
  addUploadedFiles: (files: File[]) => void
  removeUploadedFile: (index: number) => void
  startRecording: () => void
  pauseRecording: () => void
  stopRecording: () => void
  updateRecordingTime: (time: number) => void
  setLeftPanelWidth: (width: number) => void
}

const INITIAL_STATE: NotebookState = {
  title: '',
  notes: '',
  audioTranscript: '',
  uploadedFiles: [],
  recordingTime: 0,
  isRecording: false,
  isPaused: false,
  leftPanelWidth: 40,
  saving: false,
  localSaving: false,
  isLocalSave: false,
  localSaveId: undefined,
  lastModified: new Date().toISOString(),
  hasUnsavedChanges: false
}

const STORAGE_KEYS = {
  NOTEBOOK_STATE: 'summarease-notebook-state',
  LOCAL_NOTEBOOKS: 'summarease-local-notebooks'
}

export const useNotebookState = (): [NotebookState, NotebookActions] => {
  const [state, setState] = useState<NotebookState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTEBOOK_STATE)
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('Restoring notebook state:', parsed) // Debug log
        return {
          ...INITIAL_STATE,
          title: parsed.title || '',
          notes: parsed.notes || '',
          audioTranscript: parsed.audioTranscript || '',
          leftPanelWidth: parsed.leftPanelWidth || 40,
          localSaveId: parsed.localSaveId,
          isLocalSave: Boolean(parsed.localSaveId),
          lastModified: parsed.lastModified || new Date().toISOString(),
          hasUnsavedChanges: false // Don't mark as unsaved when restoring
        }
      }
    } catch (error) {
      console.error('Error loading notebook state:', error)
    }
    console.log('Using initial notebook state') // Debug log
    return INITIAL_STATE
  })

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveContentRef = useRef<string>('')

  // Auto-save functionality
  const saveToLocalStorage = useCallback(async () => {
    if (state.localSaving || !state.title.trim()) return

    const contentToSave = JSON.stringify({
      title: state.title,
      notes: state.notes,
      audioTranscript: state.audioTranscript
    })

    // Only save if content has changed
    if (contentToSave === lastSaveContentRef.current) return

    try {
      setState(prev => ({ ...prev, localSaving: true }))

      const localData = {
        id: state.localSaveId || `local_${Date.now()}`,
        title: state.title.trim(),
        notes: state.notes,
        audioTranscript: state.audioTranscript,
        uploadedFiles: state.uploadedFiles.map(f => ({ 
          name: f.name, 
          size: f.size, 
          type: f.type 
        })),
        recordingTime: state.recordingTime,
        lastSaved: new Date().toISOString(),
        isLocalSave: true
      }

      // Save to local notebooks collection
      const existingLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_NOTEBOOKS) || '[]')
      const existingIndex = existingLocal.findIndex((item: any) => item.id === localData.id)

      if (existingIndex >= 0) {
        existingLocal[existingIndex] = localData
      } else {
        existingLocal.push(localData)
      }

      localStorage.setItem(STORAGE_KEYS.LOCAL_NOTEBOOKS, JSON.stringify(existingLocal))

      // Save current state
      const stateToSave = {
        title: state.title,
        notes: state.notes,
        audioTranscript: state.audioTranscript,
        leftPanelWidth: state.leftPanelWidth,
        localSaveId: localData.id,
        lastModified: localData.lastSaved
      }
      localStorage.setItem(STORAGE_KEYS.NOTEBOOK_STATE, JSON.stringify(stateToSave))

      setState(prev => ({
        ...prev,
        isLocalSave: true,
        localSaveId: localData.id,
        hasUnsavedChanges: false,
        lastModified: localData.lastSaved
      }))

      lastSaveContentRef.current = contentToSave
    } catch (error) {
      console.error('Error saving locally:', error)
    } finally {
      setState(prev => ({ ...prev, localSaving: false }))
    }
  }, [state.title, state.notes, state.audioTranscript, state.uploadedFiles, state.recordingTime, state.localSaveId, state.localSaving])

  // Auto-save effect
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (state.title.trim() && (state.notes.trim() || state.audioTranscript.trim()) && state.hasUnsavedChanges) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage()
      }, 5000)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [state.title, state.notes, state.audioTranscript, state.hasUnsavedChanges, saveToLocalStorage])

  // Persist state changes to localStorage immediately
  useEffect(() => {
    try {
      const stateToSave = {
        title: state.title,
        notes: state.notes,
        audioTranscript: state.audioTranscript,
        leftPanelWidth: state.leftPanelWidth,
        localSaveId: state.localSaveId,
        lastModified: state.lastModified
      }
      console.log('Persisting state to localStorage:', stateToSave) // Debug log
      localStorage.setItem(STORAGE_KEYS.NOTEBOOK_STATE, JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Error persisting notebook state:', error)
    }
  }, [state.title, state.notes, state.audioTranscript, state.leftPanelWidth, state.localSaveId, state.lastModified])

  const updateState = useCallback((updates: Partial<NotebookState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      lastModified: new Date().toISOString(),
      hasUnsavedChanges: true
    }))
  }, [])

  const resetNotebook = useCallback(() => {
    setState(INITIAL_STATE)
    try {
      localStorage.removeItem(STORAGE_KEYS.NOTEBOOK_STATE)
    } catch (error) {
      console.error('Error clearing notebook state:', error)
    }
  }, [])

  const saveLocally = useCallback(async () => {
    await saveToLocalStorage()
  }, [saveToLocalStorage])

  const loadFromLocalStorage = useCallback((id: string) => {
    try {
      const localNotebooks = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_NOTEBOOKS) || '[]')
      const notebook = localNotebooks.find((item: any) => item.id === id)
      
      if (notebook) {
        setState({
          ...INITIAL_STATE,
          title: notebook.title || '',
          notes: notebook.notes || '',
          audioTranscript: notebook.audioTranscript || '',
          recordingTime: notebook.recordingTime || 0,
          isLocalSave: true,
          localSaveId: notebook.id,
          lastModified: notebook.lastSaved || new Date().toISOString(),
          hasUnsavedChanges: false
        })
      }
    } catch (error) {
      console.error('Error loading from local storage:', error)
    }
  }, [])

  const clearLocalStorage = useCallback(() => {
    try {
      if (state.localSaveId) {
        const existingLocal = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_NOTEBOOKS) || '[]')
        const filtered = existingLocal.filter((item: any) => item.id !== state.localSaveId)
        localStorage.setItem(STORAGE_KEYS.LOCAL_NOTEBOOKS, JSON.stringify(filtered))
      }
      localStorage.removeItem(STORAGE_KEYS.NOTEBOOK_STATE)
    } catch (error) {
      console.error('Error clearing local storage:', error)
    }
  }, [state.localSaveId])

  // Content update methods
  const setTitle = useCallback((title: string) => {
    updateState({ title })
  }, [updateState])

  const setNotes = useCallback((notes: string) => {
    console.log('setNotes called with:', notes) // Debug log
    updateState({ notes })
  }, [updateState])

  const setAudioTranscript = useCallback((audioTranscript: string) => {
    updateState({ audioTranscript })
  }, [updateState])

  const addUploadedFiles = useCallback((files: File[]) => {
    updateState({ uploadedFiles: [...state.uploadedFiles, ...files] })
  }, [state.uploadedFiles, updateState])

  const removeUploadedFile = useCallback((index: number) => {
    updateState({ uploadedFiles: state.uploadedFiles.filter((_, i) => i !== index) })
  }, [state.uploadedFiles, updateState])

  // Recording methods
  const startRecording = useCallback(() => {
    updateState({
      isRecording: true,
      isPaused: false,
      recordingTime: 0,
      audioTranscript: ''
    })
  }, [updateState])

  const pauseRecording = useCallback(() => {
    updateState({ isPaused: !state.isPaused })
  }, [state.isPaused, updateState])

  const stopRecording = useCallback(() => {
    updateState({ isRecording: false, isPaused: false })
  }, [updateState])

  const updateRecordingTime = useCallback((recordingTime: number) => {
    updateState({ recordingTime })
  }, [updateState])

  // UI methods
  const setLeftPanelWidth = useCallback((leftPanelWidth: number) => {
    updateState({ leftPanelWidth })
  }, [updateState])

  const actions: NotebookActions = {
    updateState,
    resetNotebook,
    saveLocally,
    loadFromLocalStorage,
    clearLocalStorage,
    setTitle,
    setNotes,
    setAudioTranscript,
    addUploadedFiles,
    removeUploadedFile,
    startRecording,
    pauseRecording,
    stopRecording,
    updateRecordingTime,
    setLeftPanelWidth
  }

  return [state, actions]
}