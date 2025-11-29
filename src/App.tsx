import { CPQProvider } from './contexts/CPQContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { MainLayout } from './components/shared/MainLayout';
import { AppRoutes } from './components/shared/AppRoutes';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { Toaster } from 'sonner';

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
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  );
}

export default App;
