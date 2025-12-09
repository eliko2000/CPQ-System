import { CPQProvider } from './contexts/CPQContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import { AppRoutes } from './components/shared/AppRoutes';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TeamProvider>
              <FeatureFlagProvider>
                <CPQProvider>
                  <AppRoutes />
                </CPQProvider>
              </FeatureFlagProvider>
            </TeamProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  );
}

export default App;
