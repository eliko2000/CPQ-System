import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { CustomHeader } from '../grid/CustomHeader';
import {
  StatusCellEditor,
  QUOTATION_STATUS_OPTIONS,
} from '../grid/StatusCellEditor';
import { StatusRenderer, CurrencyRenderer } from './quotationGridRenderers';
import { SelectionCheckboxRenderer } from '../grid/SelectionCheckboxRenderer';
import { logger } from '@/lib/logger';

export interface QuotationColumnDefsParams {
  getUniqueValues: (field: string) => string[];
  handleColumnMenuClick: (columnId: string) => void;
  handleFilterClick: (columnId: string) => void;
  updateQuotation: (id: string, updates: any) => Promise<void>;
}

export const createQuotationColumnDefs = ({
  getUniqueValues,
  handleColumnMenuClick,
  handleFilterClick,
  updateQuotation,
}: QuotationColumnDefsParams): ColDef[] => [
  {
    headerName: 'תאריך עדכון',
    field: 'updated_at',
    width: 120,
    valueFormatter: (params: ValueFormatterParams) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleDateString('he-IL');
    },
    filter: 'agDateColumnFilter',
    comparator: (dateA: string, dateB: string) => {
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'תאריך עדכון',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'date',
    }),
  },
  {
    headerName: 'תאריך יצירה',
    field: 'created_at',
    width: 120,
    valueFormatter: (params: ValueFormatterParams) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleDateString('he-IL');
    },
    filter: 'agDateColumnFilter',
    comparator: (dateA: string, dateB: string) => {
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'תאריך יצירה',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'date',
    }),
  },
  {
    headerName: 'מחיר סופי',
    field: 'displayTotalPrice',
    width: 130,
    editable: false,
    cellRenderer: CurrencyRenderer,
    valueGetter: params => params.data?.total_price || 0,
    filter: 'agNumberColumnFilter',
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מחיר סופי',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'number',
    }),
  },
  {
    headerName: 'סטטוס',
    field: 'status',
    width: 120,
    editable: true,
    cellEditor: StatusCellEditor,
    cellEditorParams: {
      options: QUOTATION_STATUS_OPTIONS,
      onStatusChange: async (id: string, newStatus: string) => {
        logger.debug('QuotationDataGrid - onStatusChange called:', {
          id,
          newStatus,
        });
        await updateQuotation(id, { status: newStatus as any });
      },
    },
    cellRenderer: StatusRenderer,
    filter: 'agSetColumnFilter',
    filterParams: {
      values: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'סטטוס',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    }),
  },
  {
    headerName: 'גרסה',
    field: 'version',
    width: 80,
    editable: true,
    cellEditor: 'agNumberCellEditor',
    cellEditorParams: {
      min: 1,
      precision: 0,
    },
    valueFormatter: (params: ValueFormatterParams) =>
      params.value?.toString() || '1',
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'גרסה',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'number',
    }),
  },
  {
    headerName: 'שם פרוייקט',
    field: 'project_name',
    width: 200,
    editable: false,
    filter: 'agSetColumnFilter',
    filterParams: {
      values: () => getUniqueValues('project_name'),
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'שם פרוייקט',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('project_name'),
    }),
  },
  {
    headerName: 'לקוח',
    field: 'customer_name',
    width: 180,
    editable: false,
    filter: 'agSetColumnFilter',
    filterParams: {
      values: () => getUniqueValues('customer_name'),
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'לקוח',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('customer_name'),
    }),
  },
  {
    headerName: '',
    field: 'selection',
    sortable: false,
    filter: false,
    resizable: false,
    width: 48,
    maxWidth: 48,
    minWidth: 48,
    pinned: 'right' as const, // Pinned to right in RTL = visually left
    lockPosition: true,
    lockVisible: true,
    suppressMenu: true,
    suppressMovable: true,
    suppressNavigable: true,
    cellRenderer: SelectionCheckboxRenderer,
    // cellRendererParams will be provided by the grid
  },
];
