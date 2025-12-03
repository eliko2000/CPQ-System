import { useCallback, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { Button } from '../ui/button';
import { Settings, ChevronDown } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTableConfig } from '../../hooks/useTableConfig';
import { logger } from '@/lib/logger';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface QuotationItemsGridProps {
  gridData: any[];
  columnDefs: ColDef[];
  autoGroupColumnDef: any;
  gridOptions: any;
  onGridReady: (params: any) => void;
  onColumnResized: (params: any) => void;
  onColumnMoved: (params: any) => void;
  onFilterChanged: (params: any) => void;
  onCellValueChanged: (params: any) => void;
  onCellDoubleClicked: (params: any) => void;
  onSelectionChanged: (params: any) => void;
  onAddSystem: () => void;
}

export function QuotationItemsGrid({
  gridData,
  columnDefs,
  autoGroupColumnDef,
  gridOptions,
  onGridReady,
  onColumnResized,
  onColumnMoved,
  onFilterChanged,
  onCellValueChanged,
  onCellDoubleClicked,
  onSelectionChanged,
  onAddSystem,
}: QuotationItemsGridProps) {
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Use table configuration hook
  const { config, saveConfig, loading } = useTableConfig('quotation_editor', {
    columnOrder: [
      'actions',
      'displayNumber',
      'componentName',
      'itemType',
      'laborSubtype',
      'quantity',
      'unitPriceILS',
      'totalPriceUSD',
      'totalPriceILS',
      'customerPriceILS',
    ],
    columnWidths: {},
    visibleColumns: [
      'actions',
      'displayNumber',
      'componentName',
      'itemType',
      'laborSubtype',
      'quantity',
      'unitPriceILS',
      'totalPriceUSD',
      'totalPriceILS',
      'customerPriceILS',
    ],
    filterState: {},
  });

  logger.debug('🔍 QuotationItemsGrid config loaded:', config);

  // Close column manager when clicking outside
  const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
    setShowColumnManager(false);
  });

  // Filter and reorder columns based on config
  const visibleColumnDefs = useMemo(() => {
    // Default column order if not configured
    const defaultOrder = [
      'actions',
      'displayNumber',
      'componentName',
      'quantity',
      'unitPriceILS',
      'totalPriceUSD',
      'totalPriceILS',
      'customerPriceILS',
    ];

    logger.debug('🔍 config.visibleColumns:', config.visibleColumns);
    logger.debug('🔍 config.columnOrder:', config.columnOrder);

    // Use saved order if exists and not empty, otherwise use default
    const effectiveOrder =
      config.columnOrder && config.columnOrder.length > 0
        ? config.columnOrder
        : defaultOrder;

    // ALWAYS ensure 'actions' is in visibleColumns
    const ensuredVisibleColumns =
      config.visibleColumns && config.visibleColumns.length > 0
        ? config.visibleColumns.includes('actions')
          ? config.visibleColumns
          : ['actions', ...config.visibleColumns]
        : defaultOrder;

    logger.debug('🔍 ensuredVisibleColumns:', ensuredVisibleColumns);

    const visible = columnDefs.filter(col =>
      ensuredVisibleColumns.includes(col.field!)
    );

    // If filtering results in no columns, fall back to all columns
    if (visible.length === 0) {
      return columnDefs;
    }

    const ordered = effectiveOrder
      .filter(fieldId => visible.some(col => col.field === fieldId))
      .map(fieldId => visible.find(col => col.field === fieldId)!);

    logger.debug('🔍 effectiveOrder was:', effectiveOrder);
    logger.debug(
      '🔍 Final ordered columns:',
      ordered.map(c => c.field)
    );

    // Apply saved column widths to prevent flash of default widths
    const withSavedWidths = ordered.map(col => {
      const savedWidth = config.columnWidths[col.field!];
      if (savedWidth) {
        return { ...col, width: savedWidth };
      }
      return col;
    });

    // AG Grid with enableRtl={true} does NOT reverse the array - just the visual layout
    // So we use the column order as-is
    return withSavedWidths.length > 0 ? withSavedWidths : visible;
  }, [
    columnDefs,
    config.visibleColumns,
    config.columnOrder,
    config.columnWidths,
  ]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading table configuration...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">פריטי הצעת מחיר</h3>

        <div className="flex items-center gap-3">
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
                    onClick={() =>
                      saveConfig({
                        visibleColumns: allColumns.map(col => col.field),
                      })
                    }
                  >
                    הצג הכל
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      saveConfig({
                        visibleColumns: [
                          'displayNumber',
                          'componentName',
                          'actions',
                        ],
                      })
                    }
                  >
                    מינימלי
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Add System Button */}
          <Button
            onClick={onAddSystem}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            הוסף מערכת
          </Button>
        </div>
      </div>

      <div className="h-96">
        <AgGridReact
          rowData={gridData}
          columnDefs={visibleColumnDefs}
          autoGroupColumnDef={autoGroupColumnDef}
          gridOptions={gridOptions}
          enableRtl={true}
          onGridReady={onGridReady}
          onColumnResized={onColumnResized}
          onColumnMoved={onColumnMoved}
          onFilterChanged={onFilterChanged}
          onCellValueChanged={onCellValueChanged}
          onCellDoubleClicked={onCellDoubleClicked}
          onSelectionChanged={onSelectionChanged}
          groupDefaultExpanded={1}
          className="ag-theme-alpine"
        />
      </div>
    </div>
  );
}
