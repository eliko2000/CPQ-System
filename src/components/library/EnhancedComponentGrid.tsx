import React, { useMemo, useRef, useState, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, ICellRendererParams, ValueGetterParams, ValueSetterParams, IFilterParams } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Edit, Trash2, Eye, Settings, ChevronDown, Search, X } from 'lucide-react'
import { Component } from '../../types'
import { useClickOutside } from '../../hooks/useClickOutside'

// Unified categories for both form and grid
const UNIFIED_CATEGORIES = [
  'בקרים (PLCs)',
  'חיישנים',
  'אקטואטורים',
  'מנועים',
  'בקרים',
  'ספקי כוח',
  'תקשורת',
  'בטיחות',
  'מכני',
  'כבלים ומחברים',
  'אחר'
]

// Default product types for dropdown
const DEFAULT_PRODUCT_TYPES = [
  'שסתומים',
  'חיישנים',
  'מנועים',
  'בקרים',
  'כבלים ומחברים',
  'ערכות הרכבה',
  'רכיבים מכניים',
  'מקורות כוח',
  'תקשורת',
  'בטיחות',
  'אחר'
]


interface EnhancedComponentGridProps {
  components: Component[]
  onEdit: (component: Component) => void
  onDelete: (componentId: string, componentName: string) => void
  onView?: (component: Component) => void
  onComponentUpdate?: (componentId: string, field: string, value: any) => void
}

