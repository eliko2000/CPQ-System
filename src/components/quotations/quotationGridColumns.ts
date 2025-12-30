import { ColDef, ValueFormatterParams } from 'ag-grid-community';
import { CustomHeader } from '../grid/CustomHeader';
import {
  StatusCellEditor,
  QUOTATION_STATUS_OPTIONS,
} from '../grid/StatusCellEditor';
import {
  StatusRenderer,
  CurrencyRenderer,
  PriorityRenderer,
  FollowUpDateRenderer,
  QUOTATION_PRIORITY_OPTIONS,
} from './quotationGridRenderers';
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
    filter: 'agTextColumnFilter',
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'סטטוס',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: ['טיוטה', 'נשלח', 'התקבל', 'נדחה', 'פג תוקף'],
    }),
  },
  {
    headerName: 'עדיפות',
    field: 'priority',
    width: 110,
    editable: true,
    cellEditor: StatusCellEditor,
    cellEditorParams: {
      options: QUOTATION_PRIORITY_OPTIONS,
      onStatusChange: async (id: string, newPriority: string) => {
        logger.debug('QuotationDataGrid - onPriorityChange called:', {
          id,
          newPriority,
        });
        await updateQuotation(id, { priority: newPriority as any });
      },
    },
    cellRenderer: PriorityRenderer,
    filter: 'agTextColumnFilter',
    filterParams: {
      filterOptions: ['equals', 'notEqual'],
      suppressAndOrCondition: true,
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'עדיפות',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
    }),
  },
  {
    headerName: 'מעקב',
    field: 'follow_up_date',
    width: 110,
    editable: true,
    cellEditor: 'agDateCellEditor',
    cellEditorParams: {
      useFormatter: true,
    },
    cellRenderer: FollowUpDateRenderer,
    valueFormatter: (params: ValueFormatterParams) => {
      if (!params.value) return '';
      return new Date(params.value).toLocaleDateString('he-IL');
    },
    filter: 'agDateColumnFilter',
    comparator: (dateA: string, dateB: string) => {
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מעקב',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'date',
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
