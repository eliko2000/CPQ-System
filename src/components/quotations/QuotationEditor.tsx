import { useCallback, useMemo, useEffect } from 'react';
import { useCPQ } from '../../contexts/CPQContext';
import { QuotationParameters } from './QuotationParameters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { QuotationStatisticsPanelSimplified } from './QuotationStatisticsPanelSimplified';
import { logger } from '@/lib/logger';
import { useQuotationState } from '../../hooks/quotation/useQuotationState';
import { useQuotationActions } from '../../hooks/quotation/useQuotationActions';
import { useQuotationCalculations } from '../../hooks/quotation/useQuotationCalculations';
import { useQuotations } from '../../hooks/useQuotations';
// NOTE: useTableConfig is handled ONLY in QuotationItemsGrid to avoid duplicate hook race conditions
import { QuotationHeader } from './QuotationHeader';
import { QuotationItemsGrid } from './QuotationItemsGrid';
import { QuotationSummary } from './QuotationSummary';
import { AddItemDialog } from './AddItemDialog';
import { QuotationModals } from './QuotationModals';
import { createQuotationItemColumnDefs } from './quotationItemGridColumns';

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

  // NOTE: Table configuration (useTableConfig) is handled ONLY in QuotationItemsGrid
  // to avoid duplicate hook calls causing race conditions and resize issues

  // Make components available globally for the LibrarySearchEditor
  useEffect(() => {
    (window as any).__cpq_components = components;
  }, [components]);

  // State management
  const state = useQuotationState();

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

  // Prepare grid data with tree structure
  const gridData = useMemo(() => {
    if (!currentQuotation) return [];

    const data: any[] = [];
    const profitCoefficient =
      currentQuotation.parameters?.markupPercent ?? 0.75;

    // Defensive: ensure systems and items arrays exist
    const systems = currentQuotation.systems || [];
    const items = currentQuotation.items || [];

    // Create tree structure with systems as parent nodes
    systems.forEach(system => {
      const systemItems = items.filter(item => item.systemId === system.id);

      // Calculate system totals with current profit coefficient
      const systemTotalCost = systemItems.reduce(
        (sum, item) => sum + (item.unitPriceILS || 0) * (item.quantity || 1),
        0
      );
      const systemCustomerPrice = systemTotalCost / profitCoefficient;

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
        const unitPrice = item.unitPriceILS || 0;
        const quantity = item.quantity || 1;
        const customerPrice = (unitPrice * quantity) / profitCoefficient;

        data.push({
          ...item,
          systemName: system.name,
          customerPriceILS: customerPrice,
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
  const columnDefs = useMemo(
    () =>
      createQuotationItemColumnDefs({
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
        setSelectedAssemblyForDetail: state.setSelectedAssemblyForDetail,
        setShowAssemblyDetail: state.setShowAssemblyDetail,
        quotationsHook,
        setCurrentQuotation,
        updateQuotation,
      }),
    [
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
    ]
  );

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
        filteredComponents={filteredComponents}
        filteredAssemblies={filteredAssemblies}
        onAddComponent={actions.addComponentToSystem}
        onAddAssembly={actions.addAssemblyToSystem}
        onAddCustomItem={actions.addCustomItemToSystem}
        defaultMarkup={currentQuotation?.parameters?.markupPercent}
      />

      {/* Modals */}
      <QuotationModals
        modalState={modalState}
        closeModal={closeModal}
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
