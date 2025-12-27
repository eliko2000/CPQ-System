import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ColumnState } from 'ag-grid-community';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FolderOpen, Plus, Edit, Trash2, Search } from 'lucide-react';
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
import { useGridSelection } from '../../hooks/useGridSelection';
import { SelectionCheckboxRenderer } from '../grid/SelectionCheckboxRenderer';
import { FloatingActionToolbar } from '../grid/FloatingActionToolbar';
import { GridAction } from '../../types/grid.types';

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

// (ActionsRenderer removed - replaced with SelectionCheckboxRenderer)

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
    open: boolean;
    count: number;
    items: ProjectSummary[];
  }>({ open: false, count: 0, items: [] });

  // Initialize grid selection hook
  const selection = useGridSelection<ProjectSummary>({
    gridApi: gridRef.current?.api,
    getRowId: project => project.id,
  });

  // Force refresh row styles when selection changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.redrawRows();
    }
  }, [selection.selectedIds]);

  // Use table configuration hook for persistence
  const {
    config,
    saveConfig,
    loading: configLoading,
  } = useTableConfig('projects_list', {
    columnOrder: [
      'selection',
      'projectNumber',
      'projectName',
      'companyName',
      'status',
      'quotationCount',
      'createdAt',
    ],
    columnWidths: {},
    visibleColumns: [
      'selection',
      'projectNumber',
      'projectName',
      'companyName',
      'status',
      'quotationCount',
      'createdAt',
    ],
    filterState: {},
  });

  // Ensure selection column is in saved config (migration from old config)
  useEffect(() => {
    if (config.visibleColumns && !config.visibleColumns.includes('selection')) {
      saveConfig({
        ...config,
        visibleColumns: ['selection', ...config.visibleColumns],
        columnOrder: config.columnOrder?.includes('selection')
          ? config.columnOrder
          : ['selection', ...(config.columnOrder || [])],
      });
    }
  }, [config.visibleColumns, config.columnOrder, saveConfig]);

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
        headerName: '',
        field: 'selection' as any, // Custom field for selection column
        sortable: false,
        filter: false,
        resizable: false,
        width: 48,
        maxWidth: 48,
        minWidth: 48,
        pinned: 'right' as const, // Pinned to right in RTL = visually left
        lockPosition: true,
        lockVisible: true,
        suppressMenu: true,
        suppressMovable: true,
        suppressNavigable: true,
        cellRenderer: SelectionCheckboxRenderer,
        cellRendererParams: {
          onSelectionToggle: selection.toggleSelection,
          isSelected: selection.isSelected,
        },
      },
    ],
    [
      getUniqueValues,
      handleColumnMenuClick,
      handleFilterClick,
      updateProject,
      selection.toggleSelection,
      selection.isSelected,
    ]
  );

  // Filter and reorder columns based on config (ensure selection column is always visible)
  const visibleColumnDefs = useMemo(() => {
    // Ensure 'selection' is always in visible columns
    const visibleColumnsWithSelection =
      config.visibleColumns && config.visibleColumns.includes('selection')
        ? config.visibleColumns
        : ['selection', ...(config.visibleColumns || [])];

    // If no visible columns configured, show all columns
    if (!config.visibleColumns || config.visibleColumns.length === 0) {
      return columnDefs;
    }

    const visible = columnDefs.filter(col =>
      visibleColumnsWithSelection.includes(col.field as string)
    );

    // If filtering results in no columns, fall back to all columns
    if (visible.length === 0) {
      return columnDefs;
    }

    // Reorder according to config.columnOrder
    const effectiveOrder =
      config.columnOrder && config.columnOrder.length > 0
        ? config.columnOrder
        : config.visibleColumns;

    const ordered = effectiveOrder
      .filter(fieldId => visible.some(col => col.field === fieldId))
      .map(fieldId => visible.find(col => col.field === fieldId)!);

    // Apply saved column widths to prevent flash of default widths
    const withSavedWidths = ordered.map(col => {
      const savedWidth = config.columnWidths[col.field as string];
      if (savedWidth) {
        return { ...col, width: savedWidth };
      }
      return col;
    });

    return withSavedWidths.length > 0 ? withSavedWidths : visible;
  }, [
    columnDefs,
    config.visibleColumns,
    config.columnOrder,
    config.columnWidths,
  ]);

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

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (selectedIds: string[], selectedData: ProjectSummary[]) => {
      setDeleteConfirm({
        open: true,
        count: selectedIds.length,
        items: selectedData,
      });
    },
    []
  );

  // Confirm bulk delete
  const confirmBulkDelete = useCallback(async () => {
    const { items } = deleteConfirm;
    const failures: Array<{ id: string; reason: string; itemName: string }> =
      [];
    let successCount = 0;
    let totalQuotationsDeleted = 0;

    // Close dialog first
    setDeleteConfirm({ open: false, count: 0, items: [] });

    // Perform actual deletion
    for (const project of items) {
      try {
        const result = await deleteProject(project.id);
        successCount++;
        totalQuotationsDeleted += result?.quotationCount || 0;
      } catch (error: any) {
        failures.push({
          id: project.id,
          itemName: project.projectName,
          reason: error.message || 'שגיאה לא ידועה',
        });
      }
    }

    // Show results AFTER deletion completes
    if (failures.length === 0) {
      if (totalQuotationsDeleted > 0) {
        toast.success(
          `${successCount} פרויקטים ו-${totalQuotationsDeleted} הצעות מחיר נמחקו בהצלחה`
        );
      } else {
        toast.success(`${successCount} פרויקטים נמחקו בהצלחה`);
      }
    } else if (successCount === 0) {
      toast.error(`מחיקה נכשלה עבור כל ${failures.length} הפרויקטים`);
      // Show detailed failure messages
      failures.forEach(f => {
        toast.error(
          <div className="space-y-1">
            <div className="font-semibold">{f.itemName}</div>
            <div className="text-sm whitespace-pre-line">{f.reason}</div>
          </div>,
          { duration: 10000 }
        );
      });
    } else {
      toast.warning(
        `${successCount} פרויקטים נמחקו בהצלחה, ${failures.length} נכשלו`
      );
      // Show detailed failure messages
      failures.forEach(f => {
        toast.error(
          <div className="space-y-1">
            <div className="font-semibold">{f.itemName}</div>
            <div className="text-sm whitespace-pre-line">{f.reason}</div>
          </div>,
          { duration: 10000 }
        );
      });
    }

    // Clear selection AFTER successful deletion
    selection.clearSelection();
  }, [deleteConfirm, deleteProject, selection]);

  // Define grid actions for floating toolbar
  const gridActions = useMemo<GridAction[]>(() => {
    const actions: GridAction[] = [];

    // Edit action (single-row only)
    actions.push({
      type: 'edit',
      label: 'ערוך',
      icon: Edit,
      variant: 'outline',
      singleOnly: true,
      handler: async (__ids, data) => {
        if (data.length === 1) {
          handleEditProject(data[0]);
        }
      },
    });

    // Delete action (works for single or multiple)
    actions.push({
      type: 'delete',
      label: 'מחק',
      icon: Trash2,
      variant: 'destructive',
      confirmRequired: true,
      handler: handleBulkDelete,
    });

    return actions;
  }, [handleEditProject, handleBulkDelete]);

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

  // Grid context for selection
  const context = useMemo(
    () => ({
      onSelectionToggle: selection.toggleSelection,
      isSelected: selection.isSelected,
    }),
    [selection.toggleSelection, selection.isSelected]
  );

  // Handle cell click to prevent selection column from opening edit form
  const onCellClicked = useCallback((event: any) => {
    // Don't open form if clicking selection checkbox column
    if (event.colDef.field === 'selection') return;

    // For other cells, the double-click handler will open the project
  }, []);

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
              className="ag-theme-alpine cpq-selection-grid"
              style={{ height: '600px', width: '100%' }}
              dir="rtl"
            >
              <style>{`
                /* ClickUp-style: Checkbox OUTSIDE table - completely transparent */
                .cpq-selection-grid .ag-pinned-right-cols-container {
                  background: transparent !important;
                  border: none !important;
                  margin-left: 0 !important;
                  padding-left: 0 !important;
                }

                .cpq-selection-grid .ag-pinned-right-header {
                  background: transparent !important;
                  border: none !important;
                  margin-left: 0 !important;
                }

                .cpq-selection-grid .ag-cell[col-id="selection"] {
                  background: transparent !important;
                  border: none !important;
                  padding: 0 !important;
                }

                /* Show checkbox on row hover - overrides inline style */
                .cpq-selection-grid .ag-row:hover .checkbox-hover-target,
                .cpq-selection-grid .ag-row-hover .checkbox-hover-target {
                  opacity: 1 !important;
                }

                /* CRITICAL: Show checkbox for selected rows even when not hovering */
                .cpq-selection-grid .ag-row.row-selected .checkbox-hover-target {
                  opacity: 1 !important;
                }

                /* Row highlighting when selected - light blue */
                .cpq-selection-grid .ag-row.row-selected {
                  background-color: #eff6ff !important;
                }

                /* Remove focus ring from checkbox (but keep border for visibility) */
                .cpq-selection-grid .ag-cell[col-id="selection"] button {
                  outline: none !important;
                  box-shadow: none !important;
                }

                .cpq-selection-grid .ag-cell[col-id="selection"] button:focus {
                  outline: none !important;
                  box-shadow: none !important;
                  ring: 0 !important;
                }

                /* Remove blue border from AG Grid cell focus */
                .cpq-selection-grid .ag-cell[col-id="selection"]:focus,
                .cpq-selection-grid .ag-cell[col-id="selection"].ag-cell-focus,
                .cpq-selection-grid .ag-cell[col-id="selection"]:focus-within {
                  outline: none !important;
                  border: none !important;
                  box-shadow: none !important;
                }
              `}</style>
              <AgGridReact<ProjectSummary>
                ref={gridRef}
                rowData={filteredProjects}
                columnDefs={visibleColumnDefs}
                defaultColDef={defaultColDef}
                context={context}
                pagination={true}
                paginationPageSize={20}
                domLayout="normal"
                enableRtl={true}
                suppressRowClickSelection={true}
                rowSelection="multiple"
                getRowClass={params => {
                  const isSelected = selection.isSelected(
                    params.data?.id || ''
                  );
                  return isSelected ? 'row-selected' : '';
                }}
                singleClickEdit={true}
                onRowDoubleClicked={onRowDoubleClicked}
                onCellClicked={onCellClicked}
                onCellValueChanged={handleCellValueChanged}
                animateRows={true}
                onGridReady={() => {
                  // Apply saved column state if available
                  if (config.columnOrder?.length && gridRef.current) {
                    const columnState: ColumnState[] = config.columnOrder.map(
                      colId => ({
                        colId,
                        hide:
                          colId === 'selection'
                            ? false // ALWAYS show selection column
                            : Array.isArray(config.visibleColumns)
                              ? !config.visibleColumns.includes(colId)
                              : (config.visibleColumns as any)?.[colId] ===
                                false,
                        width: (config.columnWidths as any)?.[colId],
                      })
                    );

                    // Ensure selection column is in the state even if not in saved config
                    const hasSelection = columnState.some(
                      col => col.colId === 'selection'
                    );
                    if (!hasSelection) {
                      columnState.unshift({
                        colId: 'selection',
                        hide: false,
                        width: 48,
                      });
                    }

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
                    let visibleColumns: string[] = columnState
                      .filter(col => !col.hide)
                      .map(col => col.colId);

                    // Ensure selection column is always in visible columns
                    if (!visibleColumns.includes('selection')) {
                      visibleColumns = ['selection', ...visibleColumns];
                    }

                    saveConfig({ ...config, visibleColumns });
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Toolbar */}
      <FloatingActionToolbar
        selectedCount={selection.selectionCount}
        actions={gridActions}
        onClear={selection.clearSelection}
        onAction={selection.handleAction}
      />

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
        isOpen={deleteConfirm.open}
        title="מחיקת פרויקטים"
        message={
          deleteConfirm.count === 1
            ? deleteConfirm.items[0]?.quotationCount > 0
              ? `האם אתה בטוח שברצונך למחוק את הפרויקט "${deleteConfirm.items[0]?.projectName}"?\n\n⚠️ הפרויקט מכיל ${deleteConfirm.items[0]?.quotationCount} הצעות מחיר שיימחקו גם כן.\n\nפעולה זו אינה הפיכה ותמחק את כל הנתונים הקשורים.`
              : `האם אתה בטוח שברצונך למחוק את הפרויקט "${deleteConfirm.items[0]?.projectName}"?\n\nפעולה זו אינה הפיכה.`
            : `האם אתה בטוח שברצונך למחוק ${deleteConfirm.count} פרויקטים?\n\nפרויקטים שיימחקו:\n${deleteConfirm.items.map(p => `• ${p.projectName}${p.quotationCount > 0 ? ` (${p.quotationCount} הצעות מחיר)` : ''}`).join('\n')}\n\n⚠️ כל הצעות המחיר הקשורות יימחקו גם כן.\n\nפעולה זו אינה הפיכה.`
        }
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={confirmBulkDelete}
        onCancel={() => setDeleteConfirm({ open: false, count: 0, items: [] })}
        type="danger"
        requireConfirmation={deleteConfirm.items.some(
          p => p.quotationCount > 0
        )}
        confirmationText={deleteConfirm.items[0]?.projectName}
        confirmationPlaceholder="הקלד את שם הפרויקט"
      />
    </div>
  );
}
