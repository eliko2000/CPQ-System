import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { NewValueParams } from 'ag-grid-community';
import { useQuotations } from '../../hooks/useQuotations';
import { useCPQ } from '../../contexts/CPQContext';
import { DbQuotation } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  formatCurrency,
  convertDbQuotationToQuotationProject,
} from '../../lib/utils';
import { Plus, Settings, ChevronDown } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTableConfig } from '../../hooks/useTableConfig';
import { getTableColumnSettings } from '../../constants/settings';
import { ProjectPicker } from './ProjectPicker';
import { supabase } from '../../supabaseClient';
import { logger } from '@/lib/logger';
import { createQuotationColumnDefs } from './quotationGridColumns';
import { generateQuotationNumber } from '../../services/numberingService';
import { useTeam } from '../../contexts/TeamContext';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Cell renderers and column definitions are now in separate files

interface QuotationDataGridProps {
  onQuotationSelect?: (quotation: DbQuotation) => void;
  onQuotationEdit?: (quotation: DbQuotation) => void;
}

export const QuotationDataGrid: React.FC<QuotationDataGridProps> = ({
  onQuotationSelect,
  onQuotationEdit,
}) => {
  const {
    quotations,
    loading,
    error,
    updateQuotation,
    deleteQuotation,
    addQuotation,
    duplicateQuotation,
    fetchQuotations,
  } = useQuotations();
  const { setCurrentQuotation } = useCPQ();
  const { currentTeam } = useTeam();

  const gridRef = useRef<AgGridReact>(null);
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    quotation?: DbQuotation;
  }>({ open: false });
  const [creatingNew, setCreatingNew] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const isInitialMount = useRef(true);

  // Refetch quotations when component mounts to ensure fresh data after navigation
  useEffect(() => {
    fetchQuotations();
  }, []);

  // Use table configuration hook - RTL order (stored order matches desired display order)
  const { config, saveConfig } = useTableConfig('quotation_data_grid', {
    columnOrder: [
      'actions',
      'customer_name',
      'project_name',
      'version',
      'status',
      'displayTotalPrice',
      'created_at',
      'updated_at',
    ],
    columnWidths: {},
    visibleColumns: getTableColumnSettings('quotation_data_grid'),
    filterState: {},
  });

  // Close column manager when clicking outside
  const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
    setShowColumnManager(false);
  });

  // Get unique values for filtering
  const getUniqueValues = useCallback(
    (field: string): string[] => {
      const values = quotations
        .map(q => String((q as any)[field] || ''))
        .filter(Boolean);
      return Array.from(new Set(values)).sort();
    },
    [quotations]
  );

  // Handle column menu click
  const handleColumnMenuClick = useCallback((columnId: string) => {
    logger.debug('Column menu clicked:', columnId);
  }, []);

  // Handle filter click
  const handleFilterClick = useCallback((columnId: string) => {
    logger.debug('Filter clicked:', columnId);
  }, []);

  // Handle edit
  const handleEdit = useCallback(
    (quotation: DbQuotation) => {
      if (onQuotationEdit) {
        onQuotationEdit(quotation);
      } else {
        // Convert DbQuotation to QuotationProject and open in editor
        const quotationProject =
          convertDbQuotationToQuotationProject(quotation);
        setCurrentQuotation(quotationProject);
      }
    },
    [onQuotationEdit, setCurrentQuotation]
  );

  // Handle delete
  const handleDelete = useCallback((quotation: DbQuotation) => {
    setDeleteDialog({ open: true, quotation });
  }, []);

  // Handle duplicate
  const handleDuplicate = useCallback(
    async (quotation: DbQuotation) => {
      try {
        const newQuotationNumber = `${quotation.quotation_number}-COPY-${Date.now()}`;
        const newQuotation = await duplicateQuotation(
          quotation.id,
          newQuotationNumber
        );

        if (newQuotation) {
          if (onQuotationEdit) {
            onQuotationEdit(newQuotation);
          } else {
            const quotationProject =
              convertDbQuotationToQuotationProject(newQuotation);
            setCurrentQuotation(quotationProject);
          }
        }
      } catch (error) {
        logger.error('Failed to duplicate quotation:', error);
        alert('שגיאה בשכפול הצעת מחיר. נסה שוב.');
      }
    },
    [duplicateQuotation, onQuotationEdit, setCurrentQuotation]
  );

  // Handle new version
  const handleNewVersion = useCallback(
    async (quotation: DbQuotation) => {
      try {
        const currentVersion = quotation.version || 1;
        const newVersion = currentVersion + 1;
        const newQuotationNumber = `${quotation.quotation_number}-V${newVersion}`;
        const newQuotation = await duplicateQuotation(
          quotation.id,
          newQuotationNumber,
          newVersion
        );

        if (newQuotation) {
          if (onQuotationEdit) {
            onQuotationEdit(newQuotation);
          } else {
            const quotationProject =
              convertDbQuotationToQuotationProject(newQuotation);
            setCurrentQuotation(quotationProject);
          }
        }
      } catch (error) {
        logger.error('Failed to create new version:', error);
        alert('שגיאה ביצירת גרסה חדשה. נסה שוב.');
      }
    },
    [duplicateQuotation, onQuotationEdit, setCurrentQuotation]
  );

  // Create context for AG Grid cell renderers
  const gridContext = useMemo(
    () => ({
      onEdit: handleEdit,
      onDelete: handleDelete,
      onDuplicate: handleDuplicate,
      onNewVersion: handleNewVersion,
    }),
    [handleEdit, handleDelete, handleDuplicate, handleNewVersion]
  );

  // Convert DbQuotation to grid data format
  const gridData = useMemo(() => {
    return quotations.map(quotation => ({
      ...quotation,
      // Add computed fields for display
      displayTotalPrice: quotation.total_price || 0,
      displayTotalCost: quotation.total_cost || 0,
      displayMargin:
        quotation.total_price && quotation.total_cost
          ? ((quotation.total_price - quotation.total_cost) /
              quotation.total_cost) *
            100
          : 0,
    }));
  }, [quotations]);

  // Column definitions with RTL support - order will be reversed by AG Grid
  const columnDefs = useMemo(
    () =>
      createQuotationColumnDefs({
        getUniqueValues,
        handleColumnMenuClick,
        handleFilterClick,
        updateQuotation,
      }),
    [getUniqueValues, handleColumnMenuClick, handleFilterClick, updateQuotation]
  );

  // Filter and reorder columns based on config
  const visibleColumnDefs = useMemo(() => {
    // Default column order if not configured
    const defaultOrder = [
      'actions',
      'customer_name',
      'project_name',
      'version',
      'status',
      'displayTotalPrice',
      'created_at',
      'updated_at',
    ];

    // Use saved order if exists and not empty, otherwise use default
    const effectiveOrder =
      config.columnOrder && config.columnOrder.length > 0
        ? config.columnOrder
        : defaultOrder;

    logger.debug('QuotationDataGrid - effectiveOrder:', effectiveOrder);
    logger.debug(
      'QuotationDataGrid - config.visibleColumns:',
      config.visibleColumns
    );

    // If no visible columns configured, show all columns
    if (!config.visibleColumns || config.visibleColumns.length === 0) {
      return columnDefs;
    }

    const visible = columnDefs.filter(col =>
      config.visibleColumns.includes(col.field!)
    );

    // If filtering results in no columns, fall back to all columns
    if (visible.length === 0) {
      return columnDefs;
    }

    const ordered = effectiveOrder
      .filter(fieldId => visible.some(col => col.field === fieldId))
      .map(fieldId => visible.find(col => col.field === fieldId)!);

    // Apply saved column widths to prevent flash of default widths
    const withSavedWidths = ordered.map(col => {
      const savedWidth = config.columnWidths[col.field!];
      if (savedWidth) {
        return { ...col, width: savedWidth };
      }
      return col;
    });

    logger.debug(
      'QuotationDataGrid - ordered:',
      withSavedWidths.map(c => c?.field)
    );

    // Don't reverse! columnDefs is already reversed and AG Grid RTL will handle it
    return withSavedWidths.length > 0 ? withSavedWidths : visible;
  }, [
    columnDefs,
    config.visibleColumns,
    config.columnOrder,
    config.columnWidths,
  ]);

  // Toggle column visibility - Note: This updates settings, not table config
  const toggleColumn = useCallback(
    async (field: string) => {
      // Import settingsService dynamically
      const { saveSetting, loadSetting } = await import(
        '../../services/settingsService'
      );

      // Load current table column settings
      const result =
        await loadSetting<Record<string, string[]>>('tableColumns');
      const currentSettings = result.data || {};

      // Toggle the column for this table
      const currentVisible =
        currentSettings['quotation_data_grid'] || config.visibleColumns;
      const newVisibleColumns = currentVisible.includes(field)
        ? currentVisible.filter(col => col !== field)
        : [...currentVisible, field];

      // Save to settings
      await saveSetting('tableColumns', {
        ...currentSettings,
        quotation_data_grid: newVisibleColumns,
      });

      // Dispatch event to notify settings updated
      window.dispatchEvent(new CustomEvent('cpq-settings-updated'));
    },
    [config.visibleColumns]
  );

  // Get all available columns for management
  const allColumns = useMemo(() => {
    return columnDefs.map(col => ({
      field: col.field!,
      headerName: col.headerName!,
      isVisible: config.visibleColumns.includes(col.field!),
    }));
  }, [columnDefs, config.visibleColumns]);

  // Handle cell value changes
  const handleCellValueChanged = useCallback(
    async (params: NewValueParams) => {
      const { data, colDef, newValue, oldValue } = params;
      logger.debug('🟢 QuotationDataGrid - onCellValueChanged fired:', {
        field: colDef.field,
        oldValue,
        newValue,
        data,
      });

      if (newValue === oldValue) {
        logger.debug('No change detected, skipping update');
        return;
      }

      try {
        logger.debug('Updating quotation field:', colDef.field);
        await updateQuotation(data.id, {
          [colDef.field!]: newValue,
        });
        logger.debug('✅ Quotation updated successfully');
      } catch (error) {
        logger.error('❌ Failed to update quotation:', error);
        // Revert change in grid
        if (params.node) {
          params.node.setDataValue(colDef.field!, oldValue);
        }
      }
    },
    [updateQuotation]
  );

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.quotation) return;

    try {
      await deleteQuotation(deleteDialog.quotation.id);
      setDeleteDialog({ open: false });
    } catch (error) {
      logger.error('Failed to delete quotation:', error);
    }
  }, [deleteDialog.quotation, deleteQuotation]);

  // Handle row double click
  const handleRowDoubleClicked = useCallback(
    (params: any) => {
      if (onQuotationSelect) {
        onQuotationSelect(params.data);
      } else {
        // Convert and open in editor
        const quotationProject = convertDbQuotationToQuotationProject(
          params.data
        );
        setCurrentQuotation(quotationProject);
      }
    },
    [onQuotationSelect, setCurrentQuotation]
  );

  // Handle selection change
  const handleSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes() || [];
    setSelectedQuotations(selectedNodes.map((node: any) => node.data.id));
  }, []);

  // Grid ready handler
  const onGridReady = useCallback(
    (params: any) => {
      // Widths are already applied via columnDefs in visibleColumnDefs
      // No need to re-apply them here as it causes a flash

      // Apply saved filter state
      if (Object.keys(config.filterState).length > 0 && params.api) {
        params.api.setFilterModel(config.filterState);
      }

      // DON'T call sizeColumnsToFit - it interferes with saved widths

      // Mark initial mount as complete after a short delay
      setTimeout(() => {
        isInitialMount.current = false;
      }, 500);
    },
    [config.filterState]
  );

  const onFirstDataRendered = useCallback((params: any) => {
    // DON'T call sizeColumnsToFit - let AG Grid use the saved column widths from columnDefs
  }, []);

  // Handle column resize
  const onColumnResized = useCallback(
    (params: any) => {
      // ONLY save if this was a user drag - ignore all automatic resizes
      const isUserResize =
        params.source === 'uiColumnResized' ||
        params.source === 'uiColumnDragged';

      if (params.finished && isUserResize && params.api) {
        const widths: Record<string, number> = {};
        const columns = params.api.getAllDisplayedColumns();
        columns?.forEach((col: any) => {
          widths[col.getColId()] = col.getActualWidth();
        });
        logger.debug('User resized column, saving widths:', widths);
        saveConfig({ columnWidths: widths });
      } else if (params.finished) {
        logger.debug('Ignoring automatic resize, source:', params.source);
      }
    },
    [saveConfig]
  );

  // Handle column move
  const onColumnMoved = useCallback(
    (params: any) => {
      // ONLY save if this was a user drag - ignore automatic column reordering
      const isUserMove =
        params.source === 'uiColumnMoved' ||
        params.source === 'uiColumnDragged';

      if (params.finished && isUserMove && params.api) {
        const displayedOrder =
          params.api
            .getAllDisplayedColumns()
            ?.map((col: any) => col.getColId()) || [];
        // Reverse because AG Grid gives us reversed order in RTL
        const actualOrder = [...displayedOrder].reverse();
        logger.debug(
          'User moved column - displayed:',
          displayedOrder,
          'saving:',
          actualOrder
        );
        saveConfig({ columnOrder: actualOrder });
      } else if (params.finished) {
        logger.debug('Ignoring automatic column move, source:', params.source);
      }
    },
    [saveConfig]
  );

  // Handle filter change
  const onFilterChanged = useCallback(
    (params: any) => {
      if (!isInitialMount.current) {
        const filterModel = params.api.getFilterModel();
        saveConfig({ filterState: filterModel });
      }
    },
    [saveConfig]
  );

  // Add new quotation - show project picker first
  const handleAddNew = useCallback(() => {
    setShowProjectPicker(true);
  }, []);

  // Create quotation after project is selected
  const handleProjectSelected = useCallback(
    async (projectId: string) => {
      setShowProjectPicker(false);
      setCreatingNew(true);

      try {
        // Get project data
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;

        // Load pricing settings from Supabase/cache
        const { loadDefaultQuotationParameters } = await import(
          '../../utils/quotationCalculations'
        );
        const defaultParams = await loadDefaultQuotationParameters();

        // Generate quotation number (optional feature)
        if (!currentTeam) throw new Error('No active team');

        let quotationNumber = `Q-${Date.now()}`; // Fallback number

        // Try to generate smart quotation number if project has number
        if (project.project_number) {
          try {
            quotationNumber = await generateQuotationNumber(
              currentTeam.id,
              project.project_number
            );
            logger.debug('Generated quotation number:', quotationNumber);
          } catch (numberError) {
            logger.warn(
              'Could not generate quotation number, using fallback:',
              numberError
            );
            // Use fallback number already set above
          }
        } else {
          logger.debug(
            'Project has no project_number, using timestamp-based quotation number'
          );
        }

        const newQuotation = await addQuotation({
          quotation_number: quotationNumber,
          version: 1,
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
          if (onQuotationEdit) {
            onQuotationEdit(newQuotation);
          } else {
            const quotationProject =
              convertDbQuotationToQuotationProject(newQuotation);
            setCurrentQuotation(quotationProject);
          }
        }
      } catch (error) {
        logger.error('Failed to create quotation:', error);
        alert('שגיאה ביצירת הצעת מחיר');
      } finally {
        setCreatingNew(false);
      }
    },
    [addQuotation, onQuotationEdit, setCurrentQuotation]
  );

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalValue = quotations.reduce(
      (sum, q) => sum + (q.total_price || 0),
      0
    );
    const totalCost = quotations.reduce(
      (sum, q) => sum + (q.total_cost || 0),
      0
    );
    const totalMargin = totalValue - totalCost;
    const avgMargin = totalCost > 0 ? (totalMargin / totalCost) * 100 : 0;

    const statusCounts = quotations.reduce(
      (acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalValue,
      totalCost,
      totalMargin,
      avgMargin,
      statusCounts,
      totalCount: quotations.length,
    };
  }, [quotations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">טוען נתונים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">שגיאה: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">הצעות מחיר</h1>
          <p className="text-muted-foreground">
            ניהול ועריכה של הצעות מחיר ({quotations.length} הצעות)
          </p>
        </div>
        <Button onClick={handleAddNew} disabled={creatingNew}>
          <Plus className="h-4 w-4 ml-2" />
          {creatingNew ? 'יוצר...' : 'הצעת מחיר חדשה'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">סה"כ הצעות</div>
            <div className="text-2xl font-bold">{summaryStats.totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">שווי כולל</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summaryStats.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">עלות כוללת</div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summaryStats.totalCost)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">רווח כולל</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryStats.totalMargin)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-gray-600">רווח ממוצע</div>
            <div className="text-2xl font-bold">
              {summaryStats.avgMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AG Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>רשימת הצעות מחיר</CardTitle>
              <div className="text-sm text-gray-600">
                {selectedQuotations.length > 0 &&
                  `נבחרו ${selectedQuotations.length} הצעות`}
              </div>
            </div>

            {/* Column Management */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnManager(!showColumnManager)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                ניהול עמודות
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showColumnManager ? 'rotate-180' : ''}`}
                />
              </Button>

              {showColumnManager && (
                <div
                  ref={columnManagerRef}
                  className="absolute top-full mt-2 right-0 bg-background border border-border rounded-md shadow-lg z-50 p-4 min-w-64"
                >
                  <h4 className="font-medium mb-3">בחר עמודות להצגה</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allColumns.map(col => (
                      <label
                        key={col.field}
                        className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-muted p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={col.isVisible}
                          onChange={() => toggleColumn(col.field)}
                          className="rounded"
                        />
                        <span className="text-sm">{col.headerName}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const { saveSetting, loadSetting } = await import(
                          '../../services/settingsService'
                        );
                        const result =
                          await loadSetting<Record<string, string[]>>(
                            'tableColumns'
                          );
                        const currentSettings = result.data || {};
                        await saveSetting('tableColumns', {
                          ...currentSettings,
                          quotation_data_grid: allColumns.map(col => col.field),
                        });
                        window.dispatchEvent(
                          new CustomEvent('cpq-settings-updated')
                        );
                      }}
                    >
                      הצג הכל
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const { saveSetting, loadSetting } = await import(
                          '../../services/settingsService'
                        );
                        const result =
                          await loadSetting<Record<string, string[]>>(
                            'tableColumns'
                          );
                        const currentSettings = result.data || {};
                        await saveSetting('tableColumns', {
                          ...currentSettings,
                          quotation_data_grid: [
                            'actions',
                            'customer_name',
                            'status',
                          ],
                        });
                        window.dispatchEvent(
                          new CustomEvent('cpq-settings-updated')
                        );
                      }}
                    >
                      מינימלי
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="ag-theme-alpine"
            style={{ height: '600px', width: '100%', direction: 'rtl' }}
          >
            <AgGridReact
              ref={gridRef}
              rowData={gridData}
              columnDefs={visibleColumnDefs}
              context={gridContext}
              enableRtl={true}
              suppressMovableColumns={false}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              onGridReady={onGridReady}
              onFirstDataRendered={onFirstDataRendered}
              onColumnResized={onColumnResized}
              onColumnMoved={onColumnMoved}
              onFilterChanged={onFilterChanged}
              onCellValueChanged={handleCellValueChanged}
              onRowDoubleClicked={handleRowDoubleClicked}
              onSelectionChanged={handleSelectionChanged}
              rowSelection="multiple"
              enableRangeSelection={false}
              animateRows={true}
              stopEditingWhenCellsLoseFocus={true}
              singleClickEdit={true}
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        title="מחיקת הצעת מחיר"
        message={`האם אתה בטוח שברצונך למחוק את הצעת המחיר "${deleteDialog.quotation?.project_name || deleteDialog.quotation?.quotation_number}"?`}
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ open: false })}
        type="danger"
      />

      {/* Project Picker Dialog */}
      {showProjectPicker && (
        <ProjectPicker
          isOpen={showProjectPicker}
          onClose={() => setShowProjectPicker(false)}
          onSelect={project => handleProjectSelected(project.id)}
          currentProjectId={null}
        />
      )}
    </div>
  );
};
