import React, { useState } from 'react'
import { AuthProvider, useAuth } from './components/Auth/AuthProvider'
import { LoginForm } from './components/Auth/LoginForm'
import { SignUpForm } from './components/Auth/SignUpForm'
import { Dashboard } from './components/Dashboard/Dashboard'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()
  const [isLoginMode, setIsLoginMode] = useState(true)

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return isLoginMode ? (
      <LoginForm onToggleMode={() => setIsLoginMode(false)} />
    ) : (
      <SignUpForm onToggleMode={() => setIsLoginMode(true)} />
    )
  }

  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
