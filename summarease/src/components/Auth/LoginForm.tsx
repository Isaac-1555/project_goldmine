import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import './AuthForms.css'

interface LoginFormProps {
  onToggleMode: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const { signIn, requestPasswordReset } = useAuth()
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const redirectTo = `${window.location.origin}/reset-password`
      await requestPasswordReset(email, redirectTo)
      setSuccess('Check your email for a password reset link.')
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-back">
        <Link to="/" className="auth-back-button" aria-label="Back to Landing Page">
          <ArrowLeft />
          Back to Landing
        </Link>
      </div>
      <div className="auth-card">
        <div className="auth-header">
          <h1>{view === 'login' ? 'Welcome back' : 'Reset your password'}</h1>
          <p>
            {view === 'login'
              ? 'Sign in to your Sat-Brain account'
              : 'Enter your email and we’ll send you a reset link.'}
          </p>
        </div>

        {view === 'login' ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              <div className="auth-helper-row">
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setView('forgot')
                    setError('')
                    setSuccess('')
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <div className="auth-footer" style={{ marginTop: 0 }}>
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('login')
                    setError('')
                    setSuccess('')
                  }}
                  className="link-button"
                >
                  Back to sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {view === 'login' && (
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <button type="button" onClick={onToggleMode} className="link-button">
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}