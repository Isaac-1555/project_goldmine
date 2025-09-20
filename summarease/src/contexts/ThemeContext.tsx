import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ActualTheme = 'light' | 'dark'

interface ThemeContextType {
  themeMode: ThemeMode
  actualTheme: ActualTheme
  setThemeMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get initial theme mode from localStorage, default to 'system'
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode')
    if (stored) {
      return stored as ThemeMode
    }
    
    // Migrate from old theme storage
    const oldTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (oldTheme && (oldTheme === 'light' || oldTheme === 'dark')) {
      localStorage.removeItem('theme') // Clean up old storage
      localStorage.setItem('theme-mode', oldTheme)
      return oldTheme
    }
    
    return 'system'
  })

  // Get system theme preference
  const getSystemTheme = (): ActualTheme => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Calculate actual theme based on mode
  const getActualTheme = (mode: ThemeMode): ActualTheme => {
    if (mode === 'system') {
      return getSystemTheme()
    }
    return mode
  }

  const [actualTheme, setActualTheme] = useState<ActualTheme>(getActualTheme(themeMode))

  // Handle theme mode changes
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode)
    localStorage.setItem('theme-mode', mode)
    
    const newActualTheme = getActualTheme(mode)
    setActualTheme(newActualTheme)
    document.documentElement.setAttribute('data-theme', newActualTheme)
  }

  // Listen for system theme changes when in system mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (themeMode === 'system') {
        const newActualTheme = getSystemTheme()
        setActualTheme(newActualTheme)
        document.documentElement.setAttribute('data-theme', newActualTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode])

  // Set theme on mount and when themeMode changes
  useEffect(() => {
    const initialActualTheme = getActualTheme(themeMode)
    setActualTheme(initialActualTheme)
    document.documentElement.setAttribute('data-theme', initialActualTheme)
  }, [themeMode])

  const value: ThemeContextType = {
    themeMode,
    actualTheme,
    setThemeMode: handleSetThemeMode
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}