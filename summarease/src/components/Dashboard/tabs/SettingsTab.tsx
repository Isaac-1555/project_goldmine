import React, { useState } from 'react'
import { User, Palette, Bot, Save, Info, ChevronDown, Monitor, MessageSquare } from 'lucide-react'
import { useAuth } from '../../Auth/AuthProvider'
import { useSettingsConfig } from '../../../hooks/useSettingsConfig'
import { useTheme } from '../../../contexts/ThemeContext'
import { FeedbackModal } from '../../Feedback/FeedbackModal'
import './SettingsTab.css'

export const SettingsTab: React.FC = () => {
  const { user, signOut } = useAuth()
  const { settings, updateSetting } = useSettingsConfig()
  const { themeMode, actualTheme, setThemeMode } = useTheme()
  
  const [email, setEmail] = useState(user?.email || '')
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

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
                  className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
                  onClick={() => setThemeMode('light')}
                >
                  <div className="theme-preview light-preview"></div>
                  Light
                </button>
                <button
                  className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
                  onClick={() => setThemeMode('dark')}
                >
                  <div className="theme-preview dark-preview"></div>
                  Dark
                </button>
                <button
                  className={`theme-option ${themeMode === 'system' ? 'active' : ''}`}
                  onClick={() => setThemeMode('system')}
                >
                  <div className="theme-preview system-preview">
                    <Monitor size={16} />
                  </div>
                  System
                </button>
              </div>
              <p className="input-help">
                {themeMode === 'system' 
                  ? `Following system preference (currently ${actualTheme})` 
                  : `Theme set to ${themeMode}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Summary Configuration Section */}
        <div className="settings-section">
          <div className="section-header">
            <Bot className="section-icon" />
            <h3>Summary Configuration</h3>
          </div>
          <div className="section-content">
            {/* Infographics Toggle */}
            <div className="form-group">
              <label htmlFor="infographics-toggle" className="toggle-label">
                <span>Include Infographics</span>
                <div className="info-tooltip">
                  <Info className="info-icon" />
                  <span className="tooltip-text">
                    When enabled, summaries will include visual diagrams and charts when relevant to the content
                  </span>
                </div>
              </label>
              <div className="toggle-container">
                <label className="toggle-switch">
                  <input
                    id="infographics-toggle"
                    type="checkbox"
                    checked={settings.includeInfographics}
                    onChange={(e) => updateSetting('includeInfographics', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">
                  {settings.includeInfographics ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="input-help">
                Infographics help visualize complex concepts through flowcharts, diagrams, and graphs
              </p>
            </div>

            {/* Auto-Generate Infographics Toggle */}
            {settings.includeInfographics && (
              <>
                <div className="form-group sub-setting">
                  <label htmlFor="auto-generate-infographics" className="toggle-label">
                    <span>Auto-Generate Infographics</span>
                    <div className="info-tooltip">
                      <Info className="info-icon" />
                      <span className="tooltip-text">
                        Automatically create visual diagrams when generating or regenerating summaries
                      </span>
                    </div>
                  </label>
                  <div className="toggle-container">
                    <label className="toggle-switch">
                      <input
                        id="auto-generate-infographics"
                        type="checkbox"
                        checked={settings.autoGenerateInfographic || false}
                        onChange={(e) => updateSetting('autoGenerateInfographic', e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-status">
                      {settings.autoGenerateInfographic ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="input-help">
                    When enabled, infographics are generated automatically alongside summaries
                  </p>
                </div>

                {/* Preferred Infographic Type */}
                <div className="form-group sub-setting">
                  <label htmlFor="infographic-type">Preferred Infographic Type</label>
                  <div className="select-wrapper">
                    <select
                      id="infographic-type"
                      value={settings.preferredInfographicType || 'auto'}
                      onChange={(e) => updateSetting('preferredInfographicType', e.target.value as any)}
                      className="settings-select"
                    >
                      <option value="auto">Auto (Let AI Choose)</option>
                      <option value="mindmap">Mind Map</option>
                      <option value="pyramid">Pyramid / Hierarchy</option>
                      <option value="cycle">Cycle Diagram</option>
                      <option value="timeline">Timeline</option>
                      <option value="comparison">Comparison</option>
                      <option value="process">Process Flow</option>
                      <option value="hierarchy">Organization Chart</option>
                    </select>
                    <ChevronDown className="select-icon" />
                  </div>
                  <p className="input-help">
                    AI will prefer this type, but may choose another if more suitable
                  </p>
                </div>
              </>
            )}

            {/* Auto Tags Toggle */}
            <div className="form-group">
              <label htmlFor="auto-tags-toggle" className="toggle-label">
                <span>Auto Tags</span>
                <div className="info-tooltip">
                  <Info className="info-icon" />
                  <span className="tooltip-text">
                    When enabled, AI automatically generates relevant tags for your summaries. When disabled, you can manage all tags manually.
                  </span>
                </div>
              </label>
              <div className="toggle-container">
                <label className="toggle-switch">
                  <input
                    id="auto-tags-toggle"
                    type="checkbox"
                    checked={settings.autoTags}
                    onChange={(e) => updateSetting('autoTags', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">
                  {settings.autoTags ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="input-help">
                Auto Tags generates 3-7 relevant keywords during content processing to help organize and link related summaries
              </p>
            </div>

            {/* LLM Provider Dropdown */}
            <div className="form-group">
              <label htmlFor="llm-provider">AI Model Provider</label>
              <div className="select-wrapper">
                <select
                  id="llm-provider"
                  value={settings.llmProvider}
                  onChange={(e) => updateSetting('llmProvider', e.target.value as any)}
                  className="settings-select"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai" disabled>OpenAI GPT (Coming Soon)</option>
                  <option value="claude" disabled>Anthropic Claude (Coming Soon)</option>
                </select>
                <ChevronDown className="select-icon" />
              </div>
              <p className="input-help">
                Currently using Google Gemini. Additional AI models will be available in future updates.
              </p>
            </div>

            {/* Additional Settings */}
            <div className="form-group">
              <label htmlFor="length-preference">Summary Length</label>
              <div className="select-wrapper">
                <select
                  id="length-preference"
                  value={settings.lengthPreference}
                  onChange={(e) => updateSetting('lengthPreference', e.target.value as any)}
                  className="settings-select"
                >
                  <option value="short">Short (200-300 words)</option>
                  <option value="standard">Standard (300-500 words)</option>
                  <option value="detailed">Detailed (500-700 words)</option>
                </select>
                <ChevronDown className="select-icon" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="academic-level">Academic Level</label>
              <div className="select-wrapper">
                <select
                  id="academic-level"
                  value={settings.academicLevel}
                  onChange={(e) => updateSetting('academicLevel', e.target.value as any)}
                  className="settings-select"
                >
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Professional">Professional</option>
                  <option value="General">General</option>
                </select>
                <ChevronDown className="select-icon" />
              </div>
            </div>
          </div>
        </div>

        {/* Feedback & Support Section */}
        <div className="settings-section">
          <div className="section-header">
            <MessageSquare className="section-icon" />
            <h3>Feedback & Support</h3>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label>Share Your Thoughts</label>
              <p className="input-help" style={{ marginBottom: '12px' }}>
                We'd love to hear from you! Share your feedback, report bugs, or suggest new features.
              </p>
              <button 
                onClick={() => setShowFeedbackModal(true)} 
                className="feedback-button"
              >
                <MessageSquare size={18} />
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  )
}
