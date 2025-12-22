import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  DbQuotation,
  QuotationProject,
  QuotationSystem,
  QuotationItem,
} from '../types';
import { getDefaultQuotationParameters } from '../utils/quotationCalculations';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// CPQ-specific formatting utilities
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateMargin(cost: number, price: number): number {
  return cost > 0 ? ((price - cost) / cost) * 100 : 0;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Convert DbQuotation (from Supabase) to QuotationProject (app format)
 */
export function convertDbQuotationToQuotationProject(
  dbQuotation: DbQuotation
): QuotationProject {
  // Convert systems if they exist
  // CRITICAL: Always use index + 1 for order to ensure sequential numbering (1, 2, 3...)
  // even after system deletions. Ignore sort_order from database to prevent gaps.
  const systems: QuotationSystem[] = (dbQuotation.quotation_systems || []).map(
    (dbSystem, index) => ({
      id: dbSystem.id,
      name: dbSystem.system_name,
      description: dbSystem.system_description,
      order: index + 1, // Always sequential, ignore dbSystem.sort_order
      quantity: dbSystem.quantity || 1,
      createdAt: dbSystem.created_at,
    })
  );

  // Convert items if they exist
  const items: QuotationItem[] = [];
  let globalItemOrder = 1;

  (dbQuotation.quotation_systems || []).forEach((dbSystem, systemIndex) => {
    // CRITICAL: Use systemIndex + 1 (not dbSystem.sort_order) to match renumbered systems
    // This ensures item numbering matches the system numbering (1.1, 1.2, 2.1, 2.2...)
    const systemOrder = systemIndex + 1;

    (dbSystem.quotation_items || []).forEach((dbItem, itemIndex) => {
      const itemOrder = itemIndex + 1;

      // CRITICAL: Use original_currency and original_cost to properly convert prices
      // This ensures that when exchange rates change, we convert from the ORIGINAL currency
      const originalCurrency = dbItem.original_currency || 'NIS';
      const originalCost = dbItem.original_cost || dbItem.unit_cost || 0;
      const usdRate = dbQuotation.exchange_rate || 3.7;
      const eurRate = dbQuotation.eur_to_ils_rate || 4.0;

      // Convert from original currency to USD and ILS
      let unitPriceUSD = 0;
      let unitPriceILS = 0;

      if (originalCurrency === 'USD') {
        unitPriceUSD = originalCost;
        unitPriceILS = originalCost * usdRate;
      } else if (originalCurrency === 'EUR') {
        unitPriceUSD = (originalCost * eurRate) / usdRate; // EUR -> ILS -> USD
        unitPriceILS = originalCost * eurRate;
      } else {
        // NIS
        unitPriceUSD = originalCost / usdRate;
        unitPriceILS = originalCost;
      }

      items.push({
        id: dbItem.id,
        systemId: dbSystem.id,
        systemOrder,
        itemOrder,
        displayNumber: `${systemOrder}.${itemOrder}`,
        componentId: dbItem.component_id,
        assemblyId: dbItem.assembly_id, // CRITICAL: Preserve assembly link for assembly items
        isCustomItem: dbItem.is_custom_item || false, // Track custom items created directly in quotation
        laborTypeId: (dbItem as any).labor_type_id, // ✅ Load labor type ID for labor items
        isInternalLabor: (dbItem as any).is_internal_labor, // ✅ Load internal/external labor flag
        componentName: dbItem.item_name,
        componentCategory: dbItem.component?.category || 'כללי',
        itemType: dbItem.item_type || 'hardware',
        laborSubtype: dbItem.labor_subtype,
        quantity: dbItem.quantity || 1,
        unitPriceUSD,
        unitPriceILS,
        totalPriceUSD: unitPriceUSD * (dbItem.quantity || 1),
        totalPriceILS: unitPriceILS * (dbItem.quantity || 1),
        itemMarkupPercent:
          dbItem.margin_percentage || dbQuotation.margin_percentage || 25,
        customerPriceILS: dbItem.total_price || 0,
        notes: dbItem.notes,
        // CRITICAL: Preserve original currency and cost for exchange rate recalculation
        originalCurrency: originalCurrency,
        originalCost: originalCost,
        // MSRP fields - loaded from quotation item (copied from component when added)
        msrpPrice: dbItem.msrp_price,
        msrpCurrency: dbItem.msrp_currency,
        createdAt: dbItem.created_at,
        updatedAt: dbItem.updated_at,
      });

      globalItemOrder++;
    });
  });

  // Get default parameters from settings (uses cached values)
  const defaultParams = getDefaultQuotationParameters();

  // Create QuotationProject
  return {
    id: dbQuotation.id,
    name: dbQuotation.project_name || 'הצעת מחיר',
    customerName: dbQuotation.customer_name,
    description: dbQuotation.project_description,
    projectId: dbQuotation.project_id,
    projectName: dbQuotation.project?.project_name || dbQuotation.project_name,
    status:
      dbQuotation.status === 'accepted'
        ? 'won'
        : dbQuotation.status === 'rejected'
          ? 'lost'
          : dbQuotation.status === 'sent'
            ? 'sent'
            : 'draft',
    createdAt: dbQuotation.created_at,
    updatedAt: dbQuotation.updated_at,
    systems,
    parameters: {
      usdToIlsRate: dbQuotation.exchange_rate || defaultParams.usdToIlsRate,
      eurToIlsRate: dbQuotation.eur_to_ils_rate || defaultParams.eurToIlsRate,
      markupPercent:
        dbQuotation.margin_percentage || defaultParams.markupPercent,
      dayWorkCost:
        (dbQuotation as any).day_work_cost || defaultParams.dayWorkCost, // ✅ Load from database
      profitPercent: defaultParams.profitPercent,
      riskPercent: dbQuotation.risk_percentage || defaultParams.riskPercent,
      useMsrpPricing: dbQuotation.use_msrp_pricing || false, // Load MSRP toggle state
      includeVAT: defaultParams.includeVAT,
      vatRate: defaultParams.vatRate,
      paymentTerms: dbQuotation.terms || defaultParams.paymentTerms,
      deliveryTime: defaultParams.deliveryTime,
    },
    items,
    calculations: {
      totalHardwareUSD: 0,
      totalHardwareILS: 0,
      totalSoftwareUSD: 0,
      totalSoftwareILS: 0,
      totalLaborUSD: 0,
      totalLaborILS: 0,
      totalEngineeringILS: 0,
      totalCommissioningILS: 0,
      totalInstallationILS: 0,
      totalProgrammingILS: 0,
      subtotalUSD: 0,
      subtotalILS: 0,
      totalCustomerPriceILS: dbQuotation.total_price || 0,
      riskAdditionILS: 0,
      totalQuoteILS: dbQuotation.total_price || 0,
      totalVATILS: 0,
      finalTotalILS: dbQuotation.total_price || 0,
      totalCostILS: dbQuotation.total_cost || 0,
      totalProfitILS:
        (dbQuotation.total_price || 0) - (dbQuotation.total_cost || 0),
      profitMarginPercent: dbQuotation.total_cost
        ? (((dbQuotation.total_price || 0) - dbQuotation.total_cost) /
            dbQuotation.total_cost) *
          100
        : 0,
    },
  };
}
