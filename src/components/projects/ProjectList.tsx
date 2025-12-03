import { useRef, useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ColumnState } from 'ag-grid-community';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FolderOpen, Plus, Edit, Trash2, Eye, Search } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { useTableConfig } from '../../hooks/useTableConfig';
import { CustomHeader } from '../grid/CustomHeader';
import {
  StatusCellEditor,
  PROJECT_STATUS_OPTIONS,
} from '../grid/StatusCellEditor';
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectSummary, ProjectFormData, ProjectStatus } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Status badge renderer with edit capability
const StatusBadgeRenderer = (props: any) => {
  const status: ProjectStatus = props.value;
  const statusLabels: Record<ProjectStatus, string> = {
    active: 'פעיל',
    'on-hold': 'בהמתנה',
    completed: 'הושלם',
    cancelled: 'בוטל',
  };
  const statusColors: Record<ProjectStatus, string> = {
    active: 'bg-green-100 text-green-800 hover:bg-green-200',
    'on-hold': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    completed: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    cancelled: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  };
  return (
    <Badge
      className={`${statusColors[status] || 'bg-gray-100 text-gray-800'} cursor-pointer transition-colors`}
      title="לחץ לשינוי סטטוס"
    >
      {statusLabels[status] || status}
    </Badge>
  );
};

// Actions renderer
const ActionsRenderer = (props: any) => {
  const { onView, onEdit, onDelete } = props.context;
  const project: ProjectSummary = props.data;

  return (
    <div className="flex gap-1 items-center justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onView(project.id)}
        title="צפה בפרויקט"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(project)}
        title="ערוך פרויקט"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(project.id, project.projectName)}
        title="מחק פרויקט"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};

interface ProjectListProps {
  onViewProject?: (projectId: string) => void;
}

