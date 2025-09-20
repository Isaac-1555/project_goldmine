import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import './lib/loadKatex'
import App from './App.tsx'
import { PostHogProvider } from 'posthog-js/react'

// Apply theme immediately to prevent flash of unstyled content
const initializeTheme = () => {
  const stored = localStorage.getItem('theme-mode')
  let themeMode = stored || 'system'
  
  // Migrate from old theme storage
  if (!stored) {
    const oldTheme = localStorage.getItem('theme')
    if (oldTheme && (oldTheme === 'light' || oldTheme === 'dark')) {
      themeMode = oldTheme
      localStorage.removeItem('theme')
      localStorage.setItem('theme-mode', oldTheme)
    }
  }
  
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  const actualTheme = themeMode === 'system' ? getSystemTheme() : themeMode
  document.documentElement.setAttribute('data-theme', actualTheme)
}

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: import.meta.env.MODE === "development",
      }}
    >
      <App />
    </PostHogProvider>
  </StrictMode>,
)