import React, { useState } from 'react'
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { submitFeedback } from '../../lib/feedbackService'
import { CustomSelect } from '../CustomSelect'
import './FeedbackModal.css'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState('General')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      setErrorMessage('Please enter a message')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    const result = await submitFeedback({
      message: message.trim(),
      category,
      userEmail: userEmail.trim() || undefined,
    })

    setIsSubmitting(false)

    if (result.success) {
      setSubmitStatus('success')
      // Reset form after 2 seconds
      setTimeout(() => {
        setMessage('')
        setCategory('General')
        setSubmitStatus('idle')
        onClose()
      }, 2000)
    } else {
      setSubmitStatus('error')
      setErrorMessage(result.error || 'Failed to send feedback')
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage('')
      setCategory('General')
      setSubmitStatus('idle')
      setErrorMessage('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="feedback-modal-overlay" onClick={handleClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>Send Feedback</h2>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={[
                { value: 'General', label: 'General Feedback' },
                { value: 'Bug Report', label: 'Bug Report' },
                { value: 'Feature Request', label: 'Feature Request' },
                { value: 'Question', label: 'Question' },
                { value: 'Other', label: 'Other' }
              ]}
              disabled={isSubmitting}
              ariaLabel="Feedback category"
              className="feedback-select"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your thoughts, report a bug, or suggest a feature..."
              rows={6}
              disabled={isSubmitting}
              className="feedback-textarea"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="userEmail">Your Email (optional)</label>
            <input
              id="userEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your.email@example.com"
              disabled={isSubmitting}
              className="feedback-input"
            />
            <p className="input-help">
              We'll use this to follow up if needed
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="feedback-status success">
              <CheckCircle size={20} />
              <span>Thank you! Your feedback has been sent.</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="feedback-status error">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="feedback-modal-footer">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
