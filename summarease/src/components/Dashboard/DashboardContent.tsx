import React, { useState } from 'react'
import { Upload, Mic, FileText, Brain } from 'lucide-react'
import { FileUpload } from '../Upload/FileUpload'
import { AudioRecorder } from '../Recording/AudioRecorder'
import './DashboardContent.css'

export const DashboardContent: React.FC = () => {
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1>Welcome to Sat-Brain</h1>
        <p>Transform your content into knowledge with AI-powered summaries and insights</p>
      </div>

      <div className="getting-started">
        <h2>Get Started</h2>
        <div className="action-cards">
          <div className="action-card">
            <div className="card-icon">
              <Mic />
            </div>
            <h3>Record Audio</h3>
            <p>Record lectures, meetings, or conversations and get instant transcriptions</p>
            <button 
              className="card-button"
              onClick={() => setShowAudioRecorder(true)}
            >
              Start Recording
            </button>
          </div>

          <div className="action-card">
            <div className="card-icon">
              <Upload />
            </div>
            <h3>Upload Document</h3>
            <p>Upload PDF or DOCX files to extract and summarize their content</p>
            <button 
              className="card-button"
              onClick={() => setShowFileUpload(true)}
            >
              Upload File
            </button>
          </div>

          <div className="action-card">
            <div className="card-icon">
              <FileText />
            </div>
            <h3>View Summaries</h3>
            <p>Browse and manage your processed content and summaries</p>
            <button className="card-button" disabled>No Content Yet</button>
          </div>

          <div className="action-card">
            <div className="card-icon">
              <Brain />
            </div>
            <h3>Knowledge Graph</h3>
            <p>Explore connections between your content in an interactive graph</p>
            <button className="card-button" disabled>No Content Yet</button>
          </div>
        </div>
      </div>

      <div className="features-overview">
        <h2>What you can do with Sat-Brain</h2>
        <div className="features-grid">
          <div className="feature-item">
            <h4>🎤 Audio Transcription</h4>
            <p>Record and transcribe audio with high accuracy using AI</p>
          </div>
          <div className="feature-item">
            <h4>📄 Document Processing</h4>
            <p>Extract text from PDFs and Word documents automatically</p>
          </div>
          <div className="feature-item">
            <h4>🤖 AI Summaries</h4>
            <p>Generate concise, intelligent summaries of your content</p>
          </div>
          <div className="feature-item">
            <h4>🏷️ Smart Tagging</h4>
            <p>Automatically tag content to discover connections</p>
          </div>
          <div className="feature-item">
            <h4>🃏 Study Tools</h4>
            <p>Create flashcards and quizzes from your summaries</p>
          </div>
          <div className="feature-item">
            <h4>💬 AI Chat</h4>
            <p>Ask questions about your content and get instant answers</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFileUpload && (
        <FileUpload
          onUploadComplete={(fileId) => {
            console.log('File uploaded:', fileId)
            setShowFileUpload(false)
            // TODO: Navigate to file view or show success message
          }}
          onClose={() => setShowFileUpload(false)}
        />
      )}

      {showAudioRecorder && (
        <AudioRecorder
          onRecordingComplete={(fileId) => {
            console.log('Recording uploaded:', fileId)
            setShowAudioRecorder(false)
            // TODO: Navigate to file view or show success message
          }}
          onClose={() => setShowAudioRecorder(false)}
        />
      )}
    </div>
  )
}