import React, { useState } from 'react'
import { User, Palette, Bot, Save, Info, Monitor, MessageSquare, Zap, ExternalLink, CreditCard } from 'lucide-react'
import { useAuth } from '../../Auth/AuthProvider'
import { useSubscription } from '../../../contexts/SubscriptionContext'
import { useSettingsConfig } from '../../../hooks/useSettingsConfig'
import { useTheme } from '../../../contexts/ThemeContext'
import { FeedbackModal } from '../../Feedback/FeedbackModal'
import { CustomSelect, type SelectOption } from '../../CustomSelect'
import './SettingsTab.css'

export const SettingsTab: React.FC = () => {
  const { user, signOut } = useAuth()
  const { subscription, localTrialStatus, localTrialExpiresAt } = useSubscription()
  const { settings, updateSetting } = useSettingsConfig()
  const { themeMode, actualTheme, setThemeMode } = useTheme()
  
  const [email, setEmail] = useState(user?.email || '')
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)

  const subscriptionStatus = React.useMemo(() => {
    if (subscription?.is_lifetime_premium) {
      return { type: 'lifetime', label: 'Lifetime Premium', color: 'var(--accent-primary)' }
    }
    if (subscription?.status === 'active' || subscription?.status === 'trialing') {
      return { type: 'polar', label: 'Premium (Polar)', color: 'var(--accent-primary)' }
    }
    if (localTrialStatus === 'active' && localTrialExpiresAt) {
      const days = Math.ceil((new Date(localTrialExpiresAt).getTime() - Date.now()) / (86400000))
      return { type: 'trial', label: `Free Trial (${Math.max(0, days)} days left)`, color: 'var(--color-warning)' }
    }
    return { type: 'free', label: 'Free Plan', color: 'var(--text-secondary)' }
  }, [subscription, localTrialStatus, localTrialExpiresAt])

  const handleManageSubscription = () => {
    window.open('https://polar.sh/settings', '_blank')
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
        <div className=\"settings-section\">
          <div className=\"section-header\">
            <User className=\"section-icon\" />
            <h3>Account</h3>
          </div>
          <div className=\"section-content\">
            <div className=\"form-group\">
              <label htmlFor=\"email\">Email Address</label>
              <input
                id=\"email\"
                type=\"email\"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
                className=\"disabled-input\"
              />
              <p className=\"input-help\">Email changes are not currently supported</p>
            </div>
            
            <div className=\"form-group\">
              <label>Account Actions</label>
              <button onClick={handleSignOut} className=\"danger-button\">
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className=\"settings-section\">
          <div className=\"section-header\">
            <Zap className=\"section-icon\" />
            <h3>Subscription</h3>
          </div>
          <div className=\"section-content\">
            <div className=\"form-group\">
              <label>Current Plan</label>
              <div className=\"subscription-info\">
                <div className=\"status-badge\" style={{ borderColor: subscriptionStatus.color, color: subscriptionStatus.color }}>
                  {subscriptionStatus.label}
                </div>
                {subscriptionStatus.type === 'polar' && (
                  <button onClick={handleManageSubscription} className=\"manage-button\">
                    <ExternalLink size={16} />
                    Manage Subscription
                  </button>
                )}
              </div>
              <p className=\"input-help\">
                {subscriptionStatus.type === 'polar' 
                  ? 'Cancel or update your payment method via Polar.' 
                  : subscriptionStatus.type === 'free' 
                    ? 'Upgrade to unlock premium features.' 
                    : 'Enjoy your free trial features!'}
              </p>
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
                  <CustomSelect
                    value={settings.preferredInfographicType || 'auto'}
                    onChange={(value) => updateSetting('preferredInfographicType', value as any)}
                    options={[
                      { value: 'auto', label: 'Auto (Let AI Choose)' },
                      { value: 'mindmap', label: 'Mind Map' },
                      { value: 'pyramid', label: 'Pyramid / Hierarchy' },
                      { value: 'cycle', label: 'Cycle Diagram' },
                      { value: 'timeline', label: 'Timeline' },
                      { value: 'comparison', label: 'Comparison' },
                      { value: 'process', label: 'Process Flow' },
                      { value: 'hierarchy', label: 'Organization Chart' }
                    ]}
                    ariaLabel="Preferred infographic type"
                  />
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
              <CustomSelect
                value={settings.llmProvider}
                onChange={(value) => updateSetting('llmProvider', value as any)}
                options={[
                  { value: 'gemini', label: 'Google Gemini' },
                  { value: 'openai', label: 'OpenAI GPT (Coming Soon)', disabled: true },
                  { value: 'claude', label: 'Anthropic Claude (Coming Soon)', disabled: true }
                ]}
                ariaLabel="AI model provider"
              />
              <p className="input-help">
                Currently using Google Gemini. Additional AI models will be available in future updates.
              </p>
            </div>

            {/* Additional Settings */}
            <div className="form-group">
              <label htmlFor="length-preference">Summary Length</label>
              <CustomSelect
                value={settings.lengthPreference}
                onChange={(value) => updateSetting('lengthPreference', value as any)}
                options={[
                  { value: 'short', label: 'Short (200-300 words)' },
                  { value: 'standard', label: 'Standard (300-500 words)' },
                  { value: 'detailed', label: 'Detailed (500-700 words)' }
                ]}
                ariaLabel="Summary length preference"
              />
            </div>

            <div className="form-group">
              <label htmlFor="academic-level">Academic Level</label>
              <CustomSelect
                value={settings.academicLevel}
                onChange={(value) => updateSetting('academicLevel', value as any)}
                options={[
                  { value: 'Undergraduate', label: 'Undergraduate' },
                  { value: 'Graduate', label: 'Graduate' },
                  { value: 'Professional', label: 'Professional' },
                  { value: 'General', label: 'General' }
                ]}
                ariaLabel="Academic level"
              />
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
