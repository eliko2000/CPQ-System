import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useCPQ } from '../../contexts/CPQContext';
import { useQuotations } from '../../hooks/useQuotations';
import { useProjects } from '../../hooks/useProjects';
import { convertDbQuotationToQuotationProject } from '../../lib/utils';
import { loadDefaultQuotationParameters } from '../../utils/quotationCalculations';
import { toast } from 'sonner';
import { SectionErrorBoundary } from '../error/ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { MainLayout } from './MainLayout';
import { AuthGuard } from '../auth/AuthGuard';

import LoginPage from '../../pages/auth/LoginPage';
import SignupPage from '../../pages/auth/SignupPage';
import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage';
import AuthCallback from '../../pages/auth/AuthCallback';
import { UserProfilePage } from '../../pages/profile/UserProfilePage';
import { TeamOnboardingPage } from '../../pages/onboarding/TeamOnboardingPage';

// Lazy load heavy components for code splitting
const Dashboard = lazy(() =>
  import('../dashboard/Dashboard').then(m => ({ default: m.Dashboard }))
);
const SupplierQuotesPage = lazy(() =>
  import('../supplier-quotes/SupplierQuotesPage').then(m => ({
    default: m.SupplierQuotesPage,
  }))
);
const ComponentLibrary = lazy(() =>
  import('../library/ComponentLibrary').then(m => ({
    default: m.ComponentLibrary,
  }))
);
const ProjectList = lazy(() =>
  import('../projects/ProjectList').then(m => ({ default: m.ProjectList }))
);
const ProjectDetailPage = lazy(() =>
  import('../projects/ProjectDetailPage').then(m => ({
    default: m.ProjectDetailPage,
  }))
);
const BOMEditor = lazy(() =>
  import('../projects/BOMEditor').then(m => ({ default: m.BOMEditor }))
);
const Analytics = lazy(() =>
  import('../analytics/Analytics').then(m => ({ default: m.Analytics }))
);
const QuotationEditor = lazy(() =>
  import('../quotations/QuotationEditor').then(m => ({
    default: m.QuotationEditor,
  }))
);
const QuotationList = lazy(() =>
  import('../quotations/QuotationList').then(m => ({
    default: m.QuotationList,
  }))
);
const SettingsPage = lazy(() =>
  import('../settings/SettingsPage').then(m => ({ default: m.SettingsPage }))
);
const SystemAdminPage = lazy(() =>
  import('../../pages/admin/SystemAdminPage').then(m => ({
    default: m.SystemAdminPage,
  }))
);

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">טוען...</p>
    </div>
  </div>
);

function AuthenticatedApp() {
  const {
    uiState,
    currentProject,
    currentQuotation,
    setCurrentQuotation,
    viewingProjectId,
    setViewingProjectId,
  } = useCPQ();
  const { getQuotation, addQuotation } = useQuotations();
  const { getProject } = useProjects();
  const { handleError } = useErrorHandler();

  // Handle quotation viewing
  const handleViewQuotation = async (quotationId: string) => {
    const quotation = await getQuotation(quotationId);
    if (quotation) {
      const quotationProject = convertDbQuotationToQuotationProject(quotation);
      setCurrentQuotation(quotationProject);
    }
  };

  // Handle quotation creation
  const handleCreateQuotation = async (projectId: string) => {
    try {
      // Get project data to populate quotation
      const project = await getProject(projectId);

      if (!project) {
        toast.error('לא ניתן למצוא את הפרויקט');
        return;
      }

      // Load default parameters
      const defaultParams = await loadDefaultQuotationParameters();

      // Use the hook's addQuotation function (includes team_id automatically)
      const newQuotation = await addQuotation({
        quotation_number: `Q-${Date.now()}`,
        customer_name: project.company_name,
        project_name: project.project_name,
        project_id: projectId,
        currency: 'ILS',
        exchange_rate: defaultParams.usdToIlsRate,
        margin_percentage: defaultParams.markupPercent,
        status: 'draft',
        total_cost: 0,
        total_price: 0,
      });

      if (newQuotation) {
        const quotationProject =
          convertDbQuotationToQuotationProject(newQuotation);
        setCurrentQuotation(quotationProject);
        setViewingProjectId(null);
      }
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה ביצירת הצעת מחיר',
        context: { projectId },
      });
    }
  };

  const getContent = () => {
    // If we have a current quotation, show quotation editor
    if (currentQuotation) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <QuotationEditor />
        </Suspense>
      );
    }

    // If we have a current project, show BOM editor
    if (currentProject) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <BOMEditor />
        </Suspense>
      );
    }

    // If viewing a project detail page
    if (viewingProjectId && uiState.activeView === 'projects') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProjectDetailPage
            projectId={viewingProjectId}
            onBack={() => setViewingProjectId(null)}
            onViewQuotation={handleViewQuotation}
            onCreateQuotation={handleCreateQuotation}
          />
        </Suspense>
      );
    }

    // Otherwise, show view based on active state
    switch (uiState.activeView) {
      case 'dashboard':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </SectionErrorBoundary>
        );
      case 'quotes':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <SupplierQuotesPage />
            </Suspense>
          </SectionErrorBoundary>
        );
      case 'quotations':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <QuotationList />
            </Suspense>
          </SectionErrorBoundary>
        );
      case 'components':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <ComponentLibrary />
            </Suspense>
          </SectionErrorBoundary>
        );
      case 'projects':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <ProjectList
                onViewProject={projectId => setViewingProjectId(projectId)}
              />
            </Suspense>
          </SectionErrorBoundary>
        );
      case 'analytics':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Analytics />
            </Suspense>
          </SectionErrorBoundary>
        );
      case 'settings':
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <SettingsPage />
            </Suspense>
          </SectionErrorBoundary>
        );
      default:
        return (
          <SectionErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Dashboard />
            </Suspense>
          </SectionErrorBoundary>
        );
    }
  };

  return <MainLayout>{getContent()}</MainLayout>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/onboarding"
        element={
          <AuthGuard>
            <TeamOnboardingPage />
          </AuthGuard>
        }
      />

      <Route
        path="/profile"
        element={
          <AuthGuard>
            <MainLayout>
              <UserProfilePage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/settings"
        element={
          <AuthGuard>
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <SettingsPage />
              </Suspense>
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/admin"
        element={
          <AuthGuard>
            <MainLayout>
              <SystemAdminPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/*"
        element={
          <AuthGuard>
            <AuthenticatedApp />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
