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
import {
  Plus,
  Settings,
  ChevronDown,
  Edit,
  Trash2,
  Copy,
  FileText,
  X,
  Filter,
} from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTableConfig } from '../../hooks/useTableConfig';
import { useAppearancePreferences } from '../../hooks/useAppearancePreferences';
import { getTableColumnSettings } from '../../constants/settings';
import { ProjectPicker } from './ProjectPicker';
import { supabase } from '../../supabaseClient';
import { logger } from '@/lib/logger';
import { createQuotationColumnDefs } from './quotationGridColumns';
import {
  generateProjectNumber,
  generateQuotationNumber,
} from '../../services/numberingService';
import { useTeam } from '../../contexts/TeamContext';
import { useGridSelection } from '../../hooks/useGridSelection';
import { FloatingActionToolbar } from '../grid/FloatingActionToolbar';
import { GridAction } from '../../types/grid.types';
import { toast } from 'sonner';
import { useUI } from '../../contexts/UIStateContext';

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
  const { preferences } = useAppearancePreferences();
  const { viewParams, clearViewParams } = useUI();

  const gridRef = useRef<AgGridReact>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    count: number;
    items: DbQuotation[];
  }>({ open: false, count: 0, items: [] });
  const [creatingNew, setCreatingNew] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const isInitialMount = useRef(true);

  // Active status filter (from dashboard pipeline click)
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(
    viewParams?.statusFilter || null
  );

  // Initialize grid selection hook
  const selection = useGridSelection<DbQuotation>({
    gridApi: gridRef.current?.api,
    getRowId: quotation => quotation.id,
  });

  // Refetch quotations when component mounts
  useEffect(() => {
    fetchQuotations();
  }, []);

  // Capture viewParams filter when it arrives (from dashboard pipeline click)
  useEffect(() => {
    if (viewParams?.statusFilter) {
      setActiveStatusFilter(viewParams.statusFilter);
      clearViewParams();
    }
  }, [viewParams, clearViewParams]);

  // Filter quotations based on active status filter (bypasses AG Grid filter API for free tier)
  const filteredQuotations = useMemo(() => {
    if (!activeStatusFilter) {
      return quotations;
    }
    return quotations.filter(q => q.status === activeStatusFilter);
  }, [quotations, activeStatusFilter]);

  // Clear the active filter
  const clearStatusFilter = useCallback(() => {
    setActiveStatusFilter(null);
  }, []);

  // Hebrew to English status mapping
  const statusHebrewToEnglish: Record<string, string> = {
    טיוטה: 'draft',
    נשלח: 'sent',
    התקבל: 'accepted',
    נדחה: 'rejected',
    'פג תוקף': 'expired',
  };

  // Handle status filter change from column dropdown (Hebrew values)
  const handleStatusFilterChange = useCallback((selectedValues: string[]) => {
    if (selectedValues.length === 0) {
      setActiveStatusFilter(null);
    } else if (selectedValues.length === 1) {
      // Map Hebrew to English
      const englishValue =
        statusHebrewToEnglish[selectedValues[0]] || selectedValues[0];
      setActiveStatusFilter(englishValue);
    } else {
      // Multiple values selected - for now just use the first one
      // Could enhance to support multiple values later
      const englishValue =
        statusHebrewToEnglish[selectedValues[0]] || selectedValues[0];
      setActiveStatusFilter(englishValue);
    }
  }, []);

  // Use table configuration hook - RTL order (stored order matches desired display order)
  const { config, saveConfig } = useTableConfig('quotation_data_grid', {
    columnOrder: [
      'selection',
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

  // Bulk delete handler with partial failure support
  const handleBulkDelete = useCallback(
    async (selectedIds: string[], selectedData: DbQuotation[]) => {
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

    // Close dialog first
    setDeleteConfirm({ open: false, count: 0, items: [] });

    // Perform actual deletion
    for (const quotation of items) {
      try {
        await deleteQuotation(quotation.id);
        successCount++;
      } catch (error: any) {
        failures.push({
          id: quotation.id,
          itemName: quotation.project_name || quotation.quotation_number,
          reason: error.message || 'שגיאה לא ידועה',
        });
      }
    }

    // Show results AFTER deletion completes
    if (failures.length === 0) {
      toast.success(`${successCount} הצעות מחיר נמחקו בהצלחה`);
    } else if (successCount === 0) {
      toast.error(`מחיקה נכשלה עבור כל ${failures.length} ההצעות`);
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
        `${successCount} הצעות מחיר נמחקו בהצלחה, ${failures.length} נכשלו`
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
  }, [deleteConfirm, deleteQuotation, selection]);

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
          if (onQuotationEdit) {
            onQuotationEdit(data[0]);
          } else {
            const quotationProject = convertDbQuotationToQuotationProject(
              data[0]
            );
            setCurrentQuotation(quotationProject);
          }
        }
      },
    });

    // Duplicate action (works for single or multiple)
    actions.push({
      type: 'duplicate',
      label: 'שכפל',
      icon: Copy,
      variant: 'outline',
      handler: async (__ids, data) => {
        for (const quotation of data) {
          try {
            const newQuotationNumber = `${quotation.quotation_number}-COPY-${Date.now()}`;
            const newQuotation = await duplicateQuotation(
              quotation.id,
              newQuotationNumber
            );

            if (newQuotation && data.length === 1) {
              // Only open the duplicated quotation if it's a single item
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
          }
        }
        if (data.length > 1) {
          toast.success(`${data.length} הצעות מחיר שוכפלו בהצלחה`);
        }
      },
    });

    // New Version action (single-row only)
    actions.push({
      type: 'newVersion' as any, // Custom action type
      label: 'גרסה חדשה',
      icon: FileText,
      variant: 'outline',
      singleOnly: true,
      handler: async (__ids, data) => {
        if (data.length === 1) {
          try {
            const quotation = data[0];
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
            toast.error('שגיאה ביצירת גרסה חדשה');
          }
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
  }, [
    onQuotationEdit,
    setCurrentQuotation,
    duplicateQuotation,
    handleBulkDelete,
  ]);

  // Grid context for selection
  const gridContext = useMemo(
    () => ({
      onSelectionToggle: selection.toggleSelection,
      isSelected: selection.isSelected,
    }),
    [selection.toggleSelection, selection.isSelected]
  );

  // Convert DbQuotation to grid data format (uses filtered data)
  const gridData = useMemo(() => {
    return filteredQuotations.map(quotation => ({
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
  }, [filteredQuotations]);

  // Column definitions with RTL support - order will be reversed by AG Grid
  const columnDefs = useMemo(() => {
    const baseCols = createQuotationColumnDefs({
      getUniqueValues,
      handleColumnMenuClick,
      handleFilterClick,
      updateQuotation,
    });

    // Add cellRendererParams to selection column and filter indicator to status column
    return baseCols.map(col => {
      if (col.field === 'selection') {
        return {
          ...col,
          cellRendererParams: {
            onSelectionToggle: selection.toggleSelection,
            isSelected: selection.isSelected,
          },
        };
      }
      // Add filter indicator and custom handler to status column
      if (col.field === 'status') {
        const existingParams =
          typeof col.headerComponentParams === 'function'
            ? col.headerComponentParams
            : () => col.headerComponentParams || {};

        return {
          ...col,
          headerComponentParams: (params: any) => ({
            ...existingParams(params),
            isFilterActive: !!activeStatusFilter,
            onCustomFilterChange: handleStatusFilterChange,
          }),
        };
      }
      return col;
    });
  }, [
    getUniqueValues,
    handleColumnMenuClick,
    handleFilterClick,
    updateQuotation,
    selection.toggleSelection,
    selection.isSelected,
    activeStatusFilter,
    handleStatusFilterChange,
  ]);

  // Filter and reorder columns based on config
  const visibleColumnDefs = useMemo(() => {
    // Default column order if not configured
    const defaultOrder = [
      'selection',
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
      visibleColumnsWithSelection.includes(col.field!)
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

  // Toggle column visibility - Uses table config for persistence
  const toggleColumn = useCallback(
    (field: string) => {
      // Toggle the column in current visible columns
      const currentVisible = config.visibleColumns;
      const newVisibleColumns = currentVisible.includes(field)
        ? currentVisible.filter(col => col !== field)
        : [...currentVisible, field];

      // Save via useTableConfig hook - this persists to user_table_configs
      saveConfig({ visibleColumns: newVisibleColumns });

      logger.debug('Column visibility toggled:', { field, newVisibleColumns });
    },
    [config.visibleColumns, saveConfig]
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

      // Skip status and priority fields - they are handled directly by StatusCellEditor
      // via onStatusChange to avoid double-updates
      if (colDef.field === 'status' || colDef.field === 'priority') {
        logger.debug('Skipping status/priority - handled by StatusCellEditor');
        return;
      }

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

  // Handle cell click to prevent selection column from opening editor
  const onCellClicked = useCallback((params: any) => {
    // Don't open form if clicking on the selection checkbox column
    if (params.colDef.field === 'selection') return;

    // For other cells, the double-click handler will open the quotation
  }, []);

  // Grid ready handler
  const onGridReady = useCallback(
    (params: any) => {
      // Widths are already applied via columnDefs in visibleColumnDefs
      // No need to re-apply them here as it causes a flash

      // Apply saved filter state (AG Grid's own filters, not our status filter)
      if (
        Object.keys(config.filterState).length > 0 &&
        params.api &&
        !activeStatusFilter
      ) {
        params.api.setFilterModel(config.filterState);
      }

      // DON'T call sizeColumnsToFit - it interferes with saved widths

      // Mark initial mount as complete after a short delay
      setTimeout(() => {
        isInitialMount.current = false;
      }, 500);
    },
    [config.filterState, activeStatusFilter]
  );

  const onFirstDataRendered = useCallback((__params: any) => {
    // Grid is ready with data - no special handling needed since we filter at data source level
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

  // Handle filter change (from AG Grid column filters)
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

        // Load pricing settings from Supabase/cache with team scope
        const { loadDefaultQuotationParameters } = await import(
          '../../utils/quotationCalculations'
        );
        const defaultParams = await loadDefaultQuotationParameters(
          currentTeam?.id
        );

        // Generate quotation number
        if (!currentTeam) throw new Error('No active team');

        let quotationNumber = `Q-${Date.now()}`; // Fallback number

        // Determine project number (use existing or generate new)
        let projectNumber = project.project_number;

        if (!projectNumber) {
          // Project doesn't have a number, generate one
          try {
            projectNumber = await generateProjectNumber(currentTeam.id);
            logger.debug(
              'Generated project number for quotation:',
              projectNumber
            );
          } catch (err) {
            logger.warn('Could not generate project number:', err);
          }
        }

        // Generate quotation number if we have a project number
        if (projectNumber) {
          try {
            quotationNumber = await generateQuotationNumber(
              currentTeam.id,
              projectNumber
            );
            logger.debug('Generated quotation number:', quotationNumber);
          } catch (numberError) {
            logger.warn(
              'Could not generate quotation number, using fallback:',
              numberError
            );
          }
        } else {
          logger.debug(
            'No project number available, using timestamp-based quotation number'
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
          eur_to_ils_rate: defaultParams.eurToIlsRate,
          margin_percentage: defaultParams.markupPercent,
          day_work_cost: defaultParams.dayWorkCost,
          risk_percentage: defaultParams.riskPercent,
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
            ניהול ועריכה של הצעות מחיר ({filteredQuotations.length} הצעות
            {activeStatusFilter ? ` מסוננות` : ''})
          </p>
        </div>
        <Button onClick={handleAddNew} disabled={creatingNew}>
          <Plus className="h-4 w-4 ml-2" />
          {creatingNew ? 'יוצר...' : 'הצעת מחיר חדשה'}
        </Button>
      </div>

      {/* Active Filter Indicator */}
      {activeStatusFilter && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            מסנן לפי סטטוס:{' '}
            <strong>
              {activeStatusFilter === 'draft' && 'טיוטה'}
              {activeStatusFilter === 'sent' && 'נשלח'}
              {activeStatusFilter === 'accepted' && 'התקבל'}
              {activeStatusFilter === 'rejected' && 'נדחה'}
              {activeStatusFilter === 'expired' && 'פג תוקף'}
            </strong>
          </span>
          <span className="text-sm text-blue-600">
            ({filteredQuotations.length} מתוך {quotations.length} הצעות)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearStatusFilter}
            className="mr-auto h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4 ml-1" />
            נקה מסנן
          </Button>
        </div>
      )}

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
                {selection.selectionCount > 0 &&
                  `נבחרו ${selection.selectionCount} הצעות`}
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
                      onClick={() => {
                        // Show all columns
                        saveConfig({
                          visibleColumns: allColumns.map(col => col.field),
                        });
                      }}
                    >
                      הצג הכל
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Minimal columns
                        saveConfig({
                          visibleColumns: [
                            'selection',
                            'customer_name',
                            'status',
                          ],
                        });
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
            className="ag-theme-alpine cpq-selection-grid"
            style={{ height: '600px', width: '100%', direction: 'rtl' }}
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
            <AgGridReact
              ref={gridRef}
              rowData={gridData}
              columnDefs={visibleColumnDefs}
              context={gridContext}
              enableRtl={true}
              suppressMovableColumns={false}
              suppressRowClickSelection={true}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
              }}
              rowSelection="multiple"
              getRowClass={params => {
                const isSelected = selection.isSelected(params.data?.id);
                return isSelected ? 'row-selected' : '';
              }}
              onGridReady={onGridReady}
              onFirstDataRendered={onFirstDataRendered}
              onColumnResized={onColumnResized}
              onColumnMoved={onColumnMoved}
              onFilterChanged={onFilterChanged}
              onCellValueChanged={handleCellValueChanged}
              onCellClicked={onCellClicked}
              onRowDoubleClicked={handleRowDoubleClicked}
              enableRangeSelection={false}
              animateRows={true}
              stopEditingWhenCellsLoseFocus={true}
              singleClickEdit={true}
              pagination={true}
              paginationPageSize={preferences.itemsPerPage}
              paginationPageSizeSelector={[25, 50, 100]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Toolbar */}
      <FloatingActionToolbar
        selectedCount={selection.selectionCount}
        actions={gridActions}
        onClear={selection.clearSelection}
        onAction={selection.handleAction}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="מחיקת הצעות מחיר"
        message={
          deleteConfirm.count === 1
            ? `האם אתה בטוח שברצונך למחוק את הצעת המחיר "${deleteConfirm.items[0]?.project_name || deleteConfirm.items[0]?.quotation_number}"?`
            : `האם אתה בטוח שברצונך למחוק ${deleteConfirm.count} הצעות מחיר?\n\nהצעות המחיר שיימחקו:\n${deleteConfirm.items.map(q => `• ${q.project_name || q.quotation_number}`).join('\n')}`
        }
        confirmText="מחק"
        cancelText="ביטול"
        onConfirm={confirmBulkDelete}
        onCancel={() => setDeleteConfirm({ open: false, count: 0, items: [] })}
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