export function ProjectList({ onViewProject }: ProjectListProps = {}) {
  const gridRef = useRef<AgGridReact>(null);
  const { projects, loading, addProject, updateProject, deleteProject } =
    useProjects();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    projectId: string | null;
    projectName: string;
    quotationCount: number;
  }>({
    isOpen: false,
    projectId: null,
    projectName: '',
    quotationCount: 0,
  });

  // Use table configuration hook for persistence
  const {
    config,
    saveConfig,
    loading: configLoading,
  } = useTableConfig('projects_list', {
    columnOrder: [
      'projectNumber',
      'projectName',
      'companyName',
      'status',
      'quotationCount',
      'createdAt',
      'actions',
    ],
    columnWidths: {},
    visibleColumns: [
      'projectNumber',
      'projectName',
      'companyName',
      'status',
      'quotationCount',
      'createdAt',
      'actions',
    ],
    filterState: {},
  });

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;

    const lowerSearch = searchTerm.toLowerCase();
    return projects.filter(
      project =>
        project.companyName.toLowerCase().includes(lowerSearch) ||
        project.projectName.toLowerCase().includes(lowerSearch) ||
        project.description?.toLowerCase().includes(lowerSearch)
    );
  }, [projects, searchTerm]);

  // Get unique values for filtering
  const getUniqueValues = useCallback(
    (field: keyof ProjectSummary): string[] => {
      const values = projects
        .map(proj => String(proj[field] || ''))
        .filter(Boolean);
      return Array.from(new Set(values)).sort();
    },
    [projects]
  );

  // Handle column menu and filter clicks
  const handleColumnMenuClick = useCallback((columnId: string) => {
    logger.debug('Column menu clicked:', columnId);
  }, []);

  const handleFilterClick = useCallback((columnId: string) => {
    logger.debug('Filter clicked:', columnId);
  }, []);

  // Column definitions with CustomHeader for enhanced filtering
  const columnDefs = useMemo<ColDef<ProjectSummary>[]>(
    () => [
      {
        field: 'projectNumber',
        headerName: 'מספר פרויקט',
        sortable: true,
        filter: 'agTextColumnFilter',
        flex: 1,
        minWidth: 120,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מספר פרויקט',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('projectNumber'),
        }),
        filterParams: {
          values: () => getUniqueValues('projectNumber'),
        },
        cellRenderer: (params: any) => {
          return (
            params.value || (
              <span className="text-gray-400 text-xs">לא הוקצה</span>
            )
          );
        },
      },
      {
        field: 'projectName',
        headerName: 'שם פרויקט',
        sortable: true,
        filter: 'agTextColumnFilter',
        flex: 2,
        minWidth: 200,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'שם פרויקט',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('projectName'),
        }),
        filterParams: {
          values: () => getUniqueValues('projectName'),
        },
      },
      {
        field: 'companyName',
        headerName: 'שם חברה',
        sortable: true,
        filter: 'agTextColumnFilter',
        flex: 2,
        minWidth: 200,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'שם חברה',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('companyName'),
        }),
        filterParams: {
          values: () => getUniqueValues('companyName'),
        },
      },
      {
        field: 'status',
        headerName: 'סטטוס',
        sortable: true,
        filter: 'agTextColumnFilter',
        cellRenderer: StatusBadgeRenderer,
        editable: true,
        cellEditor: StatusCellEditor,
        cellEditorParams: {
          options: PROJECT_STATUS_OPTIONS,
          onStatusChange: async (id: string, newStatus: string) => {
            logger.debug('ProjectList - onStatusChange called:', {
              id,
              newStatus,
            });
            await updateProject(id, { status: newStatus as any });
          },
        },
        flex: 1,
        minWidth: 120,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'סטטוס',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: ['active', 'on-hold', 'completed', 'cancelled'],
        }),
        filterParams: {
          values: ['active', 'on-hold', 'completed', 'cancelled'],
          valueFormatter: (params: any) => {
            const statusLabels: Record<ProjectStatus, string> = {
              active: 'פעיל',
              'on-hold': 'בהמתנה',
              completed: 'הושלם',
              cancelled: 'בוטל',
            };
            return statusLabels[params.value as ProjectStatus] || params.value;
          },
        },
      },
      {
        field: 'quotationCount',
        headerName: 'מספר הצעות מחיר',
        sortable: true,
        filter: 'agNumberColumnFilter',
        flex: 1,
        minWidth: 150,
        cellStyle: { textAlign: 'center' },
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מספר הצעות מחיר',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          filterType: 'number',
        }),
      },
      {
        field: 'createdAt',
        headerName: 'תאריך יצירה',
        sortable: true,
        filter: 'agDateColumnFilter',
        flex: 1,
        minWidth: 150,
        valueFormatter: params => {
          if (!params.value) return '';
          return new Date(params.value).toLocaleDateString('he-IL');
        },
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'תאריך יצירה',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          filterType: 'date',
        }),
      },
      {
        headerName: 'פעולות',
        cellRenderer: ActionsRenderer,
        flex: 1,
        minWidth: 150,
        sortable: false,
        filter: false,
        cellStyle: { textAlign: 'left' },
      },
    ],
    [getUniqueValues, handleColumnMenuClick, handleFilterClick, updateProject]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  // Handle form submission
  const handleFormSubmit = async (data: ProjectFormData) => {
    try {
      if (editingProject) {
        await updateProject(editingProject.id, data);
        toast.success('הפרויקט עודכן בהצלחה');
      } else {
        await addProject(data);
        toast.success('פרויקט חדש נוצר בהצלחה');
      }
      setIsFormOpen(false);
      setEditingProject(null);
    } catch (error) {
      logger.error('Failed to save project:', error);
      throw error;
    }
  };

  // Handle view project
  const handleViewProject = useCallback(
    (projectId: string) => {
      if (onViewProject) {
        onViewProject(projectId);
      }
    },
    [onViewProject]
  );

  // Handle edit project
  const handleEditProject = useCallback((project: ProjectSummary) => {
    setEditingProject(project);
    setIsFormOpen(true);
  }, []);

  // Handle delete project
  const handleDeleteProject = useCallback(
    (projectId: string, projectName: string) => {
      // Find the project to get quotation count
      const project = projects.find(p => p.id === projectId);
      const quotationCount = project?.quotationCount || 0;

      setDeleteConfirm({
        isOpen: true,
        projectId,
        projectName,
        quotationCount,
      });
    },
    [projects]
  );

  // Confirm delete
  const confirmDelete = async () => {
    if (deleteConfirm.projectId) {
      try {
        const result = await deleteProject(deleteConfirm.projectId);
        const deletedQuotations = result?.quotationCount || 0;

        if (deletedQuotations > 0) {
          toast.success(
            `הפרויקט ו-${deletedQuotations} הצעות מחיר נמחקו בהצלחה`
          );
        } else {
          toast.success('הפרויקט נמחק בהצלחה');
        }
      } catch (error) {
        logger.error('Failed to delete project:', error);
        toast.error('שגיאה במחיקת הפרויקט');
      }
      setDeleteConfirm({
        isOpen: false,
        projectId: null,
        projectName: '',
        quotationCount: 0,
      });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({
      isOpen: false,
      projectId: null,
      projectName: '',
      quotationCount: 0,
    });
  };

  // Handle row double-click to view project
  const onRowDoubleClicked = useCallback(
    (event: any) => {
      if (event.data) {
        handleViewProject(event.data.id);
      }
    },
    [handleViewProject]
  );

  // Handle cell value changed
  const handleCellValueChanged = useCallback((event: any) => {
    logger.debug('🟢 onCellValueChanged fired:', {
      field: event.colDef.field,
      oldValue: event.oldValue,
      newValue: event.newValue,
      data: event.data,
    });
  }, []);

  // Context for cell renderers
  const context = useMemo(
    () => ({
      onView: handleViewProject,
      onEdit: handleEditProject,
      onDelete: handleDeleteProject,
    }),
    [handleViewProject, handleEditProject, handleDeleteProject]
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">פרויקטים</h1>
          <p className="text-muted-foreground">
            נהל את פרויקטי הצעות המחיר שלך ({projects.length} פרויקטים)
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProject(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 ml-2" />
          פרויקט חדש
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="חיפוש לפי שם חברה, שם פרויקט או תיאור..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">טוען פרויקטים...</p>
            </div>
          ) : configLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">טוען הגדרות...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'לא נמצאו פרויקטים תואמים' : 'אין פרויקטים עדיין'}
              </p>
              {!searchTerm && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  צור פרויקט ראשון
                </Button>
              )}
            </div>
          ) : (
            <div
              className="ag-theme-alpine"
              style={{ height: '600px', width: '100%' }}
              dir="rtl"
            >
              <AgGridReact<ProjectSummary>
                ref={gridRef}
                rowData={filteredProjects}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                domLayout="normal"
                enableRtl={true}
                singleClickEdit={true}
                onRowDoubleClicked={onRowDoubleClicked}
                onCellValueChanged={handleCellValueChanged}
                context={context}
                animateRows={true}
                onGridReady={() => {
                  // Apply saved column state if available
                  if (config.columnOrder?.length && gridRef.current) {
                    const columnState: ColumnState[] = config.columnOrder.map(
                      colId => ({
                        colId,
                        hide: Array.isArray(config.visibleColumns)
                          ? !config.visibleColumns.includes(colId)
                          : (config.visibleColumns as any)?.[colId] === false,
                        width: (config.columnWidths as any)?.[colId],
                      })
                    );
                    gridRef.current.api.applyColumnState({
                      state: columnState,
                    });
                  }
                }}
                onColumnResized={event => {
                  if (event.finished && event.column && gridRef.current) {
                    const columnState = gridRef.current.api.getColumnState();
                    const columnWidths: Record<string, number> = {};
                    columnState.forEach(col => {
                      if (col.width) columnWidths[col.colId] = col.width;
                    });
                    saveConfig({ ...config, columnWidths });
                  }
                }}
                onColumnMoved={event => {
                  if (event.finished && gridRef.current) {
                    const columnState = gridRef.current.api.getColumnState();
                    const columnOrder = columnState.map(col => col.colId);
                    saveConfig({ ...config, columnOrder });
                  }
                }}
                onColumnVisible={event => {
                  if (event.column && gridRef.current) {
                    const columnState = gridRef.current.api.getColumnState();
                    const visibleColumns: string[] = columnState
                      .filter(col => !col.hide)
                      .map(col => col.colId);
                    saveConfig({ ...config, visibleColumns });
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Form Modal */}
      <ProjectFormModal
        project={editingProject}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="מחיקת פרויקט"
        message={
          deleteConfirm.quotationCount > 0
            ? `האם אתה בטוח שברצונך למחוק את הפרויקט "${deleteConfirm.projectName}"?\n\n⚠️ הפרויקט מכיל ${deleteConfirm.quotationCount} הצעות מחיר שיימחקו גם כן.\n\nפעולה זו אינה הפיכה ותמחק את כל הנתונים הקשורים.`
            : `האם אתה בטוח שברצונך למחוק את הפרויקט "${deleteConfirm.projectName}"?\n\nפעולה זו אינה הפיכה.`
        }
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
        requireConfirmation={deleteConfirm.quotationCount > 0}
        confirmationText={deleteConfirm.projectName}
        confirmationPlaceholder="הקלד את שם הפרויקט"
      />
    </div>
  );
}
