import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './OnboardingTour.css'

type OnboardingSlide = {
  title: string
  content: React.ReactNode
}

const SLIDES: OnboardingSlide[] = [
  {
    title: 'Welcome to Satbrain',
    content: (
      <>
        <p>
          Satbrain helps you capture information and turn it into organized knowledge.
        </p>
        <ul>
          <li>Create notebooks for notes, recordings, and uploads</li>
          <li>Browse your knowledge history in list + map form</li>
          <li>Study with quizzes and flashcards generated from your content</li>
        </ul>
      </>
    )
  },
  {
    title: 'Notebook tab',
    content: (
      <>
        <p>
          Use the <strong>Notebook</strong> tab to create and edit a notebook.
        </p>
        <ul>
          <li>Write notes as you learn</li>
          <li>Upload documents or record audio for your notebook</li>
          <li>Add tags to make your content easier to find later</li>
        </ul>
      </>
    )
  },
  {
    title: 'View tab (Map View)',
    content: (
      <>
        <p>
          The <strong>View</strong> tab is your knowledge history.
        </p>
        <ul>
          <li><strong>List View</strong>: browse everything by title/tags</li>
          <li><strong>Map View</strong> (Premium/Trial): explore connections between notes using tags</li>
          <li>Tip: better tags → better connections in Map View</li>
        </ul>
      </>
    )
  },
  {
    title: 'Study Tools (Quizzes + Flashcards)',
    content: (
      <>
        <p>
          The <strong>Study Tools</strong> tab (Premium/Trial) turns your content into practice.
        </p>
        <ul>
          <li><strong>Quizzes</strong>: test yourself with AI-generated questions</li>
          <li><strong>Flashcards</strong>: review key concepts quickly</li>
          <li>More study tools are coming in future updates</li>
        </ul>
      </>
    )
  },
  {
    title: 'Send feedback',
    content: (
      <>
        <p>
          We’d love your feedback.
        </p>
        <ul>
          <li>Go to <strong>Settings</strong></li>
          <li>Click <strong>Send Feedback</strong></li>
          <li>Report bugs, suggest features, or share what you want next</li>
        </ul>
      </>
    )
  }
]

interface OnboardingTourProps {
  onComplete: () => void
  onSkip: () => void
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0)
  const modalRef = useRef<HTMLDivElement | null>(null)

  const totalSteps = SLIDES.length
  const isFirst = step === 0
  const isLast = step === totalSteps - 1

  const slide = useMemo(() => SLIDES[step], [step])

  useEffect(() => {
    // Focus for accessibility (and to keep keyboard intent within the modal).
    modalRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Let users skip quickly.
      if (e.key === 'Escape') {
        e.preventDefault()
        onSkip()
        return
      }

      if (e.key === 'ArrowLeft') {
        if (!isFirst) {
          e.preventDefault()
          setStep((s) => Math.max(0, s - 1))
        }
        return
      }

      if (e.key === 'ArrowRight') {
        if (!isLast) {
          e.preventDefault()
          setStep((s) => Math.min(totalSteps - 1, s + 1))
        }
        return
      }

    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFirst, isLast, onSkip, totalSteps])

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1))
  }

  const handleNextOrDone = () => {
    if (isLast) {
      onComplete()
      return
    }
    setStep((s) => Math.min(totalSteps - 1, s + 1))
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div
        className="onboarding-modal"
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="onboarding-header">
          <div className="onboarding-progress">
            <span className="onboarding-step-count">
              {step + 1} / {totalSteps}
            </span>
            <div className="onboarding-dots" aria-hidden="true">
              {SLIDES.map((_, idx) => (
                <span
                  key={idx}
                  className={`onboarding-dot ${idx === step ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>

          <button className="onboarding-skip" onClick={onSkip}>
            Skip
          </button>
        </div>

        <div className="onboarding-body">
          <h2 id="onboarding-title">{slide.title}</h2>
          <div className="onboarding-content">{slide.content}</div>
        </div>

        <div className="onboarding-footer">
          <button
            className="onboarding-nav secondary"
            onClick={handleBack}
            disabled={isFirst}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <button className="onboarding-nav primary" onClick={handleNextOrDone}>
            {isLast ? 'Done' : 'Next'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
