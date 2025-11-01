import React from 'react'
import { useCPQ } from '../../contexts/CPQContext'
import {
  LayoutDashboard,
  FileText,
  Package,
  FolderOpen,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { cn } from '../../lib/utils'

export function Sidebar() {
  const { uiState, setActiveView, toggleSidebar } = useCPQ()

  const navigation = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      view: 'dashboard' as const,
    },
    {
      name: 'Quotes',
      icon: FileText,
      view: 'quotes' as const,
    },
    {
      name: 'Library',
      icon: Package,
      view: 'components' as const,
    },
    {
      name: 'Projects',
      icon: FolderOpen,
      view: 'projects' as const,
    },
    {
      name: 'Analytics',
      icon: BarChart3,
      view: 'analytics' as const,
    },
  ]

  return (
    <div className={cn(
      "flex flex-col bg-card border-r border-border transition-all duration-300",
      uiState.sidebarCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!uiState.sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CPQ</span>
            </div>
            <span className="font-semibold text-foreground">CPQ System</span>
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
              onClick={() => setActiveView(item.view)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
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
          className={cn(
            "w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {!uiState.sidebarCollapsed && (
            <span className="truncate">Settings</span>
          )}
        </button>
      </div>
    </div>
  )
}
