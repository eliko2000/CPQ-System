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
      <div className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded text-right">
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

// Actions cell renderer - NOT memoized to ensure fresh event handlers
export const ActionsCellRenderer = (
  props: ICellRendererParams & {
    openComponentSelector: (systemId: string) => void;
    deleteItem: (itemId: string) => Promise<void>;
    components: Component[];
    assemblies: Assembly[];
    setModal: (modal: any) => void;
    currentQuotation: QuotationProject | null;
    quotationsHook: any;
    setCurrentQuotation: (quotation: QuotationProject | null) => void;
    updateQuotation: (id: string, updates: any) => void;
  }
) => {
  // DEBUG: Log what props we receive
  logger.debug('🎨 ActionsCellRenderer received props:', {
    hasOpenComponentSelector: typeof props.openComponentSelector,
    hasDeleteItem: typeof props.deleteItem,
    hasComponents: !!props.components,
    hasSetModal: typeof props.setModal,
    allPropKeys: Object.keys(props),
  });

  const {
    data,
    openComponentSelector,
    deleteItem,
    components,
    setModal,
    currentQuotation,
    quotationsHook,
    setCurrentQuotation,
    updateQuotation,
  } = props;

  if (data?.isSystemGroup) {
    return (
      <div
        className="flex gap-1 items-center justify-end"
        style={{ direction: 'ltr' }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={async e => {
            e.stopPropagation();
            logger.debug('🗑️ Delete system button clicked', {
              systemId: data.systemId,
            });

            if (!currentQuotation) {
              logger.error('❌ currentQuotation is null');
              return;
            }

            const systemId = data.systemId;

            try {
              const itemsToDelete = currentQuotation.items.filter(
                item => item.systemId === systemId
              );
              for (const item of itemsToDelete) {
                await quotationsHook.deleteQuotationItem(item.id);
              }

              await quotationsHook.deleteQuotationSystem(systemId);

              const { renumberItems } = await import(
                '../../utils/quotationCalculations'
              );
              const updatedSystems = currentQuotation.systems
                .filter(s => s.id !== systemId)
                .map((s, index) => ({
                  ...s,
                  order: index + 1,
                }));

              for (const system of updatedSystems) {
                await quotationsHook.updateQuotationSystem(system.id, {
                  sort_order: system.order,
                });
              }

              const updatedItems = currentQuotation.items.filter(
                item => item.systemId !== systemId
              );

              const renumberedItems = renumberItems(
                updatedItems,
                updatedSystems
              );

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
          onClick={e => {
            e.stopPropagation();
            logger.debug('➕ Add item button clicked', {
              systemId: data.systemId,
            });
            openComponentSelector(data.systemId);
          }}
          className="h-8 w-8 p-0"
          title="הוסף פריט"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex gap-1 items-center justify-end"
      style={{ direction: 'ltr' }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={e => {
          e.stopPropagation();
          logger.debug('✏️ Edit item button clicked', {
            itemId: data.id,
            itemName: data.componentName,
          });

          const isCustomItem = data.isCustomItem;
          const isLaborItem = data.itemType === 'labor';

          if (isCustomItem || isLaborItem) {
            const rowIndex = props.node.rowIndex;
            if (rowIndex !== null && rowIndex !== undefined) {
              props.api.startEditingCell({
                rowIndex,
                colKey: 'componentName',
              });
            }
          } else {
            const component = components.find(
              comp => comp.name === data.componentName
            );
            if (component) {
              setModal({ type: 'edit-component', data: component });
            }
          }
        }}
        className="h-8 w-8 p-0"
        title={
          data.isCustomItem || data.itemType === 'labor'
            ? 'ערוך שם פריט'
            : 'ערוך פריט'
        }
      >
        <Edit className="h-3 w-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={async e => {
          e.stopPropagation();
          logger.debug('🗑️ Delete item button clicked', {
            itemId: data.id,
            itemName: data.componentName,
          });
          await deleteItem(data.id);
        }}
        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
        title="מחק"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// Simple text editor for system names
export class SystemNameEditor {
  private eInput!: HTMLInputElement;
  private params!: ICellEditorParams;
  private value!: string;
  private boundKeyDown!: (event: KeyboardEvent) => void;
  private boundBlur!: () => void;
  private boundInput!: () => void;
  private isReady: boolean = false; // Flag to prevent immediate blur

  // gets called once before renderer is used
  init(params: ICellEditorParams): void {
    console.log('[SystemNameEditor] init called with value:', params.value);
    this.params = params;
    this.value = params.value || '';

    // create cell editor
    this.eInput = document.createElement('input');
    this.eInput.type = 'text';
    this.eInput.value = this.value;
    this.eInput.placeholder = 'שם מערכת...';
    this.eInput.className =
      'w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';
    // Make the input more visible
    this.eInput.style.width = '100%';
    this.eInput.style.height = '100%';
    this.eInput.style.boxSizing = 'border-box';
    this.eInput.style.direction = 'rtl';
    this.eInput.style.textAlign = 'right';

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
    console.log('[SystemNameEditor] afterGuiAttached called');
    if (this.eInput) {
      // Use setTimeout to ensure the DOM is fully ready
      setTimeout(() => {
        this.eInput.focus();
        this.eInput.select();
        this.isReady = true; // Now ready to accept blur events
        console.log(
          '[SystemNameEditor] Input focused and selected, isReady=true'
        );
      }, 50);
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
    console.log('[SystemNameEditor] onBlur called, isReady:', this.isReady);
    // Only stop editing if the editor is ready (prevents immediate close)
    if (this.isReady) {
      this.params.api.stopEditing();
    }
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
      width: 140,
      resizable: true,
      cellRenderer: CurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
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
          // CRITICAL: Use already-calculated customerPriceILS from each item
          // This ensures MSRP pricing, exchange rates, and profit coefficient are applied correctly
          const itemsTotal = systemItems.reduce((sum: number, item: any) => {
            return sum + (item.customerPriceILS || 0);
          }, 0);
          return itemsTotal * systemQuantity;
        }
        // CRITICAL: Use the already-calculated customerPriceILS from the item data
        // This value is calculated by calculateItemTotals() which handles MSRP, rates, and profit
        return valueParams.data.customerPriceILS || 0;
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
      width: 140,
      resizable: true,
      cellRenderer: CurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
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
      width: 140,
      resizable: true,
      cellRenderer: USDCurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
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
      width: 120,
      resizable: true,
      editable: (editParams: any) =>
        editParams.data?.isCustomItem && !editParams.data?.isSystemGroup, // ✅ Only custom items editable
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 0,
        precision: 0,
      },
      cellRenderer: CurrencyRenderer,
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
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
      resizable: true,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        min: 1,
        precision: 0,
      },
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
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
      width: 300,
      resizable: true,
      editable: (editParams: any) =>
        editParams.data?.isSystemGroup ||
        editParams.data?.isCustomItem ||
        editParams.data?.itemType === 'labor', // ✅ Labor items also editable
      cellEditor: SystemNameEditor, // ✅ Direct class assignment
      cellClass: cellParams =>
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
      cellStyle: { textAlign: 'right', direction: 'rtl' },
      cellRenderer: (cellParams: ICellRendererParams) => {
        if (cellParams.data?.isSystemGroup) {
          // System group row - render as bold text
          // Click handling is done via onCellClicked in QuotationItemsGrid
          return (
            <span
              className="font-bold w-full block text-right cursor-text hover:text-blue-600 hover:underline"
              style={{ direction: 'rtl' }}
              title="לחץ לעריכת שם המערכת"
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

        // Check if this component has MSRP pricing
        const hasMSRP =
          cellParams.data?.msrpPrice && cellParams.data?.msrpCurrency;

        // Check if this item should be editable (custom items or labor items)
        const isEditable =
          cellParams.data?.isCustomItem ||
          cellParams.data?.itemType === 'labor';

        // For editable items (custom/labor): display with edit cursor
        // Click handling is done via onCellClicked in QuotationItemsGrid
        if (isEditable) {
          return (
            <div
              className="cursor-text hover:text-blue-600 w-full text-right flex items-center gap-2"
              style={{ direction: 'rtl' }}
              title="לחץ לעריכת שם הפריט"
            >
              {hasMSRP && (
                <span
                  className="inline-flex items-center gap-1 text-purple-600"
                  title="רכיב מופץ - יש מחיר MSRP"
                >
                  🏷️
                </span>
              )}
              <span>{cellParams.value}</span>
            </div>
          );
        }

        // For regular component items: double-click opens component card (NOT editable inline)
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
            className="cursor-pointer hover:text-blue-600 w-full text-right flex items-center gap-2"
            style={{ direction: 'rtl' }}
            title="לחץ פעמיים לפתיחת כרטיס רכיב"
          >
            {hasMSRP && (
              <span
                className="inline-flex items-center gap-1 text-purple-600"
                title="רכיב מופץ - יש מחיר MSRP"
              >
                🏷️
              </span>
            )}
            <span>{cellParams.value}</span>
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
      headerName: 'תמחור MSRP',
      field: 'useMsrpPricing',
      width: 120,
      resizable: true,
      sortable: false,
      hide: false, // Ensure column is visible by default
      cellClass: 'text-center',
      cellRenderer: (cellParams: ICellRendererParams) => {
        // Debug logging for ALL items to understand full data structure
        logger.debug('[QuotationGrid] MSRP Toggle Cell Renderer called', {
          itemName: cellParams.data?.componentName,
          isSystemGroup: cellParams.data?.isSystemGroup,
          msrpPrice: cellParams.data?.msrpPrice,
          msrpCurrency: cellParams.data?.msrpCurrency,
          useMsrpPricing: cellParams.data?.useMsrpPricing,
          fullItemData: cellParams.data,
        });

        // Don't show for system groups
        if (cellParams.data?.isSystemGroup) {
          logger.debug('[QuotationGrid] Skipping - is system group');
          return null;
        }

        // Show toggle for items WITH MSRP data
        if (cellParams.data?.msrpPrice && cellParams.data?.msrpCurrency) {
          logger.debug('[QuotationGrid] Showing MSRP toggle button', {
            itemName: cellParams.data.componentName,
            msrpPrice: cellParams.data.msrpPrice,
            msrpCurrency: cellParams.data.msrpCurrency,
          });
          const isUsingMsrp = cellParams.data?.useMsrpPricing ?? false;

          return (
            <div className="flex items-center justify-center h-full">
              <Button
                size="sm"
                variant={isUsingMsrp ? 'default' : 'outline'}
                onClick={async () => {
                  // Toggle MSRP pricing for this item
                  const itemId = cellParams.data.id;
                  const newValue = !isUsingMsrp;

                  // Update in quotation state
                  if (currentQuotation) {
                    try {
                      const updatedItems = currentQuotation.items.map(item =>
                        item.id === itemId
                          ? { ...item, useMsrpPricing: newValue }
                          : item
                      );

                      const updatedQuotation = {
                        ...currentQuotation,
                        items: updatedItems,
                      };

                      setCurrentQuotation(updatedQuotation);
                      updateQuotation(currentQuotation.id, {
                        items: updatedItems,
                      });

                      // Update in database
                      await quotationsHook.updateQuotationItem(itemId, {
                        use_msrp_pricing: newValue,
                      });

                      logger.info('MSRP pricing toggled:', {
                        itemId,
                        newValue,
                      });
                    } catch (error) {
                      logger.error('Failed to toggle MSRP pricing:', error);
                      alert('שגיאה בעדכון תמחור MSRP. נסה שוב.');
                    }
                  }
                }}
                className="gap-1 text-xs whitespace-nowrap"
                title={
                  isUsingMsrp
                    ? 'משתמש במחיר MSRP - לחץ לשנות למחיר עלות+מרווח'
                    : 'משתמש במחיר עלות+מרווח - לחץ לשנות למחיר MSRP'
                }
              >
                {isUsingMsrp ? <>🏷️ MSRP</> : <>💰 עלות+מרווח</>}
              </Button>
            </div>
          );
        }

        // Show placeholder for items WITHOUT MSRP (so column doesn't collapse)
        logger.debug('[QuotationGrid] No MSRP - showing placeholder', {
          itemName: cellParams.data?.componentName,
        });
        return <span className="text-xs text-gray-400">—</span>;
      },
      headerComponent: CustomHeader,
      headerComponentParams: (headerParams: any) => ({
        displayName: 'תמחור MSRP',
        onMenuClick: handleColumnMenuClick,
        onFilterClick: handleFilterClick,
        api: headerParams.api,
        columnApi: headerParams.columnApi,
        column: headerParams.column,
      }),
    },
    {
      headerName: 'סוג',
      field: 'itemType',
      width: 100,
      resizable: true,
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
        cellParams.data?.isSystemGroup ? 'text-right' : 'text-right',
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
      resizable: true,
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
      width: 120, // Reduced back since button is now just a plus icon
      resizable: true,
      cellRenderer: (cellParams: ICellRendererParams) => {
        if (cellParams.data?.isSystemGroup) {
          const systemId = cellParams.data.systemId;
          const { onAddItemToSystem } = cellParams.context || {};

          if (onAddItemToSystem) {
            // System number as a button that shows + on hover
            return (
              <button
                className="system-number-btn font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 cursor-pointer transition-all duration-150 inline-flex items-center justify-center"
                style={{ minWidth: '2rem' }}
                onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  logger.debug('➕ Add Component button clicked', { systemId });
                  onAddItemToSystem(systemId);
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                title="הוסף רכיב למערכת"
                type="button"
              >
                <span className="number-text">{cellParams.value}</span>
                <span className="plus-icon" style={{ display: 'none' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>
            );
          }

          // Fallback if no onAddItemToSystem
          return (
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
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
        cellParams.data?.isSystemGroup
          ? 'ag-cell-bold text-right'
          : 'text-right',
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
      headerName: '',
      field: 'selection' as any, // Custom field for selection column
      width: 48,
      maxWidth: 48,
      minWidth: 48,
      pinned: 'right' as const, // In RTL, this appears on the left
      lockPosition: true,
      lockVisible: true,
      resizable: false,
      sortable: false,
      filter: false,
      suppressMenu: true,
      suppressMovable: true,
      suppressNavigable: true,
      cellRenderer: 'SelectionCheckboxRenderer', // Will be provided via framework components
      // cellRendererParams will be provided by the grid
      cellClass: 'selection-cell',
    },
  ];
};
