import React, { useState } from 'react'
import { User, Palette, Bot, Save } from 'lucide-react'
import { useAuth } from '../../Auth/AuthProvider'
import './SettingsTab.css'

export const SettingsTab: React.FC = () => {
  const { user, signOut } = useAuth()
  // Custom summary prompt feature removed
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  )
  const [email, setEmail] = useState(user?.email || '')
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  // Custom summary prompt: removed

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="settings-tab">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account and application preferences</p>
      </div>

      <div className="settings-sections">
        {/* Account Section */}
        <div className="settings-section">
          <div className="section-header">
            <User className="section-icon" />
            <h3>Account</h3>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
                className="disabled-input"
              />
              <p className="input-help">Email changes are not currently supported</p>
            </div>
            
            <div className="form-group">
              <label>Account Actions</label>
              <button onClick={handleSignOut} className="danger-button">
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="settings-section">
          <div className="section-header">
            <Palette className="section-icon" />
            <h3>Preferences</h3>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label>Theme</label>
              <div className="theme-options">
                <button
                  className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  <div className="theme-preview light-preview"></div>
                  Light
                </button>
                <button
                  className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <div className="theme-preview dark-preview"></div>
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Configuration Section - removed custom prompt feature */}
        <div className="settings-section">
          <div className="section-header">
            <Bot className="section-icon" />
            <h3>AI Configuration</h3>
          </div>
          <div className="section-content">
            <p className="input-help">Summaries use a standardized student-friendly format. Custom summary prompts have been removed for consistency.</p>
          </div>
        </div>
      </div>
    </div>
  )
}