import { useCallback, useMemo, useEffect } from 'react';
import { useCPQ } from '../../contexts/CPQContext';
import { QuotationParameters } from './QuotationParameters';
import { renumberItems } from '../../utils/quotationCalculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { QuotationStatisticsPanelSimplified } from './QuotationStatisticsPanelSimplified';
import { logger } from '@/lib/logger';
import { useQuotationState } from '../../hooks/quotation/useQuotationState';
import { useQuotationActions } from '../../hooks/quotation/useQuotationActions';
import { useQuotationCalculations } from '../../hooks/quotation/useQuotationCalculations';
import { useQuotations } from '../../hooks/useQuotations';
import { useTableConfig } from '../../hooks/useTableConfig';
import { QuotationHeader } from './QuotationHeader';
import { QuotationItemsGrid } from './QuotationItemsGrid';
import { QuotationSummary } from './QuotationSummary';
import { AddItemDialog } from './AddItemDialog';
import { QuotationModals } from './QuotationModals';

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

  // Use table configuration hook
  const { config, saveConfig, loading } = useTableConfig('quotation_editor', {
    columnOrder: [
      'actions',
      'displayNumber',
      'componentName',
      'itemType',
      'laborSubtype',
      'quantity',
      'unitPriceILS',
      'totalPriceUSD',
      'totalPriceILS',
      'customerPriceILS',
    ],
    columnWidths: {},
    visibleColumns: [
      'actions',
      'displayNumber',
      'componentName',
      'itemType',
      'laborSubtype',
      'quantity',
      'unitPriceILS',
      'totalPriceUSD',
      'totalPriceILS',
      'customerPriceILS',
    ],
    filterState: {},
  });

  logger.debug('🔍 QuotationEditor config loaded:', config);

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

  // Open component selector popup
  const _openComponentSelector = useCallback(
    (systemId: string) => {
      state.setSelectedSystemId(systemId);
      state.setComponentSearchText('');
      state.setShowComponentSelector(true);
    },
    [state]
  );

  // Delete system handler
  const _deleteSystem = useCallback(
    async (systemId: string) => {
      if (!currentQuotation) return;

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

        // Remove from local state
        const updatedSystems = currentQuotation.systems
          .filter(s => s.id !== systemId)
          .map((s, index) => ({
            ...s,
            order: index + 1,
          }));

        const updatedItems = currentQuotation.items.filter(
          item => item.systemId !== systemId
        );

        // Renumber all items with new system orders
        const renumberedItems = renumberItems(updatedItems, updatedSystems);

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
    },
    [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation]
  );

  // TODO: Extract grid configuration to useQuotationGrid hook (Phase 5 continuation)
  // For now, using inline placeholder values to fix TypeScript error
  const gridData = currentQuotation?.items || [];
  const columnDefs: any[] = []; // TODO: Import from quotationGridColumns.ts
  const autoGroupColumnDef: any = {}; // TODO: Configure properly
  const gridOptions: any = {}; // TODO: Configure properly

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

  // Handle grid ready with config restoration
  const onGridReady = useCallback(
    (params: any) => {
      if (!params.api) return;

      // Apply saved column widths
      if (Object.keys(config.columnWidths).length > 0) {
        params.api.getAllDisplayedColumns()?.forEach((col: any) => {
          const fieldId = col.getColId();
          if (config.columnWidths[fieldId]) {
            params.api.setColumnWidth(
              col.getColId(),
              config.columnWidths[fieldId]
            );
          }
        });
      }

      // Apply saved filter state
      if (Object.keys(config.filterState).length > 0) {
        params.api.setFilterModel(config.filterState);
      }

      params.api.sizeColumnsToFit();
    },
    [config.columnWidths, config.filterState]
  );

  // Handle column resize
  const onColumnResized = useCallback(
    (params: any) => {
      if (params.finished && params.api) {
        const widths: Record<string, number> = {};
        params.api.getAllDisplayedColumns()?.forEach((col: any) => {
          widths[col.getColId()] = col.getActualWidth();
        });
        saveConfig({ columnWidths: widths });
      }
    },
    [saveConfig]
  );

  // Handle column move
  const onColumnMoved = useCallback(
    (params: any) => {
      if (params.finished && params.api) {
        const order =
          params.api
            .getAllDisplayedColumns()
            ?.map((col: any) => col.getColId()) || [];
        saveConfig({ columnOrder: order });
      }
    },
    [saveConfig]
  );

  // Handle filter change
  const onFilterChanged = useCallback(
    (params: any) => {
      saveConfig({ filterState: params.api.getFilterModel() });
    },
    [saveConfig]
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading table configuration...
      </div>
    );
  }

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
            autoGroupColumnDef={autoGroupColumnDef}
            gridOptions={gridOptions}
            onGridReady={onGridReady}
            onColumnResized={onColumnResized}
            onColumnMoved={onColumnMoved}
            onFilterChanged={onFilterChanged}
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
