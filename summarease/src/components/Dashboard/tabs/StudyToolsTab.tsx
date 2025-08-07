import React, { useState, useEffect } from 'react'
import { BookOpen, Brain, ArrowLeft } from 'lucide-react'
import { getUserFiles, type FileWithMetadata } from '../../../lib/api'
import './StudyToolsTab.css'

export const StudyToolsTab: React.FC = () => {
  const [view, setView] = useState<'menu' | 'quiz-select' | 'quiz' | 'flashcard-select' | 'flashcards'>('menu')
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [selectedFile, setSelectedFile] = useState<FileWithMetadata | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (view === 'quiz-select' || view === 'flashcard-select') {
      loadFiles()
    }
  }, [view])

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

  const handleBackToMenu = () => {
    setView('menu')
    setSelectedFile(null)
  }

  const handleBackToSelect = () => {
    if (view === 'quiz') {
      setView('quiz-select')
    } else if (view === 'flashcards') {
      setView('flashcard-select')
    }
    setSelectedFile(null)
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
            Back to Study Tools
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
          <div className="file-selection">
            {files.map((file) => (
              <div
                key={file.id}
                className="selectable-file-card"
                onClick={() => handleFileSelect(file)}
              >
                <h3>{file.title || file.filename}</h3>
                <p>{file.summary?.substring(0, 100)}...</p>
                <div className="file-tags">
                  {file.tags?.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (view === 'quiz' && selectedFile) {
    return (
      <div className="study-tools-tab">
        <div className="study-tools-header">
          <button className="back-button" onClick={handleBackToSelect}>
            <ArrowLeft />
            Back to Selection
          </button>
          <h2>Quiz: {selectedFile.title || selectedFile.filename}</h2>
        </div>

        <div className="quiz-container">
          <div className="quiz-placeholder">
            <Brain className="placeholder-icon" />
            <h3>Quiz Generation Coming Soon</h3>
            <p>AI-powered quiz generation will be available in the next update.</p>
            <p>Selected content: <strong>{selectedFile.title || selectedFile.filename}</strong></p>
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
            Back to Selection
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