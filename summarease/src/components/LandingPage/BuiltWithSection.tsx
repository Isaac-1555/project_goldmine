import React from 'react'
import { Shield, Zap, Cloud, Sparkles } from 'lucide-react'
import './BuiltWithSection.css'

export const BuiltWithSection: React.FC = () => {
  return (
    <section className="built-with-section" aria-labelledby="built-with-title">
      <div className="built-with-container">
        <div className="built-with-header">
          <h2 id="built-with-title" className="built-with-title">Built with modern technology</h2>
          <p className="built-with-subtitle">
            Enterprise-grade infrastructure powering your learning
          </p>
        </div>

        <div className="tech-grid">
          <div className="tech-card">
            <div className="tech-icon">
              <Cloud size={24} aria-hidden="true" />
            </div>
            <div className="tech-content">
              <h3 className="tech-name">Supabase</h3>
              <p className="tech-description">Enterprise database with real-time sync</p>
            </div>
          </div>

          <div className="tech-card">
            <div className="tech-icon">
              <Sparkles size={24} aria-hidden="true" />
            </div>
            <div className="tech-content">
              <h3 className="tech-name">Google Gemini AI</h3>
              <p className="tech-description">State-of-the-art language models</p>
            </div>
          </div>

          <div className="tech-card">
            <div className="tech-icon">
              <Shield size={24} aria-hidden="true" />
            </div>
            <div className="tech-content">
              <h3 className="tech-name">End-to-end encryption</h3>
              <p className="tech-description">Your data is always private and secure</p>
            </div>
          </div>

          <div className="tech-card">
            <div className="tech-icon">
              <Zap size={24} aria-hidden="true" />
            </div>
            <div className="tech-content">
              <h3 className="tech-name">React + TypeScript</h3>
              <p className="tech-description">Fast, reliable, modern web app</p>
            </div>
          </div>
        </div>

        <div className="launch-badge">
          <div className="badge-content">
            <span className="badge-emoji">🚀</span>
            <div className="badge-text">
              <strong>Just Launched!</strong> Join our first 100 users and help shape the future of AI-powered learning.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
