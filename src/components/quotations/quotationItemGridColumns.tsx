import { memo } from 'react';
import {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
  ICellEditorParams,
} from 'ag-grid-community';
import { Button } from '../ui/button';
import { Trash2, Plus, Edit } from 'lucide-react';
import { CustomHeader } from '../grid/CustomHeader';
import { Component, Assembly, QuotationProject } from '../../types';
import { logger } from '@/lib/logger';

// Custom cell renderer for system headers (bold) - Memoized to prevent unnecessary re-renders
export const SystemHeaderRenderer = memo((props: ICellRendererParams) => {
  if (props.data?.isSystemGroup) {
    return (
      <div className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
        {props.value}
      </div>
    );
  }
  return props.value;
});
SystemHeaderRenderer.displayName = 'SystemHeaderRenderer';

// Custom cell renderer for currency values - Memoized for performance
export const CurrencyRenderer = memo((props: ICellRendererParams) => {
  const value = props.value;
  if (value == null) return '-';

  const formatted = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));

  return <span className="font-mono text-sm">{formatted}</span>;
});
CurrencyRenderer.displayName = 'CurrencyRenderer';

// Custom cell renderer for USD currency - Memoized for performance
export const USDCurrencyRenderer = memo((props: ICellRendererParams) => {
  const value = props.value;
  if (value == null) return '-';

  return (
    <span className="font-mono text-sm">
      ${Math.round(value).toLocaleString()}
    </span>
  );
});
USDCurrencyRenderer.displayName = 'USDCurrencyRenderer';

// Simple text editor for system names
export class SystemNameEditor {
  private eInput!: HTMLInputElement;
  private params!: ICellEditorParams;
  private value!: string;
  private boundKeyDown!: (event: KeyboardEvent) => void;
  private boundBlur!: () => void;
  private boundInput!: () => void;

  // gets called once before renderer is used
  init(params: ICellEditorParams): void {
    this.params = params;
    this.value = params.value || '';

    // create cell editor
    this.eInput = document.createElement('input');
    this.eInput.type = 'text';
    this.eInput.value = this.value;
    this.eInput.placeholder = 'שם מערכת...';
    this.eInput.className =
      'w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';

    // Create bound references once to avoid memory leaks
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundBlur = this.onBlur.bind(this);
    this.boundInput = this.onInput.bind(this);

    // add event listeners using bound references
    this.eInput.addEventListener('keydown', this.boundKeyDown);
    this.eInput.addEventListener('blur', this.boundBlur);
    this.eInput.addEventListener('input', this.boundInput);
  }

  // gets called once when grid is ready to insert the element
  getGui(): HTMLElement {
    return this.eInput;
  }

  // Called by AG Grid after editor is attached to DOM
  // This ensures focus happens after render is complete
  afterGuiAttached(): void {
    if (this.eInput) {
      this.eInput.focus();
      this.eInput.select();
    }
  }

  // focus and select the text
  focusIn(): void {
    if (this.eInput) {
      this.eInput.focus();
      this.eInput.select();
    }
  }

  // returns the new value after editing
  getValue(): string {
    return this.eInput.value;
  }

  // when user presses Enter or Escape
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.params.api.stopEditing();
    } else if (event.key === 'Escape') {
      this.params.api.stopEditing(true);
    }
  }

  // when user clicks outside
  private onBlur(): void {
    this.params.api.stopEditing();
  }

  // update value on input
  private onInput(): void {
    this.value = this.eInput.value;
  }

  // destroy the editor
  destroy(): void {
    // Remove using same references to properly clean up
    this.eInput.removeEventListener('keydown', this.boundKeyDown);
    this.eInput.removeEventListener('blur', this.boundBlur);
    this.eInput.removeEventListener('input', this.boundInput);
  }

  // returns false if we don't want a popup
  isPopup(): boolean {
    return false;
  }

  // if refresh, update the value
  refresh(params: ICellEditorParams): boolean {
    this.value = params.value || '';
    this.eInput.value = this.value;
    return true;
  }
}

// Parameters for column definitions factory
export interface QuotationItemColumnDefsParams {
  currentQuotation: QuotationProject | null;
  gridData: any[];
  getUniqueValues: (field: string) => string[];
  handleColumnMenuClick: (columnId: string) => void;
  handleFilterClick: (columnId: string) => void;
  openComponentSelector: (systemId: string) => void;
  deleteItem: (itemId: string) => Promise<void>;
  components: Component[];
  assemblies: Assembly[];
  setModal: (modal: any) => void;
  setSelectedAssemblyForDetail: (assembly: Assembly | null) => void;
  setShowAssemblyDetail: (show: boolean) => void;
  quotationsHook: any;
  setCurrentQuotation: (quotation: QuotationProject | null) => void;
  updateQuotation: (id: string, updates: any) => void;
}

