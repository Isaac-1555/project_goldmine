import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, ArrowLeft, Search, X, Clock, Play, BarChart3, HelpCircle, ChevronRight, ChevronLeft, Trash2, Brain } from 'lucide-react'
import { SatBrainMark } from '../../brand/SatBrainMark'
import { getUserFiles, type FileWithMetadata } from '../../../lib/api'
import { useSubscription } from '../../../contexts/SubscriptionContext'
import { PremiumLock } from '../../Subscription/PremiumLock'
import {
  createSimpleQuiz, 
  getUserSimpleQuizzes, 
  getSimpleQuizById, 
  submitQuizAttempt,
  deleteSimpleQuiz,
  type SimpleQuizSet,
  type SimpleQuiz,
  type SimpleQuizAttempt
} from '../../../lib/quizServiceSimple'
import {
  createFlashcardSet,
  getUserFlashcardSets,
  getFlashcardSetById,
  submitFlashcardReviews,
  deleteFlashcardSet,
  computePerSourceMax,
  type FlashcardSet,
  type Flashcard,
  type FlashcardType,
  type GenerateFlashcardsOptions
} from '../../../lib/flashcardsServiceV2'
import './StudyToolsTab.css'

type QuestionType = 'mcq' | 'true-false' | 'fill-blank' | 'short-answer'
type ViewState = 'menu' | 'quiz-select' | 'quiz-taking' | 'quiz-results' | 'flashcard-select' | 'flashcards'

type FlashcardQuestionType = 'term-definition' | 'qa' | 'cloze'

interface QuizState {
  currentQuiz: SimpleQuizSet | null
  currentQuestionIndex: number
  userAnswers: { [questionIndex: number]: number }
  userAttempts: { [questionIndex: number]: SimpleQuizAttempt }
  startTime: number
  questionStartTime: number
}

