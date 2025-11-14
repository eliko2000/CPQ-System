import React, { useState, useMemo, useEffect } from 'react'
import { Search, FolderOpen, X } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { ProjectSummary } from '../../types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

interface ProjectPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (project: ProjectSummary) => void
  currentProjectId?: string | null
}

export function ProjectPicker({ isOpen, onClose, onSelect, currentProjectId }: ProjectPickerProps) {
  const { projects, loading } = useProjects()
  const [searchTerm, setSearchTerm] = useState('')

  // Reset search when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
    }
  }, [isOpen])

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects

    const lowerSearch = searchTerm.toLowerCase()
    return projects.filter(project =>
      project.projectName.toLowerCase().includes(lowerSearch) ||
      project.companyName.toLowerCase().includes(lowerSearch) ||
      project.description?.toLowerCase().includes(lowerSearch)
    )
  }, [projects, searchTerm])

  // Status labels
  const statusLabels = {
    active: 'פעיל',
    'on-hold': 'בהמתנה',
    completed: 'הושלם',
    cancelled: 'בוטל'
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">בחר פרויקט</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="חפש לפי שם פרויקט, חברה או תיאור..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              autoFocus
            />
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              טוען פרויקטים...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'לא נמצאו פרויקטים תואמים' : 'אין פרויקטים זמינים'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelect(project)
                    onClose()
                  }}
                  className={`w-full text-right p-4 rounded-lg border-2 transition-all hover:border-blue-500 hover:bg-blue-50 ${
                    currentProjectId === project.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{project.projectName}</h3>
                        <Badge className={statusColors[project.status]}>
                          {statusLabels[project.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{project.companyName}</p>
                      {project.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>הצעות מחיר: {project.quotationCount}</span>
                        <span>נוצר: {new Date(project.createdAt).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                    {currentProjectId === project.id && (
                      <div className="flex-shrink-0">
                        <Badge className="bg-blue-600 text-white">נבחר</Badge>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {filteredProjects.length} פרויקטים
            </p>
            <Button variant="outline" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