/**
 * Create column definitions for quotation items grid
 * This grid displays systems and their items in a tree structure
 */
export const createQuotationItemColumnDefs = (
  params: QuotationItemColumnDefsParams
): ColDef[] => {
  const {
    currentQuotation,
    gridData,
    getUniqueValues,
    handleColumnMenuClick,
    handleFilterClick,
    openComponentSelector,
    deleteItem,
    components,
    assemblies,
    setModal,
    setSelectedAssemblyForDetail,
    setShowAssemblyDetail,
    quotationsHook,
    setCurrentQuotation,
    updateQuotation,
  } = params;

  return [
    {
      headerName: 'מחיר ללקוח',
      field: 'customerPriceILS',
      width: 120,
      cellRenderer: CurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (valueParams: ValueGetterParams) => {
        if (valueParams.data.isSystemGroup) {
          const system = currentQuotation?.systems.find(
            s => s.id === valueParams.data.systemId
          );
          const systemQuantity = system?.quantity || 1;
          const systemItems = gridData.filter(
            item =>
              item.systemId === valueParams.data.systemId && !item.isSystemGroup
          );
          // Calculate customer price with profit coefficient for system total
          const profitCoefficient =
            currentQuotation?.parameters?.markupPercent ?? 0.75;
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS || 0;
            const quantity = item.quantity || 1;
            const customerPrice = (unitPrice * quantity) / profitCoefficient;
            return sum + customerPrice;
          }, 0);
          return itemsTotal * systemQuantity;
        }
        // Calculate customer price with profit coefficient for individual items
        const unitPrice = valueParams.data.unitPriceILS || 0;
        const quantity = valueParams.data.quantity || 1;
        const profitCoefficient =
          currentQuotation?.parameters?.markupPercent ?? 0.75;
        const customerPrice = (unitPrice * quantity) / profitCoefficient;
        return customerPrice;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'מחיר ללקוח',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        filterType: 'number',
      }),
    },
    {
      headerName: 'מחיר נטו שקלים',
      field: 'totalPriceILS',
      width: 120,
      cellRenderer: CurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (valueParams: ValueGetterParams) => {
        if (valueParams.data.isSystemGroup) {
          const system = currentQuotation?.systems.find(
            s => s.id === valueParams.data.systemId
          );
          const systemQuantity = system?.quantity || 1;
          const systemItems = gridData.filter(
            item =>
              item.systemId === valueParams.data.systemId && !item.isSystemGroup
          );
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS || 0;
            const quantity = item.quantity || 1;
            return sum + unitPrice * quantity;
          }, 0);
          return itemsTotal * systemQuantity;
        }
        const unitPrice = valueParams.data.unitPriceILS || 0;
        const quantity = valueParams.data.quantity || 1;
        return unitPrice * quantity;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'מחיר נטו שקלים',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        filterType: 'number',
      }),
    },
    {
      headerName: 'מחיר נטו דולר',
      field: 'totalPriceUSD',
      width: 120,
      cellRenderer: USDCurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (valueParams: ValueGetterParams) => {
        if (valueParams.data.isSystemGroup) {
          const system = currentQuotation?.systems.find(
            s => s.id === valueParams.data.systemId
          );
          const systemQuantity = system?.quantity || 1;
          const systemItems = gridData.filter(
            item =>
              item.systemId === valueParams.data.systemId && !item.isSystemGroup
          );
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceUSD || 0;
            const quantity = item.quantity || 1;
            return sum + unitPrice * quantity;
          }, 0);
          return itemsTotal * systemQuantity;
        }
        const unitPrice = valueParams.data.unitPriceUSD || 0;
        const quantity = valueParams.data.quantity || 1;
        return unitPrice * quantity;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'מחיר נטו דולר',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        filterType: 'number',
      }),
    },
    {
      headerName: 'מחיר יחידה',
      field: 'unitPriceILS',
      width: 100,
      editable: (editParams: any) =>
        editParams.data?.isCustomItem && !editParams.data?.isSystemGroup, // ✅ Only custom items editable
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 0,
      },
      cellRenderer: CurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (valueParams: ValueGetterParams) => {
        if (valueParams.data.isSystemGroup) {
          const systemItems = gridData.filter(
            item =>
              item.systemId === valueParams.data.systemId && !item.isSystemGroup
          );
          const totalCost = systemItems.reduce((sum: number, item: any) => {
            const unitPrice = item.unitPriceILS || 0;
            const quantity = item.quantity || 1;
            return sum + unitPrice * quantity;
          }, 0);
          return totalCost;
        }
        return valueParams.data.unitPriceILS || 0;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'מחיר יחידה',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        filterType: 'number',
      }),
    },
    {
      headerName: 'כמות',
      field: 'quantity',
      width: 80,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 1,
        precision: 0,
      },
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      valueGetter: (valueParams: ValueGetterParams) => {
        if (valueParams.data.isSystemGroup)
          return valueParams.data.quantity || 1;
        return valueParams.data.quantity || 1;
      },
      valueFormatter: valueParams =>
        valueParams.value?.toLocaleString('he-IL') || '0',
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'כמות',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        filterType: 'number',
      }),
    },
    {
      headerName: 'שם פריט',
      field: 'componentName',
      width: 200,
      editable: (editParams: any) =>
        editParams.data?.isSystemGroup || editParams.data?.isCustomItem, // ✅ Systems and custom items editable
      cellEditor: SystemNameEditor, // ✅ Direct class assignment
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : '',
      cellStyle: { textAlign: 'right', direction: 'rtl' },
      cellRenderer: (cellParams: ICellRendererParams) => {
        if (cellParams.data?.isSystemGroup) {
          return (
            <span
              className="font-bold w-full block text-right"
              style={{ direction: 'rtl' }}
            >
              {cellParams.value}
            </span>
          );
        }

        // Check if this is an assembly item
        const isAssembly = cellParams.data?.assemblyId;

        // For assembly items: click opens assembly detail modal
        if (isAssembly) {
          return (
            <div
              onClick={e => {
                e.stopPropagation();
                const assembly = assemblies.find(
                  asm => asm.id === cellParams.data.assemblyId
                );
                if (assembly) {
                  setSelectedAssemblyForDetail(assembly);
                  setShowAssemblyDetail(true);
                }
              }}
              className="cursor-pointer hover:text-green-600 w-full text-right flex items-center gap-2"
              style={{ direction: 'rtl' }}
              title="לחץ לצפייה בפרטי ההרכבה"
            >
              <span className="inline-flex items-center gap-1">
                📦 {cellParams.value}
              </span>
            </div>
          );
        }

        // For component items: double-click opens component card
        return (
          <div
            onDoubleClick={e => {
              e.stopPropagation();
              const component = components.find(
                comp => comp.name === cellParams.data.componentName
              );
              if (component) {
                setModal({ type: 'edit-component', data: component });
              }
            }}
            className="cursor-pointer hover:text-blue-600 w-full text-right"
            style={{ direction: 'rtl' }}
            title="לחץ פעמיים לפתיחת כרטיס רכיב"
          >
            {cellParams.value}
          </div>
        );
      },
      valueGetter: (valueParams: ValueGetterParams<any>) => {
        if (valueParams.data.isSystemGroup)
          return valueParams.data?.componentName || '';
        return valueParams.data.componentName || '';
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'שם פריט',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        uniqueValues: getUniqueValues('componentName'),
      }),
    },
    {
      headerName: 'סוג',
      field: 'itemType',
      width: 100,
      editable: (editParams: any) => !editParams.data?.isSystemGroup,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['hardware', 'software', 'labor'],
      },
      valueFormatter: valueParams => {
        if (valueParams.data?.isSystemGroup) return '';
        const type = valueParams.value;
        return type === 'hardware'
          ? 'חומרה'
          : type === 'software'
            ? 'תוכנה'
            : type === 'labor'
              ? 'עבודה'
              : '';
      },
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? '' : 'ag-cell-right',
      cellStyle: cellParams => {
        if (cellParams.data?.isSystemGroup) {
          return { textAlign: 'right' } as any;
        }
        const type = cellParams.data?.itemType;
        return {
          backgroundColor:
            type === 'hardware'
              ? '#e3f2fd'
              : type === 'software'
                ? '#e8f5e9'
                : type === 'labor'
                  ? '#fff3e0'
                  : 'white',
          textAlign: 'right',
        } as any;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'סוג',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        uniqueValues: ['hardware', 'software', 'labor'],
      }),
    },
    {
      headerName: 'תת-סוג עבודה',
      field: 'laborSubtype',
      width: 120,
      editable: (editParams: any) =>
        !editParams.data?.isSystemGroup &&
        editParams.data?.itemType === 'labor',
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['engineering', 'commissioning', 'installation'],
      },
      valueFormatter: valueParams => {
        if (
          valueParams.data?.isSystemGroup ||
          valueParams.data?.itemType !== 'labor'
        )
          return '';
        const subtype = valueParams.value;
        return subtype === 'engineering'
          ? 'פיתוח והנדסה'
          : subtype === 'commissioning'
            ? 'הרצה'
            : subtype === 'installation'
              ? 'התקנה'
              : '';
      },
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup || cellParams.data?.itemType !== 'labor'
          ? 'ag-cell-disabled'
          : 'ag-cell-right',
      cellStyle: cellParams => {
        if (
          cellParams.data?.isSystemGroup ||
          cellParams.data?.itemType !== 'labor'
        ) {
          return {
            backgroundColor: '#f5f5f5',
            color: '#aaa',
            textAlign: 'right',
          } as any;
        }
        return { textAlign: 'right' } as any;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'תת-סוג עבודה',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        uniqueValues: [
          'engineering',
          'commissioning',
          'installation',
          'programming',
        ],
      }),
    },
    {
      headerName: 'מס"ד',
      field: 'displayNumber',
      width: 80,
      cellRenderer: (cellParams: ICellRendererParams) => {
        if (cellParams.data?.isSystemGroup) {
          return (
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
              {cellParams.value}
            </span>
          );
        }
        return (
          <span className="font-mono text-sm text-gray-600">
            {cellParams.value}
          </span>
        );
      },
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-right',
      sortable: false,
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'מס"ד',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
        uniqueValues: getUniqueValues('displayNumber'),
      }),
    },
    {
      headerName: 'פעולות',
      field: 'actions',
      width: 150,
      sortable: false,
      filter: false,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup ? 'ag-cell-bold' : 'ag-cell-center',
      cellRenderer: (cellParams: ICellRendererParams) => {
        if (cellParams.data?.isSystemGroup) {
          return (
            <div className="flex gap-1 items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Delete system and all its items
                  if (!currentQuotation) return;

                  const systemId = cellParams.data.systemId;

                  // Delete from Supabase first
                  try {
                    // Delete all items in this system
                    const itemsToDelete = currentQuotation.items.filter(
                      item => item.systemId === systemId
                    );
                    for (const item of itemsToDelete) {
                      await quotationsHook.deleteQuotationItem(item.id);
                    }

                    // Delete the system itself
                    await quotationsHook.deleteQuotationSystem(systemId);

                    // Remove from local state and renumber
                    const { renumberItems } = await import(
                      '../../utils/quotationCalculations'
                    );
                    const updatedSystems = currentQuotation.systems
                      .filter(s => s.id !== systemId)
                      .map((s, index) => ({
                        ...s,
                        order: index + 1,
                      }));

                    // CRITICAL: Update sort_order in database for all remaining systems
                    // This ensures numbering persists after page reload
                    for (const system of updatedSystems) {
                      await quotationsHook.updateQuotationSystem(system.id, {
                        sort_order: system.order,
                      });
                    }

                    const updatedItems = currentQuotation.items.filter(
                      item => item.systemId !== systemId
                    );

                    // Renumber all items with new system orders
                    const renumberedItems = renumberItems(
                      updatedItems,
                      updatedSystems
                    );

                    // CRITICAL: Update item sort_order in database to match new system numbering
                    // Group items by system and update their sort_order in the database
                    for (const item of renumberedItems) {
                      await quotationsHook.updateQuotationItem(item.id, {
                        sort_order: item.itemOrder,
                      });
                    }

                    const updatedQuotation = {
                      ...currentQuotation,
                      systems: updatedSystems,
                      items: renumberedItems,
                    };

                    setCurrentQuotation(updatedQuotation);
                    updateQuotation(currentQuotation.id, {
                      systems: updatedSystems,
                      items: renumberedItems,
                    });
                  } catch (error) {
                    logger.error('Failed to delete system:', error);
                    alert('שגיאה במחיקת מערכת. נסה שוב.');
                  }
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                title="מחק מערכת"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openComponentSelector(cellParams.data.systemId)}
                className="h-8 w-8 p-0"
                title="הוסף פריט"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          );
        }

        return (
          <div className="flex gap-1 items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const isCustomItem = cellParams.data.isCustomItem;

                if (isCustomItem) {
                  // For custom items: Start editing the name cell
                  const rowIndex = cellParams.node.rowIndex;
                  if (rowIndex !== null && rowIndex !== undefined) {
                    cellParams.api.startEditingCell({
                      rowIndex,
                      colKey: 'componentName',
                    });
                  }
                } else {
                  // For library items: Open component form modal
                  const component = components.find(
                    comp => comp.name === cellParams.data.componentName
                  );
                  if (component) {
                    setModal({ type: 'edit-component', data: component });
                  }
                }
              }}
              className="h-8 w-8 p-0"
              title={
                cellParams.data.isCustomItem ? 'ערוך שם פריט' : 'ערוך פריט'
              }
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteItem(cellParams.data.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
              title="מחק"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];
};
