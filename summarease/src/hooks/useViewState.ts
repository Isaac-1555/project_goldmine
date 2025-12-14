import { useState, useEffect, useCallback, useRef } from 'react'
import { type FileWithMetadata } from '../lib/api'

// State interfaces for the ViewTab component
export interface ViewTabState {
  // Core tab state
  activeSubTab: 'list' | 'graph'
  
  // Search state
  searchResults: FileWithMetadata[]
  isSearching: boolean
  searchedTags: string[]
  
  // ListView specific state
  listView: {
    selectedFolderFilter: string | null
    showFolderManagement: boolean
    editingFolder: { id: string; name: string } | null
    newFolderName: string
    showMoveModal: { fileId: string; fileName: string } | null
    selectedTargetFolder: string | null
    scrollPosition: number
    sortBy: 'date' | 'title' | 'folder'
    sortOrder: 'asc' | 'desc'
  }
  
  // GraphView specific state
  graphView: {
    zoomLevel: number
    panPosition: { x: number; y: number }
    hoveredNodeId: string | null
    selectedNodeId: string | null
    layoutType: 'force' | 'circular' | 'hierarchical'
    showLabels: boolean
    nodeSize: 'small' | 'medium' | 'large'
    linkOpacity: number
  }
  
  // UI preferences that persist across sessions
  preferences: {
    lastActiveSubTab: 'list' | 'graph'
    listViewDensity: 'compact' | 'comfortable' | 'spacious'
    graphTheme: 'light' | 'dark' | 'auto'
    autoSaveFilters: boolean
    showSearchHistory: boolean
  }
  
  // Runtime state
  loading: boolean
  error: string | null
  lastModified: string
}

export interface ViewTabActions {
  // Tab navigation
  setActiveSubTab: (tab: 'list' | 'graph') => void
  
  // Search actions
  setSearchResults: (results: FileWithMetadata[]) => void
  setIsSearching: (searching: boolean) => void
  setSearchedTags: (tags: string[]) => void
  clearSearch: () => void
  
  // ListView actions
  setSelectedFolderFilter: (filter: string | null) => void
  setShowFolderManagement: (show: boolean) => void
  setEditingFolder: (folder: { id: string; name: string } | null) => void
  setNewFolderName: (name: string) => void
  setShowMoveModal: (modal: { fileId: string; fileName: string } | null) => void
  setSelectedTargetFolder: (folderId: string | null) => void
  updateScrollPosition: (position: number) => void
  setSortBy: (sortBy: 'date' | 'title' | 'folder') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  
  // GraphView actions
  setZoomLevel: (zoom: number) => void
  setPanPosition: (position: { x: number; y: number }) => void
  setHoveredNodeId: (nodeId: string | null) => void
  setSelectedNodeId: (nodeId: string | null) => void
  setLayoutType: (layout: 'force' | 'circular' | 'hierarchical') => void
  setShowLabels: (show: boolean) => void
  setNodeSize: (size: 'small' | 'medium' | 'large') => void
  setLinkOpacity: (opacity: number) => void
  
  // Preference actions
  updatePreferences: (preferences: Partial<ViewTabState['preferences']>) => void
  resetPreferences: () => void
  
  // Utility actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetViewState: () => void
  exportState: () => ViewTabState
  importState: (state: Partial<ViewTabState>) => void
}

// Default state values
const getDefaultState = (): ViewTabState => ({
  activeSubTab: 'list',
  searchResults: [],
  isSearching: false,
  searchedTags: [],
  
  listView: {
    selectedFolderFilter: null,
    showFolderManagement: false,
    editingFolder: null,
    newFolderName: '',
    showMoveModal: null,
    selectedTargetFolder: null,
    scrollPosition: 0,
    sortBy: 'date',
    sortOrder: 'desc'
  },
  
  graphView: {
    zoomLevel: 1,
    panPosition: { x: 0, y: 0 },
    hoveredNodeId: null,
    selectedNodeId: null,
    layoutType: 'force',
    showLabels: true,
    nodeSize: 'medium',
    linkOpacity: 0.6
  },
  
  preferences: {
    lastActiveSubTab: 'list',
    listViewDensity: 'comfortable',
    graphTheme: 'auto',
    autoSaveFilters: true,
    showSearchHistory: true
  },
  
  loading: false,
  error: null,
  lastModified: new Date().toISOString()
})

