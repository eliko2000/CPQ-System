import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Column } from 'ag-grid-community';
import { MoreVertical, Filter } from 'lucide-react';
import { SmartFilter } from './SmartFilter';
import { DateFilter } from './DateFilter';
import { NumberFilter } from './NumberFilter';
import { logger } from '@/lib/logger';

interface CustomHeaderProps {
  displayName: string;
  column: Column;
  api?: any;
  columnApi?: any;
  onMenuClick?: (column: string, event: React.MouseEvent) => void;
  onFilterClick?: (column: string, event: React.MouseEvent) => void;
  isFilterActive?: boolean;
  uniqueValues?: string[];
  filterType?: 'text' | 'number' | 'date';
  // Custom callback for external filter handling (e.g., source-level filtering)
  onCustomFilterChange?: (selectedValues: string[]) => void;
}

export function CustomHeader(props: CustomHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
  const [currentFilterValues, setCurrentFilterValues] = useState<string[]>([]);
  const [internalFilterActive, setInternalFilterActive] = useState(false);
  // Use prop if provided, otherwise use internal state
  const isFilterActive = props.isFilterActive ?? internalFilterActive;
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync filter state with grid filter model
  useEffect(() => {
    if (props.api) {
      const colId = props.column.getColId();
      props.api
        .getColumnFilterInstance(colId)
        .then((filterInstance: any) => {
          if (filterInstance) {
            const model = filterInstance.getModel();
            const active = filterInstance.isFilterActive();

            setInternalFilterActive(active);

            if (model && model.values && Array.isArray(model.values)) {
              setCurrentFilterValues(model.values);
            } else {
              setCurrentFilterValues([]);
            }
          }
        })
        .catch((error: any) => {
          logger.error('Error syncing filter state:', error);
        });
    }
  }, [props.api, props.column]);

  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }

    setShowMenu(!showMenu);
    if (props.onMenuClick) {
      props.onMenuClick(props.column.getColId(), event);
    }
  };

  const handleFilterClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (!showFilter && filterRef.current) {
      const rect = filterRef.current.getBoundingClientRect();
      setFilterPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }

    setShowFilter(!showFilter);
    if (props.onFilterClick) {
      props.onFilterClick(props.column.getColId(), event);
    }
  };

  const handleFilterChange = (filterModel: any) => {
    // If custom filter handler is provided, use it instead of AG Grid's filter
    if (props.onCustomFilterChange) {
      if (
        filterModel === null ||
        (Array.isArray(filterModel) && filterModel.length === 0)
      ) {
        props.onCustomFilterChange([]);
        setCurrentFilterValues([]);
      } else if (Array.isArray(filterModel)) {
        props.onCustomFilterChange(filterModel);
        setCurrentFilterValues(filterModel);
      }
      setShowFilter(false);
      return;
    }

    // Apply filter to the column using AG-Grid's filter API
    if (props.api) {
      const colId = props.column.getColId();

      if (
        filterModel === null ||
        (Array.isArray(filterModel) && filterModel.length === 0)
      ) {
        // Remove filter
        props.api
          .getColumnFilterInstance(colId)
          .then(async (filterInstance: any) => {
            if (filterInstance) {
              await filterInstance.setModel(null);
              props.api.onFilterChanged();
              setInternalFilterActive(false);
            }
          });
        setCurrentFilterValues([]);
      } else if (Array.isArray(filterModel)) {
        // Set filter for text columns (SmartFilter) using agSetColumnFilter
        setCurrentFilterValues(filterModel);

        // Use async/await properly to ensure filter is applied before triggering change
        (async () => {
          try {
            const filterInstance =
              await props.api.getColumnFilterInstance(colId);
            if (filterInstance) {
              const filterTypeName = filterInstance.constructor?.name;
              logger.debug(
                `[CustomHeader] Filter instance type:`,
                filterTypeName
              );

              // CRITICAL VALIDATION: Ensure filter type matches expectations
              // This prevents the bug where SetFilter format was used with TextFilter
              if (
                filterTypeName !== 'SetFilter' &&
                filterTypeName !== 'TextFilter' &&
                filterTypeName !== 'SetFloatingFilter'
              ) {
                logger.warn(
                  `[CustomHeader] Unexpected filter type "${filterTypeName}" for column ${colId}. ` +
                    `Expected TextFilter (Community) or SetFilter (Enterprise). ` +
                    `Filter may not work correctly.`
                );
              }

              let model: any;

              // Handle different filter types
              if (
                filterTypeName === 'SetFilter' ||
                filterTypeName === 'SetFloatingFilter'
              ) {
                // Enterprise agSetColumnFilter format: { values: ['a', 'b'] }
                const stringValues = filterModel.map(v => String(v));
                model = { values: stringValues };

                logger.debug(
                  `[CustomHeader] Using SetFilter (Enterprise) format for ${colId}`
                );
              } else {
                // Community TextFilter format: Use 'equals' operator with multiple conditions
                // For multiple values, we need to use OR conditions
                const stringValues = filterModel.map(v => String(v));

                logger.debug(
                  `[CustomHeader] Using TextFilter (Community) format for ${colId}`
                );

                if (stringValues.length === 1) {
                  // Single value: simple equals filter
                  model = {
                    filterType: 'text',
                    type: 'equals',
                    filter: stringValues[0],
                  };
                } else {
                  // Multiple values: use OR condition
                  model = {
                    filterType: 'text',
                    operator: 'OR',
                    conditions: stringValues.map(value => ({
                      filterType: 'text',
                      type: 'equals',
                      filter: value,
                    })),
                  };
                }
              }

              logger.debug(
                `[CustomHeader] Setting filter for ${colId}:`,
                model
              );

              // setModel returns a promise, await it
              const result = filterInstance.setModel(model);
              if (result && typeof result.then === 'function') {
                await result;
              }

              logger.debug(
                `[CustomHeader] Filter model set, triggering onFilterChanged for ${colId}`
              );

              // Check if filterInstance has applyModel method (some AG Grid filters require this)
              if (typeof filterInstance.applyModel === 'function') {
                logger.debug(
                  `[CustomHeader] Calling applyModel() for ${colId}`
                );
                filterInstance.applyModel();
              }

              // Then trigger filter changed - this must happen AFTER setModel completes
              props.api.onFilterChanged();

              // Update filter active state
              setInternalFilterActive(true);

              // Verify the filter was actually set
              const verifyModel = filterInstance.getModel();
              const isActive = filterInstance.isFilterActive();
              logger.debug(`[CustomHeader] Filter verification for ${colId}:`, {
                modelSet: verifyModel,
                isActive: isActive,
                fullFilterModel: props.api.getFilterModel(),
              });

              logger.debug(
                `[CustomHeader] Filter applied successfully for ${colId}`
              );
            }
          } catch (error) {
            logger.error('[CustomHeader] Error setting filter:', error);
          }
        })();
      } else {
        // Set filter for date/number columns (custom filters)
        props.api.getColumnFilterInstance(colId).then((filterInstance: any) => {
          if (filterInstance) {
            filterInstance.setModel(filterModel);
            props.api.onFilterChanged();
          }
        });
      }
    }
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    if (props.api) {
      props.api.applyColumnState({
        state: [{ colId: props.column.getColId(), sort: direction }],
        defaultState: { sort: null },
      });
    }
    setShowMenu(false);
  };

  const handleAutoSizeAll = () => {
    if (props.api) {
      try {
        props.api.autoSizeAllColumns(false);

        // Ensure minimum widths for all columns
        setTimeout(() => {
          const columnState = props.api?.getColumnState();
          columnState?.forEach((col: any) => {
            const column = props.columnApi?.getColumn(col.colId);
            if (column && column.getActualWidth() < 120) {
              props.columnApi?.setColumnWidth(col.colId, 120);
            }
          });
        }, 100);

        logger.debug('Auto-sized all columns');
      } catch (error) {
        logger.error('Error auto-sizing all columns:', error);
      }
    }
    setShowMenu(false);
  };

  return (
    // CRITICAL: Use calc(100% - 8px) to leave room for AG Grid's resize handle (8px wide)
    // Without this, the header content covers the resize handle and blocks column resizing
    <div
      className="flex items-center justify-between h-full px-2 group"
      style={{ width: 'calc(100% - 8px)' }}
    >
      {/* Column Title */}
      <div
        className="flex-1 text-right font-medium text-sm cursor-pointer select-none"
        onClick={() => {
          // Toggle sort on column title click
          if (props.api) {
            const currentState = props.api
              .getColumnState()
              .find((col: any) => col.colId === props.column.getColId())?.sort;
            const nextSort =
              currentState === 'asc'
                ? 'desc'
                : currentState === 'desc'
                  ? null
                  : 'asc';
            props.api.applyColumnState({
              state: [{ colId: props.column.getColId(), sort: nextSort }],
              defaultState: { sort: null },
            });
          }
        }}
      >
        {props.displayName}
      </div>

      {/* Action Icons - Always visible, right-aligned */}
      <div className="flex items-center gap-1 mr-2 transition-opacity">
        {/* Filter Icon */}
        <button
          ref={filterRef}
          type="button"
          onClick={handleFilterClick}
          className={`relative p-1 rounded hover:bg-muted transition-colors ${
            isFilterActive
              ? 'text-blue-600 bg-blue-50'
              : 'text-muted-foreground'
          }`}
          title={
            isFilterActive
              ? `סינון פעיל (${currentFilterValues.length} ערכים)`
              : 'סינון'
          }
        >
          <Filter className="h-3 w-3" />
          {isFilterActive && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-600 border border-white"></span>
          )}
        </button>

        {/* 3-Dot Menu */}
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleMenuClick}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
            title="תפריט"
          >
            <MoreVertical className="h-3 w-3" />
          </button>

          {/* Dropdown Menu - Portal */}
          {showMenu &&
            createPortal(
              <div
                ref={menuRef}
                className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[999999] min-w-[200px] flex flex-col"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  minWidth: '200px',
                  maxHeight: '400px',
                  zIndex: 999999,
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Scrollable Content - constrained height */}
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: 'calc(400px - 60px)' }}
                >
                  {/* Sort Options */}
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                    מיון
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSort('asc')}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <span>מיון בסדר עולה</span>
                    <span className="text-muted-foreground text-xs">↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort('desc')}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <span>מיון בסדר יורד</span>
                    <span className="text-muted-foreground text-xs">↓</span>
                  </button>

                  {/* Size Options */}
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b mt-1">
                    גודל עמודות
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoSizeAll}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors"
                  >
                    התאם את כל העמודות
                  </button>
                </div>

                {/* Fixed Bottom Section - always visible */}
                <div className="border-t flex-shrink-0 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      if (props.api) {
                        props.api.resetColumnState();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-right text-sm hover:bg-muted transition-colors text-orange-600"
                  >
                    אפס עמודות
                  </button>
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>

      {/* Filter Portal */}
      {showFilter &&
        createPortal(
          <>
            {/* Text Filter (SmartFilter) */}
            {(!props.filterType || props.filterType === 'text') && (
              <SmartFilter
                values={props.uniqueValues || []}
                selectedValues={currentFilterValues}
                onFilterChange={handleFilterChange}
                onClose={() => setShowFilter(false)}
                title={props.displayName}
                position={filterPosition}
              />
            )}

            {/* Date Filter */}
            {props.filterType === 'date' &&
              (() => {
                let currentFilter = null;
                if (props.api) {
                  props.api
                    .getColumnFilterInstance(props.column.getColId())
                    .then((filterInstance: any) => {
                      if (filterInstance) {
                        currentFilter = filterInstance.getModel();
                      }
                    });
                }
                return (
                  <DateFilter
                    onFilterChange={handleFilterChange}
                    onClose={() => setShowFilter(false)}
                    title={props.displayName}
                    position={filterPosition}
                    currentFilter={currentFilter}
                  />
                );
              })()}

            {/* Number Filter */}
            {props.filterType === 'number' &&
              (() => {
                let currentFilter = null;
                if (props.api) {
                  props.api
                    .getColumnFilterInstance(props.column.getColId())
                    .then((filterInstance: any) => {
                      if (filterInstance) {
                        currentFilter = filterInstance.getModel();
                      }
                    });
                }
                return (
                  <NumberFilter
                    onFilterChange={handleFilterChange}
                    onClose={() => setShowFilter(false)}
                    title={props.displayName}
                    position={filterPosition}
                    currentFilter={currentFilter}
                  />
                );
              })()}
          </>,
          document.body
        )}
    </div>
  );
}
