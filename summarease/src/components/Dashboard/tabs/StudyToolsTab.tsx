import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Brain, ArrowLeft, Search, X } from 'lucide-react'
import { getUserFiles, type FileWithMetadata } from '../../../lib/api'
import './StudyToolsTab.css'

type QuestionType = 'mcq' | 'true-false' | 'fill-blank' | 'short-answer'

export const StudyToolsTab: React.FC = () => {
  const [view, setView] = useState<'menu' | 'quiz-select' | 'quiz' | 'flashcard-select' | 'flashcards'>('menu')
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [filteredFiles, setFilteredFiles] = useState<FileWithMetadata[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([])
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(['mcq'])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (view === 'quiz-select' || view === 'flashcard-select') {
      loadFiles()
    }
  }, [view])

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
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFiles(filtered)
    }
  }, [files, searchQuery])

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

  const loadFiles = async () => {
    try {
      setLoading(true)
      const filesData = await getUserFiles()
      // Only show completed files
      setFiles(filesData.filter(file => file.status === 'completed'))
    } catch (err) {
      console.error('Error loading files:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: FileWithMetadata) => {
    setSelectedFile(file)
    if (view === 'quiz-select') {
      setView('quiz')
    } else if (view === 'flashcard-select') {
      setView('flashcards')
    }
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
    setSelectedQuestionTypes(prev => {
      const isSelected = prev.includes(type)
      if (isSelected) {
        const newTypes = prev.filter(t => t !== type)
        return newTypes.length === 0 ? ['mcq'] : newTypes // Always keep at least MCQ
      } else {
        return [...prev, type]
      }
    })
  }

  const handleGenerateQuiz = () => {
    if (selectedFiles.length === 0) return
    
    // For now, set the first selected file as the selected file for compatibility
    setSelectedFile(selectedFiles[0])
    setView('quiz')
  }

  const handleBackToMenu = () => {
    setView('menu')
    setSelectedFile(null)
    setSelectedFiles([])
    setSearchQuery('')
  }

  const handleBackToSelect = () => {
    if (view === 'quiz') {
      setView('quiz-select')
    } else if (view === 'flashcards') {
      setView('flashcard-select')
    }
    setSelectedFile(null)
    setSelectedFiles([])
  }

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
              <Brain />
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

  if (view === 'quiz-select' || view === 'flashcard-select') {
    const toolType = view === 'quiz-select' ? 'Quiz' : 'Flashcards'
    
    return (
      <div className="study-tools-tab">
        <div className="study-tools-header">
          <button className="back-button" onClick={handleBackToMenu}>
            <ArrowLeft />
          </button>
          <h2>Select Content for {toolType}</h2>
          <p>Choose a summary to generate {toolType.toLowerCase()} from</p>
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
          <>
            {/* Search Bar */}
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

            {/* Question Type Selection for Quiz */}
            {view === 'quiz-select' && (
              <div className="question-types">
                <h4>Question Types:</h4>
                <div className="question-type-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes('mcq')}
                      onChange={() => handleQuestionTypeToggle('mcq')}
                    />
                    Multiple Choice
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes('true-false')}
                      onChange={() => handleQuestionTypeToggle('true-false')}
                    />
                    True/False
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes('fill-blank')}
                      onChange={() => handleQuestionTypeToggle('fill-blank')}
                    />
                    Fill in the Blank
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedQuestionTypes.includes('short-answer')}
                      onChange={() => handleQuestionTypeToggle('short-answer')}
                    />
                    Short Answer
                  </label>
                </div>
              </div>
            )}

            {/* File Selection */}
            <div className="file-selection">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.some(f => f.id === file.id)
                return (
                  <div
                    key={file.id}
                    className={`selectable-file-card ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      if (view === 'quiz-select') {
                        e.stopPropagation()
                        handleFileToggle(file)
                      } else {
                        handleFileSelect(file)
                      }
                    }}
                  >
                    {view === 'quiz-select' && (
                      <div className="file-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFileToggle(file)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <h3>{file.title || file.filename}</h3>
                    <div className="file-tags">
                      <div className="file-tags-inner">
                        {file.tags && file.tags.length > 0 ? (
                          file.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
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

            {/* Generate Quiz Button */}
            {view === 'quiz-select' && selectedFiles.length > 0 && (
              <div className="quiz-generation-section">
                <button 
                  className="generate-quiz-button"
                  onClick={handleGenerateQuiz}
                >
                  Generate Quiz ({selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (view === 'quiz' && (selectedFile || selectedFiles.length > 0)) {
    const quizFiles = selectedFiles.length > 0 ? selectedFiles : [selectedFile].filter(Boolean)
    const quizTitle = quizFiles.length === 1 
      ? `Quiz: ${quizFiles[0].title || quizFiles[0].filename}`
      : `Quiz: ${quizFiles.length} Files Selected`
    
    return (
      <div className="study-tools-tab">
        <div className="study-tools-header">
          <button className="back-button" onClick={handleBackToSelect}>
            <ArrowLeft />
          </button>
          <h2>{quizTitle}</h2>
        </div>

        <div className="quiz-container">
          <div className="quiz-placeholder">
            <Brain className="placeholder-icon" />
            <h3>Quiz Generation Coming Soon</h3>
            <p>AI-powered quiz generation will be available in the next update.</p>
            
            <div className="quiz-details">
              <div className="selected-files-info">
                <h4>Selected Files ({quizFiles.length}):</h4>
                <ul>
                  {quizFiles.map((file, index) => (
                    <li key={file.id}>{file.title || file.filename}</li>
                  ))}
                </ul>
              </div>
              
              <div className="selected-question-types">
                <h4>Question Types:</h4>
                <ul>
                  {selectedQuestionTypes.map((type, index) => (
                    <li key={type}>
                      {type === 'mcq' ? 'Multiple Choice' :
                       type === 'true-false' ? 'True/False' :
                       type === 'fill-blank' ? 'Fill in the Blank' :
                       type === 'short-answer' ? 'Short Answer' : type}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'flashcards' && selectedFile) {
    return (
      <div className="study-tools-tab">
        <div className="study-tools-header">
          <button className="back-button" onClick={handleBackToSelect}>
            <ArrowLeft />
          </button>
          <h2>Flashcards: {selectedFile.title || selectedFile.filename}</h2>
        </div>

        <div className="flashcards-container">
          <div className="flashcards-placeholder">
            <BookOpen className="placeholder-icon" />
            <h3>Flashcard Generation Coming Soon</h3>
            <p>AI-powered flashcard generation will be available in the next update.</p>
            <p>Selected content: <strong>{selectedFile.title || selectedFile.filename}</strong></p>
          </div>
        </div>
      </div>
    )
  }

  return null
}