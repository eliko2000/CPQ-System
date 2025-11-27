import { ColDef, ValueSetterParams } from 'ag-grid-community';
import { CustomHeader } from '../grid/CustomHeader';
import {
  NameCellRenderer,
  CategoryBadgeRenderer,
  CurrencyBadgeRenderer,
  ActionsRenderer,
} from './componentGridRenderers';
import { Component } from '../../types';
import { logger } from '@/lib/logger';

export interface ComponentColumnDefsParams {
  categories: string[];
  getUniqueValues: (field: keyof Component) => string[];
  handleCellEdit: (params: ValueSetterParams) => boolean;
  handleColumnMenuClick: (columnId: string) => void;
  handleFilterClick: (columnId: string) => void;
  onEdit: (component: Component) => void;
  onDelete: (componentId: string, componentName: string) => void;
  onView?: (component: Component) => void;
  onDuplicate?: (component: Component) => void;
}

export const createComponentColumnDefs = ({
  categories,
  getUniqueValues,
  handleCellEdit,
  handleColumnMenuClick,
  handleFilterClick,
}: ComponentColumnDefsParams): ColDef[] => [
  {
    headerName: 'תאריך הצעה',
    field: 'quoteDate',
    sortable: true,
    filter: 'agDateColumnFilter',
    resizable: true,
    width: 120,
    editable: true,
    cellEditor: 'agDateStringCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'תאריך הצעה',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'date',
    }),
    valueFormatter: (params: any) => {
      if (!params.value) return '-';
      return new Date(params.value).toLocaleDateString('he-IL');
    },
    filterParams: {
      buttons: ['reset'],
    },
  },
  {
    headerName: 'מחיר בדולר',
    field: 'unitCostUSD',
    sortable: true,
    filter: 'agNumberColumnFilter',
    resizable: true,
    width: 120,
    type: 'numericColumn',
    editable: true,
    cellEditor: 'agNumberCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מחיר בדולר',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'number',
    }),
    valueFormatter: (params: any) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(params.value || 0);
    },
    cellClass: 'font-semibold text-blue-600',
    filterParams: {
      buttons: ['reset'],
    },
  },
  {
    headerName: 'מחיר בש"ח',
    field: 'unitCostNIS',
    sortable: true,
    filter: 'agNumberColumnFilter',
    resizable: true,
    width: 120,
    type: 'numericColumn',
    editable: true,
    cellEditor: 'agNumberCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מחיר בש"ח',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'number',
    }),
    valueFormatter: (params: any) => {
      return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 2,
      }).format(params.value || 0);
    },
    cellClass: 'font-semibold text-green-600',
    filterParams: {
      buttons: ['reset'],
    },
  },
  {
    headerName: 'ספק',
    field: 'supplier',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 120,
    editable: true,
    cellEditor: 'agTextCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'ספק',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('supplier'),
    }),
    filterParams: {
      values: (_params: any) => getUniqueValues('supplier'),
    },
  },
  {
    headerName: 'יצרן',
    field: 'manufacturer',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 120,
    editable: true,
    cellEditor: 'agTextCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'יצרן',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('manufacturer'),
    }),
    filterParams: {
      values: (_params: any) => getUniqueValues('manufacturer'),
    },
  },
  {
    headerName: 'שם רכיב',
    field: 'name',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 180,
    editable: true,
    cellEditor: 'agTextCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'שם רכיב',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('name'),
    }),
    cellRenderer: NameCellRenderer,
    filterParams: {
      values: (_params: any) => getUniqueValues('name'),
    },
  },
  {
    headerName: 'מק"ט יצרן',
    field: 'manufacturerPN',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 140,
    editable: true,
    cellEditor: 'agTextCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מק"ט יצרן',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('manufacturerPN'),
    }),
    cellClass: 'font-mono text-sm',
    filterParams: {
      values: (_params: any) => getUniqueValues('manufacturerPN'),
    },
  },
  {
    headerName: 'פעולות',
    field: 'actions',
    sortable: false,
    filter: false,
    resizable: false,
    width: 180,
    cellRenderer: ActionsRenderer,
  },
  {
    headerName: 'קטגוריה',
    field: 'category',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 120,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: categories,
    },
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'קטגוריה',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('category'),
    }),
    cellRenderer: CategoryBadgeRenderer,
    filterParams: {
      values: categories,
    },
  },
  {
    headerName: 'סוג',
    field: 'componentType',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 100,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['hardware', 'software', 'labor'],
    },
    valueSetter: params => {
      logger.debug('💎 componentType valueSetter called:', {
        oldValue: params.oldValue,
        newValue: params.newValue,
      });
      if (params.newValue !== params.oldValue) {
        params.data.componentType = params.newValue;
        handleCellEdit(params);
      }
      return true;
    },
    valueFormatter: params => {
      const type = params.value;
      return type === 'hardware'
        ? 'חומרה'
        : type === 'software'
          ? 'תוכנה'
          : type === 'labor'
            ? 'עבודה'
            : '';
    },
    cellStyle: params => {
      const type = params.data?.componentType;
      return {
        backgroundColor:
          type === 'hardware'
            ? '#e3f2fd'
            : type === 'software'
              ? '#e8f5e9'
              : type === 'labor'
                ? '#fff3e0'
                : 'white',
        fontWeight: '500',
      };
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'סוג',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: ['hardware', 'software', 'labor'],
    }),
    filterParams: {
      values: ['hardware', 'software', 'labor'],
      valueFormatter: (params: any) => {
        const type = params.value;
        return type === 'hardware'
          ? 'חומרה'
          : type === 'software'
            ? 'תוכנה'
            : type === 'labor'
              ? 'עבודה'
              : '';
      },
    },
  },
  {
    headerName: 'סוג עבודה',
    field: 'laborSubtype',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 120,
    editable: params => params.data?.componentType === 'labor',
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['engineering', 'commissioning', 'installation'],
    },
    valueSetter: params => {
      if (
        params.data?.componentType === 'labor' &&
        params.newValue !== params.oldValue
      ) {
        params.data.laborSubtype = params.newValue;
        handleCellEdit(params);
      }
      return true;
    },
    valueFormatter: params => {
      if (params.data?.componentType !== 'labor') return '';
      const subtype = params.value;
      return subtype === 'engineering'
        ? 'פיתוח והנדסה'
        : subtype === 'commissioning'
          ? 'הרצה'
          : subtype === 'installation'
            ? 'התקנה'
            : '';
    },
    cellStyle: params => {
      if (params.data?.componentType !== 'labor') {
        return {
          backgroundColor: '#f5f5f5',
          color: '#aaa',
          fontWeight: 'normal',
        };
      }
      return {
        fontWeight: '500',
        backgroundColor: 'transparent',
        color: 'inherit',
      };
    },
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'סוג עבודה',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: ['engineering', 'commissioning', 'installation'],
    }),
    filterParams: {
      values: ['engineering', 'commissioning', 'installation'],
      valueFormatter: (params: any) => {
        const subtype = params.value;
        return subtype === 'engineering'
          ? 'פיתוח והנדסה'
          : subtype === 'commissioning'
            ? 'הרצה'
            : subtype === 'installation'
              ? 'התקנה'
              : '';
      },
    },
  },
  {
    headerName: 'מחיר באירו',
    field: 'unitCostEUR',
    sortable: true,
    filter: 'agNumberColumnFilter',
    resizable: true,
    width: 120,
    type: 'numericColumn',
    editable: true,
    cellEditor: 'agNumberCellEditor',
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מחיר באירו',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      filterType: 'number',
    }),
    valueFormatter: (params: any) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(params.value || 0);
    },
    cellClass: 'font-semibold text-purple-600',
    filterParams: {
      buttons: ['reset'],
    },
  },
  {
    headerName: 'מטבע',
    field: 'currency',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 80,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['NIS', 'USD', 'EUR'],
    },
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'מטבע',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('currency'),
    }),
    cellRenderer: CurrencyBadgeRenderer,
    filterParams: {
      values: ['NIS', 'USD', 'EUR'],
    },
  },
  {
    headerName: 'תיאור',
    field: 'description',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 200,
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'תיאור',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('description'),
    }),
    filterParams: {
      values: (_params: any) => getUniqueValues('description'),
    },
  },
  {
    headerName: 'הערות',
    field: 'notes',
    sortable: true,
    filter: 'agSetColumnFilter',
    resizable: true,
    width: 150,
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    onCellValueChanged: handleCellEdit,
    headerComponent: CustomHeader,
    headerComponentParams: (params: any) => ({
      displayName: 'הערות',
      onMenuClick: handleColumnMenuClick,
      onFilterClick: handleFilterClick,
      api: params.api,
      columnApi: params.columnApi,
      column: params.column,
      uniqueValues: getUniqueValues('notes'),
    }),
    filterParams: {
      values: (_params: any) => getUniqueValues('notes'),
    },
  },
];
