import { useCallback } from 'react';
import {
  QuotationProject,
  QuotationSystem,
  QuotationItem,
  Component,
  Assembly,
} from '../../types';
import {
  convertToAllCurrencies,
  type ExchangeRates,
  detectOriginalCurrency,
} from '../../utils/currencyConversion';
import { calculateAssemblyPricing } from '../../utils/assemblyCalculations';
import { renumberItems } from '../../utils/quotationCalculations';
import { useQuotations } from '../useQuotations';
import { logger } from '@/lib/logger';
import { CustomItemData } from '../../components/quotations/CustomItemForm';

export interface QuotationActionsProps {
  currentQuotation: QuotationProject | null;
  setCurrentQuotation: (quotation: QuotationProject | null) => void;
  updateQuotation: (id: string, updates: Partial<QuotationProject>) => void;
  selectedSystemId: string;
  setShowComponentSelector: (show: boolean) => void;
}

export function useQuotationActions({
  currentQuotation,
  setCurrentQuotation,
  updateQuotation,
  selectedSystemId,
  setShowComponentSelector,
}: QuotationActionsProps) {
  const quotationsHook = useQuotations();

  // Add a new system
  const addSystem = useCallback(async () => {
    if (!currentQuotation) return;

    const systemOrder = currentQuotation.systems.length + 1;

    // Persist system to Supabase FIRST to get real ID
    try {
      const dbSystem = await quotationsHook.addQuotationSystem({
        quotation_id: currentQuotation.id,
        system_name: `מערכת ${systemOrder}`,
        system_description: '',
        quantity: 1,
        sort_order: systemOrder,
        unit_cost: 0,
        total_cost: 0,
        unit_price: 0,
        total_price: 0,
      });

      if (!dbSystem) {
        throw new Error('Failed to create system');
      }

      // Create local system with DB ID
      const newSystem: QuotationSystem = {
        id: dbSystem.id,
        name: dbSystem.system_name,
        description: dbSystem.system_description || '',
        order: dbSystem.sort_order,
        quantity: dbSystem.quantity,
        createdAt: dbSystem.created_at,
      };

      const updatedQuotation = {
        ...currentQuotation,
        systems: [...currentQuotation.systems, newSystem],
      };

      setCurrentQuotation(updatedQuotation);
      updateQuotation(currentQuotation.id, {
        systems: updatedQuotation.systems,
      });
    } catch (error) {
      logger.error('Failed to save system:', error);
      alert('שגיאה בהוספת מערכת. נסה שוב.');
    }
  }, [currentQuotation, setCurrentQuotation, updateQuotation, quotationsHook]);

  // Add selected component to system
  const addComponentToSystem = useCallback(
    async (component: Component) => {
      if (!currentQuotation || !selectedSystemId) return;

      const system = currentQuotation.systems.find(
        s => s.id === selectedSystemId
      );
      if (!system) return;

      const itemOrder =
        currentQuotation.items.filter(
          item => item.systemId === selectedSystemId
        ).length + 1;

      // CRITICAL: Use component's ORIGINAL currency and convert to other currencies
      // using the quotation's current exchange rates
      const quotationRates: ExchangeRates = {
        usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
        eurToIlsRate: currentQuotation.parameters.eurToIlsRate,
      };

      // Convert from original currency to all currencies using quotation rates
      const convertedPrices = convertToAllCurrencies(
        component.originalCost,
        component.currency,
        quotationRates
      );

      // DEBUG: Log component prices being used
      logger.debug('💰 [CURRENCY-ADD] Adding component to quotation:', {
        componentName: component.name,
        componentFromLibrary: {
          unitCostILS: component.unitCostNIS,
          unitCostUSD: component.unitCostUSD,
          unitCostEUR: component.unitCostEUR,
          detectedCurrency: component.currency,
          detectedOriginalCost: component.originalCost,
        },
        quotationRates,
        convertedPrices,
        willSaveToQuotation: {
          unitPriceILS: convertedPrices.unitCostNIS,
          unitPriceUSD: convertedPrices.unitCostUSD,
          unitPriceEUR: convertedPrices.unitCostEUR,
          originalCurrency: component.currency,
          originalCost: component.originalCost,
        },
      });

      // Persist item to Supabase FIRST to get real ID
      try {
        const dbItem = await quotationsHook.addQuotationItem({
          quotation_system_id: selectedSystemId,
          component_id: component.id,
          item_name: component.name,
          manufacturer: component.manufacturer,
          manufacturer_part_number: component.manufacturerPN,
          item_type: component.componentType || 'hardware',
          labor_subtype: component.laborSubtype,
          quantity: 1,
          unit_cost: convertedPrices.unitCostNIS,
          total_cost: convertedPrices.unitCostNIS,
          unit_price: convertedPrices.unitCostNIS,
          total_price: convertedPrices.unitCostNIS,
          margin_percentage: currentQuotation.parameters.markupPercent || 0.75,
          sort_order: itemOrder,
          // CRITICAL: Save original currency and cost for proper exchange rate handling
          original_currency: component.currency,
          original_cost: component.originalCost,
        });

        if (!dbItem) {
          throw new Error('Failed to create item');
        }

        // Create local item with DB ID and converted prices from original currency
        const newItem: QuotationItem = {
          id: dbItem.id,
          systemId: selectedSystemId,
          systemOrder: system.order,
          itemOrder: itemOrder,
          displayNumber: `${system.order}.${itemOrder}`,
          componentId: component.id,
          componentName: component.name,
          componentCategory: component.category,
          itemType: component.componentType || 'hardware',
          laborSubtype: component.laborSubtype, // Inherit from component library
          quantity: dbItem.quantity,
          unitPriceUSD: convertedPrices.unitCostUSD,
          unitPriceILS: convertedPrices.unitCostNIS,
          unitPriceEUR: convertedPrices.unitCostEUR,
          totalPriceUSD: convertedPrices.unitCostUSD * dbItem.quantity,
          totalPriceILS: convertedPrices.unitCostNIS * dbItem.quantity,
          // Store original currency to preserve it when exchange rates change
          originalCurrency: component.currency,
          originalCost: component.originalCost,
          itemMarkupPercent: dbItem.margin_percentage || 25,
          customerPriceILS: dbItem.total_price || 0,
          notes: dbItem.notes || '',
          createdAt: dbItem.created_at,
          updatedAt: dbItem.updated_at,
        };

        // Renumber items after adding component
        const updatedItems = [...currentQuotation.items, newItem];
        const renumberedItems = renumberItems(updatedItems);

        const updatedQuotation = {
          ...currentQuotation,
          items: renumberedItems,
        };

        setCurrentQuotation(updatedQuotation);
        updateQuotation(currentQuotation.id, { items: renumberedItems });
        setShowComponentSelector(false);
      } catch (error) {
        logger.error('Failed to save item:', error);
        alert('שגיאה בהוספת פריט. נסה שוב.');
      }
    },
    [
      currentQuotation,
      selectedSystemId,
      setCurrentQuotation,
      updateQuotation,
      quotationsHook,
      setShowComponentSelector,
    ]
  );

  // Add assembly to system (as single line item)
  const addAssemblyToSystem = useCallback(
    async (assembly: Assembly) => {
      if (!currentQuotation || !selectedSystemId) return;

      const system = currentQuotation.systems.find(
        s => s.id === selectedSystemId
      );
      if (!system) return;

      const quotationRates: ExchangeRates = {
        usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
        eurToIlsRate: currentQuotation.parameters.eurToIlsRate,
      };

      try {
        // Calculate total assembly price using assembly calculations
        const assemblyPricing = calculateAssemblyPricing(
          assembly,
          quotationRates
        );

        const itemOrder =
          currentQuotation.items.filter(
            item => item.systemId === selectedSystemId
          ).length + 1;

        // Create single item for the entire assembly
        const dbItem = await quotationsHook.addQuotationItem({
          quotation_system_id: selectedSystemId,
          assembly_id: assembly.id, // Link to assembly
          item_name: assembly.name,
          manufacturer: '', // Not applicable for assemblies
          manufacturer_part_number: '', // Not applicable for assemblies
          item_type: 'hardware', // Assemblies are treated as hardware
          labor_subtype: undefined,
          quantity: 1, // Default quantity for assembly
          unit_cost: assemblyPricing.totalCostNIS,
          total_cost: assemblyPricing.totalCostNIS,
          unit_price: assemblyPricing.totalCostNIS,
          total_price: assemblyPricing.totalCostNIS,
          margin_percentage: currentQuotation.parameters.markupPercent || 0.75,
          notes: assembly.description || 'הרכבה',
          sort_order: itemOrder,
        });

        if (!dbItem) {
          throw new Error('Failed to create assembly item in database');
        }

        // Create local item
        const newItem: QuotationItem = {
          id: dbItem.id,
          systemId: selectedSystemId,
          systemOrder: system.order,
          itemOrder,
          displayNumber: `${system.order}.${itemOrder}`,
          assemblyId: assembly.id, // Link to assembly
          componentName: assembly.name,
          componentCategory: 'הרכבה', // Assembly category
          itemType: 'hardware',
          quantity: 1,
          unitPriceUSD: assemblyPricing.totalCostUSD,
          unitPriceILS: assemblyPricing.totalCostNIS,
          totalPriceUSD: assemblyPricing.totalCostUSD,
          totalPriceILS: assemblyPricing.totalCostNIS,
          itemMarkupPercent: currentQuotation.parameters.markupPercent || 0.75,
          customerPriceILS:
            assemblyPricing.totalCostNIS *
            (1 + (currentQuotation.parameters.markupPercent || 0.75)),
          notes: assembly.description || 'הרכבה',
          createdAt: dbItem.created_at,
          updatedAt: dbItem.updated_at,
        };

        // Renumber items after adding assembly
        const updatedItems = [...currentQuotation.items, newItem];
        const renumberedItems = renumberItems(updatedItems);

        const updatedQuotation = {
          ...currentQuotation,
          items: renumberedItems,
        };

        setCurrentQuotation(updatedQuotation);
        updateQuotation(currentQuotation.id, { items: renumberedItems });
        setShowComponentSelector(false);
      } catch (error) {
        logger.error('Failed to add assembly:', error);
        alert('שגיאה בהוספת הרכבה. נסה שוב.');
      }
    },
    [
      currentQuotation,
      selectedSystemId,
      setCurrentQuotation,
      updateQuotation,
      quotationsHook,
      setShowComponentSelector,
    ]
  );

  // Add custom item to system
  const addCustomItemToSystem = useCallback(
    async (customItemData: CustomItemData) => {
      if (!currentQuotation || !selectedSystemId) return;

      const system = currentQuotation.systems.find(
        s => s.id === selectedSystemId
      );
      if (!system) return;

      const itemOrder =
        currentQuotation.items.filter(
          item => item.systemId === selectedSystemId
        ).length + 1;

      const quotationRates: ExchangeRates = {
        usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
        eurToIlsRate: currentQuotation.parameters.eurToIlsRate,
      };

      try {
        // Convert prices from original currency to all currencies
        const convertedPrices = convertToAllCurrencies(
          customItemData.unitCost,
          customItemData.currency,
          quotationRates
        );

        // Calculate totals
        const totalPriceUSD =
          convertedPrices.unitCostUSD * customItemData.quantity;
        const totalPriceILS =
          convertedPrices.unitCostNIS * customItemData.quantity;
        const markupPercent = currentQuotation.parameters.markupPercent || 0.75;
        const customerPriceILS = totalPriceILS * (1 + markupPercent);

        // Persist to database
        const dbItem = await quotationsHook.addQuotationItem({
          quotation_system_id: selectedSystemId,
          component_id: undefined, // No library component
          assembly_id: undefined,
          is_custom_item: true, // Mark as custom item
          item_name: customItemData.name,
          manufacturer: undefined,
          manufacturer_part_number: undefined,
          item_type: customItemData.componentType,
          labor_subtype: customItemData.laborSubtype,
          quantity: customItemData.quantity,
          unit_cost: convertedPrices.unitCostNIS,
          total_cost: totalPriceILS,
          unit_price: convertedPrices.unitCostNIS,
          total_price: totalPriceILS,
          margin_percentage: markupPercent,
          notes: customItemData.description,
          sort_order: itemOrder,
          original_currency: customItemData.currency,
          original_cost: customItemData.unitCost,
        });

        if (!dbItem) {
          throw new Error('Failed to create custom item in database');
        }

        // Create local item
        const newItem: QuotationItem = {
          id: dbItem.id,
          systemId: selectedSystemId,
          systemOrder: system.order,
          itemOrder,
          displayNumber: `${system.order}.${itemOrder}`,
          componentId: undefined, // No library component
          isCustomItem: true, // Mark as custom
          componentName: customItemData.name,
          componentCategory: customItemData.category,
          itemType: customItemData.componentType,
          laborSubtype: customItemData.laborSubtype,
          quantity: customItemData.quantity,
          unitPriceUSD: convertedPrices.unitCostUSD,
          unitPriceILS: convertedPrices.unitCostNIS,
          unitPriceEUR: convertedPrices.unitCostEUR,
          totalPriceUSD,
          totalPriceILS,
          originalCurrency: customItemData.currency,
          originalCost: customItemData.unitCost,
          itemMarkupPercent: markupPercent,
          customerPriceILS,
          notes: customItemData.description,
          createdAt: dbItem.created_at,
          updatedAt: dbItem.updated_at,
        };

        // Renumber items
        const updatedItems = [...currentQuotation.items, newItem];
        const renumberedItems = renumberItems(updatedItems);

        const updatedQuotation = {
          ...currentQuotation,
          items: renumberedItems,
        };

        setCurrentQuotation(updatedQuotation);
        updateQuotation(currentQuotation.id, { items: renumberedItems });
        setShowComponentSelector(false);
      } catch (error) {
        logger.error('Failed to add custom item:', error);
        alert('שגיאה בהוספת פריט מותאם אישית. נסה שוב.');
      }
    },
    [
      currentQuotation,
      selectedSystemId,
      setCurrentQuotation,
      updateQuotation,
      quotationsHook,
      setShowComponentSelector,
    ]
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
      const renumberedItems = renumberItems(updatedItems);

      const updatedQuotation = {
        ...currentQuotation,
        items: renumberedItems,
      };

      setCurrentQuotation(updatedQuotation);
      updateQuotation(currentQuotation.id, { items: renumberedItems });
    },
    [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation]
  );

  // Update item
  const updateItem = useCallback(
    async (itemId: string, updates: Partial<QuotationItem>) => {
      if (!currentQuotation) return;

      // Update in Supabase first
      try {
        await quotationsHook.updateQuotationItem(itemId, {
          quantity: updates.quantity,
          unit_cost: updates.unitPriceILS,
          total_cost: updates.totalPriceILS,
          unit_price: updates.unitPriceILS,
          total_price: updates.totalPriceILS,
          margin_percentage: updates.itemMarkupPercent,
          notes: updates.notes,
        });
      } catch (error) {
        logger.error('Failed to update item:', error);
      }

      // Update local state
      const updatedItems = currentQuotation.items.map(item =>
        item.id === itemId
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      );

      const updatedQuotation = {
        ...currentQuotation,
        items: updatedItems,
      };

      setCurrentQuotation(updatedQuotation);
      updateQuotation(currentQuotation.id, { items: updatedItems });
    },
    [currentQuotation, quotationsHook, setCurrentQuotation, updateQuotation]
  );

  // Update parameters and recalculate item prices if exchange rates changed
  const updateParameters = useCallback(
    (parameters: any) => {
      if (!currentQuotation) return;

      // Check if exchange rates changed
      const ratesChanged =
        parameters.usdToIlsRate !== currentQuotation.parameters.usdToIlsRate ||
        parameters.eurToIlsRate !== currentQuotation.parameters.eurToIlsRate;

      // If rates changed, recalculate all item prices
      let updatedItems = currentQuotation.items;
      if (ratesChanged) {
        const newRates: ExchangeRates = {
          usdToIlsRate: parameters.usdToIlsRate,
          eurToIlsRate: parameters.eurToIlsRate,
        };

        logger.debug('🔄 Exchange rates changed, recalculating item prices:', {
          oldRates: {
            usdToIlsRate: currentQuotation.parameters.usdToIlsRate,
            eurToIlsRate: currentQuotation.parameters.eurToIlsRate,
          },
          newRates,
        });

        // Recalculate each item's prices with new exchange rates
        updatedItems = currentQuotation.items.map(item => {
          // CRITICAL: Detect the original currency for this item
          // This preserves the original price when exchange rates change
          const { currency: originalCurrency, amount: originalAmount } =
            detectOriginalCurrency(
              item.unitPriceILS,
              item.unitPriceUSD,
              item.unitPriceEUR,
              item.originalCurrency // Use stored original currency if available
            );

          logger.debug(`  📦 ${item.componentName}:`, {
            originalCurrency,
            originalAmount,
            storedOriginalCurrency: item.originalCurrency,
            storedOriginalCost: item.originalCost,
          });

          // Use stored originalCost if available (most reliable)
          const finalAmount = item.originalCost || originalAmount;

          // Convert from ORIGINAL currency with new rates
          // This ensures ILS-only items stay ILS, USD-only items stay USD, etc.
          const convertedPrices = convertToAllCurrencies(
            finalAmount,
            originalCurrency,
            newRates
          );

          return {
            ...item,
            unitPriceILS: convertedPrices.unitCostNIS,
            unitPriceUSD: convertedPrices.unitCostUSD,
            unitPriceEUR: convertedPrices.unitCostEUR,
            totalPriceILS: convertedPrices.unitCostNIS * item.quantity,
            totalPriceUSD: convertedPrices.unitCostUSD * item.quantity,
          };
        });
      }

      const updatedQuotation = {
        ...currentQuotation,
        parameters,
        items: updatedItems,
      };

      setCurrentQuotation(updatedQuotation);
      updateQuotation(currentQuotation.id, { parameters, items: updatedItems });
    },
    [currentQuotation, setCurrentQuotation, updateQuotation]
  );

  // Handle close - just navigate back to list
  const handleClose = useCallback(() => {
    setCurrentQuotation(null);
  }, [setCurrentQuotation]);

  // Handle project selection
  const handleProjectSelect = useCallback(
    async (project: any) => {
      logger.debug('🔵 handleProjectSelect called with project:', project);
      logger.debug('🔵 Current quotation:', currentQuotation);

      if (!currentQuotation) {
        logger.error('❌ No current quotation!');
        return;
      }

      try {
        // Update quotation with selected project - save directly to Supabase
        const updates = {
          project_id: project.id,
          project_name: project.projectName,
          customer_name: project.companyName,
        };
        logger.debug('🔵 Preparing database updates:', updates);

        // Update in database using the Supabase hook directly
        logger.debug('🔵 Calling quotationsHook.updateQuotation...');
        await quotationsHook.updateQuotation(currentQuotation.id, updates);
        logger.debug('✅ Database update completed successfully');

        // Update local state after successful database update
        logger.debug('🔵 Updating local CPQ context state...');
        updateQuotation(currentQuotation.id, {
          projectId: project.id,
          projectName: project.projectName,
          customerName: project.companyName,
        });

        // Also update currentQuotation directly for immediate UI feedback
        setCurrentQuotation({
          ...currentQuotation,
          projectId: project.id,
          projectName: project.projectName,
          customerName: project.companyName,
        });
        logger.debug('✅ Local state updated');

        // Show success message
        const { toast } = await import('sonner');
        toast.success('הפרויקט עודכן בהצלחה');
        logger.debug('✅ Success toast shown');
      } catch (error) {
        logger.error('❌ Failed to update project:', error);
        const { toast } = await import('sonner');
        toast.error('שגיאה בעדכון פרויקט');
      }
    },
    [currentQuotation, setCurrentQuotation, updateQuotation, quotationsHook]
  );

  return {
    addSystem,
    addComponentToSystem,
    addAssemblyToSystem,
    addCustomItemToSystem,
    deleteItem,
    updateItem,
    updateParameters,
    handleClose,
    handleProjectSelect,
  };
}
