import { useState } from 'react'
import { useCPQ } from '../../contexts/CPQContext'
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Package,
  FolderOpen,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

export function Sidebar() {
  const { uiState, setActiveView, toggleSidebar, currentQuotation, setCurrentQuotation } = useCPQ()
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false)
  const [pendingView, setPendingView] = useState<string | null>(null)

  const navigation = [
    {
      name: 'לוח בקרה',
      icon: LayoutDashboard,
      view: 'dashboard' as const,
    },
    {
      name: 'הצעות ספקים',
      icon: FileText,
      view: 'quotes' as const,
    },
    {
      name: 'הצעות מחיר',
      icon: Calculator,
      view: 'quotations' as const,
    },
    {
      name: 'ספרייה',
      icon: Package,
      view: 'components' as const,
    },
    {
      name: 'פרויקטים',
      icon: FolderOpen,
      view: 'projects' as const,
    },
    {
      name: 'ניתוחים',
      icon: BarChart3,
      view: 'analytics' as const,
    },
  ]

  // Handle navigation with quotation check
  const handleNavigation = (view: string) => {
    if (currentQuotation) {
      // Show confirmation dialog
      setPendingView(view)
      setShowNavigationConfirm(true)
    } else {
      setActiveView(view as any)
    }
  }

  // Confirm navigation and close quotation
  const confirmNavigation = () => {
    setCurrentQuotation(null)
    if (pendingView) {
      setActiveView(pendingView as any)
    }
    setShowNavigationConfirm(false)
    setPendingView(null)
  }

  // Cancel navigation
  const cancelNavigation = () => {
    setShowNavigationConfirm(false)
    setPendingView(null)
  }

  return (
    <>
      <div className={cn(
        "flex flex-col bg-card border-l border-border transition-all duration-300",
        uiState.sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!uiState.sidebarCollapsed && (
            <div className="flex items-center space-x-reverse space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CPQ</span>
              </div>
              <span className="font-semibold text-foreground">מערכת CPQ</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            {uiState.sidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = uiState.activeView === item.view

            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.view)}
                className={cn(
                  "w-full flex items-center space-x-reverse space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={uiState.sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!uiState.sidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => setActiveView('settings')}
            className={cn(
              "w-full flex items-center space-x-reverse space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              uiState.activeView === 'settings'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!uiState.sidebarCollapsed && (
              <span className="truncate">הגדרות</span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Confirmation Dialog */}
      {showNavigationConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">סגירת הצעת מחיר</h3>
            <p className="text-gray-600 mb-6">
              האם אתה בטוח שברצונך לסגור את הצעת המחיר ולנווט לדף אחר? השינויים נשמרים באופן אוטומטי.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={cancelNavigation}
                variant="outline"
              >
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
  )
}
