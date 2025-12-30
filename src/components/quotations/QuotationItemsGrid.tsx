import { useCallback, useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import { Button } from '../ui/button';
import { Settings, ChevronDown } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTableConfig } from '../../hooks/useTableConfig';
import { logger } from '@/lib/logger';
import { SelectionCheckboxRenderer } from '../grid/SelectionCheckboxRenderer';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface QuotationItemsGridProps {
  gridRef: React.RefObject<AgGridReact>;
  gridData: any[];
  columnDefs: ColDef[];
  onCellValueChanged: (params: any) => void;
  onCellDoubleClicked: (params: any) => void;
  onSelectionChanged: (params: any) => void;
  onAddSystem: () => void;
  onAddItemToSystem: (systemId: string) => void;
  selection: any; // useGridSelection return type
}

export function QuotationItemsGrid({
  gridRef,
  gridData,
  columnDefs,
  onCellValueChanged,
  onCellDoubleClicked,
  onSelectionChanged,
  onAddSystem,
  onAddItemToSystem,
  selection,
}: QuotationItemsGridProps) {
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Use table configuration hook
  const { config, saveConfig, loading } = useTableConfig('quotation_editor', {
    columnOrder: [
      'selection',
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
      'selection',
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

  // Removed debug logging to reduce re-renders
  // logger.debug('🔍 QuotationItemsGrid config loaded:', config);

  // Close column manager when clicking outside
  const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
    setShowColumnManager(false);
  });

  // Filter and reorder columns based on config
  const visibleColumnDefs = useMemo(() => {
    // Default column order if not configured
    const defaultOrder = [
      'selection',
      'displayNumber',
      'componentName',
      'quantity',
      'unitPriceILS',
      'totalPriceUSD',
      'totalPriceILS',
      'customerPriceILS',
    ];

    // Removed debug logging to reduce re-renders
    // logger.debug('🔍 config.visibleColumns:', config.visibleColumns);
    // logger.debug('🔍 config.columnOrder:', config.columnOrder);

    // Use saved order if exists and not empty, otherwise use default
    const effectiveOrder =
      config.columnOrder && config.columnOrder.length > 0
        ? config.columnOrder
        : defaultOrder;

    // ALWAYS ensure 'selection' is in visibleColumns
    const ensuredVisibleColumns =
      config.visibleColumns && config.visibleColumns.length > 0
        ? config.visibleColumns.includes('selection')
          ? config.visibleColumns
          : ['selection', ...config.visibleColumns]
        : defaultOrder;

    // Removed debug logging to reduce re-renders
    // logger.debug('🔍 ensuredVisibleColumns:', ensuredVisibleColumns);

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

    // Removed debug logging to reduce re-renders
    // logger.debug('🔍 effectiveOrder was:', effectiveOrder);
    // logger.debug(
    //   '🔍 Final ordered columns:',
    //   ordered.map(c => c.field)
    // );

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

  // Memoized defaultColDef to ensure stable reference and proper AG Grid behavior
  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      cellClass: 'text-right',
      minWidth: 80,
    }),
    []
  );

  // Internal grid event handlers - all table config is managed HERE, not in parent
  const handleGridReady = useCallback(
    (params: any) => {
      if (!params.api) return;

      // Apply saved filter state
      if (config.filterState && Object.keys(config.filterState).length > 0) {
        params.api.setFilterModel(config.filterState);
      }
    },
    [config.filterState]
  );

  const handleColumnResized = useCallback(
    (params: any) => {
      // ONLY save if this was a user drag - ignore all automatic resizes
      const isUserResize =
        params.source === 'uiColumnResized' ||
        params.source === 'uiColumnDragged';

      if (params.finished && isUserResize && params.api) {
        const widths: Record<string, number> = {};
        params.api.getAllDisplayedColumns()?.forEach((col: any) => {
          widths[col.getColId()] = col.getActualWidth();
        });
        saveConfig({ columnWidths: widths });
      }
    },
    [saveConfig]
  );

  const handleColumnMoved = useCallback(
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
        saveConfig({ columnOrder: displayedOrder });
      }
    },
    [saveConfig]
  );

  const handleFilterChanged = useCallback(
    (params: any) => {
      saveConfig({ filterState: params.api.getFilterModel() });
    },
    [saveConfig]
  );

  // Store grid API reference for use in mouse down handler
  const gridApiRef = useRef<any>(null);

  // Check if a cell should be editable (system names, custom items, labor)
  const isCellEditable = useCallback((data: any) => {
    return (
      data?.isSystemGroup || data?.isCustomItem || data?.itemType === 'labor'
    );
  }, []);

  // Handle cell mouse down to start editing for editable cells
  // Using mousedown instead of click because it fires earlier and is more reliable
  // when AG Grid is re-rendering frequently
  const handleCellMouseDown = useCallback(
    (params: any) => {
      const { colDef, data, node, api } = params;

      // Store the API reference
      gridApiRef.current = api;

      // Only handle clicks on the componentName column
      if (colDef?.field !== 'componentName') {
        return;
      }

      // Debug: Log data flags for troubleshooting
      console.log('[QuotationItemsGrid] Cell clicked:', {
        componentName: data?.componentName,
        isSystemGroup: data?.isSystemGroup,
        isCustomItem: data?.isCustomItem,
        itemType: data?.itemType,
        isEditable: isCellEditable(data),
      });

      // Check if this cell should be editable
      if (
        isCellEditable(data) &&
        node?.rowIndex !== null &&
        node?.rowIndex !== undefined
      ) {
        console.log(
          '[QuotationItemsGrid] Mouse down on editable cell, will start edit for:',
          data?.componentName
        );
        // Use setTimeout to start editing after AG Grid processes the mousedown
        setTimeout(() => {
          if (gridApiRef.current) {
            console.log(
              '[QuotationItemsGrid] Starting edit for row:',
              node.rowIndex
            );
            gridApiRef.current.startEditingCell({
              rowIndex: node.rowIndex,
              colKey: 'componentName',
            });
          }
        }, 0);
      }
    },
    [isCellEditable]
  );

  // Intercept double-click to prevent editing on non-editable cells
  const handleCellDoubleClick = useCallback(
    (params: any) => {
      const { colDef, data } = params;

      // For componentName column, only allow double-click editing for editable rows
      if (colDef?.field === 'componentName' && !isCellEditable(data)) {
        // Stop the editing from happening
        params.api?.stopEditing(true);
        return;
      }

      // For other columns or editable rows, call the parent handler
      onCellDoubleClicked?.(params);
    },
    [isCellEditable, onCellDoubleClicked]
  );

  // Only wait for config to load - don't block on columnWidths
  // This allows the grid to render immediately and users can resize columns
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
            onClick={e => {
              e.stopPropagation();
              logger.debug('🟢 Add System button clicked', {
                onAddSystem: typeof onAddSystem,
              });

              if (typeof onAddSystem !== 'function') {
                logger.error('❌ onAddSystem is not a function!');
                alert('שגיאה: הפונקציה להוספת מערכת לא זמינה');
                return;
              }

              onAddSystem();
            }}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            הוסף מערכת
          </Button>
        </div>
      </div>

      <div
        className="ag-theme-alpine cpq-quotation-grid"
        style={{ height: '400px', width: '100%' }}
      >
        <style>{`
          /* ClickUp-style: Checkbox OUTSIDE table - completely transparent */
          .cpq-quotation-grid .ag-pinned-right-cols-container {
            background: transparent !important;
            border: none !important;
            margin-left: 0 !important;
            padding-left: 0 !important;
          }

          .cpq-quotation-grid .ag-pinned-right-header {
            background: transparent !important;
            border: none !important;
            margin-left: 0 !important;
          }

          .cpq-quotation-grid .ag-cell[col-id="selection"] {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }

          /* Show checkbox on row hover - overrides inline style */
          .cpq-quotation-grid .ag-row:hover .checkbox-hover-target,
          .cpq-quotation-grid .ag-row-hover .checkbox-hover-target {
            opacity: 1 !important;
          }

          /* CRITICAL: Show checkbox for selected rows even when not hovering */
          .cpq-quotation-grid .ag-row.row-selected .checkbox-hover-target {
            opacity: 1 !important;
          }

          /* Row highlighting when selected - light blue */
          .cpq-quotation-grid .ag-row.row-selected {
            background-color: #eff6ff !important;
          }

          /* Remove focus ring from checkbox (but keep border for visibility) */
          .cpq-quotation-grid .ag-cell[col-id="selection"] button {
            outline: none !important;
            box-shadow: none !important;
          }

          .cpq-quotation-grid .ag-cell[col-id="selection"] button:focus {
            outline: none !important;
            box-shadow: none !important;
            ring: 0 !important;
          }

          /* Remove blue border from AG Grid cell focus */
          .cpq-quotation-grid .ag-cell[col-id="selection"]:focus,
          .cpq-quotation-grid .ag-cell[col-id="selection"].ag-cell-focus,
          .cpq-quotation-grid .ag-cell[col-id="selection"]:focus-within {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* System number button: hide number text and show + icon on hover */
          .cpq-quotation-grid .ag-row:hover .system-number-btn .number-text,
          .cpq-quotation-grid .ag-row-hover .system-number-btn .number-text {
            display: none !important;
          }

          .cpq-quotation-grid .ag-row:hover .system-number-btn .plus-icon,
          .cpq-quotation-grid .ag-row-hover .system-number-btn .plus-icon {
            display: inline-flex !important;
          }

          /* Ensure system number button is always clickable */
          .cpq-quotation-grid .system-number-btn {
            pointer-events: auto !important;
            cursor: pointer !important;
          }

          /* Prevent displayNumber cell from blocking clicks */
          .cpq-quotation-grid .ag-cell[col-id="displayNumber"] {
            overflow: visible !important;
            z-index: 1 !important;
          }
        `}</style>
        <AgGridReact
          ref={gridRef}
          rowData={gridData}
          columnDefs={visibleColumnDefs}
          defaultColDef={defaultColDef}
          context={{ onAddItemToSystem }}
          components={{ SelectionCheckboxRenderer }}
          enableRtl={true}
          suppressRowClickSelection={true}
          rowSelection="multiple"
          getRowClass={params => {
            const isSelected = selection.isSelected(params.data?.id);
            return isSelected ? 'row-selected' : '';
          }}
          onGridReady={handleGridReady}
          onColumnResized={handleColumnResized}
          onColumnMoved={handleColumnMoved}
          onFilterChanged={handleFilterChanged}
          onCellValueChanged={onCellValueChanged}
          onCellDoubleClicked={handleCellDoubleClick}
          onCellMouseDown={handleCellMouseDown}
          onSelectionChanged={onSelectionChanged}
          animateRows={true}
          singleClickEdit={false}
          enableCellTextSelection={true}
          stopEditingWhenCellsLoseFocus={true}
        />
      </div>
    </div>
  );
}
