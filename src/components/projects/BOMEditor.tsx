import React, { useRef, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, CellValueChangedEvent, RowDragItem, RowDragEndEvent } from 'ag-grid-community'
import { useCPQ } from '@/contexts/CPQContext'
import { BOMLine } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, Calculator } from 'lucide-react'
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
  const { currentProject, currentProjectBOM, updateBOMItem, deleteBOMItem, calculateBOMTotals } = useCPQ()
  const gridRef = useRef<AgGridReact>(null)

  // Calculate totals whenever BOM changes
  const totals = useMemo(() => {
    return calculateBOMTotals(currentProjectBOM)
  }, [currentProjectBOM, calculateBOMTotals])

  // Column definitions with Excel-like functionality
  const columnDefs: ColDef<BOMLine>[] = useMemo(() => [
    {
      headerName: '',
      field: 'drag',
      width: 50,
      rowDrag: true,
      suppressSizeToFit: true,
      sortable: false,
      resizable: false,
    },
    {
      headerName: 'Item Name',
      field: 'name',
      editable: true,
      width: 200,
      cellEditor: 'agTextCellEditor',
      cellEditorPopup: false,
    },
    {
      headerName: 'Type',
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
      headerName: 'Description',
      field: 'description',
      editable: true,
      width: 250,
      cellEditor: 'agTextCellEditor',
      flex: 1,
    },
    {
      headerName: 'Quantity',
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
      headerName: 'Unit Cost',
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
      headerName: 'Total Cost',
      field: 'totalPrice',
      width: 120,
      type: 'numericColumn',
      cellRenderer: CurrencyRenderer,
      valueGetter: (params) => {
        return (params.data.quantity || 0) * (params.data.unitCost || 0)
      },
      editable: false,
    },
    {
      headerName: 'Markup',
      field: 'markupValue',
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
      headerName: 'Customer Price',
      field: 'customerPrice',
      width: 140,
      type: 'numericColumn',
      cellRenderer: CurrencyRenderer,
      valueGetter: (params) => {
        const totalPrice = (params.data.quantity || 0) * (params.data.unitCost || 0)
        const markup = params.data.markupValue || 0
        return totalPrice * (1 + markup / 100)
      },
      editable: false,
    },
    {
      headerName: 'Margin',
      width: 100,
      type: 'numericColumn',
      cellRenderer: PercentageRenderer,
      valueGetter: (params) => {
        const totalPrice = (params.data.quantity || 0) * (params.data.unitCost || 0)
        const customerPrice = totalPrice * (1 + (params.data.markupValue || 0) / 100)
        return totalPrice > 0 ? ((customerPrice - totalPrice) / customerPrice * 100) : 0
      },
      editable: false,
    },
    {
      headerName: 'Actions',
      width: 100,
      suppressSizeToFit: true,
      cellRenderer: (params: any) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteBOMItem(params.data.id)}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </Button>
        )
      },
    },
  ], [deleteBOMItem])

  // Default column definitions
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
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
    console.log(`Row ${node.data?.name} moved to position ${overIndex}`)
    // TODO: Implement reordering in the BOM array
  }, [])

  // Add new BOM item
  const handleAddItem = useCallback(() => {
    const newItem: Omit<BOMLine, 'id'> = {
      type: 'component',
      name: 'New Item',
      quantity: 1,
      unitCost: 0,
      totalPrice: 0,
      markupType: 'percentage',
      markupValue: 30,
      customerPrice: 0,
      level: 0,
    }

    // This will be handled by the context
    // TODO: Implement addBOMItem in context
    console.log('Add new BOM item:', newItem)
  }, [])

  // Save project
  const handleSave = useCallback(() => {
    // TODO: Implement project saving
    console.log('Save project with BOM:', currentProjectBOM)
  }, [currentProjectBOM])

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bill of Materials
          </h1>
          <p className="text-muted-foreground">
            {currentProject.name} • {currentProject.customerName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleAddItem}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </Button>
          <Button
            onClick={handleSave}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Project</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Cost</span>
            </div>
            <p className="text-2xl font-bold text-cost">
              ${totals.totalCost.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Customer Price</span>
            </div>
            <p className="text-2xl font-bold text-quote">
              ${totals.totalPrice.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Margin</span>
            </div>
            <p className="text-2xl font-bold text-profit">
              ${totals.margin.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Margin %</span>
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
          <CardTitle>Bill of Materials</CardTitle>
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