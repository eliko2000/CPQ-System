import React, { createContext, useContext, useEffect, useState } from 'react'
import { logger } from '../lib/logger'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  systemTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('light')

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }

    // Store preference
    try {
      localStorage.setItem('cpq-theme', theme)
    } catch (e) {
      logger.warn('Failed to save theme preference:', e)
    }
  }, [theme, systemTheme])

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cpq-theme') as Theme | null
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setTheme(saved)
      }
    } catch (e) {
      logger.warn('Failed to load theme preference:', e)
    }
  }, [])

  const value: ThemeContextType = {
    theme,
    setTheme,
    systemTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}