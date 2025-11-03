import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Column } from 'ag-grid-community'
import { MoreVertical, Filter } from 'lucide-react'
import { SmartFilter } from './SmartFilter'
import { DateFilter } from './DateFilter'
import { NumberFilter } from './NumberFilter'

interface CustomHeaderProps {
  displayName: string
  column: Column
  api?: any
  columnApi?: any
  onMenuClick?: (column: string, event: React.MouseEvent) => void
  onFilterClick?: (column: string, event: React.MouseEvent) => void
  isFilterActive?: boolean
  uniqueValues?: string[]
  filterType?: 'text' | 'number' | 'date'
}

export function CustomHeader(props: CustomHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 })
  const [currentFilterValues, setCurrentFilterValues] = useState<string[]>([])
  const [isFilterActive, setIsFilterActive] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const filterRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Sync filter state with grid filter model
  useEffect(() => {
    if (props.api) {
      const colId = props.column.getColId()
      props.api.getColumnFilterInstance(colId).then((filterInstance: any) => {
        if (filterInstance) {
          const model = filterInstance.getModel()
          const active = filterInstance.isFilterActive()

          setIsFilterActive(active)

          if (model && model.values && Array.isArray(model.values)) {
            setCurrentFilterValues(model.values)
          } else {
            setCurrentFilterValues([])
          }
        }
      }).catch((error: any) => {
        console.error('Error syncing filter state:', error)
      })
    }
  }, [props.api, props.column])

  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      })
    }
    
    setShowMenu(!showMenu)
    if (props.onMenuClick) {
      props.onMenuClick(props.column.getColId(), event)
    }
  }

  const handleFilterClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!showFilter && filterRef.current) {
      const rect = filterRef.current.getBoundingClientRect()
      setFilterPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      })
    }
    
    setShowFilter(!showFilter)
    if (props.onFilterClick) {
      props.onFilterClick(props.column.getColId(), event)
    }
  }

  const handleFilterChange = (filterModel: any) => {
    // Apply filter to the column using AG-Grid's filter API
    if (props.api) {
      const colId = props.column.getColId()

      if (filterModel === null || (Array.isArray(filterModel) && filterModel.length === 0)) {
        // Remove filter
        props.api.getColumnFilterInstance(colId).then(async (filterInstance: any) => {
          if (filterInstance) {
            await filterInstance.setModel(null)
            props.api.onFilterChanged()
            setIsFilterActive(false)
          }
        })
        setCurrentFilterValues([])
      } else if (Array.isArray(filterModel)) {
        // Set filter for text columns (SmartFilter) using agSetColumnFilter
        setCurrentFilterValues(filterModel)

        props.api.getColumnFilterInstance(colId).then(async (filterInstance: any) => {
          if (filterInstance) {
            // AG-Grid agSetColumnFilter expects { values: ['a', 'b'] } format
            // Values should be strings
            const stringValues = filterModel.map(v => String(v))
            const model = { values: stringValues }

            // setModel returns a Promise, wait for it to complete
            await filterInstance.setModel(model)

            // Then trigger filter changed
            props.api.onFilterChanged()

            // Update filter active state
            setIsFilterActive(true)
          }
        }).catch((error: any) => {
          console.error('Error setting filter:', error)
        })
      } else {
        // Set filter for date/number columns (custom filters)
        props.api.getColumnFilterInstance(colId).then((filterInstance: any) => {
          if (filterInstance) {
            filterInstance.setModel(filterModel)
            props.api.onFilterChanged()
          }
        })
      }
    }
  }

  const handleSort = (direction: 'asc' | 'desc') => {
    if (props.api) {
      props.api.applyColumnState({
        state: [{ colId: props.column.getColId(), sort: direction }],
        defaultState: { sort: null }
      })
    }
    setShowMenu(false)
  }


  const handleAutoSizeAll = () => {
    if (props.api) {
      try {
        props.api.autoSizeAllColumns(false)
        
        // Ensure minimum widths for all columns
        setTimeout(() => {
          const columnState = props.api?.getColumnState()
          columnState?.forEach((col: any) => {
            const column = props.columnApi?.getColumn(col.colId)
            if (column && column.getActualWidth() < 120) {
              props.columnApi?.setColumnWidth(col.colId, 120)
            }
          })
        }, 100)
        
        console.log('Auto-sized all columns')
      } catch (error) {
        console.error('Error auto-sizing all columns:', error)
      }
    }
    setShowMenu(false)
  }

  return (
    <div className="flex items-center justify-between w-full h-full px-2 group">
      {/* Column Title */}
      <div 
        className="flex-1 text-right font-medium text-sm cursor-pointer select-none"
        onClick={() => {
          // Toggle sort on column title click
          if (props.api) {
            const currentState = props.api.getColumnState().find((col: any) => col.colId === props.column.getColId())?.sort
            const nextSort = currentState === 'asc' ? 'desc' : currentState === 'desc' ? null : 'asc'
            props.api.applyColumnState({
              state: [{ colId: props.column.getColId(), sort: nextSort }],
              defaultState: { sort: null }
            })
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
            isFilterActive ? 'text-blue-600 bg-blue-50' : 'text-muted-foreground'
          }`}
          title={isFilterActive ? `סינון פעיל (${currentFilterValues.length} ערכים)` : 'סינון'}
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
          {showMenu && createPortal(
            <div
              ref={menuRef}
              className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[999999] min-w-[200px] flex flex-col"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                minWidth: '200px',
                maxHeight: '400px',
                zIndex: 999999,
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scrollable Content - constrained height */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(400px - 60px)' }}>
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
                      props.api.resetColumnState()
                    }
                    setShowMenu(false)
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
      {showFilter && createPortal(
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
          {props.filterType === 'date' && (() => {
            let currentFilter = null
            if (props.api) {
              props.api.getColumnFilterInstance(props.column.getColId()).then((filterInstance: any) => {
                if (filterInstance) {
                  currentFilter = filterInstance.getModel()
                }
              })
            }
            return (
              <DateFilter
                onFilterChange={handleFilterChange}
                onClose={() => setShowFilter(false)}
                title={props.displayName}
                position={filterPosition}
                currentFilter={currentFilter}
              />
            )
          })()}

          {/* Number Filter */}
          {props.filterType === 'number' && (() => {
            let currentFilter = null
            if (props.api) {
              props.api.getColumnFilterInstance(props.column.getColId()).then((filterInstance: any) => {
                if (filterInstance) {
                  currentFilter = filterInstance.getModel()
                }
              })
            }
            return (
              <NumberFilter
                onFilterChange={handleFilterChange}
                onClose={() => setShowFilter(false)}
                title={props.displayName}
                position={filterPosition}
                currentFilter={currentFilter}
              />
            )
          })()}
        </>,
        document.body
      )}
    </div>
  )
}
