import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ICellRendererParams, ValueSetterParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, Eye, Settings, ChevronDown, Copy } from 'lucide-react';
import { Component } from '../../types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTableConfig } from '../../hooks/useTableConfig';
import { useTeam } from '../../contexts/TeamContext';
import { useAppearancePreferences } from '../../hooks/useAppearancePreferences';
import { CustomHeader } from '../grid/CustomHeader';
import {
  getComponentCategories,
  getTableColumnSettings,
  CATEGORIES_UPDATED_EVENT,
} from '../../constants/settings';
import { logger } from '@/lib/logger';

interface EnhancedComponentGridProps {
  components: Component[];
  onEdit: (component: Component) => void;
  onDelete: (componentId: string, componentName: string) => void;
  onDuplicate?: (component: Component) => void;
  onView?: (component: Component) => void;
  onComponentUpdate?: (componentId: string, field: string, value: any) => void;
}

export function EnhancedComponentGrid({
  components,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  onComponentUpdate,
}: EnhancedComponentGridProps) {
  const { currentTeam } = useTeam();
  const { preferences } = useAppearancePreferences();
  const gridRef = useRef<AgGridReact>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [categories, setCategories] = useState<string[]>(() =>
    getComponentCategories(currentTeam?.id)
  );

  // Reload categories when team changes
  useEffect(() => {
    if (currentTeam?.id) {
      setCategories(getComponentCategories(currentTeam.id));
      // Force grid to refresh column definitions
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.refreshCells({ force: true });
      }
    }
  }, [currentTeam?.id]);

  // Listen for category updates from settings
  useEffect(() => {
    const handleCategoriesUpdate = () => {
      setCategories(getComponentCategories(currentTeam?.id));
      // Force grid to refresh column definitions
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.refreshCells({ force: true });
      }
    };

    window.addEventListener(CATEGORIES_UPDATED_EVENT, handleCategoriesUpdate);
    return () => {
      window.removeEventListener(
        CATEGORIES_UPDATED_EVENT,
        handleCategoriesUpdate
      );
    };
  }, [currentTeam?.id]);

  // Use table configuration hook - RTL order (reversed because AG Grid reverses it back)
  const { config, saveConfig, loading } = useTableConfig('component_library', {
    columnOrder: [
      'description',
      'notes',
      'quoteDate',
      'currency',
      'unitCostEUR',
      'unitCostUSD',
      'unitCostNIS',
      'componentType',
      'category',
      'supplier',
      'manufacturer',
      'name',
      'manufacturerPN',
      'actions',
    ],
    columnWidths: {},
    visibleColumns: getTableColumnSettings('component_library'),
    filterState: {},
  });

  // Close column manager when clicking outside
  const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
    setShowColumnManager(false);
  });

  // Get unique values for a specific field for filtering
  const getUniqueValues = useCallback(
    (field: keyof Component): string[] => {
      const values = components
        .map(comp => String(comp[field] || ''))
        .filter(Boolean);
      return Array.from(new Set(values)).sort();
    },
    [components]
  );

  // Handle inline editing
  const handleCellEdit = useCallback(
    (params: ValueSetterParams) => {
      logger.debug('🔧 EnhancedComponentGrid.handleCellEdit called:', {
        field: params.colDef.field,
        oldValue: params.oldValue,
        newValue: params.newValue,
        data: params.data,
      });
      if (
        onComponentUpdate &&
        params.data &&
        params.newValue !== params.oldValue
      ) {
        logger.debug('🔧 Calling onComponentUpdate with:', {
          id: params.data.id,
          field: params.colDef.field,
          newValue: params.newValue,
        });
        onComponentUpdate(
          params.data.id,
          params.colDef.field!,
          params.newValue
        );
      } else {
        logger.debug('🔧 Skipped update - no change or missing handler');
      }
      return true;
    },
    [onComponentUpdate]
  );

  // Handle column menu click
  const handleColumnMenuClick = useCallback((columnId: string) => {
    logger.debug('Column menu clicked:', columnId);
    // Menu functionality will be implemented in Phase 2
  }, []);

  // Handle filter click
  const handleFilterClick = useCallback((columnId: string) => {
    logger.debug('Filter clicked:', columnId);
    // Smart filter is now handled by the CustomHeader component
  }, []);

  // Column definitions with enhanced filtering and editing - RTL order
  const columnDefs = useMemo(
    () => [
      {
        headerName: 'תאריך הצעה',
        field: 'quoteDate',
        sortable: true,
        filter: 'agDateColumnFilter',
        resizable: true,
        width: 120,
        editable: true,
        cellEditor: 'agDateStringCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'תאריך הצעה',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          filterType: 'date',
        }),
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleDateString('he-IL');
        },
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'מחיר בדולר',
        field: 'unitCostUSD',
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        width: 120,
        type: 'numericColumn',
        editable: true,
        cellEditor: 'agNumberCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מחיר בדולר',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          filterType: 'number',
        }),
        valueFormatter: (params: any) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
          }).format(params.value || 0);
        },
        cellClass: 'font-semibold text-blue-600',
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'מחיר בש"ח',
        field: 'unitCostNIS',
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        width: 120,
        type: 'numericColumn',
        editable: true,
        cellEditor: 'agNumberCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מחיר בש"ח',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          filterType: 'number',
        }),
        valueFormatter: (params: any) => {
          return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 2,
          }).format(params.value || 0);
        },
        cellClass: 'font-semibold text-green-600',
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'ספק',
        field: 'supplier',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 120,
        editable: true,
        cellEditor: 'agTextCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'ספק',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('supplier'),
        }),
        filterParams: {
          values: (_params: any) => getUniqueValues('supplier'),
        },
      },
      {
        headerName: 'יצרן',
        field: 'manufacturer',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 120,
        editable: true,
        cellEditor: 'agTextCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'יצרן',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('manufacturer'),
        }),
        filterParams: {
          values: (_params: any) => getUniqueValues('manufacturer'),
        },
      },
      {
        headerName: 'שם רכיב',
        field: 'name',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 180,
        editable: true,
        cellEditor: 'agTextCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'שם רכיב',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('name'),
        }),
        cellRenderer: (params: ICellRendererParams) => (
          <div className="py-1">
            <div className="font-medium">{params.value}</div>
          </div>
        ),
        filterParams: {
          values: (_params: any) => getUniqueValues('name'),
        },
      },
      {
        headerName: 'מק"ט יצרן',
        field: 'manufacturerPN',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 140,
        editable: true,
        cellEditor: 'agTextCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מק"ט יצרן',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('manufacturerPN'),
        }),
        cellClass: 'font-mono text-sm',
        filterParams: {
          values: (_params: any) => getUniqueValues('manufacturerPN'),
        },
      },
      {
        headerName: 'פעולות',
        field: 'actions',
        sortable: false,
        filter: false,
        resizable: false,
        width: 180,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex gap-1 items-center justify-center">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(params.data)}
                className="h-8 w-8 p-0"
                title="צפה"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(params.data)}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                title="שכפל"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(params.data)}
              className="h-8 w-8 p-0"
              title="ערוך"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(params.data.id, params.data.name)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
              title="מחק"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
      {
        headerName: 'קטגוריה',
        field: 'category',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 120,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: categories,
        },
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'קטגוריה',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('category'),
        }),
        cellRenderer: (params: ICellRendererParams) => (
          <Badge variant="secondary" className="text-xs">
            {params.value}
          </Badge>
        ),
        filterParams: {
          values: categories,
        },
      },
      {
        headerName: 'סוג',
        field: 'componentType',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 100,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['hardware', 'software', 'labor'],
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          logger.debug('💎 componentType valueSetter called:', {
            oldValue: params.oldValue,
            newValue: params.newValue,
          });
          if (params.newValue !== params.oldValue) {
            params.data.componentType = params.newValue;
            handleCellEdit(params);
          }
          return true;
        },
        valueFormatter: (params: any) => {
          const type = params.value;
          return type === 'hardware'
            ? 'חומרה'
            : type === 'software'
              ? 'תוכנה'
              : type === 'labor'
                ? 'עבודה'
                : '';
        },
        cellStyle: (params: any) => {
          const type = params.data?.componentType;
          return {
            backgroundColor:
              type === 'hardware'
                ? '#e3f2fd'
                : type === 'software'
                  ? '#e8f5e9'
                  : type === 'labor'
                    ? '#fff3e0'
                    : 'white',
            fontWeight: '500',
          };
        },
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'סוג',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: ['hardware', 'software', 'labor'],
        }),
        filterParams: {
          values: ['hardware', 'software', 'labor'],
          valueFormatter: (params: any) => {
            const type = params.value;
            return type === 'hardware'
              ? 'חומרה'
              : type === 'software'
                ? 'תוכנה'
                : type === 'labor'
                  ? 'עבודה'
                  : '';
          },
        },
      },
      {
        headerName: 'סוג עבודה',
        field: 'laborSubtype',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 120,
        editable: (params: any) => params.data?.componentType === 'labor',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['engineering', 'commissioning', 'installation'],
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          if (
            params.data?.componentType === 'labor' &&
            params.newValue !== params.oldValue
          ) {
            params.data.laborSubtype = params.newValue;
            handleCellEdit(params);
          }
          return true;
        },
        valueFormatter: (params: any) => {
          if (params.data?.componentType !== 'labor') return '';
          const subtype = params.value;
          return subtype === 'engineering'
            ? 'פיתוח והנדסה'
            : subtype === 'commissioning'
              ? 'הרצה'
              : subtype === 'installation'
                ? 'התקנה'
                : '';
        },
        cellStyle: (params: any) => {
          if (params.data?.componentType !== 'labor') {
            return {
              backgroundColor: '#f5f5f5',
              color: '#aaa',
              fontWeight: 'normal',
            };
          }
          return {
            fontWeight: '500',
            backgroundColor: 'transparent',
            color: 'inherit',
          };
        },
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'סוג עבודה',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: ['engineering', 'commissioning', 'installation'],
        }),
        filterParams: {
          values: ['engineering', 'commissioning', 'installation'],
          valueFormatter: (params: any) => {
            const subtype = params.value;
            return subtype === 'engineering'
              ? 'פיתוח והנדסה'
              : subtype === 'commissioning'
                ? 'הרצה'
                : subtype === 'installation'
                  ? 'התקנה'
                  : '';
          },
        },
      },
      {
        headerName: 'מחיר באירו',
        field: 'unitCostEUR',
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        width: 120,
        type: 'numericColumn',
        editable: true,
        cellEditor: 'agNumberCellEditor',
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מחיר באירו',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          filterType: 'number',
        }),
        valueFormatter: (params: any) => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
          }).format(params.value || 0);
        },
        cellClass: 'font-semibold text-purple-600',
        filterParams: {
          buttons: ['reset'],
        },
      },
      {
        headerName: 'מטבע',
        field: 'currency',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 80,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['NIS', 'USD', 'EUR'],
        },
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'מטבע',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('currency'),
        }),
        cellRenderer: (params: ICellRendererParams) => (
          <Badge variant="outline" className="text-xs">
            {params.value}
          </Badge>
        ),
        filterParams: {
          values: ['NIS', 'USD', 'EUR'],
        },
      },
      {
        headerName: 'תיאור',
        field: 'description',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 200,
        editable: true,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'תיאור',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('description'),
        }),
        filterParams: {
          values: (_params: any) => getUniqueValues('description'),
        },
      },
      {
        headerName: 'הערות',
        field: 'notes',
        sortable: true,
        filter: 'agSetColumnFilter',
        resizable: true,
        width: 150,
        editable: true,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        onCellValueChanged: handleCellEdit,
        headerComponent: CustomHeader,
        headerComponentParams: (params: any) => ({
          displayName: 'הערות',
          onMenuClick: handleColumnMenuClick,
          onFilterClick: handleFilterClick,
          api: params.api,
          columnApi: params.columnApi,
          column: params.column,
          uniqueValues: getUniqueValues('notes'),
        }),
        filterParams: {
          values: (_params: any) => getUniqueValues('notes'),
        },
      },
    ],
    [
      categories,
      getUniqueValues,
      handleCellEdit,
      onEdit,
      onDelete,
      onView,
      onDuplicate,
    ]
  );

  // Filter and reorder columns based on config
  const visibleColumnDefs = useMemo(() => {
    // First filter by visibility, then reorder
    const visible = columnDefs.filter(col =>
      config.visibleColumns.includes(col.field!)
    );

    // Reorder according to config.columnOrder
    const ordered = config.columnOrder
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

    // Reverse the order because AG Grid with RTL will reverse it again
    return withSavedWidths.reverse();
  }, [
    columnDefs,
    config.visibleColumns,
    config.columnOrder,
    config.columnWidths,
  ]);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      wrapText: true,
      autoHeight: false, // Disable auto-height for smaller rows
      editable: false, // Disable inline editing - use the form modal instead
      headerClass: 'ag-header-cell-label-right',
      cellClass: 'ag-rtl',
      minWidth: 100,
    }),
    []
  );

  // Toggle column visibility
  const toggleColumn = useCallback(
    (field: string) => {
      const newVisibleColumns = config.visibleColumns.includes(field)
        ? config.visibleColumns.filter(col => col !== field)
        : [...config.visibleColumns, field];

      saveConfig({ visibleColumns: newVisibleColumns });
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

  const onGridReady = useCallback(
    (params: any) => {
      // Widths are already applied via columnDefs in visibleColumnDefs
      // No need to re-apply them here as it causes a flash
      console.log(
        '[EnhancedComponentGrid] onGridReady - widths already in columnDefs'
      );

      // Apply saved filter state
      if (Object.keys(config.filterState).length > 0 && params.api) {
        params.api.setFilterModel(config.filterState);
      }
    },
    [config.filterState]
  );

  const onFirstDataRendered = useCallback((params: any) => {
    // DON'T call sizeColumnsToFit - let AG Grid use the default column widths
    console.log(
      '[EnhancedComponentGrid] onFirstDataRendered - using default/saved column widths'
    );
  }, []);

  // Handle column resize
  const onColumnResized = useCallback(
    (params: any) => {
      console.log(
        '[EnhancedComponentGrid] onColumnResized - source:',
        params.source,
        'finished:',
        params.finished
      );

      // ONLY save if this was a user drag - ignore all automatic resizes
      // User drags have source: 'uiColumnDragged' or 'uiColumnResized'
      const isUserResize =
        params.source === 'uiColumnResized' ||
        params.source === 'uiColumnDragged';

      if (params.finished && params.api && isUserResize) {
        const widths: Record<string, number> = {};
        const columns = params.api.getAllDisplayedColumns();
        columns?.forEach((col: any) => {
          widths[col.getColId()] = col.getActualWidth();
        });

        console.log(
          '[EnhancedComponentGrid] User resized column, saving widths:',
          widths
        );
        saveConfig({ columnWidths: widths });
      } else {
        console.log(
          '[EnhancedComponentGrid] Ignoring automatic resize, source:',
          params.source
        );
      }
    },
    [saveConfig]
  );

  // Handle column move
  const onColumnMoved = useCallback(
    (params: any) => {
      if (params.finished && params.api) {
        const displayedOrder =
          params.api
            .getAllDisplayedColumns()
            ?.map((col: any) => col.getColId()) || [];
        // Reverse the order because AG Grid shows it reversed in RTL mode
        const actualOrder = [...displayedOrder].reverse();
        saveConfig({ columnOrder: actualOrder });
      }
    },
    [saveConfig]
  );

  // Handle filter change
  const onFilterChanged = useCallback(
    (params: any) => {
      saveConfig({ filterState: params.api.getFilterModel() });
    },
    [saveConfig]
  );

  // Handle cell click to open component card (except for actions column)
  const onCellClicked = useCallback(
    (params: any) => {
      // Don't open form if clicking on the actions column
      if (params.colDef.field === 'actions') return;

      if (params.data && onEdit) {
        onEdit(params.data);
      }
    },
    [onEdit]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading table configuration...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Column Management */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              setShowColumnManager(!showColumnManager);
            }}
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
                  onClick={e => {
                    e.stopPropagation();
                    saveConfig({
                      visibleColumns: [
                        'actions',
                        'manufacturerPN',
                        'name',
                        'manufacturer',
                        'supplier',
                        'category',
                        'componentType',
                        'unitCostNIS',
                        'unitCostUSD',
                        'quoteDate',
                      ],
                      columnOrder: [
                        'description',
                        'notes',
                        'quoteDate',
                        'currency',
                        'unitCostEUR',
                        'unitCostUSD',
                        'unitCostNIS',
                        'componentType',
                        'category',
                        'supplier',
                        'manufacturer',
                        'name',
                        'manufacturerPN',
                        'actions',
                      ],
                    });
                  }}
                >
                  אפס להגדרות ברירת מחדל
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={e => {
                    e.stopPropagation();
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
                  onClick={e => {
                    e.stopPropagation();
                    saveConfig({ visibleColumns: ['name', 'actions'] });
                  }}
                >
                  מינימלי
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div
        className="ag-theme-alpine"
        style={{ height: '600px', width: '100%' }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={components}
          columnDefs={visibleColumnDefs}
          defaultColDef={defaultColDef}
          enableRtl={true}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
          onColumnResized={onColumnResized}
          onColumnMoved={onColumnMoved}
          onFilterChanged={onFilterChanged}
          onCellClicked={onCellClicked}
          rowSelection="single"
          animateRows={true}
          pagination={true}
          paginationPageSize={preferences.itemsPerPage}
          paginationPageSizeSelector={[25, 50, 100]}
          enableCellTextSelection={true}
          localeText={{
            page: 'עמוד',
            more: 'עוד',
            to: 'עד',
            of: 'מתוך',
            next: 'הבא',
            last: 'אחרון',
            first: 'ראשון',
            previous: 'קודם',
            loadingOoo: 'טוען...',
            selectAll: 'בחר הכל',
            searchOoo: 'חיפוש...',
            blanks: 'ריק',
            filterOoo: 'סינון...',
            applyFilter: 'החל סינון',
            equals: 'שווה ל',
            notEqual: 'לא שווה ל',
            lessThan: 'קטן מ',
            greaterThan: 'גדול מ',
            lessThanOrEqual: 'קטן או שווה ל',
            greaterThanOrEqual: 'גדול או שווה ל',
            inRange: 'בטווח',
            contains: 'מכיל',
            notContains: 'לא מכיל',
            startsWith: 'מתחיל ב',
            endsWith: 'מסתיים ב',
            andCondition: 'וגם',
            orCondition: 'או',
            group: 'קבוצה',
            columns: 'עמודות',
            filters: 'סינונים',
            pivotMode: 'מצב פיבוט',
            rowGroupColumns: 'עמודות קיבוץ שורות',
            pivotColumns: 'עמודות פיבוט',
            valueColumns: 'עמודות ערך',
            pivotPanel: 'פאנל פיבוט',
          }}
        />
      </div>
    </div>
  );
}
