import { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Component } from '../../types';

interface ComponentGridProps {
  components: Component[];
  onEdit: (component: Component) => void;
  onDelete: (componentId: string, componentName: string) => void;
  onView?: (component: Component) => void;
}

export function ComponentGrid({
  components,
  onEdit,
  onDelete,
  onView,
}: ComponentGridProps) {
  const gridRef = useRef<AgGridReact>(null);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: 'שם רכיב',
        field: 'name',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 200,
        cellRenderer: (params: any) => (
          <div className="py-1">
            <div className="font-medium">{params.value}</div>
            {params.data.description && (
              <div className="text-sm text-muted-foreground">
                {params.data.description}
              </div>
            )}
          </div>
        ),
      },
      {
        headerName: 'יצרן',
        field: 'manufacturer',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
      },
      {
        headerName: 'מק"ט יצרן',
        field: 'manufacturerPN',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 140,
        cellClass: 'font-mono text-sm',
        cellStyle: {
          direction: 'ltr',
          unicodeBidi: 'isolate',
          textAlign: 'left',
        },
      },
      {
        headerName: 'קטגוריה',
        field: 'category',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
        cellRenderer: (params: any) => (
          <Badge variant="secondary" className="text-xs">
            {params.value}
          </Badge>
        ),
      },
      {
        headerName: 'סוג מוצר',
        field: 'productType',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
        valueGetter: (params: any) => params.data.productType || '-',
      },
      {
        headerName: 'ספק',
        field: 'supplier',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
      },
      {
        headerName: 'מחיר בש"ח',
        field: 'unitCostNIS',
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        minWidth: 120,
        type: 'numericColumn',
        valueFormatter: (params: any) => {
          return new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 2,
          }).format(params.value || 0);
        },
        cellClass: 'font-semibold text-green-600',
      },
      {
        headerName: 'מחיר בדולר',
        field: 'unitCostUSD',
        sortable: true,
        filter: 'agNumberColumnFilter',
        resizable: true,
        minWidth: 120,
        type: 'numericColumn',
        valueFormatter: (params: any) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
          }).format(params.value || 0);
        },
        cellClass: 'font-semibold text-blue-600',
      },
      {
        headerName: 'מטבע',
        field: 'currency',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 80,
        cellRenderer: (params: any) => (
          <Badge variant="outline" className="text-xs">
            {params.value}
          </Badge>
        ),
      },
      {
        headerName: 'תאריך הצעה',
        field: 'quoteDate',
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleDateString('he-IL');
        },
      },
      {
        headerName: 'פעולות',
        field: 'actions',
        sortable: false,
        filter: false,
        resizable: false,
        minWidth: 150,
        cellRenderer: (params: any) => (
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
        ),
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      wrapText: true,
      autoHeight: true,
    }),
    []
  );

  const onGridReady = (params: any) => {
    // Auto-size columns to fit content
    params.api.sizeColumnsToFit();
  };

  const onFirstDataRendered = (params: any) => {
    // Auto-size columns after data is rendered
    params.api.sizeColumnsToFit();
  };

  return (
    <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
      <AgGridReact
        ref={gridRef}
        rowData={components}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        onFirstDataRendered={onFirstDataRendered}
        rowSelection="single"
        animateRows={true}
        pagination={true}
        paginationPageSize={20}
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
            },
          ],
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
          pivotPanel: 'פאנל פיבוט',
        }}
      />
    </div>
  );
}
