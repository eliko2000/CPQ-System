import React from 'react'
import { CPQProvider } from './contexts/CPQContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { MainLayout } from './components/shared/MainLayout'
import { AppRoutes } from './components/shared/AppRoutes'

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CPQProvider>
          <MainLayout>
            <AppRoutes />
          </MainLayout>
        </CPQProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App