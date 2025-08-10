import React, { useState } from 'react'
import { TabNavigation, type TabType } from './TabNavigation'
import { NotebookTab } from './tabs/NotebookTab'
import { ViewTab } from './tabs/ViewTab'
import { StudyToolsTab } from './tabs/StudyToolsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { ContentViewer } from '../ContentViewer/ContentViewer'
import { type FileWithMetadata } from '../../lib/api'
import './Dashboard.css'

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('notebook')
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)
  const [showContentViewer, setShowContentViewer] = useState(false)
  
  // Persistent notebook state with localStorage
  const [notebookState, setNotebookState] = useState(() => {
    try {
      const saved = localStorage.getItem('summarease-notebook-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Don't restore recording state or saving state
        return {
          title: parsed.title || '',
          notes: parsed.notes || '',
          audioTranscript: parsed.audioTranscript || '',
          uploadedFiles: [], // Files can't be persisted in localStorage
          recordingTime: 0, // Reset recording time
          isRecording: false, // Reset recording state
          isPaused: false, // Reset pause state
          leftPanelWidth: parsed.leftPanelWidth || 50,
          saving: false
        }
      }
    } catch (error) {
      console.error('Error loading notebook state:', error)
    }
    
    return {
      title: '',
      notes: '',
      audioTranscript: '',
      uploadedFiles: [] as File[],
      recordingTime: 0,
      isRecording: false,
      isPaused: false,
      leftPanelWidth: 50,
      saving: false
    }
  })

  const handleFileSelect = (file: FileWithMetadata) => {
    setSelectedFile(file)
    setShowContentViewer(true)
  }

  const handleFileDelete = (fileId: string) => {
    // File will be deleted from the backend, just reset the viewer
    setShowContentViewer(false)
    setSelectedFile(null)
  }

  const handleBackToTab = () => {
    setShowContentViewer(false)
    setSelectedFile(null)
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    // Reset content viewer when switching tabs
    setShowContentViewer(false)
    setSelectedFile(null)
  }

  const updateNotebookState = (updates: Partial<typeof notebookState>) => {
    setNotebookState(prev => {
      const newState = { ...prev, ...updates }
      
      // Save to localStorage (excluding files and temporary states)
      try {
        const stateToSave = {
          title: newState.title,
          notes: newState.notes,
          audioTranscript: newState.audioTranscript,
          leftPanelWidth: newState.leftPanelWidth
        }
        localStorage.setItem('summarease-notebook-state', JSON.stringify(stateToSave))
      } catch (error) {
        console.error('Error saving notebook state:', error)
      }
      
      return newState
    })
  }

  const renderTabContent = () => {
    if (showContentViewer && selectedFile) {
      return (
        <ContentViewer 
          file={selectedFile} 
          onBack={handleBackToTab}
          onDelete={handleFileDelete}
        />
      )
    }

    switch (activeTab) {
      case 'notebook':
        return <NotebookTab state={notebookState} updateState={updateNotebookState} />
      case 'view':
        return <ViewTab onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
      case 'study-tools':
        return <StudyToolsTab />
      case 'settings':
        return <SettingsTab />
      default:
        return <NotebookTab state={notebookState} updateState={updateNotebookState} />
    }
  }

  return (
    <div className="dashboard">
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="dashboard-layout">
        <main className="dashboard-main">
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}