// localStorage keys
const STORAGE_KEYS = {
  VIEW_STATE: 'sat-brain-view-state',
  VIEW_PREFERENCES: 'sat-brain-view-preferences'
}

/**
 * Custom hook for managing ViewTab state with persistence
 * Similar to useNotebookState but for the View tab functionality
 */
export const useViewState = (): [ViewTabState, ViewTabActions] => {
  const [state, setState] = useState<ViewTabState>(() => {
    // Load initial state from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW_STATE)
      const savedPrefs = localStorage.getItem(STORAGE_KEYS.VIEW_PREFERENCES)
      
      const defaultState = getDefaultState()
      
      if (saved || savedPrefs) {
        const parsedState = saved ? JSON.parse(saved) : {}
        const parsedPrefs = savedPrefs ? JSON.parse(savedPrefs) : {}
        
        return {
          ...defaultState,
          ...parsedState,
          preferences: { ...defaultState.preferences, ...parsedPrefs },
          // Always start fresh with these runtime states
          loading: false,
          error: null,
          searchResults: [],
          isSearching: false
        }
      }
      
      return defaultState
    } catch (error) {
      console.warn('Failed to load view state from localStorage:', error)
      return getDefaultState()
    }
  })
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debounced save to localStorage
  const saveToStorage = useCallback((currentState: ViewTabState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        // Save main state (excluding runtime data)
        const stateToSave = {
          activeSubTab: currentState.activeSubTab,
          listView: currentState.listView,
          graphView: {
            ...currentState.graphView,
            hoveredNodeId: null, // Don't persist hover state
            selectedNodeId: null // Don't persist selection
          }
        }
        
        localStorage.setItem(STORAGE_KEYS.VIEW_STATE, JSON.stringify(stateToSave))
        localStorage.setItem(STORAGE_KEYS.VIEW_PREFERENCES, JSON.stringify(currentState.preferences))
      } catch (error) {
        console.warn('Failed to save view state to localStorage:', error)
      }
    }, 50) // 50ms debounce
  }, [])
  
  // Update state helper
  const updateState = useCallback((updates: Partial<ViewTabState> | ((prev: ViewTabState) => ViewTabState)) => {
    setState((prev) => {
      const newState = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
      newState.lastModified = new Date().toISOString()
      
      // Auto-save to localStorage for non-runtime state changes
      if (typeof updates === 'object' && (
        updates.activeSubTab !== undefined ||
        updates.listView !== undefined ||
        updates.graphView !== undefined ||
        updates.preferences !== undefined
      )) {
        saveToStorage(newState)
      }
      
      return newState
    })
  }, [saveToStorage])
  
  // Actions object
  const actions: ViewTabActions = {
    // Tab navigation
    setActiveSubTab: useCallback((tab: 'list' | 'graph') => {
      updateState(prev => ({
        ...prev,
        activeSubTab: tab,
        preferences: { ...prev.preferences, lastActiveSubTab: tab }
      }))
    }, [updateState]),
    
    // Search actions
    setSearchResults: useCallback((results: FileWithMetadata[]) => {
      updateState({ searchResults: results })
    }, [updateState]),
    
    setIsSearching: useCallback((searching: boolean) => {
      updateState({ isSearching: searching })
    }, [updateState]),
    
    setSearchedTags: useCallback((tags: string[]) => {
      updateState({ searchedTags: tags })
    }, [updateState]),
    
    clearSearch: useCallback(() => {
      updateState({
        searchResults: [],
        isSearching: false,
        searchedTags: []
      })
    }, [updateState]),
    
    // ListView actions
    setSelectedFolderFilter: useCallback((filter: string | null) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, selectedFolderFilter: filter }
      }))
    }, [updateState]),
    
    setShowFolderManagement: useCallback((show: boolean) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, showFolderManagement: show }
      }))
    }, [updateState]),
    
    setEditingFolder: useCallback((folder: { id: string; name: string } | null) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, editingFolder: folder }
      }))
    }, [updateState]),
    
    setNewFolderName: useCallback((name: string) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, newFolderName: name }
      }))
    }, [updateState]),
    
    setShowMoveModal: useCallback((modal: { fileId: string; fileName: string } | null) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, showMoveModal: modal }
      }))
    }, [updateState]),
    
    setSelectedTargetFolder: useCallback((folderId: string | null) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, selectedTargetFolder: folderId }
      }))
    }, [updateState]),
    
    updateScrollPosition: useCallback((position: number) => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, scrollPosition: position }
      }))
    }, [updateState]),
    
    setSortBy: useCallback((sortBy: 'date' | 'title' | 'folder') => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, sortBy }
      }))
    }, [updateState]),
    
    setSortOrder: useCallback((order: 'asc' | 'desc') => {
      updateState(prev => ({
        ...prev,
        listView: { ...prev.listView, sortOrder: order }
      }))
    }, [updateState]),
    
    // GraphView actions
    setZoomLevel: useCallback((zoom: number) => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, zoomLevel: zoom }
      }))
    }, [updateState]),
    
    setPanPosition: useCallback((position: { x: number; y: number }) => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, panPosition: position }
      }))
    }, [updateState]),
    
    setHoveredNodeId: useCallback((nodeId: string | null) => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, hoveredNodeId: nodeId }
      }))
    }, [updateState]),
    
    setSelectedNodeId: useCallback((nodeId: string | null) => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, selectedNodeId: nodeId }
      }))
    }, [updateState]),
    
    setLayoutType: useCallback((layout: 'force' | 'circular' | 'hierarchical') => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, layoutType: layout }
      }))
    }, [updateState]),
    
    setShowLabels: useCallback((show: boolean) => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, showLabels: show }
      }))
    }, [updateState]),
    
    setNodeSize: useCallback((size: 'small' | 'medium' | 'large') => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, nodeSize: size }
      }))
    }, [updateState]),
    
    setLinkOpacity: useCallback((opacity: number) => {
      updateState(prev => ({
        ...prev,
        graphView: { ...prev.graphView, linkOpacity: opacity }
      }))
    }, [updateState]),
    
    // Preference actions
    updatePreferences: useCallback((preferences: Partial<ViewTabState['preferences']>) => {
      updateState(prev => ({
        ...prev,
        preferences: { ...prev.preferences, ...preferences }
      }))
    }, [updateState]),
    
    resetPreferences: useCallback(() => {
      const defaultPrefs = getDefaultState().preferences
      updateState(prev => ({ ...prev, preferences: defaultPrefs }))
    }, [updateState]),
    
    // Utility actions
    setLoading: useCallback((loading: boolean) => {
      updateState({ loading })
    }, [updateState]),
    
    setError: useCallback((error: string | null) => {
      updateState({ error })
    }, [updateState]),
    
    resetViewState: useCallback(() => {
      const defaultState = getDefaultState()
      setState(defaultState)
      // Clear localStorage
      try {
        localStorage.removeItem(STORAGE_KEYS.VIEW_STATE)
        localStorage.removeItem(STORAGE_KEYS.VIEW_PREFERENCES)
      } catch (error) {
        console.warn('Failed to clear view state from localStorage:', error)
      }
    }, []),
    
    exportState: useCallback(() => {
      return { ...state }
    }, [state]),
    
    importState: useCallback((importState: Partial<ViewTabState>) => {
      updateState(prev => ({ ...prev, ...importState }))
    }, [updateState])
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])
  
  return [state, actions]
}