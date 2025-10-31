import React from 'react'
import { useCPQ } from '@/contexts/CPQContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToastActions } from '@/contexts/ToastContext'
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Search,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Header() {
  const { currentProject, setModal } = useCPQ()
  const { theme, setTheme } = useTheme()
  const { info } = useToastActions()

  const handleThemeToggle = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const handleNewProject = () => {
    setModal({ type: 'create-project' })
  }

  const handleUploadQuote = () => {
    setModal({ type: 'upload-quote' })
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {currentProject ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-foreground">
                  {currentProject.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentProject.customerName} • {currentProject.status}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Input
                placeholder="Search components, assemblies, projects..."
                className="w-80"
                startIcon={<Search className="h-4 w-4" />}
              />
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {/* Action buttons */}
          {!currentProject && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadQuote}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Quote</span>
              </Button>
              <Button
                size="sm"
                onClick={handleNewProject}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            </>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThemeToggle}
            title={`Current theme: ${theme}`}
          >
            {getThemeIcon()}
          </Button>
        </div>
      </div>
    </header>
  )
}