import React, { useRef, useState, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, NewValueParams, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, calculateMargin } from '@/lib/utils';
import { Plus, Trash2, Calculator } from 'lucide-react';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// BOM Item interface
export interface BOMItem {
  id: string;
  itemType: 'component' | 'assembly' | 'labor' | 'other';
  manufacturer?: string;
  manufacturerPn?: string;
  description: string;
  quantity: number;
  unitCost: number;
  customerPrice: number;
  margin: number;
  supplier?: string;
  quoteReference?: string;
  validUntil?: string;
  notes?: string;
  children?: BOMItem[]; // For nested assemblies
}

interface BOMGridProps {
  bomItems: BOMItem[];
  onBOMChange: (items: BOMItem[]) => void;
  readonly?: boolean;
  showCustomerPricing?: boolean;
  allowEditing?: boolean;
}

export const BOMGrid: React.FC<BOMGridProps> = ({
  bomItems,
  onBOMChange,
  readonly = false,
  showCustomerPricing = true,
  allowEditing = true
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [averageMargin, setAverageMargin] = useState(0);

  // Column definitions with CPQ-specific functionality
  const columnDefs: ColDef<BOMItem>[] = useMemo(() => [
    {
      headerName: '',
      field: 'id' as keyof BOMItem,
      width: 50,
      rowDrag: allowEditing,
      cellRenderer: () => <div className="drag-handle">⋮⋮</div>,
      suppressMenu: true,
      sortable: false,
    },
    {
      headerName: 'Type',
      field: 'itemType' as keyof BOMItem,
      width: 120,
      cellRenderer: (params: ValueFormatterParams) => (
        <Badge variant={
          params.value === 'component' ? 'default' :
          params.value === 'assembly' ? 'secondary' :
          params.value === 'labor' ? 'outline' : 'destructive'
        }>
          {params.value?.toUpperCase() || 'OTHER'}
        </Badge>
      ),
      editable: allowEditing,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['component', 'assembly', 'labor', 'other']
      }
    },
    {
      headerName: 'Description',
      field: 'description' as keyof BOMItem,
      flex: 2,
      editable: allowEditing,
      cellEditorPopup: true,
      cellEditorPopupPosition: 'under',
    },
    {
      headerName: 'Manufacturer',
      field: 'manufacturer' as keyof BOMItem,
      width: 150,
      editable: allowEditing,
    },
    {
      headerName: 'MFR P/N',
      field: 'manufacturerPn' as keyof BOMItem,
      width: 140,
      editable: allowEditing,
    },
    {
      headerName: 'Supplier',
      field: 'supplier' as keyof BOMItem,
      width: 120,
      editable: allowEditing,
    },
    {
      headerName: 'Qty',
      field: 'quantity' as keyof BOMItem,
      width: 80,
      editable: allowEditing,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 1,
        precision: 0,
      },
      valueFormatter: (params: ValueFormatterParams) => params.value?.toLocaleString() || '0',
      onCellValueChanged: (params: NewValueParams<BOMItem>) => {
        const newValue = params.newValue;
        if (newValue < 1 && params.node) {
          params.node.setDataValue('quantity', 1);
        }
        calculateTotals();
      }
    },
    {
      headerName: 'Unit Cost',
      field: 'unitCost' as keyof BOMItem,
      width: 120,
      editable: allowEditing && !readonly,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 2,
      },
      valueFormatter: (params: ValueFormatterParams) => formatCurrency(params.value || 0),
      onCellValueChanged: (params: NewValueParams<BOMItem>) => {
        const item = params.data;
        if (item && params.node) {
          const newMargin = calculateMargin(item.unitCost, item.customerPrice);
          params.node.setDataValue('margin', newMargin);
        }
        calculateTotals();
      }
    },
    ...(showCustomerPricing ? [{
      headerName: 'Customer Price',
      field: 'customerPrice' as keyof BOMItem,
      width: 140,
      editable: allowEditing && !readonly,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 2,
      },
      valueFormatter: (params: ValueFormatterParams) => formatCurrency(params.value || 0),
      onCellValueChanged: (params: NewValueParams<BOMItem>) => {
        const item = params.data;
        if (item && params.node) {
          const newMargin = calculateMargin(item.unitCost, item.customerPrice);
          params.node.setDataValue('margin', newMargin);
        }
        calculateTotals();
      }
    }] : []),
    {
      headerName: 'Margin %',
      field: 'margin' as keyof BOMItem,
      width: 100,
      editable: false,
      valueFormatter: (params: ValueFormatterParams) => `${params.value?.toFixed(1)}%`,
      cellRenderer: (params: ValueFormatterParams) => {
        const margin = params.value || 0;
        const color = margin >= 25 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600';
        return <span className={color}>{margin.toFixed(1)}%</span>;
      }
    },
    {
      headerName: 'Total Cost',
      field: 'totalCost' as keyof BOMItem,
      width: 120,
      editable: false,
      valueGetter: (params: ValueGetterParams) => (params.data.quantity || 0) * (params.data.unitCost || 0),
      valueFormatter: (params: ValueFormatterParams) => formatCurrency(params.value || 0),
      cellRenderer: (params: ValueFormatterParams) => (
        <span className="font-medium">{formatCurrency(params.value || 0)}</span>
      )
    },
    ...(showCustomerPricing ? [{
      headerName: 'Total Price',
      field: 'totalPrice' as keyof BOMItem,
      width: 140,
      editable: false,
      valueGetter: (params: ValueGetterParams) => (params.data.quantity || 0) * (params.data.customerPrice || 0),
      valueFormatter: (params: ValueFormatterParams) => formatCurrency(params.value || 0),
      cellRenderer: (params: ValueFormatterParams) => (
        <span className="font-semibold text-blue-600">{formatCurrency(params.value || 0)}</span>
      )
    }] : []),
    {
      headerName: 'Actions',
      width: 100,
      suppressMenu: true,
      sortable: false,
      cellRenderer: (params: ValueFormatterParams) => (
        <div className="flex gap-1">
          {allowEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeItem(params.data.id)}
              className="text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ], [allowEditing, readonly, showCustomerPricing]);

  // Calculate totals whenever BOM changes
  const calculateTotals = useCallback(() => {
    const totalCostAmount = bomItems.reduce((sum, item) =>
      sum + (item.quantity * item.unitCost), 0
    );
    const totalPriceAmount = bomItems.reduce((sum, item) =>
      sum + (item.quantity * item.customerPrice), 0
    );

    setTotalCost(totalCostAmount);
    setTotalPrice(totalPriceAmount);

    // Calculate average margin
    const validItems = bomItems.filter(item => item.unitCost > 0);
    const avgMargin = validItems.length > 0
      ? validItems.reduce((sum, item) => sum + item.margin, 0) / validItems.length
      : 0;
    setAverageMargin(avgMargin);
  }, [bomItems]);

  // Grid event handlers
  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
    calculateTotals();
  }, [calculateTotals]);

  const onCellValueChanged = useCallback(() => {
    const updatedItems: BOMItem[] = [];
    gridRef.current?.api.forEachNode((node) => {
      if (node.data) {
        updatedItems.push(node.data);
      }
    });
    onBOMChange(updatedItems);
    calculateTotals();
  }, [onBOMChange, calculateTotals]);

  const onRowDragEnd = useCallback(() => {
    const updatedItems: BOMItem[] = [];
    gridRef.current?.api.forEachNode((node) => {
      if (node.data) {
        updatedItems.push(node.data);
      }
    });
    onBOMChange(updatedItems);
  }, [onBOMChange]);

  // CRUD operations
  const addNewItem = useCallback(() => {
    const newItem: BOMItem = {
      id: `item-${Date.now()}`,
      itemType: 'component',
      description: 'New Component',
      quantity: 1,
      unitCost: 0,
      customerPrice: 0,
      margin: 0,
    };

    const updatedItems = [...bomItems, newItem];
    onBOMChange(updatedItems);

    // Focus the new row after state update
    setTimeout(() => {
      const rowNode = gridRef.current?.api.getRowNode(newItem.id);
      if (rowNode) {
        rowNode.setSelected(true);
        gridRef.current?.api.ensureNodeVisible(rowNode);
      }
    }, 100);
  }, [bomItems, onBOMChange]);

  const removeItem = useCallback((itemId: string) => {
    const updatedItems = bomItems.filter(item => item.id !== itemId);
    onBOMChange(updatedItems);
  }, [bomItems, onBOMChange]);

  const applyMarkup = useCallback((markupPercent: number) => {
    const updatedItems = bomItems.map(item => ({
      ...item,
      customerPrice: item.unitCost * (1 + markupPercent / 100),
      margin: markupPercent
    }));
    onBOMChange(updatedItems);
  }, [bomItems, onBOMChange]);

  // Calculate totals on mount and when items change
  React.useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Bill of Materials</CardTitle>
          <div className="flex gap-2">
            {allowEditing && (
              <>
                <Button onClick={addNewItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
                <Button variant="outline" onClick={() => applyMarkup(25)} size="sm">
                  <Calculator className="h-4 w-4 mr-2" />
                  Apply 25% Markup
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* AG Grid */}
          <div className="ag-theme-alpine" style={{ height: '400px', width: '100%' }}>
            <AgGridReact<BOMItem>
              ref={gridRef}
              rowData={bomItems}
              columnDefs={columnDefs}
              defaultColDef={{
                sortable: true,
                filter: true,
                resizable: true,
                floatingFilter: false,
              }}
              rowDragManaged={allowEditing}
              animateRows={true}
              onGridReady={onGridReady}
              onCellValueChanged={onCellValueChanged}
              onRowDragEnd={onRowDragEnd}
              editType="fullRow"
              stopEditingWhenCellsLoseFocus={true}
              suppressClickEdit={true}
              singleClickEdit={true}
            />
          </div>

          {/* Summary Section */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Total Cost</div>
                <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
              </div>
              {showCustomerPricing && (
                <>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Total Price</div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalPrice)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Total Margin</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalPrice - totalCost)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Average Margin</div>
                    <div className={`text-2xl font-bold ${
                      averageMargin >= 25 ? 'text-green-600' :
                      averageMargin >= 15 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {averageMargin.toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Validation Messages */}
          {bomItems.some(item => item.unitCost <= 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-yellow-800 text-sm">
                ⚠️ Some items have zero or negative unit costs. Please review and update pricing information.
              </p>
            </div>
          )}

          {bomItems.some(item => item.margin < 15 && item.unitCost > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-orange-800 text-sm">
                ⚠️ Some items have margins below 15%. Consider adjusting pricing for better profitability.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};