export const StudyToolsTab: React.FC = () => {
  const { canAccessPremiumFeatures } = useSubscription();

  // Check premium access
  if (!canAccessPremiumFeatures) {
    return (
      <PremiumLock 
        feature="Advanced Study Tools"
        description="Access quizzes, flashcards, spaced repetition, and other powerful study features to master your material."
      />
    );
  }

  // Main state
  const [view, setView] = useState<ViewState>('menu')
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileWithMetadata[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(['mcq'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Quiz-specific state
  const [quizSets, setQuizSets] = useState<SimpleQuizSet[]>([])

  // Flashcards-specific state
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [flashcardSetsLoading, setFlashcardSetsLoading] = useState(false)
  const [selectedFlashcardTypes, setSelectedFlashcardTypes] = useState<FlashcardQuestionType[]>(['term-definition','qa','cloze'])
  const [autoOpenNewFlashcards, setAutoOpenNewFlashcards] = useState(() => {
    const saved = localStorage.getItem('sat-brain_auto_open_flashcards')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [perSourceDefaultCount, setPerSourceDefaultCount] = useState<number>(10)
  const [perSourceMaxCount, setPerSourceMaxCount] = useState<number>(10)
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const [currentFlashcardSet, setCurrentFlashcardSet] = useState<FlashcardSet | null>(null)
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [quizSetsLoading, setQuizSetsLoading] = useState(false)
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuiz: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    userAttempts: {},
    startTime: 0,
    questionStartTime: 0
  })
  
  // Generation state
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  
  // Notification and new quiz state
  const [notification, setNotification] = useState<string | null>(null)
  const [newlyCreatedQuizId, setNewlyCreatedQuizId] = useState<string | null>(null)
  
  // User preference for auto-opening quizzes (default: true for better UX)
  const [autoOpenNewQuiz, setAutoOpenNewQuiz] = useState(() => {
    const saved = localStorage.getItem('sat-brain_auto_open_quiz')
    return saved !== null ? JSON.parse(saved) : true
  })

  // Load files when switching to quiz-select view
  useEffect(() => {
    if (view === 'quiz-select' || view === 'flashcard-select') {
      loadFiles()
    }
  }, [view])

  // Load quiz and flashcard sets on component mount
  useEffect(() => {
    loadQuizSets()
    loadFlashcardSets()
  }, [])

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredFiles(files)
    } else {
      const filtered = files.filter(file => 
        file.tags?.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ) || 
        file.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.filename?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFiles(filtered)
    }
  }, [files, searchQuery])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Notification utility
  const showNotification = (message: string, duration: number = 4000) => {
    setNotification(message)
    setTimeout(() => setNotification(null), duration)
  }

  // Save user preference for auto-opening quizzes
  const toggleAutoOpenQuiz = () => {
    const newValue = !autoOpenNewQuiz
    setAutoOpenNewQuiz(newValue)
    localStorage.setItem('sat-brain_auto_open_quiz', JSON.stringify(newValue))
  }

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const filesData = await getUserFiles()
      // Only show completed files
      setFiles(filesData.filter(file => file.status === 'completed'))
    } catch (err) {
      console.error('Error loading files:', err)
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const loadQuizSets = async () => {
    try {
      setQuizSetsLoading(true)
      const quizData = await getUserSimpleQuizzes()
      setQuizSets(quizData)
    } catch (err) {
      console.error('Error loading quiz sets:', err)
    } finally {
      setQuizSetsLoading(false)
    }
  }

  const loadFlashcardSets = async () => {
    try {
      setFlashcardSetsLoading(true)
      const sets = await getUserFlashcardSets()
      setFlashcardSets(sets)
    } catch (err) {
      console.error('Error loading flashcard sets:', err)
    } finally {
      setFlashcardSetsLoading(false)
    }
  }

  // Get unique tags from all files
  const getAllTags = () => {
    const allTags = files.flatMap(file => file.tags || [])
    return [...new Set(allTags)].sort()
  }

  // Get filtered tag suggestions based on search query
  const getTagSuggestions = () => {
    if (!searchQuery) return []
    const allTags = getAllTags()
    return allTags.filter(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
      tag.toLowerCase() !== searchQuery.toLowerCase()
    ).slice(0, 5)
  }

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
  }

  // Handle tag suggestion click
  const handleSuggestionClick = (tag: string) => {
    setSearchQuery(tag)
    setShowSuggestions(false)
  }

  const handleFileToggle = (file: FileWithMetadata) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id)
      if (isSelected) {
        return prev.filter(f => f.id !== file.id)
      } else {
        return [...prev, file]
      }
    })
  }

  const handleQuestionTypeToggle = (type: QuestionType) => {
    // Only allow MCQ for now
    if (type === 'mcq') {
      setSelectedQuestionTypes(['mcq'])
    }
  }

  const handleFlashcardTypeToggle = (type: FlashcardQuestionType) => {
    setSelectedFlashcardTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleAutoOpenFlashcards = () => {
    const newValue = !autoOpenNewFlashcards
    setAutoOpenNewFlashcards(newValue)
    localStorage.setItem('sat-brain_auto_open_flashcards', JSON.stringify(newValue))
  }

  const handleGenerateQuiz = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file')
      return
    }

    try {
      setIsGeneratingQuiz(true)
      setError(null)

      // Create title from selected files
      const title = selectedFiles.length === 1 
        ? `Quiz: ${selectedFiles[0].title || selectedFiles[0].filename}`
        : `Quiz: ${selectedFiles.length} Files`

      // Get summary texts and IDs
      const summaryTexts = selectedFiles.map(f => f.summary_text || f.summary || '').filter(Boolean)
      const fileIds = selectedFiles.map(f => f.id)

      if (summaryTexts.length === 0) {
        setError('Selected files have no summary content')
        return
      }

      const newQuizSet = await createSimpleQuiz(
        summaryTexts,
        fileIds,
        title
      )
      
      // Refresh quiz sets
      await loadQuizSets()
      
      // Clear selections after successful generation
      setSelectedFiles([])
      setSearchQuery('')
      
      // Set newly created quiz ID for highlighting
      setNewlyCreatedQuizId(newQuizSet.id)
      
      // Clear error state
      setError(null)
      
      if (autoOpenNewQuiz) {
        // Auto-open the newly created quiz
        showNotification(`Quiz "${title}" created! Opening quiz...`, 2000)
        
        // Small delay to allow UI to update, then start the quiz
        setTimeout(() => {
          handleStartQuiz(newQuizSet.id)
        }, 500)
      } else {
        // Just show notification
        showNotification(`Quiz "${title}" created successfully! Find it in the Previous Quizzes panel.`, 4000)
      }
      
      // Clear the newly created quiz highlight after some time
      setTimeout(() => {
        setNewlyCreatedQuizId(null)
      }, 10000)
      
    } catch (err: any) {
      console.error('Error generating quiz:', err)
      setError(err.message || 'Failed to generate quiz')
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file')
      return
    }
    try {
      setIsGeneratingFlashcards(true)
      setError(null)
      // Compute per-source max from first selected summary (approx)
      const summaryTexts = selectedFiles.map(f => f.summary_text || f.summary || '').filter(Boolean)
      const fileIds = selectedFiles.map(f => f.id)
      if (summaryTexts.length === 0) {
        setError('Selected files have no summary content')
        return
      }
      // Use first text to estimate max; could be refined to per-file UI
      const max = computePerSourceMax(summaryTexts[0])
      setPerSourceMaxCount(max)

      const title = selectedFiles.length === 1 
        ? `Flashcards: ${selectedFiles[0].title || selectedFiles[0].filename}`
        : `Flashcards: ${selectedFiles.length} Files`

      const options: GenerateFlashcardsOptions = {
        types: selectedFlashcardTypes as FlashcardType[],
        perSourceDefault: perSourceDefaultCount,
        perSourceMax: max,
        includeImages: false
      }
      const set = await createFlashcardSet(summaryTexts, fileIds, title, options)
      await loadFlashcardSets()
      setSelectedFiles([])
      setSearchQuery('')
      if (autoOpenNewFlashcards) {
        showNotification(`Flashcards "${title}" created! Opening...`, 2000)
        setTimeout(() => handleStartFlashcards(set.id), 400)
      } else {
        showNotification(`Flashcards "${title}" created. Find it in the sidebar.`, 4000)
      }
    } catch (err: any) {
      console.error('Error generating flashcards:', err)
      setError(err.message || 'Failed to generate flashcards')
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  const handleStartQuiz = async (quizSetId: string) => {
    try {
      setError(null)
      const quizSet = await getSimpleQuizById(quizSetId)
      if (!quizSet) {
        throw new Error('Quiz not found')
      }
      
      setQuizState({
        currentQuiz: quizSet,
        currentQuestionIndex: 0,
        userAnswers: {},
        userAttempts: {},
        startTime: Date.now(),
        questionStartTime: Date.now()
      })

      setView('quiz-taking')
    } catch (err: any) {
      console.error('Error starting quiz:', err)
      setError(err.message || 'Failed to start quiz')
    }
  }

  const handleDeleteQuiz = async (summaryId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return
    }

    try {
      await deleteSimpleQuiz(summaryId)
      // Refresh quiz sets
      await loadQuizSets()
    } catch (err: any) {
      console.error('Error deleting quiz:', err)
      setError(err.message || 'Failed to delete quiz')
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (!quizState.currentQuiz?.questions?.[quizState.currentQuestionIndex]) return

    const newAnswers = {
      ...quizState.userAnswers,
      [quizState.currentQuestionIndex]: answerIndex
    }

    setQuizState(prev => ({
      ...prev,
      userAnswers: newAnswers
    }))
  }

  const handleNextQuestion = async () => {
    if (!quizState.currentQuiz?.questions) return

    const currentQuestion = quizState.currentQuiz.questions[quizState.currentQuestionIndex]
    const userAnswer = quizState.userAnswers[quizState.currentQuestionIndex]

    if (userAnswer !== undefined && !quizState.userAttempts[quizState.currentQuestionIndex]) {
      // Submit the answer
      try {
        const attempt = await submitQuizAttempt(
          currentQuestion.id,
          userAnswer
        )
        
        // Store the attempt
        setQuizState(prev => ({
          ...prev,
          userAttempts: {
            ...prev.userAttempts,
            [prev.currentQuestionIndex]: attempt
          }
        }))
      } catch (err) {
        console.error('Error submitting answer:', err)
      }
    }

    // Move to next question or complete quiz
    if (quizState.currentQuestionIndex < quizState.currentQuiz.questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        questionStartTime: Date.now()
      }))
    } else {
      // Complete the quiz
      setView('quiz-results')
    }
  }

  const handlePreviousQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
        questionStartTime: Date.now()
      }))
    }
  }

  // Remove handleCompleteQuiz as we now complete directly in handleNextQuestion

  const handleStartFlashcards = async (setId: string) => {
    try {
      const set = await getFlashcardSetById(setId)
      if (!set) throw new Error('Flashcards not found')
      setCurrentFlashcardSet(set)
      setFlashcardIndex(0)
      setIsFlipped(false)
      setView('flashcards')
    } catch (err: any) {
      setError(err.message || 'Failed to open flashcards')
    }
  }

  const handleDeleteFlashcards = async (summaryId: string) => {
    if (!window.confirm('Are you sure you want to delete this flashcard set? This action cannot be undone.')) return
    try {
      await deleteFlashcardSet(summaryId)
      await loadFlashcardSets()
    } catch (err: any) {
      setError(err.message || 'Failed to delete flashcards')
    }
  }

  const handleFlashNext = () => {
    if (!currentFlashcardSet) return
    setIsFlipped(false)
    setFlashcardIndex(i => Math.min(i + 1, currentFlashcardSet.cards.length - 1))
  }

  // Keyboard shortcuts for flashcards view
  useEffect(() => {
    if (view !== 'flashcards') return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
      if (isTyping) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsFlipped(f => !f)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleFlashPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleFlashNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, currentFlashcardSet])

  const handleFlashPrev = () => {
    setIsFlipped(false)
    setFlashcardIndex(i => Math.max(0, i - 1))
  }

  const handleFlashMark = async (ease: 'again' | 'good') => {
    const card = currentFlashcardSet?.cards[flashcardIndex]
    if (!card) return
    try {
      await submitFlashcardReviews([{ card_id: card.id, ease }])
      if (ease === 'good') {
        handleFlashNext()
      } else {
        // keep in place but flip back
        setIsFlipped(false)
      }
    } catch (err) {
      console.error('review failed', err)
    }
  }

  const handleBackToMenu = () => {
    setView('menu')
    setSelectedFiles([])
    setSearchQuery('')
    setError(null)
    setQuizState({
      currentQuiz: null,
      currentQuestionIndex: 0,
      userAnswers: {},
      userAttempts: {},
      startTime: 0,
      questionStartTime: 0
    })
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Helper function to render progress dots with sliding window
  const renderProgressDots = () => {
    if (!quizState.currentQuiz?.questions) return null
    
    const totalQuestions = quizState.currentQuiz.questions.length
    const currentIndex = quizState.currentQuestionIndex
    const MAX_VISIBLE_DOTS = 9 // Show maximum 9 dots at a time
    
    // If total questions <= MAX_VISIBLE_DOTS, show all dots
    if (totalQuestions <= MAX_VISIBLE_DOTS) {
      return (
        <>
          {quizState.currentQuiz.questions.map((_, index) => (
            <div
              key={index}
              className={`progress-dot ${
                index === currentIndex ? 'current' : ''
              } ${
                quizState.userAnswers[index] !== undefined ? 'answered' : ''
              }`}
            />
          ))}
        </>
      )
    }
    
    // Sliding window logic
    const dotsToShow: (number | 'ellipsis-start' | 'ellipsis-end')[] = []
    const windowSize = 7 // Show 7 dots in the window
    const sideBuffer = Math.floor(windowSize / 2) // 3 dots on each side of current
    
    // Calculate the window boundaries
    let startIndex = Math.max(0, currentIndex - sideBuffer)
    let endIndex = Math.min(totalQuestions - 1, currentIndex + sideBuffer)
    
    // Adjust if we're near the start or end
    if (startIndex === 0) {
      endIndex = Math.min(totalQuestions - 1, windowSize - 1)
    } else if (endIndex === totalQuestions - 1) {
      startIndex = Math.max(0, totalQuestions - windowSize)
    }
    
    // Add leading ellipsis if needed
    if (startIndex > 0) {
      dotsToShow.push('ellipsis-start')
    }
    
    // Add visible dots
    for (let i = startIndex; i <= endIndex; i++) {
      dotsToShow.push(i)
    }
    
    // Add trailing ellipsis if needed
    if (endIndex < totalQuestions - 1) {
      dotsToShow.push('ellipsis-end')
    }
    
    return (
      <>
        {dotsToShow.map((item, idx) => {
          if (item === 'ellipsis-start' || item === 'ellipsis-end') {
            return (
              <div key={item} className="progress-ellipsis">
                ...
              </div>
            )
          }
          
          const index = item as number
          return (
            <div
              key={index}
              className={`progress-dot ${
                index === currentIndex ? 'current' : ''
              } ${
                quizState.userAnswers[index] !== undefined ? 'answered' : ''
              }`}
            />
          )
        })}
      </>
    )
  }

  // Render left sidebar
  const renderLeftSidebar = () => {
    if (view === 'menu') {
      return null
    }

    return (
      <div className="quiz-left-sidebar">
        {/* Search Bar */}
        <div className="sidebar-section">
          <h3>Search Content</h3>
          <div className="search-container" ref={searchRef}>
            <div className="search-bar">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search by tags or title..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              />
              {searchQuery && (
                <button 
                  className="clear-search"
                  onClick={() => {
                    setSearchQuery('')
                    setShowSuggestions(false)
                  }}
                >
                  <X />
                </button>
              )}
            </div>
            
            {/* Tag Suggestions */}
            {showSuggestions && getTagSuggestions().length > 0 && (
              <div className="suggestions-dropdown">
                {getTagSuggestions().map((tag, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Question Type Selection (Quiz) */}
        {view === 'quiz-select' && (
          <div className="sidebar-section">
            <h3>Question Types</h3>
            <div className="question-type-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedQuestionTypes.includes('mcq')}
                  onChange={() => handleQuestionTypeToggle('mcq')}
                />
                Multiple Choice
              </label>
              <label className="checkbox-label disabled" title="Coming soon">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                />
                True/False
              </label>
              <label className="checkbox-label disabled" title="Coming soon">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                />
                Fill in the Blank
              </label>
              <label className="checkbox-label disabled" title="Coming soon">
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                />
                Short Answer
              </label>
            </div>
          </div>
        )}

        {/* Flashcard Filters & Settings */}
        {view === 'flashcard-select' && (
          <div className="sidebar-section">
            <h3>Flashcard Types</h3>
            <div className="question-type-checkboxes">
              {(['term-definition','qa','cloze'] as FlashcardQuestionType[]).map((t) => (
                <label key={t} className="checkbox-label">
                  <input type="checkbox" checked={selectedFlashcardTypes.includes(t)} onChange={() => handleFlashcardTypeToggle(t)} />
                  {t === 'term-definition' ? 'Term/Definition' : t === 'qa' ? 'Q/A' : 'Cloze'}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Flashcard Settings */}
        {view === 'flashcard-select' && (
          <div className="sidebar-section">
            <h3>Flashcard Settings</h3>
            <label className="checkbox-label">
              <input type="checkbox" checked={autoOpenNewFlashcards} onChange={toggleAutoOpenFlashcards} />
              Auto-open new sets
            </label>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Cards per source (default):
              </label>
              <input
                type="number"
                min={1}
                max={perSourceMaxCount}
                value={perSourceDefaultCount}
                onChange={(e) => setPerSourceDefaultCount(Math.max(1, Math.min(perSourceMaxCount, Number(e.target.value))))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-primary)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <p className="settings-description">Max based on content length: {perSourceMaxCount}</p>
            </div>
          </div>
        )}

        {/* Quiz Settings */}
        {view === 'quiz-select' && (
          <div className="sidebar-section">
            <h3>Quiz Settings</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={autoOpenNewQuiz}
                onChange={toggleAutoOpenQuiz}
              />
              Auto-open new quizzes
            </label>
            <p className="settings-description">
              {autoOpenNewQuiz 
                ? "New quizzes will open automatically after generation"
                : "New quizzes will appear in the sidebar for manual selection"
              }
            </p>
          </div>
        )}
        
        {/* Generate Flashcards Button */}
        {view === 'flashcard-select' && (
          <div className="sidebar-section">
            <button
              className={`generate-quiz-button ${selectedFiles.length === 0 ? 'disabled' : ''}`}
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards || selectedFiles.length === 0}
            >
              {isGeneratingFlashcards ? (
                <>
                  <div className="loading-spinner small"></div>
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen />
                  Generate Flashcards ({selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected)
                </>
              )}
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {/* Generate Quiz Button */}
        {view === 'quiz-select' && (
          <div className="sidebar-section">
            <button 
              className={`generate-quiz-button ${selectedFiles.length === 0 ? 'disabled' : ''}`}
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz || selectedFiles.length === 0}
            >
              {isGeneratingQuiz ? (
                <>
                  <div className="loading-spinner small"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Brain size={16} />
                  Generate Quiz ({selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected)
                </>
              )}
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        )}
      </div>
    )
  }

  // Render right sidebar
  const renderRightSidebar = () => {
    if (view === 'menu') {
      return null
    }

    // Right sidebar switches title/content based on view
    const isFlashSelect = view === 'flashcard-select' || view === 'flashcards'

    return (
      <div className="quiz-right-sidebar">
        <div className="sidebar-section">
          <h3>{isFlashSelect ? 'Previous Flashcard Sets' : 'Previous Quizzes'}</h3>
          {isFlashSelect ? (
            flashcardSetsLoading ? (
              <div className="loading-container small">
                <div className="loading-spinner small"></div>
                <p>Loading sets...</p>
              </div>
            ) : flashcardSets.length === 0 ? (
              <div className="empty-state small">
                <p>No flashcard sets yet. Generate your first set!</p>
              </div>
            ) : (
              <div className="previous-quizzes-list">
                {flashcardSets.map((set) => (
                  <div key={set.id} className="quiz-item">
                    <div className="quiz-item-content">
                      <div className="quiz-title-row">
                        <h4>{set.title}</h4>
                      </div>
                      <p>{set.cards.length} cards</p>
                      <span className="quiz-date">{new Date(set.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="quiz-item-actions">
                      <button className="retake-quiz-button" onClick={() => handleStartFlashcards(set.id)} title="Open">
                        <Play />
                      </button>
                      <button className="delete-quiz-button" onClick={(e) => { e.stopPropagation(); handleDeleteFlashcards(set.summary_id) }} title="Delete">
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            quizSetsLoading ? (
            <div className="loading-container small">
              <div className="loading-spinner small"></div>
              <p>Loading quizzes...</p>
            </div>
          ) : quizSets.length === 0 ? (
            <div className="empty-state small">
              <p>No quizzes created yet. Generate your first quiz!</p>
            </div>
          ) : (
            <div className="previous-quizzes-list">
              {quizSets.map((quiz) => {
                const isNewlyCreated = newlyCreatedQuizId === quiz.id
                return (
                  <div 
                    key={quiz.id} 
                    className={`quiz-item ${isNewlyCreated ? 'newly-created' : ''}`}
                  >
                    <div className="quiz-item-content">
                      <div className="quiz-title-row">
                        <h4>{quiz.title}</h4>
                        {isNewlyCreated && <span className="new-badge">NEW</span>}
                      </div>
                      <p>{quiz.questions.length} questions</p>
                      <span className="quiz-date">
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="quiz-item-actions">
                      <button
                        className="retake-quiz-button"
                        onClick={() => handleStartQuiz(quiz.id)}
                        disabled={view === 'quiz-taking'}
                        title="Start Quiz"
                      >
                        <Play />
                      </button>
                      <button
                        className="delete-quiz-button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteQuiz(quiz.summary_id)
                        }}
                        disabled={view === 'quiz-taking'}
                        title="Delete Quiz"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
        </div>
      </div>
    )
  }

  // Main content area based on current view
  const renderMainContent = () => {
    if (view === 'menu') {
      return (
        <div className="study-tools-tab">
          <div className="study-tools-header">
            <h2>Study Tools</h2>
            <p>Generate interactive learning materials from your content</p>
          </div>

          <div className="study-tools-menu">
            <div className="tool-card" onClick={() => setView('quiz-select')}>
              <div className="tool-icon">
                <Brain size={24} />
              </div>
              <h3>Quizzes</h3>
              <p>Test your knowledge with AI-generated multiple choice questions</p>
              <button className="tool-button">Create Quiz</button>
            </div>

            <div className="tool-card" onClick={() => setView('flashcard-select')}>
              <div className="tool-icon">
                <BookOpen />
              </div>
              <h3>Flashcards</h3>
              <p>Review key concepts with interactive flashcards</p>
              <button className="tool-button">Create Flashcards</button>
            </div>
          </div>
        </div>
      )
    }

    if (view === 'quiz-select') {
      return (
        <div className="quiz-main-content">
          <div className="quiz-content-header">
            <button className="back-button" onClick={handleBackToMenu}>
              <ArrowLeft />
            </button>
            <h2>Select Content for Quiz</h2>
            <p>Choose summaries to generate quiz questions from</p>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your content...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <p>No processed content available. Upload and process some content first.</p>
            </div>
          ) : (
            <div className="file-selection">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.some(f => f.id === file.id)
                return (
                  <div
                    key={file.id}
                    className={`selectable-file-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFileToggle(file)}
                  >
                    <div className="file-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleFileToggle(file)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <h3>{file.title || file.filename}</h3>
                    <div className="file-tags">
                      <div className="file-tags-inner">
                        {file.tags && file.tags.length > 0 ? (
                          file.tags.map((tag, index) => (
                            <span key={index} className="tag">{typeof tag === 'string' ? tag : (tag?.name || String(tag))}</span>
                          ))
                        ) : (
                          <span className="tag no-tags">No tags</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (view === 'flashcard-select') {
      return (
        <div className="quiz-main-content">
          <div className="quiz-content-header">
            <button className="back-button" onClick={handleBackToMenu}>
              <ArrowLeft />
            </button>
            <h2>Select Content for Flashcards</h2>
            <p>Choose summaries to generate flashcards from</p>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your content...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <p>No processed content available. Upload and process some content first.</p>
            </div>
          ) : (
            <div className="file-selection">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.some(f => f.id === file.id)
                return (
                  <div
                    key={file.id}
                    className={`selectable-file-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFileToggle(file)}
                  >
                    <div className="file-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleFileToggle(file)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <h3>{file.title || file.filename}</h3>
                    <div className="file-tags">
                      <div className="file-tags-inner">
                        {file.tags && file.tags.length > 0 ? (
                          file.tags.map((tag, index) => (
                            <span key={index} className="tag">{typeof tag === 'string' ? tag : (tag?.name || String(tag))}</span>
                          ))
                        ) : (
                          <span className="tag no-tags">No tags</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (view === 'quiz-taking' && quizState.currentQuiz?.questions) {
      const currentQuestion = quizState.currentQuiz.questions[quizState.currentQuestionIndex]
      const currentAnswer = quizState.userAnswers[quizState.currentQuestionIndex]
      const elapsedTime = Math.floor((Date.now() - quizState.startTime) / 1000)

      return (
        <div className="quiz-taking-container">
          <div className="quiz-header">
            <button className="back-button" onClick={handleBackToMenu}>
              <ArrowLeft />
            </button>
            <div className="quiz-progress">
              <h2>{quizState.currentQuiz.title}</h2>
              <div className="progress-info">
                <span>Question {quizState.currentQuestionIndex + 1} of {quizState.currentQuiz.questions.length}</span>
                <div className="timer">
                  <Clock />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="question-content">
            <div className="question-text">
              <h3>{String(currentQuestion.question || '')}</h3>
            </div>

            <div className="answer-options">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`answer-option ${currentAnswer === index ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{String(option || '')}</span>
                </button>
              ))}
            </div>

            <div className="question-navigation">
              <button
                className="nav-button"
                onClick={handlePreviousQuestion}
                disabled={quizState.currentQuestionIndex === 0}
              >
                <ChevronLeft />
                Previous
              </button>

              <div className="progress-dots">
                {renderProgressDots()}
              </div>

              <button
                className="nav-button primary"
                onClick={handleNextQuestion}
                disabled={currentAnswer === undefined}
              >
                {quizState.currentQuestionIndex === quizState.currentQuiz.questions.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (view === 'quiz-results' && quizState.currentQuiz) {
      const totalQuestions = quizState.currentQuiz.questions.length
      const answeredQuestions = Object.keys(quizState.userAttempts).length
      const correctAnswers = Object.values(quizState.userAttempts).filter(attempt => attempt.is_correct).length
      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
      const timeSpent = quizState.startTime ? Math.floor((Date.now() - quizState.startTime) / 1000) : 0

      return (
        <div className="quiz-results-container">
          <div className="quiz-header">
            <button className="back-button" onClick={handleBackToMenu}>
              <ArrowLeft />
            </button>
            <div className="quiz-progress">
              <h2>Quiz Results</h2>
              <p>{quizState.currentQuiz.title}</p>
            </div>
          </div>

          <div className="results-content">
            <div className="score-summary">
              <div className="score-circle">
                <span className="score-percentage">{score}%</span>
                <span className="score-label">Score</span>
              </div>
              
              <div className="result-stats">
                <div className="stat-item">
                  <span className="stat-value">{correctAnswers}</span>
                  <span className="stat-label">Correct</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{totalQuestions - correctAnswers}</span>
                  <span className="stat-label">Incorrect</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{formatTime(timeSpent)}</span>
                  <span className="stat-label">Time</span>
                </div>
              </div>
            </div>

            <div className="question-review">
              <h3>Question Review</h3>
              <div className="questions-list">
                {quizState.currentQuiz.questions.map((question, index) => {
                  const userAnswer = quizState.userAnswers[index]
                  const attempt = quizState.userAttempts[index]
                  const isCorrect = attempt?.is_correct || false
                  
                  return (
                    <div key={question.id} className={`question-review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                      <div className="question-header">
                        <span className="question-number">Q{index + 1}</span>
                        <span className={`result-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
                          {isCorrect ? '✓' : '✗'}
                        </span>
                      </div>
                      <p className="question-text">{String(question.question || '')}</p>
                      <div className="answer-options">
                        {question.options.map((option, optionIndex) => {
                          const isUserAnswer = userAnswer === optionIndex
                          const isCorrectAnswer = optionIndex === question.correct_index
                          
                          return (
                            <div 
                              key={optionIndex} 
                              className={`review-option ${
                                isCorrectAnswer ? 'correct-answer' : ''
                              } ${
                                isUserAnswer ? 'user-answer' : ''
                              }`}
                            >
                              <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                              <span className="option-text">{String(option || '')}</span>
                              {isCorrectAnswer && <span className="indicator correct">✓</span>}
                              {isUserAnswer && !isCorrectAnswer && <span className="indicator incorrect">✗</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="results-actions">
              <button className="tool-button" onClick={() => handleStartQuiz(quizState.currentQuiz!.id)}>
                Retake Quiz
              </button>
              <button className="tool-button secondary" onClick={handleBackToMenu}>
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Flashcards player view
    if (view === 'flashcards' && currentFlashcardSet) {
      const card = currentFlashcardSet.cards[flashcardIndex]
      return (
        <div className="quiz-taking-container">
          <div className="quiz-header">
            <button className="back-button" onClick={handleBackToMenu}>
              <ArrowLeft />
            </button>
            <div className="quiz-progress">
              <h2>{currentFlashcardSet.title}</h2>
              <div className="progress-info">
                <span>Card {flashcardIndex + 1} of {currentFlashcardSet.cards.length}</span>
              </div>
            </div>
          </div>
          <div className="question-content" style={{ alignItems: 'center' }}>
            <div className="question-text" style={{ width: '100%', maxWidth: 900 }}>
              <div
                onClick={() => setIsFlipped(f => !f)}
                className={`flashcard-card ${isFlipped ? 'back' : 'front'}`}
                aria-live="polite"
              >
                <h3 style={{ margin: 0 }}>
                  {isFlipped ? String(card.answer_text || '') : String(card.question_text || '')}
                </h3>
              </div>
            </div>
            <div className="question-navigation">
              <button className="nav-button" onClick={handleFlashPrev} disabled={flashcardIndex === 0}>
                <ChevronLeft /> Previous
              </button>
              <button className="nav-button" onClick={() => setIsFlipped(f => !f)}>
                {isFlipped ? 'Show Front' : 'Flip'}
              </button>
              <button className="nav-button primary" onClick={() => handleFlashNext()} disabled={flashcardIndex === currentFlashcardSet.cards.length - 1}>
                Next <ChevronRight />
              </button>
            </div>
            <p className="kb-hint">Tip: press Space to flip; use ← → to navigate.</p>
          </div>
        </div>
      )
    }

    // Fallback
    return (
      <div className="coming-soon-placeholder">
        <HelpCircle className="placeholder-icon" />
        <h3>Feature Coming Soon</h3>
        <p>This feature is under development.</p>
        <button className="tool-button" onClick={handleBackToMenu}>
          Back to Menu
        </button>
      </div>
    )
  }

  return (
    <div className="study-tools-container">
      {/* Notification Toast */}
      {notification && (
        <div className="notification-toast">
          {notification}
        </div>
      )}
      
      {renderLeftSidebar()}
      <div className="study-tools-main">
        {renderMainContent()}
      </div>
      {renderRightSidebar()}
    </div>
  )
}