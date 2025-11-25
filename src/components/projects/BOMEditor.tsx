import { useRef, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, CellValueChangedEvent, RowDragEndEvent } from 'ag-grid-community'
import { useCPQ } from '../../contexts/CPQContext'
import { BOMLine } from '../../types'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Plus, Save, Calculator } from 'lucide-react'
import { logger } from '@/lib/logger'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// AG Grid Cell Renderers
const CurrencyRenderer = ({ value }: { value: number }) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0)
}

const PercentageRenderer = ({ value }: { value: number }) => {
  return `${value}%`
}

const StatusRenderer = ({ value }: { value: string }) => {
  const colors = {
    component: 'bg-blue-100 text-blue-800',
    assembly: 'bg-green-100 text-green-800',
    custom: 'bg-purple-100 text-purple-800',
  }

  return (
    <Badge className={colors[value as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
      {value}
    </Badge>
  )
}

export function BOMEditor() {
  logger.debug('🔧 BOMEditor component rendered')
  const { currentProject, currentProjectBOM, updateBOMItem, deleteBOMItem, calculateBOMTotals } = useCPQ()
  const gridRef = useRef<AgGridReact>(null)

  // Calculate totals whenever BOM changes
  const totals = useMemo(() => {
    return calculateBOMTotals(currentProjectBOM)
  }, [currentProjectBOM, calculateBOMTotals])

  // Column definitions with Excel-like functionality
  // Reversed order for RTL display
  const columnDefs: ColDef<BOMLine>[] = useMemo(() => {
    const cols: ColDef<BOMLine>[] = [
    {
      headerName: '',
      field: 'drag' as any,
      width: 50,
      rowDrag: true,
      suppressSizeToFit: true,
      sortable: false,
      resizable: false,
    },
    {
      headerName: 'פעולות',
      width: 100,
      suppressSizeToFit: true,
      cellRenderer: (params: any) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteBOMItem(params.data?.id)}
            className="text-red-600 hover:text-red-800"
          >
            מחק
          </Button>
        )
      },
    },
    {
      headerName: 'שם פריט',
      field: 'name',
      editable: true,
      width: 200,
      cellEditor: 'agTextCellEditor',
      cellEditorPopup: false,
    },
    {
      headerName: 'סוג',
      field: 'type',
      width: 120,
      cellRenderer: StatusRenderer,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['component', 'assembly', 'custom'],
      },
    },
    {
      headerName: 'תיאור',
      field: 'description',
      editable: true,
      width: 250,
      cellEditor: 'agTextCellEditor',
      flex: 1,
    },
    {
      headerName: 'כמות',
      field: 'quantity',
      editable: true,
      width: 100,
      type: 'numericColumn',
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 0,
      },
      valueParser: (params: any) => {
        return parseInt(params.newValue) || 0
      },
    },
    {
      headerName: 'מחיר יחידה',
      field: 'unitCost',
      editable: true,
      width: 120,
      type: 'numericColumn',
      cellRenderer: CurrencyRenderer,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 2,
      },
      valueParser: (params: any) => {
        return parseFloat(params.newValue) || 0
      },
    },
    {
      headerName: 'עלות כוללת',
      field: 'totalPrice',
      width: 120,
      type: 'numericColumn',
      cellRenderer: CurrencyRenderer,
      valueGetter: (params) => {
        return (params.data?.quantity || 0) * (params.data?.unitCost || 0)
      },
      editable: false,
    },
    {
      headerName: 'רווח',
      field: 'markupValue' as any,
      editable: true,
      width: 100,
      type: 'numericColumn',
      cellRenderer: PercentageRenderer,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 1,
      },
      valueParser: (params: any) => {
        return parseFloat(params.newValue) || 0
      },
    },
    {
      headerName: 'מחיר ללקוח',
      field: 'customerPrice' as any,
      width: 140,
      type: 'numericColumn',
      cellRenderer: CurrencyRenderer,
      valueGetter: (params) => {
        const totalPrice = (params.data?.quantity || 0) * (params.data?.unitCost || 0)
        const markup = (params.data as any)?.markupValue || 0
        return totalPrice * (1 + markup / 100)
      },
      editable: false,
    },
    {
      headerName: 'שוליים',
      width: 100,
      type: 'numericColumn',
      cellRenderer: PercentageRenderer,
      valueGetter: (params) => {
        const totalPrice = (params.data?.quantity || 0) * (params.data?.unitCost || 0)
        const markup = (params.data as any)?.markupValue || 0
        const customerPrice = totalPrice * (1 + markup / 100)
        return totalPrice > 0 ? ((customerPrice - totalPrice) / customerPrice * 100) : 0
      },
      editable: false,
    },
  ]

    logger.debug('BOMEditor columnDefs order:', cols.map(c => c.headerName || c.field))
    return cols
  }, [deleteBOMItem])

  // Don't reverse - let dir="rtl" handle it naturally
  // const reversedColumnDefs = useMemo(() => {
  //   return [...columnDefs].reverse()
  // }, [columnDefs])

  // Default column definitions
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    flex: 1, // Allow columns to flex and auto-size
    minWidth: 80
  }), [])

  // Handle cell value changes
  const onCellValueChanged = useCallback((event: CellValueChangedEvent<BOMLine>) => {
    const { data, colDef, newValue } = event

    if (!data.id) return

    // Update the BOM item
    updateBOMItem(data.id, {
      [colDef.field!]: newValue,
    })
  }, [updateBOMItem])

  // Handle row drag and drop
  const onRowDragEnd = useCallback((event: RowDragEndEvent<BOMLine>) => {
    const { overIndex, node } = event

    // Reorder logic would go here
    logger.debug(`Row ${node.data?.name} moved to position ${overIndex}`)
  }, [])

  // Add new BOM item
  const handleAddItem = useCallback(() => {
    const newItem: Omit<BOMLine, 'id'> = {
      type: 'component',
      name: 'פריט חדש',
      quantity: 1,
      unitCost: 0,
      totalPrice: 0,
    }

    logger.debug('Add new BOM item:', newItem)
  }, [])

  // Save project
  const handleSave = useCallback(() => {
    logger.debug('Save project with BOM:', currentProjectBOM)
  }, [currentProjectBOM])

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">לא נבחר פרויקט</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            ביל חומרים (BOM)
          </h1>
          <p className="text-muted-foreground">
            {currentProject.name} • {currentProject.customerName}
          </p>
        </div>
        <div className="flex items-center space-x-reverse space-x-2">
          <Button
            variant="outline"
            onClick={handleAddItem}
            className="flex items-center space-x-reverse space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>הוסף פריט</span>
          </Button>
          <Button
            onClick={handleSave}
            className="flex items-center space-x-reverse space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>שמור פרויקט</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-reverse space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">עלות כוללת</span>
            </div>
            <p className="text-2xl font-bold text-cost">
              ${totals.totalCost.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-reverse space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">מחיר ללקוח</span>
            </div>
            <p className="text-2xl font-bold text-quote">
              ${totals.totalPrice.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-reverse space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">רווח כולל</span>
            </div>
            <p className="text-2xl font-bold text-profit">
              ${totals.margin.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-reverse space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">אחוז רווח</span>
            </div>
            <p className="text-2xl font-bold">
              {totals.totalPrice > 0
                ? ((totals.margin / totals.totalPrice) * 100).toFixed(1)
                : '0'
              }%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AG Grid Table */}
      <Card>
        <CardHeader>
          <CardTitle>ביל חומרים (BOM)</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="ag-theme-alpine"
            style={{ height: '500px', width: '100%' }}
          >
            <AgGridReact<BOMLine>
              ref={gridRef}
              rowData={currentProjectBOM}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={onCellValueChanged}
              onRowDragEnd={onRowDragEnd}
              rowDragManaged={true}
              animateRows={true}
              editType="fullRow"
              enableRangeSelection={true}
              enableFillHandle={true}
              suppressCopyRowsToClipboard={false}
              allowShowChangeAfterFilter={true}
              rowSelection="single"
              suppressContextMenu={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
