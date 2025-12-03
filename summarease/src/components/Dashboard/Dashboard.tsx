import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { TabNavigation, type TabType } from './TabNavigation'
import { NotebookTab } from './tabs/NotebookTab'
import { ViewTab } from './tabs/ViewTab'
import { StudyToolsTab } from './tabs/StudyToolsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { ContentViewer } from '../ContentViewer/ContentViewer'
import { TrialExpiringModal } from '../Subscription/TrialExpiringModal'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { useTrialNotifications } from '../../hooks/useTrialNotifications'
import { type FileWithMetadata } from '../../lib/api'
import './Dashboard.css'

import { getNotebookDetails } from '../../lib/api'
import { type DocumentItem } from '../DocumentList'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { subscription, isTrialing, canAccessPremiumFeatures, localTrialStatus, localTrialExpiresAt } = useSubscription()
  const { showModal, daysLeft, closeModal } = useTrialNotifications()
  
  const [activeTab, setActiveTab] = useState<TabType>('notebook')
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)
  const [showContentViewer, setShowContentViewer] = useState(false)
  
  // Track upgrade banner dismissal
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    const dismissed = localStorage.getItem('upgrade-banner-dismissed')
    return dismissed === 'true'
  })
  
  // Calculate days left for local trial
  const localTrialDaysLeft = React.useMemo(() => {
    if (localTrialStatus !== 'active' || !localTrialExpiresAt) return 0;
    const diff = new Date(localTrialExpiresAt).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [localTrialStatus, localTrialExpiresAt]);

  // Show Local Trial Banner if active
  const showLocalTrialBanner = localTrialStatus === 'active';

  // Show upgrade banner for free users (unless dismissed) - only if not showing trial banner
  const shouldShowUpgradeBanner = 
    !showLocalTrialBanner &&
    !isBannerDismissed && (
      subscription?.status === 'canceled' || 
      (!canAccessPremiumFeatures && !isTrialing)
    )
  
  const handleDismissBanner = () => {
    setIsBannerDismissed(true)
    localStorage.setItem('upgrade-banner-dismissed', 'true')
  }

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
        folderId?: string | null
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
        folderId: details.file.folder_id,
      })
      setActiveTab('notebook')
    } catch (e) {
      console.error('Failed to load notebook for editing', e)
      setActiveTab('notebook')
    }
  }

  // Handle Edit from local notebook
  const handleEditLocalNotebook = (localNotebook: any) => {
    try {
      const documents: DocumentItem[] = []

      // Convert local notebook documents back to DocumentItem format
      if (localNotebook.documents && Array.isArray(localNotebook.documents)) {
        for (const doc of localNotebook.documents) {
          documents.push({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            content: doc.content,
            size: doc.size,
            timestamp: doc.timestamp ? new Date(doc.timestamp) : new Date(),
            // Note: file blob is not stored in localStorage, so file property will be undefined
            file: undefined
          } as DocumentItem)
        }
      }

      setEditingContext({
        fileId: localNotebook.id, // Use local ID for identification
        title: localNotebook.title,
        notesHtml: localNotebook.notes || '',
        transcriptText: '', // Will be extracted from documents if any transcript exists
        documents,
        tags: [], // Local notebooks don't store tags separately yet
        summaryId: undefined, // Local notebooks don't have summaries
        folderId: null, // Local notebooks don't support folders yet
      })
      setActiveTab('notebook')
    } catch (e) {
      console.error('Failed to load local notebook for editing', e)
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
            initialFolderId={editingContext?.folderId}
            onExitEdit={() => setEditingContext(null)}
          />
        )
      case 'view':
        return (
          <ViewTab
            onFileSelect={handleFileSelect}
            selectedFileId={selectedFile?.id}
            onEditFile={handleEditFromView}
            onEditLocalNotebook={handleEditLocalNotebook}
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
      
      {showLocalTrialBanner && (
        <div className="upgrade-banner" style={{ background: 'linear-gradient(to right, #4f46e5, #06b6d4)' }}>
          <span className="upgrade-banner-text">
            You’re on a 7‑day free trial ({localTrialDaysLeft} days left). Add your card to extend Premium to 30 days total.
          </span>
          <div className="upgrade-banner-actions">
            <button onClick={() => navigate('/pricing')} className="upgrade-banner-button">
              Add Card for 30 Days Free
            </button>
          </div>
        </div>
      )}

      {shouldShowUpgradeBanner && (
        <div className="upgrade-banner">
          <span className="upgrade-banner-text">⭐ Unlock premium features with unlimited summaries and advanced tools</span>
          <div className="upgrade-banner-actions">
            <button onClick={() => navigate('/pricing')} className="upgrade-banner-button">
              Upgrade to Premium
            </button>
            <button onClick={handleDismissBanner} className="upgrade-banner-close" aria-label="Dismiss banner">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      
      <div className="dashboard-layout">
        <main className="dashboard-main">
          {renderTabContent()}
        </main>
      </div>
      
      {showModal && daysLeft && (
        <TrialExpiringModal
          daysLeft={daysLeft}
          onClose={closeModal}
          onUpgrade={() => navigate('/pricing')}
        />
      )}
    </div>
  )
}
