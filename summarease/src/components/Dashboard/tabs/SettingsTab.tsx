import React, { useState } from 'react'
import { User, Palette, Bot, Save } from 'lucide-react'
import { useAuth } from '../../Auth/AuthProvider'
import './SettingsTab.css'

export const SettingsTab: React.FC = () => {
  const { user, signOut } = useAuth()
  const [customPrompt, setCustomPrompt] = useState(
    localStorage.getItem('customSummaryPrompt') || 
    'Summarize the following text in a professional tone using five bullet points.'
  )
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  )
  const [email, setEmail] = useState(user?.email || '')
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const handleSavePrompt = () => {
    localStorage.setItem('customSummaryPrompt', customPrompt)
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 3000)
  }

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

        {/* AI Configuration Section */}
        <div className="settings-section">
          <div className="section-header">
            <Bot className="section-icon" />
            <h3>AI Configuration</h3>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label htmlFor="custom-prompt">Custom Summary Prompt</label>
              <textarea
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter your custom prompt for AI summaries..."
                rows={4}
                className="prompt-textarea"
              />
              <p className="input-help">
                This prompt will be used by the AI for all future summary generations. 
                Be specific about the format, tone, and length you prefer.
              </p>
            </div>
            
            <div className="form-actions">
              <button onClick={handleSavePrompt} className="save-button">
                <Save className="button-icon" />
                Save Prompt
              </button>
              {showSaveSuccess && (
                <span className="save-success">✓ Saved successfully!</span>
              )}
            </div>
          </div>
        </div>

        {/* Example Prompts */}
        <div className="settings-section">
          <div className="section-header">
            <h3>Example Prompts</h3>
          </div>
          <div className="section-content">
            <div className="example-prompts">
              <div className="example-prompt">
                <h4>Academic Style</h4>
                <p>"Provide a comprehensive academic summary with key concepts, methodologies, and conclusions in structured paragraphs."</p>
                <button 
                  className="use-example-btn"
                  onClick={() => setCustomPrompt("Provide a comprehensive academic summary with key concepts, methodologies, and conclusions in structured paragraphs.")}
                >
                  Use This
                </button>
              </div>
              
              <div className="example-prompt">
                <h4>Bullet Points</h4>
                <p>"Summarize the following text in exactly 5 bullet points, focusing on the most important information."</p>
                <button 
                  className="use-example-btn"
                  onClick={() => setCustomPrompt("Summarize the following text in exactly 5 bullet points, focusing on the most important information.")}
                >
                  Use This
                </button>
              </div>
              
              <div className="example-prompt">
                <h4>Executive Summary</h4>
                <p>"Create a brief executive summary suitable for business professionals, highlighting key insights and actionable items."</p>
                <button 
                  className="use-example-btn"
                  onClick={() => setCustomPrompt("Create a brief executive summary suitable for business professionals, highlighting key insights and actionable items.")}
                >
                  Use This
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}