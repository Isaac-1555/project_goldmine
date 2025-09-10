import React, { useState } from 'react'
import { TabNavigation, type TabType } from './TabNavigation'
import { NotebookTab } from './tabs/NotebookTab'
import { ViewTab } from './tabs/ViewTab'
import { StudyToolsTab } from './tabs/StudyToolsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { ContentViewer } from '../ContentViewer/ContentViewer'
import { type FileWithMetadata } from '../../lib/api'
import './Dashboard.css'

import { getNotebookDetails } from '../../lib/api'
import { type DocumentItem } from '../DocumentList'

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('notebook')
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)
  const [showContentViewer, setShowContentViewer] = useState(false)

  // Prefill/editing state for NotebookTab
  const [editingContext, setEditingContext] = useState<
    | null
    | {
        fileId: string
        title: string
        notesHtml?: string
        transcriptText?: string
        documents: DocumentItem[]
        tags: string[]
        summaryId?: string
      }
  >(null)

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

  // Handle Edit from View tab list
  const handleEditFromView = async (fileId: string) => {
    try {
      const details = await getNotebookDetails(fileId)
      const documents: DocumentItem[] = []

      if (details.transcript?.content?.trim()) {
        documents.push({
          id: `transcript_${details.transcript.id}`,
          name: 'Transcript',
          type: 'transcript',
          content: details.transcript.content,
          timestamp: new Date(details.transcript.created_at || Date.now()) as any
        } as any)
      }
      if (Array.isArray(details.documents)) {
        for (const d of details.documents) {
          documents.push({
            id: `doc_${d.id || d.storage_path || Math.random().toString(36).slice(2)}`,
            name: d.original_filename || 'Document',
            type: 'file',
            size: undefined,
            timestamp: new Date(d.created_at || Date.now()) as any
          } as any)
        }
      }

      setEditingContext({
        fileId: details.file.id,
        title: details.file.title,
        notesHtml: details.notes?.html_content || details.notes?.content || '',
        transcriptText: details.transcript?.content || '',
        documents,
        tags: (details.tags || []).map((t: any) => t.name),
        summaryId: details.summary?.id,
      })
      setActiveTab('notebook')
    } catch (e) {
      console.error('Failed to load notebook for editing', e)
      setActiveTab('notebook')
    }
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
        return (
          <NotebookTab
            mode={editingContext ? 'edit' : 'create'}
            editingFileId={editingContext?.fileId}
            initialTitle={editingContext?.title}
            initialNotesHtml={editingContext?.notesHtml}
            initialTranscriptText={editingContext?.transcriptText}
            initialDocuments={editingContext?.documents}
            initialTags={editingContext?.tags}
            initialSummaryId={editingContext?.summaryId}
            onExitEdit={() => setEditingContext(null)}
          />
        )
      case 'view':
        return (
          <ViewTab
            onFileSelect={handleFileSelect}
            selectedFileId={selectedFile?.id}
            onEditFile={handleEditFromView}
          />
        )
      case 'study-tools':
        return <StudyToolsTab />
      case 'settings':
        return <SettingsTab />
      default:
        return <NotebookTab />
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