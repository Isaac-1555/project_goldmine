import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/Auth/AuthProvider'
import { ThemeProvider } from './contexts/ThemeContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { LoginForm } from './components/Auth/LoginForm'
import { SignUpForm } from './components/Auth/SignUpForm'
import { Dashboard } from './components/Dashboard/Dashboard'
import { LandingPage } from './components/LandingPage'
import { PricingPage } from './components/Subscription'
import { Analytics } from './components/Analytics/Analytics'
import { PrivacyPolicy } from './components/PrivacyPolicy'
import { TermsOfService } from './components/TermsOfService'
import ScrollToTop from './components/ScrollToTop'
import './App.css'
import './styles/buttons.css'
import './styles/toast.css'
import './styles/tooltip.css'
import { ToastProvider } from './components/Toast/ToastProvider'

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
              onGetStarted={() => navigate('/pricing')}
              onLogin={() => navigate('/login')}
              splineUrl={import.meta.env.VITE_SPLINE_SCENE_URL as any}
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
      <Route 
        path="/pricing" 
        element={<PricingPage />} 
      />
      <Route 
        path="/privacy" 
        element={<PrivacyPolicy />} 
      />
      <Route 
        path="/terms" 
        element={<TermsOfService />} 
      />
      <Route 
        path="/subscription/success" 
        element={
          user ? (
            <Navigate to="/dashboard" replace />
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
      <ToastProvider>
        {/* Ensure each route change scrolls to top and handles hash anchors */}
        <ScrollToTop />
        <ThemeProvider>
          <AuthProvider>
            <SubscriptionProvider>
              {/* Google Analytics */}
              <Analytics 
                trackingId={import.meta.env.VITE_GA_TRACKING_ID}
                enabled={true}
              />
              <AppContent />
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
      </ToastProvider>
    </Router>
  )
}

export default App
