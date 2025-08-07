import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/Auth/AuthProvider'
import { LoginForm } from './components/Auth/LoginForm'
import { SignUpForm } from './components/Auth/SignUpForm'
import { Dashboard } from './components/Dashboard/Dashboard'
import { LandingPage } from './components/LandingPage'
import './App.css'

function AppContent() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage 
              onSignUp={() => navigate('/signup')}
              onLogin={() => navigate('/login')}
            />
          )
        } 
      />
      <Route 
        path="/login" 
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginForm onToggleMode={() => navigate('/signup')} />
          )
        } 
      />
      <Route 
        path="/signup" 
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SignUpForm onToggleMode={() => navigate('/login')} />
          )
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          user ? (
            <Dashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
