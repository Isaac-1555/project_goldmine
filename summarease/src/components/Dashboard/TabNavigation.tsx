import React from 'react'
import { useNavigate } from 'react-router-dom'
import { NotebookPen, Mic, Eye, BookOpen, Settings } from 'lucide-react'
import { useSubscription } from '../../contexts/SubscriptionContext'
import './TabNavigation.css'
import { SatBrainMark } from '../brand/SatBrainMark'

export type TabType = 'notebook' | 'view' | 'study-tools' | 'settings'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const navigate = useNavigate()
  const { subscription, isTrialing } = useSubscription()
  
  const tabs = [
    { id: 'notebook' as TabType, label: 'Notebook', icon: NotebookPen },
    { id: 'view' as TabType, label: 'View', icon: Eye },
    { id: 'study-tools' as TabType, label: 'Study Tools', icon: BookOpen },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ]
  
  const getTrialDaysLeft = () => {
    if (!subscription?.trial_end) return null
    const daysLeft = Math.ceil(
      (new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysLeft > 0 ? daysLeft : null
  }
  
  const daysLeft = isTrialing ? getTrialDaysLeft() : null

  return (
    <nav className="tab-navigation">
      <div className="navbar-content">
        <div className="navbar-brand">
          <SatBrainMark size={28} theme="mono" variant="f" detail="low" />
          <h1 className="app-title">Sat-Brain</h1>
        </div>
        <div className="tab-container">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="tab-icon" />
                <span className="tab-label">{tab.label}</span>
              </button>
            )
          })}
        </div>
        
        {/* Trial/Plan Status Indicator */}
        <div className="plan-status">
          {daysLeft ? (
            <div 
              className="trial-indicator"
              onClick={() => navigate('/pricing')}
              role="button"
              tabIndex={0}
            >
              Trial: {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
            </div>
          ) : subscription?.status === 'canceled' ? (
            <div className="free-plan-indicator">
              Free Plan
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
