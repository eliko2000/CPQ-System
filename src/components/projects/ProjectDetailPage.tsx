import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef } from 'ag-grid-community'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  ArrowLeft,
  Edit,
  Plus,
  FileText,
  Eye,
  Calendar,
  Building,
  FolderOpen
} from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import { ProjectFormModal } from './ProjectFormModal'
import { StatusCellEditor, QUOTATION_STATUS_OPTIONS } from '../grid/StatusCellEditor'
import { DbProject, DbQuotation, ProjectFormData, ProjectStatus } from '../../types'
import { toast } from 'sonner'
import { supabase } from '../../supabaseClient'
import { logger } from '@/lib/logger'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface ProjectDetailPageProps {
  projectId: string
  onBack?: () => void
  onViewQuotation?: (quotationId: string) => void
  onCreateQuotation?: (projectId: string) => void
}

// Status renderer for quotations
const QuotationStatusRenderer = (props: any) => {
  const status = props.value
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-yellow-100 text-yellow-800'
  }
  const statusLabels: Record<string, string> = {
    draft: 'טיוטה',
    sent: 'נשלח',
    accepted: 'התקבל',
    rejected: 'נדחה',
    expired: 'פג תוקף'
  }
  return (
    <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
      {statusLabels[status] || status}
    </Badge>
  )
}

