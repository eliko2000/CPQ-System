import { CPQProvider } from './contexts/CPQContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { MainLayout } from './components/shared/MainLayout'
import { AppRoutes } from './components/shared/AppRoutes'
import { ErrorBoundary } from './components/error/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <CPQProvider>
            <MainLayout>
              <AppRoutes />
            </MainLayout>
          </CPQProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App