import React from 'react'
import { Mic, Brain, BookOpen, ArrowRight } from 'lucide-react'
import './LandingPage.css'

interface LandingPageProps {
  onSignUp: () => void
  onLogin: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignUp, onLogin }) => {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features')
    featuresSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <Brain className="logo-icon" />
            <span>SummarEase</span>
          </div>
          <div className="nav-links">
            <button onClick={scrollToFeatures} className="nav-link">
              Features
            </button>
            <button onClick={onLogin} className="nav-button nav-login">
              Log In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Turn Lectures into Knowledge, Instantly
            </h1>
            <p className="hero-subtitle">
              Record, upload, and let AI summarize your content, generate study materials, 
              and build your personal knowledge graph.
            </p>
            <button onClick={onSignUp} className="hero-cta">
              Sign Up for Free
              <ArrowRight className="cta-icon" />
            </button>
          </div>
          <div className="hero-visual">
            <div className="hero-graphic">
              <div className="floating-card">
                <Mic className="card-icon" />
                <span>Record</span>
              </div>
              <div className="floating-card">
                <Brain className="card-icon" />
                <span>Analyze</span>
              </div>
              <div className="floating-card">
                <BookOpen className="card-icon" />
                <span>Learn</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <h2 className="features-title">Powerful Features for Modern Learning</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Mic />
              </div>
              <h3 className="feature-title">Live Recording & Transcription</h3>
              <p className="feature-description">
                Capture lectures or meetings in real-time. Our AI transcribes and 
                summarizes the key points for you.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Brain />
              </div>
              <h3 className="feature-title">Visualize Your Knowledge</h3>
              <p className="feature-description">
                Connect ideas with an interactive knowledge graph. See how your 
                summaries link together through shared topics.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <BookOpen />
              </div>
              <h3 className="feature-title">Create Study Tools</h3>
              <p className="feature-description">
                Instantly generate flashcards and quizzes from any summary to 
                reinforce your learning and test your understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Transform Your Learning?</h2>
          <button onClick={onSignUp} className="cta-button">
            Sign Up for Free
            <ArrowRight className="cta-icon" />
          </button>
        </div>
      </section>
    </div>
  )
}