import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import './AuthForms.css'

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [initializing, setInitializing] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [sessionReady, setSessionReady] = useState(false)

  const resetPath = useMemo(() => {
    try {
      return window.location.pathname
    } catch {
      return '/reset-password'
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrateSessionFromUrl = async () => {
      setInitializing(true)
      setError('')

      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            })
            if (sessionError) throw sessionError
          }
        }

        // Clear tokens/code from the URL (best-effort)
        try {
          window.history.replaceState({}, document.title, resetPath)
        } catch {
          // ignore
        }

        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          throw new Error('Password reset link is invalid or has expired. Please request a new reset link.')
        }

        if (!cancelled) {
          setSessionReady(true)
        }
      } catch (err: any) {
        console.error('Failed to initialize password reset session', err)
        if (!cancelled) {
          setSessionReady(false)
          setError(err?.message || 'Failed to initialize password reset')
        }
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    void hydrateSessionFromUrl()

    return () => {
      cancelled = true
    }
  }, [resetPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setError('')

    if (!sessionReady) {
      setError('Please open the reset link from your email again.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      setSubmitting(true)
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Per decision: send user back to login, and ensure recovery session is cleared
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore sign-out errors
      }

      toast.success('Password updated', 'Please sign in with your new password.')
      navigate('/login', { replace: true })
    } catch (err: any) {
      console.error('Failed to update password', err)
      setError(err?.message || 'Failed to update password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-back">
        <Link to="/login" className="auth-back-button" aria-label="Back to Login">
          <ArrowLeft />
          Back to Login
        </Link>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1>Set a new password</h1>
          <p>Choose a new password for your Sat-Brain account</p>
        </div>

        {initializing ? (
          <div className="auth-form">
            <div className="success-message">Loading reset session…</div>
          </div>
        ) : sessionReady ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a new password"
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
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  id="confirmNewPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                />
                <span />
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        ) : (
          <div className="auth-form">
            {error && <div className="error-message">{error}</div>}
            <div className="auth-footer" style={{ marginTop: 0 }}>
              <p>
                Go back to{' '}
                <Link to="/login" className="link-button">
                  login
                </Link>{' '}
                to request a new reset link.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
