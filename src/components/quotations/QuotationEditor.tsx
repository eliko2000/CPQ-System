import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useCPQ } from '../../contexts/CPQContext';
import { QuotationParameters } from './QuotationParameters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { QuotationStatisticsPanelSimplified } from './QuotationStatisticsPanelSimplified';
import { logger } from '@/lib/logger';
import { useQuotationState } from '../../hooks/quotation/useQuotationState';
import { useQuotationActions } from '../../hooks/quotation/useQuotationActions';
import { useQuotationCalculations } from '../../hooks/quotation/useQuotationCalculations';
import { useQuotations } from '../../hooks/useQuotations';
import { useLaborTypes } from '../../hooks/useLaborTypes';
// NOTE: useTableConfig is handled ONLY in QuotationItemsGrid to avoid duplicate hook race conditions
import { QuotationHeader } from './QuotationHeader';
import { QuotationItemsGrid } from './QuotationItemsGrid';
import { QuotationSummary } from './QuotationSummary';
import { AddItemDialog } from './AddItemDialog';
import { QuotationModals } from './QuotationModals';
import { createQuotationItemColumnDefs } from './quotationItemGridColumns';
import { calculateItemTotals } from '../../utils/quotationCalculations';
import { useGridSelection } from '../../hooks/useGridSelection';
import { FloatingActionToolbar } from '../grid/FloatingActionToolbar';
import { GridAction } from '../../types/grid.types';
import { QuotationSystem } from '../../types/quotation.types';
import { convertDbQuotationToQuotationProject } from '../../lib/utils';
import { Edit, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { AgGridReact } from 'ag-grid-react';

export function QuotationEditor() {
  const {
    currentQuotation,
    components,
    assemblies,
    setCurrentQuotation,
    updateQuotation,
    setModal,
    modalState,
    closeModal,
  } = useCPQ();

  // Use quotations hook for Supabase persistence
  const quotationsHook = useQuotations();

  // Load labor types
  const { laborTypes } = useLaborTypes();

  // NOTE: Table configuration (useTableConfig) is handled ONLY in QuotationItemsGrid
  // to avoid duplicate hook calls causing race conditions and resize issues

  // Make components available globally for the LibrarySearchEditor
  useEffect(() => {
    (window as any).__cpq_components = components;
  }, [components]);

  // State management
  const state = useQuotationState();

  // Grid reference for AG Grid API access
  const gridRef = useRef<AgGridReact>(null);

  // Initialize grid selection hook
  const selection = useGridSelection({
    gridApi: gridRef.current?.api,
    getRowId: item => item.id,
  });

  // Force refresh row styles when selection changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.redrawRows();
    }
  }, [selection.selectedIds]);

  // Actions
  const actions = useQuotationActions({
    currentQuotation,
    setCurrentQuotation,
    updateQuotation,
    selectedSystemId: state.selectedSystemId,
    setShowComponentSelector: state.setShowComponentSelector,
  });

  // Calculations
  const { calculations, statistics } =
    useQuotationCalculations(currentQuotation);

  // TODO Phase 5: Wire up openComponentSelector and deleteSystem handlers to UI components
  // These handlers were extracted during refactoring but not yet connected to the new modular components

  // Open component selector popup
  const openComponentSelector = useCallback(
    (systemId: string) => {
      state.setSelectedSystemId(systemId);
      state.setComponentSearchText('');
      state.setShowComponentSelector(true);
    },
    [state]
  );

  // Delete item
  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!currentQuotation) return;

      // Delete from Supabase first
      try {
        await quotationsHook.deleteQuotationItem(itemId);
      } catch (error) {
        logger.error('Failed to delete item:', error);
      }

      // Remove from local state
      const updatedItems = currentQuotation.items.filter(
        item => item.id !== itemId
      );

      // Renumber items
      const { renumberItems: renumber } = await import(
        '../../utils/quotationCalculations'
      );
      const renumberedItems = renumber(updatedItems);

      const updatedQuotation = {
        ...currentQuotation,
        items: renumberedItems,
      };

      setCurrentQuotation(updatedQuotation);
      updateQuotation(currentQuotation.id, { items: renumberedItems });
    },
    [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (__selectedIds: string[], selectedData: any[]) => {
      if (!currentQuotation) return;

      // Separate system rows and component items
      const systemRows = selectedData.filter(item => item.isSystemGroup);
      const itemsToDelete = selectedData.filter(item => !item.isSystemGroup);

      // If only systems selected, delete the systems
      if (systemRows.length > 0 && itemsToDelete.length === 0) {
        // Delete systems
        for (const systemRow of systemRows) {
          const systemId = systemRow.systemId;

          try {
            // Delete all items in this system
            const itemsInSystem = currentQuotation.items.filter(
              item => item.systemId === systemId
            );
            for (const item of itemsInSystem) {
              await quotationsHook.deleteQuotationItem(item.id);
            }

            // Delete the system itself
            await quotationsHook.deleteQuotationSystem(systemId);
          } catch (error) {
            logger.error('Failed to delete system:', error);
          }
        }

        // Update local state
        const deletedSystemIds = systemRows.map(s => s.systemId);
        const updatedSystems = currentQuotation.systems
          .filter(s => !deletedSystemIds.includes(s.id))
          .map((s, index) => ({
            ...s,
            order: index + 1,
          }));

        const updatedItems = currentQuotation.items.filter(
          item => !deletedSystemIds.includes(item.systemId)
        );

        // Renumber items
        const { renumberItems: renumber } = await import(
          '../../utils/quotationCalculations'
        );
        const renumberedItems = renumber(updatedItems, updatedSystems);

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

        toast.success(`${systemRows.length} מערכות נמחקו בהצלחה`);
        selection.clearSelection();
        return;
      }

      // Filter out system rows (only delete component items)
      if (itemsToDelete.length === 0) {
        toast.warning('לא ניתן למחוק רק שורות מערכת');
        return;
      }

      // Delete from Supabase
      for (const item of itemsToDelete) {
        try {
          await quotationsHook.deleteQuotationItem(item.id);
        } catch (error) {
          logger.error('Failed to delete item:', error);
        }
      }

      // Remove from local state
      const deletedIds = itemsToDelete.map(item => item.id);
      const updatedItems = currentQuotation.items.filter(
        item => !deletedIds.includes(item.id)
      );

      // Renumber items
      const { renumberItems: renumber } = await import(
        '../../utils/quotationCalculations'
      );
      const renumberedItems = renumber(updatedItems);

      const updatedQuotation = {
        ...currentQuotation,
        items: renumberedItems,
      };

      setCurrentQuotation(updatedQuotation);
      updateQuotation(currentQuotation.id, { items: renumberedItems });

      toast.success(`${itemsToDelete.length} פריטים נמחקו בהצלחה`);
      selection.clearSelection();
    },
    [
      currentQuotation,
      quotationsHook,
      setCurrentQuotation,
      updateQuotation,
      selection,
    ]
  );

  // Define grid actions for floating toolbar - filtered based on selection type
  const gridActions = useMemo<GridAction[]>(() => {
    const selectedData = selection.selectedData;
    const hasSystemRows = selectedData.some((item: any) => item.isSystemGroup);
    const hasComponentItems = selectedData.some(
      (item: any) => !item.isSystemGroup
    );

    const actions: GridAction[] = [];

    // Edit action (only show for component items, not systems)
    if (!hasSystemRows && hasComponentItems) {
      actions.push({
        type: 'edit',
        label: 'ערוך',
        icon: Edit,
        variant: 'outline',
        singleOnly: true,
        handler: async (__ids, data) => {
          if (data.length === 1 && !data[0].isSystemGroup) {
            const item = data[0];
            const component = components.find(c => c.id === item.componentId);
            if (component) {
              setModal({ type: 'edit-component', data: component });
            }
          }
        },
      });
    }

    // Duplicate action (only show for system rows, not component items)
    if (hasSystemRows && !hasComponentItems) {
      actions.push({
        type: 'duplicate',
        label: 'שכפל מערכת',
        icon: Copy,
        variant: 'outline',
        handler: async (__ids, data) => {
          if (!currentQuotation) return;

          const systemsToDuplicate = data.filter(item => item.isSystemGroup);
          const itemsToDuplicate = data.filter(item => !item.isSystemGroup);

          // Only allow duplicating systems, not individual items
          if (itemsToDuplicate.length > 0) {
            toast.warning('ניתן לשכפל רק מערכות שלמות, לא פריטים בודדים');
            return;
          }

          if (systemsToDuplicate.length === 0) {
            toast.warning('אנא בחר מערכת לשכפול');
            return;
          }

          let successCount = 0;

          try {
            // Duplicate systems (with all their items)
            for (const systemRow of systemsToDuplicate) {
              const sourceSystem = currentQuotation.systems.find(
                s => s.id === systemRow.systemId
              );
              if (!sourceSystem) continue;

              // Create new system in database
              const newSystemOrder = currentQuotation.systems.length + 1;
              const dbSystem = await quotationsHook.addQuotationSystem({
                quotation_id: currentQuotation.id,
                system_name: `${sourceSystem.name} (עותק)`,
                system_description: sourceSystem.description || '',
                quantity: sourceSystem.quantity,
                sort_order: newSystemOrder,
                unit_cost: 0,
                total_cost: 0,
                unit_price: 0,
                total_price: 0,
              });

              if (!dbSystem) {
                logger.error('Failed to create duplicated system');
                continue;
              }

              // Create local system object
              const newSystem: QuotationSystem = {
                id: dbSystem.id,
                name: dbSystem.system_name,
                description: dbSystem.system_description || '',
                order: dbSystem.sort_order,
                quantity: dbSystem.quantity,
                createdAt: dbSystem.created_at,
              };

              // Duplicate all items in this system
              const itemsInSystem = currentQuotation.items.filter(
                item => item.systemId === systemRow.systemId
              );

              for (const sourceItem of itemsInSystem) {
                await quotationsHook.addQuotationItem({
                  quotation_system_id: newSystem.id,
                  component_id: sourceItem.componentId,
                  assembly_id: sourceItem.assemblyId,
                  item_name: sourceItem.componentName,
                  item_type: sourceItem.itemType,
                  labor_subtype: sourceItem.laborSubtype,
                  quantity: sourceItem.quantity,
                  unit_cost: sourceItem.unitPriceILS || 0,
                  total_cost: sourceItem.totalPriceILS || 0,
                  margin_percentage: currentQuotation.parameters.profitPercent,
                  unit_price: sourceItem.unitPriceILS || 0,
                  total_price: sourceItem.totalPriceILS || 0,
                  original_currency: sourceItem.originalCurrency,
                  original_cost: sourceItem.originalCost,
                  notes: sourceItem.notes,
                  sort_order: sourceItem.itemOrder,
                  is_custom_item: sourceItem.isCustomItem,
                  msrp_price: sourceItem.msrpPrice,
                  msrp_currency: sourceItem.msrpCurrency,
                  use_msrp_pricing: sourceItem.useMsrpPricing,
                });
              }

              // Update local state
              const updatedQuotation = {
                ...currentQuotation,
                systems: [...currentQuotation.systems, newSystem],
              };
              setCurrentQuotation(updatedQuotation);

              successCount++;
            }

            // Reload quotation to get fresh data with all duplicated items
            if (currentQuotation.id) {
              const refreshed = await quotationsHook.getQuotation(
                currentQuotation.id
              );
              if (refreshed) {
                const quotationProject =
                  convertDbQuotationToQuotationProject(refreshed);
                setCurrentQuotation(quotationProject);
              }
            }

            if (successCount > 0) {
              toast.success(`${successCount} מערכות שוכפלו בהצלחה`);
            }
          } catch (error) {
            logger.error('Failed to duplicate:', error);
            toast.error('שגיאה בשכפול. נסה שוב.');
          } finally {
            selection.clearSelection();
          }
        },
      });
    }

    // Delete action (works for single or multiple, non-system rows only)
    actions.push({
      type: 'delete',
      label: 'מחק',
      icon: Trash2,
      variant: 'destructive',
      confirmRequired: true,
      handler: handleBulkDelete,
    });

    return actions;
  }, [
    components,
    setModal,
    currentQuotation,
    setCurrentQuotation,
    updateQuotation,
    handleBulkDelete,
    selection.selectedData,
  ]);

  // Prepare grid data with tree structure
  const gridData = useMemo(() => {
    if (!currentQuotation) return [];

    const data: any[] = [];

    // Defensive: ensure systems and items arrays exist
    const systems = currentQuotation.systems || [];
    const items = currentQuotation.items || [];

    // Create tree structure with systems as parent nodes
    systems.forEach(system => {
      const systemItems = items.filter(item => item.systemId === system.id);

      // Calculate system totals using calculateItemTotals for consistency
      const systemTotalCost = systemItems.reduce(
        (sum, item) => sum + (item.unitPriceILS || 0) * (item.quantity || 1),
        0
      );

      // Calculate system customer price using the centralized calculation
      const systemCustomerPrice = systemItems.reduce((sum, item) => {
        const calculatedItem = calculateItemTotals(
          item,
          currentQuotation.parameters
        );
        return sum + calculatedItem.customerPriceILS;
      }, 0);

      // Create system node
      const systemNode = {
        id: system.id,
        systemName: system.name,
        systemId: system.id,
        isSystemGroup: true,
        displayNumber: system.order.toString(),
        componentName: system.name,
        componentCategory: 'מערכת',
        quantity: system.quantity || 1,
        unitPriceUSD: 0,
        unitPriceILS: 0,
        totalPriceUSD:
          systemItems.reduce(
            (sum, item) =>
              sum + (item.unitPriceUSD || 0) * (item.quantity || 1),
            0
          ) * (system.quantity || 1),
        totalPriceILS: systemTotalCost * (system.quantity || 1),
        customerPriceILS: systemCustomerPrice * (system.quantity || 1),
        notes: system.description || '',
      };

      data.push(systemNode);

      // Add existing items with updated customer prices
      systemItems.forEach(item => {
        // CRITICAL: Use calculateItemTotals for consistent pricing logic
        // This ensures MSRP toggle, exchange rates, and profit coefficient are all applied correctly
        const calculatedItem = calculateItemTotals(
          item,
          currentQuotation.parameters
        );

        data.push({
          ...calculatedItem,
          systemName: system.name,
        });
      });
    });

    return data;
  }, [currentQuotation]);

  // Get unique values for filtering
  const getUniqueValues = useCallback(
    (field: string): string[] => {
      if (!currentQuotation) return [];
      const values = currentQuotation.items
        .map(item => String(item[field as keyof typeof item] || ''))
        .filter(Boolean);
      return Array.from(new Set(values)).sort();
    },
    [currentQuotation]
  );

  // Handle column menu click
  const handleColumnMenuClick = useCallback((columnId: string) => {
    logger.debug('Column menu clicked:', columnId);
  }, []);

  // Handle filter click
  const handleFilterClick = useCallback((columnId: string) => {
    logger.debug('Filter clicked:', columnId);
  }, []);

  // Grid column definitions
  const columnDefs = useMemo(() => {
    logger.debug('🔧 Creating column definitions with functions:', {
      openComponentSelector: typeof openComponentSelector,
      deleteItem: typeof deleteItem,
      setModal: typeof setModal,
      componentsCount: components?.length,
      assembliesCount: assemblies?.length,
    });

    const baseCols = createQuotationItemColumnDefs({
      currentQuotation,
      gridData,
      getUniqueValues,
      handleColumnMenuClick,
      handleFilterClick,
      components,
      assemblies,
      setModal,
      setSelectedAssemblyForDetail: state.setSelectedAssemblyForDetail,
      setShowAssemblyDetail: state.setShowAssemblyDetail,
      quotationsHook,
      setCurrentQuotation,
      updateQuotation,
    });

    // Add cellRendererParams to selection column
    return baseCols.map(col => {
      if (col.field === 'selection') {
        return {
          ...col,
          cellRendererParams: {
            onSelectionToggle: selection.toggleSelection,
            isSelected: selection.isSelected,
          },
        };
      }
      return col;
    });
  }, [
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
    state.setSelectedAssemblyForDetail,
    state.setShowAssemblyDetail,
    quotationsHook,
    setCurrentQuotation,
    updateQuotation,
    selection.toggleSelection,
    selection.isSelected,
  ]);

  // Filter components for popup
  const filteredComponents = useMemo(() => {
    if (!state.componentSearchText) return components;
    return components.filter(
      comp =>
        comp.name
          .toLowerCase()
          .includes(state.componentSearchText.toLowerCase()) ||
        comp.manufacturer
          ?.toLowerCase()
          .includes(state.componentSearchText.toLowerCase()) ||
        comp.category
          ?.toLowerCase()
          .includes(state.componentSearchText.toLowerCase())
    );
  }, [components, state.componentSearchText]);

  // Filter assemblies for popup
  const filteredAssemblies = useMemo(() => {
    if (!state.componentSearchText) return assemblies;
    return assemblies.filter(
      asm =>
        asm.name
          .toLowerCase()
          .includes(state.componentSearchText.toLowerCase()) ||
        asm.description
          ?.toLowerCase()
          .includes(state.componentSearchText.toLowerCase())
    );
  }, [assemblies, state.componentSearchText]);

  // Filter labor types for popup
  const filteredLaborTypes = useMemo(() => {
    if (!state.componentSearchText) return laborTypes;
    return laborTypes.filter(
      labor =>
        labor.name
          .toLowerCase()
          .includes(state.componentSearchText.toLowerCase()) ||
        labor.description
          ?.toLowerCase()
          .includes(state.componentSearchText.toLowerCase()) ||
        labor.laborSubtype
          .toLowerCase()
          .includes(state.componentSearchText.toLowerCase())
    );
  }, [laborTypes, state.componentSearchText]);

  // NOTE: Grid event handlers (onGridReady, onColumnResized, onColumnMoved, onFilterChanged)
  // are now handled internally by QuotationItemsGrid to avoid duplicate useTableConfig hook calls

  // Handle cell value changes
  const onCellValueChanged = useCallback(
    (params: any) => {
      if (params.data.isSystemGroup) {
        // Handle system quantity changes
        if (params.colDef.field === 'quantity') {
          const newQuantity = params.newValue;
          const updatedSystems = currentQuotation?.systems.map(s =>
            s.id === params.data.systemId ? { ...s, quantity: newQuantity } : s
          );
          if (updatedSystems) {
            setCurrentQuotation(
              currentQuotation
                ? { ...currentQuotation, systems: updatedSystems }
                : null
            );
            // Persist to database
            quotationsHook.updateQuotationSystem(params.data.systemId, {
              quantity: newQuantity,
            });
          }
        }
        // Handle system name changes
        else if (params.colDef.field === 'componentName') {
          const newName = params.newValue;
          const updatedSystems = currentQuotation?.systems.map(s =>
            s.id === params.data.systemId ? { ...s, name: newName } : s
          );
          if (updatedSystems) {
            setCurrentQuotation(
              currentQuotation
                ? { ...currentQuotation, systems: updatedSystems }
                : null
            );
            // Persist to database
            quotationsHook.updateQuotationSystem(params.data.systemId, {
              system_name: newName,
            });
          }
        }
        return;
      }

      actions.updateItem(params.data.id, {
        [params.colDef.field]: params.newValue,
      });
    },
    [
      actions.updateItem,
      currentQuotation,
      setCurrentQuotation,
      updateQuotation,
      quotationsHook,
    ]
  );

  // Handle double-click to open component card
  const onCellDoubleClicked = useCallback(
    (params: any) => {
      // Only open component cards for non-system rows
      if (!params.data.isSystemGroup && params.data.componentName) {
        // Find the component in the library
        const component = components.find(
          comp => comp.name === params.data.componentName
        );
        if (component) {
          // Open component form modal for editing/viewing
          setModal({ type: 'edit-component', data: component });
        }
      }
    },
    [components, setModal]
  );

  // NOTE: Loading state for table config is now handled by QuotationItemsGrid

  if (!currentQuotation) {
    return (
      <div className="flex items-center justify-center h-64">
        No quotation selected
      </div>
    );
  }

  // Guard: Ensure parameters exists
  if (!currentQuotation.parameters) {
    return (
      <div className="flex items-center justify-center h-64">
        Quotation data is incomplete (missing parameters)
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <QuotationHeader
        quotation={currentQuotation}
        onClose={actions.handleClose}
        onProjectPickerOpen={() => state.setShowProjectPicker(true)}
      />

      {/* Parameters */}
      <QuotationParameters
        parameters={currentQuotation.parameters}
        onChange={actions.updateParameters}
      />

      {/* Tabs for Items and Statistics */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="items">פריטי הצעת מחיר</TabsTrigger>
          <TabsTrigger value="statistics">סטטיסטיקה</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
          {/* Systems and Items Grid */}
          <QuotationItemsGrid
            gridRef={gridRef}
            gridData={gridData}
            columnDefs={columnDefs}
            onCellValueChanged={onCellValueChanged}
            onCellDoubleClicked={onCellDoubleClicked}
            onSelectionChanged={e =>
              state.setSelectedItems(
                e.api.getSelectedRows().map((row: any) => row.id)
              )
            }
            onAddSystem={actions.addSystem}
            onAddItemToSystem={openComponentSelector}
            selection={selection}
          />

          {/* Calculations Summary */}
          {calculations && (
            <QuotationSummary
              quotation={currentQuotation}
              calculations={calculations}
              selectedItemsCount={state.selectedItems.length}
            />
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          {statistics ? (
            <QuotationStatisticsPanelSimplified statistics={statistics} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">אין נתונים סטטיסטיים זמינים</p>
              <p className="text-sm text-gray-400 mt-2">
                הוסף פריטים להצעת המחיר כדי לראות סטטיסטיקה
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Floating Action Toolbar */}
      <FloatingActionToolbar
        selectedCount={selection.selectionCount}
        actions={gridActions}
        onClear={selection.clearSelection}
        onAction={selection.handleAction}
      />

      {/* Component/Assembly Selector Dialog */}
      <AddItemDialog
        isOpen={state.showComponentSelector}
        onClose={() => state.setShowComponentSelector(false)}
        tab={state.selectorTab}
        onTabChange={state.setSelectorTab}
        searchText={state.componentSearchText}
        onSearchChange={state.setComponentSearchText}
        components={components}
        assemblies={assemblies}
        laborTypes={laborTypes}
        filteredComponents={filteredComponents}
        filteredAssemblies={filteredAssemblies}
        filteredLaborTypes={filteredLaborTypes}
        onAddComponent={actions.addComponentToSystem}
        onAddAssembly={actions.addAssemblyToSystem}
        onAddLabor={actions.addLaborTypeToSystem}
        onAddCustomItem={actions.addCustomItemToSystem}
        defaultMarkup={currentQuotation?.parameters?.markupPercent}
        dayWorkCost={currentQuotation?.parameters?.dayWorkCost || 0}
      />

      {/* Modals */}
      <QuotationModals
        modalState={modalState}
        closeModal={closeModal}
        onComponentUpdate={updatedComponent => {
          // When a component is updated from within the quotation editor,
          // sync ALL pricing data to any quotation items using that component
          if (currentQuotation) {
            const updatedItems = currentQuotation.items.map(item => {
              if (item.componentId === updatedComponent.id) {
                // Sync all pricing fields from component to quotation item
                const updatedItem = {
                  ...item,
                  // Cost prices
                  unitPriceUSD: updatedComponent.unitCostUSD || 0,
                  unitPriceILS: updatedComponent.unitCostNIS || 0,
                  unitPriceEUR: updatedComponent.unitCostEUR || 0,
                  // Totals (recalculate based on quantity)
                  totalPriceUSD:
                    (updatedComponent.unitCostUSD || 0) * item.quantity,
                  totalPriceILS:
                    (updatedComponent.unitCostNIS || 0) * item.quantity,
                  // Original currency tracking
                  originalCurrency: updatedComponent.currency,
                  originalCost: updatedComponent.originalCost,
                  // MSRP data
                  msrpPrice: updatedComponent.msrpPrice,
                  msrpCurrency: updatedComponent.msrpCurrency,
                };

                return updatedItem;
              }
              return item;
            });

            // Update quotation with new item prices
            const updatedQuotation = {
              ...currentQuotation,
              items: updatedItems,
            };

            setCurrentQuotation(updatedQuotation);

            // Persist each updated item to database
            const itemsToUpdate = updatedItems.filter(
              item => item.componentId === updatedComponent.id
            );
            itemsToUpdate.forEach(async item => {
              try {
                await quotationsHook.updateQuotationItem(item.id, {
                  unit_cost: item.unitPriceILS,
                  total_cost: item.totalPriceILS,
                  unit_price: item.unitPriceILS,
                  total_price: item.totalPriceILS,
                  original_currency: item.originalCurrency,
                  original_cost: item.originalCost,
                  msrp_price: item.msrpPrice,
                  msrp_currency: item.msrpCurrency,
                });
              } catch (error) {
                logger.error('Failed to update quotation item prices:', error);
              }
            });
          }
        }}
        showProjectPicker={state.showProjectPicker}
        onProjectPickerClose={() => state.setShowProjectPicker(false)}
        onProjectSelect={actions.handleProjectSelect}
        currentProjectId={currentQuotation?.projectId}
        showAssemblyDetail={state.showAssemblyDetail}
        selectedAssemblyForDetail={state.selectedAssemblyForDetail}
        onAssemblyDetailClose={() => {
          state.setShowAssemblyDetail(false);
          state.setSelectedAssemblyForDetail(null);
        }}
      />
    </div>
  );
}