// Actions renderer for quotations
const QuotationActionsRenderer = (props: any) => {
  const { onView } = props.context
  const quotation: DbQuotation = props.data

  return (
    <div className="flex gap-1 items-center justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onView(quotation.id)}
        title="צפה בהצעת מחיר"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function ProjectDetailPage({ projectId, onBack, onViewQuotation, onCreateQuotation }: ProjectDetailPageProps) {
  const { getProject, getProjectQuotations, updateProject } = useProjects()

  const [project, setProject] = useState<DbProject | null>(null)
  const [quotations, setQuotations] = useState<DbQuotation[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)

  // Load project and quotations
  const loadData = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const [projectData, quotationsData] = await Promise.all([
        getProject(projectId),
        getProjectQuotations(projectId)
      ])

      setProject(projectData)
      setQuotations(quotationsData)
    } catch (error) {
      logger.error('Failed to load project:', error)
      toast.error('שגיאה בטעינת הפרויקט')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]) // Only re-run when projectId changes

  // Refresh data when window/tab becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }

    const handleFocus = () => {
      loadData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Column definitions for quotations grid
  const columnDefs = useMemo<ColDef<DbQuotation>[]>(() => [
    {
      field: 'quotation_number',
      headerName: 'מספר הצעה',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 150
    },
    {
      field: 'version',
      headerName: 'גרסה',
      sortable: true,
      filter: 'agNumberColumnFilter',
      width: 100
    },
    {
      field: 'status',
      headerName: 'סטטוס',
      sortable: true,
      filter: true,
      editable: true,
      cellEditor: StatusCellEditor,
      cellEditorParams: {
        options: QUOTATION_STATUS_OPTIONS,
        onStatusChange: async (id: string, newStatus: string) => {
          logger.debug('ProjectDetailPage - onStatusChange called:', { id, newStatus })
          const { error } = await supabase
            .from('quotations')
            .update({ status: newStatus })
            .eq('id', id)
          if (error) throw error
        }
      },
      cellRenderer: QuotationStatusRenderer,
      flex: 1,
      minWidth: 120
    },
    {
      field: 'total_price',
      headerName: 'סה"כ מחיר',
      sortable: true,
      filter: 'agNumberColumnFilter',
      flex: 1,
      minWidth: 150,
      valueFormatter: (params) => {
        if (!params.value) return '-'
        return new Intl.NumberFormat('he-IL', {
          style: 'currency',
          currency: params.data?.currency || 'ILS'
        }).format(params.value)
      }
    },
    {
      field: 'created_at',
      headerName: 'תאריך יצירה',
      sortable: true,
      filter: 'agDateColumnFilter',
      flex: 1,
      minWidth: 150,
      valueFormatter: (params) => {
        if (!params.value) return ''
        return new Date(params.value).toLocaleDateString('he-IL')
      }
    },
    {
      headerName: 'פעולות',
      cellRenderer: QuotationActionsRenderer,
      width: 100,
      sortable: false,
      filter: false
    }
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true
  }), [])

  // Handle view quotation
  const handleViewQuotation = useCallback((quotationId: string) => {
    if (onViewQuotation) {
      onViewQuotation(quotationId)
    }
  }, [onViewQuotation])

  // Handle edit project
  const handleEditProject = async (data: ProjectFormData) => {
    if (!project) return

    try {
      await updateProject(project.id, data)
      // Reload project data
      const updatedProject = await getProject(project.id)
      setProject(updatedProject)
      toast.success('הפרויקט עודכן בהצלחה')
      setIsEditFormOpen(false)
    } catch (error) {
      logger.error('Failed to update project:', error)
      throw error
    }
  }

  // Handle create quotation
  const handleCreateQuotation = () => {
    if (onCreateQuotation && project) {
      onCreateQuotation(project.id)
    }
  }

  // Handle row double-click
  const onRowDoubleClicked = useCallback((event: any) => {
    if (event.data) {
      handleViewQuotation(event.data.id)
    }
  }, [handleViewQuotation])

  // Context for cell renderers
  const context = useMemo(() => ({
    onView: handleViewQuotation
  }), [handleViewQuotation])

  // Status labels and colors
  const statusLabels: Record<ProjectStatus, string> = {
    active: 'פעיל',
    'on-hold': 'בהמתנה',
    completed: 'הושלם',
    cancelled: 'בוטל'
  }
  const statusColors: Record<ProjectStatus, string> = {
    active: 'bg-green-100 text-green-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <p className="text-muted-foreground">טוען פרטי פרויקט...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-96" dir="rtl">
        <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">פרויקט לא נמצא</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => onBack && onBack()}
        >
          <ArrowLeft className="h-4 w-4 ml-2" />
          חזרה לרשימת פרויקטים
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => onBack && onBack()}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        חזרה לפרויקטים
      </Button>

      {/* Project Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-2xl font-bold">{project.project_name}</h1>
                <Badge className={statusColors[project.status]}>
                  {statusLabels[project.status]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building className="h-4 w-4" />
                <h2 className="text-lg">{project.company_name}</h2>
              </div>
              {project.description && (
                <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>נוצר בתאריך: {new Date(project.created_at).toLocaleDateString('he-IL')}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditFormOpen(true)}
            >
              <Edit className="h-4 w-4 ml-2" />
              ערוך פרויקט
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Quotations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              הצעות מחיר ({quotations.length})
            </CardTitle>
            <Button onClick={handleCreateQuotation}>
              <Plus className="h-4 w-4 ml-2" />
              הצעת מחיר חדשה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">אין הצעות מחיר לפרויקט זה</p>
              <Button
                variant="outline"
                onClick={handleCreateQuotation}
              >
                <Plus className="h-4 w-4 ml-2" />
                צור הצעת מחיר ראשונה
              </Button>
            </div>
          ) : (
            <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }} dir="rtl">
              <AgGridReact<DbQuotation>
                rowData={quotations}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                domLayout="normal"
                enableRtl={true}
                singleClickEdit={true}
                onRowDoubleClicked={onRowDoubleClicked}
                context={context}
                animateRows={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Project Modal */}
      <ProjectFormModal
        project={project ? {
          id: project.id,
          companyName: project.company_name,
          projectName: project.project_name,
          description: project.description,
          status: project.status,
          createdAt: project.created_at,
          updatedAt: project.updated_at
        } : null}
        isOpen={isEditFormOpen}
        onClose={() => setIsEditFormOpen(false)}
        onSubmit={handleEditProject}
      />
    </div>
  )
}
