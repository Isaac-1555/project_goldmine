import React from 'react'
import { Link } from 'react-router-dom'
import { SatBrainMark } from '../brand/SatBrainMark'
import './LandingPage.modern.css'

export const LegalHeader: React.FC = () => {
  return (
    <nav className="landing-nav" aria-label="Main navigation">
      <div className="nav-container">
        <div className="nav-logo">
          <SatBrainMark className="logo-icon" theme="mono" variant="f" detail="low" aria-hidden="true" />
          <span>Sat‑Brain</span>
        </div>
        <div className="nav-links">
          {/* These use hash links so that when returning to the home page we can jump to the section */}
          <Link to="/#features" className="nav-link" aria-label="Navigate to features">Features</Link>
          <Link to="/#pricing" className="nav-link" aria-label="Navigate to pricing">Pricing</Link>
          <Link to="/login" className="nav-button nav-login" aria-label="Log in to your account">Log In</Link>
        </div>
      </div>
    </nav>
  )
}

export default LegalHeader
