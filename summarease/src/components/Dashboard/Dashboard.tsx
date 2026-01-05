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
import { TrialAcknowledgment } from '../Subscription/TrialAcknowledgment'
import { OnboardingTour } from '../Onboarding/OnboardingTour'
import { useAuth } from '../Auth/AuthProvider'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { useTrialNotifications } from '../../hooks/useTrialNotifications'
import { type FileWithMetadata } from '../../lib/api'
import './Dashboard.css'

import { type DocumentItem } from '../DocumentList'

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subscription, isTrialing, canAccessPremiumFeatures, localTrialStatus, localTrialExpiresAt } = useSubscription()
  const { showModal, daysLeft, closeModal } = useTrialNotifications()
  
  const [activeTab, setActiveTab] = useState<TabType>('notebook')
  const [showTrialAcknowledgment, setShowTrialAcknowledgment] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)
  const [showContentViewer, setShowContentViewer] = useState(false)
  
  // Onboarding (one-time per user)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false)

  const onboardingStorageKey = React.useMemo(() => {
    if (!user?.id) return null
    return `sat-brain:onboarding:v1:${user.id}`
  }, [user?.id])

  useEffect(() => {
    if (!onboardingStorageKey) return

    // Reset the check when a new user signs in.
    setHasCheckedOnboarding(false)

    try {
      const seen = localStorage.getItem(onboardingStorageKey) === 'true'
      setShowOnboarding(!seen)
    } catch (e) {
      console.error('Error reading onboarding flag', e)
      setShowOnboarding(false)
    } finally {
      setHasCheckedOnboarding(true)
    }
  }, [onboardingStorageKey])

  const markOnboardingSeenAndClose = () => {
    try {
      if (onboardingStorageKey) {
        localStorage.setItem(onboardingStorageKey, 'true')
      }
    } catch (e) {
      console.error('Error setting onboarding flag', e)
    }

    setShowOnboarding(false)
  }

  // If onboarding is open, ensure other overlays don’t stack.
  useEffect(() => {
    if (showOnboarding) {
      setShowTrialAcknowledgment(false)
    }
  }, [showOnboarding])

  // Decide when to show the one-time trial acknowledgment overlay (after onboarding)
  useEffect(() => {
    if (!isTrialing) {
      setShowTrialAcknowledgment(false)
      return
    }

    // Wait until we know whether onboarding should show for this user.
    if (!hasCheckedOnboarding) return
    if (showOnboarding) return

    try {
      const acknowledged = localStorage.getItem('trial_acknowledged_v1') === 'true'
      if (!acknowledged) {
        setShowTrialAcknowledgment(true)
      }
    } catch (e) {
      console.error('Error reading trial acknowledgment flag', e)
    }
  }, [isTrialing, hasCheckedOnboarding, showOnboarding])
  
  // Track upgrade banner dismissal
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    const dismissed = localStorage.getItem('upgrade-banner-dismissed')
    return dismissed === 'true'
  })

  // Track local trial banner dismissal (session-only, per user)
  const localTrialBannerDismissedKey = React.useMemo(() => {
    if (!user?.id) return null
    return `local-trial-banner-dismissed:v1:${user.id}`
  }, [user?.id])

  const [isLocalTrialBannerDismissed, setIsLocalTrialBannerDismissed] = useState(() => {
    if (!localTrialBannerDismissedKey) return false

    try {
      return sessionStorage.getItem(localTrialBannerDismissedKey) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!localTrialBannerDismissedKey) {
      setIsLocalTrialBannerDismissed(false)
      return
    }

    try {
      setIsLocalTrialBannerDismissed(
        sessionStorage.getItem(localTrialBannerDismissedKey) === 'true'
      )
    } catch (e) {
      console.error('Error reading local trial banner dismissed flag', e)
      setIsLocalTrialBannerDismissed(false)
    }
  }, [localTrialBannerDismissedKey])

  // Local trial active only if it hasn't expired yet
  const isLocalTrialActive = React.useMemo(() => {
    if (localTrialStatus !== 'active' || !localTrialExpiresAt) return false
    return new Date(localTrialExpiresAt) > new Date()
  }, [localTrialStatus, localTrialExpiresAt])

  // Calculate days left for local trial (never negative)
  const localTrialDaysLeft = React.useMemo(() => {
    if (!isLocalTrialActive || !localTrialExpiresAt) return 0
    const diffMs = new Date(localTrialExpiresAt).getTime() - Date.now()
    if (diffMs <= 0) return 0
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }, [isLocalTrialActive, localTrialExpiresAt])

  // Show Local Trial Banner if trial is active and not dismissed for this session
  const showLocalTrialBanner = isLocalTrialActive && !isLocalTrialBannerDismissed

  const handleTrialAcknowledge = () => {
    try {
      localStorage.setItem('trial_acknowledged_v1', 'true')
    } catch (e) {
      console.error('Error setting trial acknowledgment flag', e)
    }
    setShowTrialAcknowledgment(false)
  }

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

  const handleDismissLocalTrialBanner = () => {
    setIsLocalTrialBannerDismissed(true)

    if (!localTrialBannerDismissedKey) return

    try {
      sessionStorage.setItem(localTrialBannerDismissedKey, 'true')
    } catch (e) {
      console.error('Error setting local trial banner dismissed flag', e)
    }
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

  const handleFileDelete = (_fileId: string) => {
    void _fileId
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
        tags: Array.isArray(localNotebook.customTags) ? localNotebook.customTags : [],
        summaryId: undefined, // Local notebooks don't have summaries
        folderId: localNotebook.selectedFolderId ?? null,
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
      
      {showOnboarding && (
        <OnboardingTour
          onComplete={markOnboardingSeenAndClose}
          onSkip={markOnboardingSeenAndClose}
        />
      )}

      {showTrialAcknowledgment && !showOnboarding && (
        <TrialAcknowledgment onAcknowledge={handleTrialAcknowledge} />
      )}
      
      {showLocalTrialBanner && (
        <div className="upgrade-banner" style={{ background: 'linear-gradient(to right, #4f46e5, #06b6d4)' }}>
          <span className="upgrade-banner-text">
            You’re on a 7‑day free trial ({localTrialDaysLeft} days left). Add your card to extend Premium to 30 days total.
          </span>
          <div className="upgrade-banner-actions">
            <button onClick={() => navigate('/pricing')} className="upgrade-banner-button">
              Add Card for 30 Days Free
            </button>
            <button
              onClick={handleDismissLocalTrialBanner}
              className="upgrade-banner-close"
              aria-label="Dismiss trial banner"
            >
              <X size={20} />
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
