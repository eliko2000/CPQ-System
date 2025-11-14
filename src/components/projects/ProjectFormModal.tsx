import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ProjectFormData, ProjectMetadata, ProjectStatus } from '../../types'
import { useClickOutside } from '../../hooks/useClickOutside'

interface ProjectFormModalProps {
  project?: ProjectMetadata | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'on-hold', label: 'בהמתנה' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' }
]

export function ProjectFormModal({ project, isOpen, onClose, onSubmit }: ProjectFormModalProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    companyName: '',
    projectName: '',
    description: '',
    status: 'active'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useClickOutside<HTMLDivElement>(() => handleClose())

  // Initialize form data when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        companyName: project.companyName,
        projectName: project.projectName,
        description: project.description || '',
        status: project.status
      })
    } else {
      setFormData({
        companyName: '',
        projectName: '',
        description: '',
        status: 'active'
      })
    }
    setError(null)
  }, [project, isOpen])

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.companyName.trim()) {
      setError('שם חברה הוא שדה חובה')
      return
    }
    if (!formData.projectName.trim()) {
      setError('שם פרויקט הוא שדה חובה')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(formData)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת הפרויקט')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
      <Card ref={modalRef} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <CardHeader>
          <CardTitle>
            {project ? 'עריכת פרויקט' : 'פרויקט חדש'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                שם חברה <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="לדוגמה: Acme Robotics Ltd"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium mb-1">
                שם פרויקט <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                placeholder="לדוגמה: אוטומציה לקו ייצור 3"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                תיאור
              </label>
              <textarea
                className="w-full min-h-[100px] p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="תיאור כללי של הפרויקט..."
                disabled={isSubmitting}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                סטטוס
              </label>
              <select
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as ProjectStatus)}
                disabled={isSubmitting}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'שומר...' : project ? 'עדכון' : 'צור פרויקט'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