export function EnhancedComponentGrid({ 
  components, 
  onEdit, 
  onDelete, 
  onView, 
  onComponentUpdate 
}: EnhancedComponentGridProps) {
  const gridRef = useRef<AgGridReact>(null)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'name', 'manufacturer', 'manufacturerPN', 'category', 'productType', 
    'supplier', 'unitCostNIS', 'currency', 'quoteDate', 'actions'
  ]))
  const [showColumnManager, setShowColumnManager] = useState(false)

  // Close column manager when clicking outside
  const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
    setShowColumnManager(false)
  })

  // Get unique values for a specific field for filtering
  const getUniqueValues = useCallback((field: keyof Component): string[] => {
    const values = components.map(comp => String(comp[field] || '')).filter(Boolean)
    return Array.from(new Set(values)).sort()
  }, [components])

  // Handle inline editing
  const handleCellEdit = useCallback((params: ValueSetterParams) => {
    if (onComponentUpdate && params.data && params.newValue !== params.oldValue) {
      onComponentUpdate(params.data.id, params.colDef.field!, params.newValue)
    }
    return true
  }, [onComponentUpdate])

  // Column definitions with enhanced filtering and editing
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'שם רכיב',
      field: 'name',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 200,
      editable: true,
      cellEditor: 'agTextCellEditor',
      onCellValueChanged: handleCellEdit,
      cellRenderer: (params: ICellRendererParams) => (
        <div className="py-1">
          <div className="font-medium">{params.value}</div>
          {params.data.description && (
            <div className="text-sm text-muted-foreground">
              {params.data.description}
            </div>
          )}
        </div>
      ),
      filterParams: {
        values: getUniqueValues('name'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'יצרן',
      field: 'manufacturer',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 120,
      editable: true,
      cellEditor: 'agTextCellEditor',
      onCellValueChanged: handleCellEdit,
      filterParams: {
        values: getUniqueValues('manufacturer'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'מק"ט יצרן',
      field: 'manufacturerPN',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 140,
      editable: true,
      cellEditor: 'agTextCellEditor',
      onCellValueChanged: handleCellEdit,
      cellClass: 'font-mono text-sm',
      filterParams: {
        values: getUniqueValues('manufacturerPN'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'קטגוריה',
      field: 'category',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: UNIFIED_CATEGORIES
      },
      onCellValueChanged: handleCellEdit,
      cellRenderer: (params: ICellRendererParams) => (
        <Badge variant="secondary" className="text-xs">
          {params.value}
        </Badge>
      ),
      filterParams: {
        values: getUniqueValues('category'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'סוג מוצר',
      field: 'productType',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: DEFAULT_PRODUCT_TYPES
      },
      onCellValueChanged: handleCellEdit,
      valueGetter: (params: ValueGetterParams) => params.data.productType || '-',
      cellRenderer: (params: ICellRendererParams) => (
        <Badge variant="outline" className="text-xs">
          {params.value || '-'}
        </Badge>
      ),
      filterParams: {
        values: getUniqueValues('productType'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'ספק',
      field: 'supplier',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 120,
      editable: true,
      cellEditor: 'agTextCellEditor',
      onCellValueChanged: handleCellEdit,
      filterParams: {
        values: getUniqueValues('supplier'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'מחיר בש"ח',
      field: 'unitCostNIS',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 120,
      type: 'numericColumn',
      editable: true,
      cellEditor: 'agNumberCellEditor',
      onCellValueChanged: handleCellEdit,
      valueFormatter: (params: any) => {
        return new Intl.NumberFormat('he-IL', {
          style: 'currency',
          currency: 'ILS',
          minimumFractionDigits: 2
        }).format(params.value || 0)
      },
      cellClass: 'font-semibold text-green-600',
      filterParams: {
        buttons: ['reset']
      }
    },
    {
      headerName: 'מחיר בדולר',
      field: 'unitCostUSD',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 120,
      type: 'numericColumn',
      editable: true,
      cellEditor: 'agNumberCellEditor',
      onCellValueChanged: handleCellEdit,
      valueFormatter: (params: any) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(params.value || 0)
      },
      cellClass: 'font-semibold text-blue-600',
      filterParams: {
        buttons: ['reset']
      }
    },
    {
      headerName: 'מטבע',
      field: 'currency',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 80,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['NIS', 'USD', 'EUR']
      },
      onCellValueChanged: handleCellEdit,
      cellRenderer: (params: ICellRendererParams) => (
        <Badge variant="outline" className="text-xs">
          {params.value}
        </Badge>
      ),
      filterParams: {
        values: ['NIS', 'USD', 'EUR'],
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'תאריך הצעה',
      field: 'quoteDate',
      sortable: true,
      filter: 'agDateColumnFilter',
      resizable: true,
      minWidth: 120,
      editable: true,
      cellEditor: 'agDateStringCellEditor',
      onCellValueChanged: handleCellEdit,
      valueFormatter: (params: any) => {
        if (!params.value) return '-'
        return new Date(params.value).toLocaleDateString('he-IL')
      },
      filterParams: {
        buttons: ['reset']
      }
    },
    {
      headerName: 'תיאור',
      field: 'description',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 200,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      onCellValueChanged: handleCellEdit,
      filterParams: {
        values: getUniqueValues('description'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'הערות',
      field: 'notes',
      sortable: true,
      filter: 'agSetColumnFilter',
      resizable: true,
      minWidth: 150,
      editable: true,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      onCellValueChanged: handleCellEdit,
      filterParams: {
        values: getUniqueValues('notes'),
        suppressMiniFilter: true,
        buttons: ['reset']
      }
    },
    {
      headerName: 'פעולות',
      field: 'actions',
      sortable: false,
      filter: false,
      resizable: false,
      minWidth: 150,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams) => (
        <div className="flex gap-1">
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
      )
    }
  ], [getUniqueValues, handleCellEdit, onEdit, onDelete, onView])

  // Filter columns based on visibility
  const visibleColumnDefs = useMemo(() => {
    return columnDefs.filter(col => visibleColumns.has(col.field!))
  }, [columnDefs, visibleColumns])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    wrapText: true,
    autoHeight: true,
    headerClass: 'ag-header-cell-label-right',
    cellClass: 'ag-rtl'
  }), [])

  // Toggle column visibility
  const toggleColumn = useCallback((field: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(field)) {
        newSet.delete(field)
      } else {
        newSet.add(field)
      }
      return newSet
    })
  }, [])

  // Get all available columns for management
  const allColumns = useMemo(() => {
    return columnDefs.map(col => ({
      field: col.field!,
      headerName: col.headerName!,
      isVisible: visibleColumns.has(col.field!)
    }))
  }, [columnDefs, visibleColumns])

  const onGridReady = (params: any) => {
    params.api.sizeColumnsToFit()
  }

  const onFirstDataRendered = (params: any) => {
    params.api.sizeColumnsToFit()
  }

  return (
    <div className="space-y-4">
      {/* Column Management */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnManager(!showColumnManager)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            ניהול עמודות
            <ChevronDown className={`h-4 w-4 transition-transform ${showColumnManager ? 'rotate-180' : ''}`} />
          </Button>
          
          {showColumnManager && (
            <div ref={columnManagerRef} className="absolute top-full mt-2 right-0 bg-background border border-border rounded-md shadow-lg z-50 p-4 min-w-64">
              <h4 className="font-medium mb-3">בחר עמודות להצגה</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allColumns.map(col => (
                  <label key={col.field} className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-muted p-1 rounded">
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
                  onClick={() => setVisibleColumns(new Set(allColumns.map(col => col.field)))}
                >
                  הצג הכל
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVisibleColumns(new Set(['name', 'actions']))}
                >
                  מינימלי
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }} dir="rtl">
        <AgGridReact
          ref={gridRef}
          rowData={components}
          columnDefs={visibleColumnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
          rowSelection="single"
          animateRows={true}
          pagination={true}
          paginationPageSize={20}
          enableRangeSelection={true}
          enableFillHandle={true}
          enableCellTextSelection={true}
          sideBar={{
            toolPanels: [
              {
                id: 'columns',
                labelDefault: 'עמודות',
                labelKey: 'columns',
                iconKey: 'columns',
                toolPanel: 'agColumnsToolPanel',
              },
              {
                id: 'filters',
                labelDefault: 'סינונים',
                labelKey: 'filters',
                iconKey: 'filter',
                toolPanel: 'agFiltersToolPanel',
              }
            ]
          }}
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
            group: 'קבץ',
            columns: 'עמודות',
            filters: 'סינונים',
            pivotMode: 'מצב פיבוט',
            rowGroupColumns: 'עמודות קיבוץ שורות',
            pivotColumns: 'עמודות פיבוט',
            valueColumns: 'עמודות ערך',
            pivotPanel: 'פאנל פיבוט'
          }}
        />
      </div>
    </div>
  )
}
