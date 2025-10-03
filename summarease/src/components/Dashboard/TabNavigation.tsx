import React from 'react'
import { NotebookPen, Mic, Eye, BookOpen, Settings } from 'lucide-react'
import './TabNavigation.css'

export type TabType = 'notebook' | 'view' | 'study-tools' | 'settings'

interface TabNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'notebook' as TabType, label: 'Notebook', icon: NotebookPen },
    { id: 'view' as TabType, label: 'View', icon: Eye },
    { id: 'study-tools' as TabType, label: 'Study Tools', icon: BookOpen },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="tab-navigation">
      <div className="navbar-content">
        <div className="navbar-brand">
          <div className="logo-placeholder"></div>
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
      </div>
    </nav>
  )
}