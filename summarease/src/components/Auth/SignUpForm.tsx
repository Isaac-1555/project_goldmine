import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { TrialAcknowledgment } from '../Subscription/TrialAcknowledgment'
import './AuthForms.css'

interface SignUpFormProps {
  onToggleMode: () => void
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onToggleMode }) => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showTrialAcknowledgment, setShowTrialAcknowledgment] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      await signUp(email, password)
      setSuccess(true)
      // Show trial acknowledgment modal instead of email confirmation
      setShowTrialAcknowledgment(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = () => {
    // After acknowledging trial, navigate to dashboard
    navigate('/dashboard')
  }

  if (success && showTrialAcknowledgment) {
    return <TrialAcknowledgment onAcknowledge={handleAcknowledge} />
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Check your email</h1>
            <p>We've sent you a confirmation link at {email}</p>
          </div>
          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <button type="button" onClick={onToggleMode} className="link-button">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create your account</h1>
          <p>Get started with Sat-Brain today</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
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
                placeholder="Create a password"
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
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button type="button" onClick={onToggleMode} className="link-button">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}