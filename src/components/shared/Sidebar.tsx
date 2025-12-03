import { useState, useEffect } from 'react';
import { useCPQ } from '../../contexts/CPQContext';
import { loadSetting } from '../../services/settingsService';
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Package,
  FolderOpen,
  BarChart3,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { logger } from '@/lib/logger';

export function Sidebar() {
  const {
    uiState,
    setActiveView,
    toggleSidebar,
    currentQuotation,
    setCurrentQuotation,
  } = useCPQ();
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
  const [pendingView, setPendingView] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const navigation = [
    {
      name: 'בית',
      icon: LayoutDashboard,
      view: 'dashboard' as const,
    },
    {
      name: 'פרויקטים',
      icon: FolderOpen,
      view: 'projects' as const,
    },
    {
      name: 'הצעות מחיר',
      icon: Calculator,
      view: 'quotations' as const,
    },
    {
      name: 'הצעות ספקים',
      icon: FileText,
      view: 'quotes' as const,
    },
    {
      name: 'ספרייה',
      icon: Package,
      view: 'components' as const,
    },
    {
      name: 'ניתוחים',
      icon: BarChart3,
      view: 'analytics' as const,
    },
  ];

  // Handle navigation with quotation check
  const handleNavigation = (view: string) => {
    if (currentQuotation) {
      // Show confirmation dialog
      setPendingView(view);
      setShowNavigationConfirm(true);
    } else {
      setActiveView(view as any);
    }
  };

  // Confirm navigation and close quotation
  const confirmNavigation = () => {
    setCurrentQuotation(null);
    if (pendingView) {
      setActiveView(pendingView as any);
    }
    setShowNavigationConfirm(false);
    setPendingView(null);
  };

  // Cancel navigation
  const cancelNavigation = () => {
    setShowNavigationConfirm(false);
    setPendingView(null);
  };

  // Load company logo on mount
  useEffect(() => {
    async function loadLogo() {
      try {
        const result = await loadSetting<{ logoUrl: string }>('companyLogo');
        if (result.success && result.data?.logoUrl) {
          setLogoUrl(result.data.logoUrl);
        }
      } catch (error) {
        logger.error('Error loading logo:', error);
      }
    }
    loadLogo();

    // Listen for logo updates
    const handleLogoUpdate = (event: any) => {
      setLogoUrl(event.detail?.logoUrl || null);
    };
    window.addEventListener('cpq-logo-updated', handleLogoUpdate);

    return () => {
      window.removeEventListener('cpq-logo-updated', handleLogoUpdate);
    };
  }, []);

  return (
    <>
      <div
        className={cn(
          'flex flex-col bg-card transition-all duration-300',
          uiState.sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header - Blue Background with White Text - matches top bar height */}
        <div className="bg-primary h-16 flex items-center px-4 border-l border-primary">
          <div className="flex items-center justify-between w-full">
            {!uiState.sidebarCollapsed && (
              <h1 className="text-lg font-bold text-primary-foreground flex-1 text-center">
                RadiaQ AI
              </h1>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors flex-shrink-0"
            >
              {uiState.sidebarCollapsed ? (
                <Menu className="h-4 w-4 text-primary-foreground" />
              ) : (
                <X className="h-4 w-4 text-primary-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 border-l border-border">
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = uiState.activeView === item.view;

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.view)}
                className={cn(
                  'w-full flex items-center space-x-reverse space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title={uiState.sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!uiState.sidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer - Company Logo */}
        <div className="border-t border-l border-border">
          {!uiState.sidebarCollapsed && logoUrl && (
            <div className="px-6 py-6">
              <div className="w-full flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="max-h-24 w-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Confirmation Dialog */}
      {showNavigationConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              סגירת הצעת מחיר
            </h3>
            <p className="text-gray-600 mb-6">
              האם אתה בטוח שברצונך לסגור את הצעת המחיר ולנווט לדף אחר? השינויים
              נשמרים באופן אוטומטי.
            </p>
            <div className="flex justify-end gap-3">
              <Button onClick={cancelNavigation} variant="outline">
                ביטול
              </Button>
              <Button
                onClick={confirmNavigation}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                סגור ונווט
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
