import {
  QuotationProject,
  QuotationItem,
  QuotationSystem,
  QuotationCalculations,
  QuotationParameters
} from '../types';

// ============ Display Number Generation ============
export function generateDisplayNumber(systemOrder: number, itemOrder: number): string {
  return `${systemOrder}.${itemOrder}`;
}

// ============ Item Calculations ============
export function calculateItemTotals(item: QuotationItem, parameters: QuotationParameters): QuotationItem {
  // Calculate total prices
  const totalPriceUSD = item.quantity * item.unitPriceUSD;
  const totalPriceILS = item.quantity * item.unitPriceILS;
  
  // Apply profit coefficient to customer price (divide by coefficient)
  const markupPercent = parameters.markupPercent ?? 25;
  const profitCoefficient = 1 / (1 + markupPercent / 100);
  const customerPriceILS = totalPriceILS / profitCoefficient;
  
  return {
    ...item,
    totalPriceUSD,
    totalPriceILS,
    customerPriceILS,
    displayNumber: generateDisplayNumber(item.systemOrder, item.itemOrder)
  };
}

// ============ System Totals ============
export interface SystemTotals {
  systemId: string;
  systemName: string;
  totalUSD: number;
  totalILS: number;
  hardwareUSD: number;
  hardwareILS: number;
  laborUSD: number;
  laborILS: number;
  itemCount: number;
}

export function calculateSystemTotals(
  system: QuotationSystem,
  items: QuotationItem[],
  parameters: QuotationParameters
): SystemTotals {
  const systemItems = items.filter(item => item.systemId === system.id);
  const systemQuantity = system.quantity || 1;
  
  const totals = systemItems.reduce(
    (acc, item) => {
      const calculatedItem = calculateItemTotals(item, parameters);
      
      acc.totalUSD += calculatedItem.totalPriceUSD;
      acc.totalILS += calculatedItem.totalPriceILS;
      acc.itemCount += 1;
      
      if (calculatedItem.isLabor) {
        acc.laborUSD += calculatedItem.totalPriceUSD;
        acc.laborILS += calculatedItem.totalPriceILS;
      } else {
        acc.hardwareUSD += calculatedItem.totalPriceUSD;
        acc.hardwareILS += calculatedItem.totalPriceILS;
      }
      
      return acc;
    },
    {
      totalUSD: 0,
      totalILS: 0,
      hardwareUSD: 0,
      hardwareILS: 0,
      laborUSD: 0,
      laborILS: 0,
      itemCount: 0
    }
  );
  
  // Multiply totals by system quantity
  return {
    systemId: system.id,
    systemName: system.name,
    totalUSD: totals.totalUSD * systemQuantity,
    totalILS: totals.totalILS * systemQuantity,
    hardwareUSD: totals.hardwareUSD * systemQuantity,
    hardwareILS: totals.hardwareILS * systemQuantity,
    laborUSD: totals.laborUSD * systemQuantity,
    laborILS: totals.laborILS * systemQuantity,
    itemCount: totals.itemCount
  };
}

// ============ Project Calculations ============
export function calculateQuotationTotals(project: QuotationProject): QuotationCalculations {
  const { items = [], systems = [], parameters } = project;
  
  // Validate inputs
  if (!parameters) {
    throw new Error('Quotation parameters are required for calculations');
  }
  
  // Calculate all items with markup
  const calculatedItems = items.map(item => calculateItemTotals(item, parameters));
  
  // Calculate system totals
  const systemTotals = systems.map(system => 
    calculateSystemTotals(system, calculatedItems, parameters)
  );
  
  // Aggregate cost totals (without markup)
  const costAggregates = systemTotals.reduce(
    (acc, system) => {
      acc.totalHardwareUSD += system.hardwareUSD;
      acc.totalHardwareILS += system.hardwareILS;
      acc.totalLaborUSD += system.laborUSD;
      acc.totalLaborILS += system.laborILS;
      acc.subtotalUSD += system.totalUSD;
      acc.subtotalILS += system.totalILS;
      return acc;
    },
    {
      totalHardwareUSD: 0,
      totalHardwareILS: 0,
      totalLaborUSD: 0,
      totalLaborILS: 0,
      subtotalUSD: 0,
      subtotalILS: 0
    }
  );
  
  
  // Apply system quantities to customer prices
  const totalCustomerPriceILS = systems.reduce((total, system) => {
    const systemItems = calculatedItems.filter(item => item.systemId === system.id);
    const systemCustomerPrice = systemItems.reduce((sum, item) => sum + item.customerPriceILS, 0);
    return total + (systemCustomerPrice * (system.quantity || 1));
  }, 0);
  
  // Calculate risk addition using simple percentage
  const riskAdditionILS = totalCustomerPriceILS * ((parameters.riskPercent || 0) / 100);
  
  // Calculate totals
  const totalQuoteILS = totalCustomerPriceILS + riskAdditionILS;
  const totalCostILS = costAggregates.subtotalILS; // Cost is before risk
  
  // Calculate VAT
  const totalVATILS = parameters.includeVAT ? totalQuoteILS * (parameters.vatRate / 100) : 0;
  const finalTotalILS = totalQuoteILS + totalVATILS;
  
  // Calculate profit (customer price - cost - risk)
  const totalProfitILS = totalQuoteILS - totalCostILS - riskAdditionILS;
  
  // Calculate profit margin based on final total
  const profitMarginPercent = finalTotalILS > 0 ? (totalProfitILS / finalTotalILS) * 100 : 0;
  
  return {
    totalHardwareUSD: costAggregates.totalHardwareUSD,
    totalHardwareILS: costAggregates.totalHardwareILS,
    totalLaborUSD: costAggregates.totalLaborUSD,
    totalLaborILS: costAggregates.totalLaborILS,
    subtotalUSD: costAggregates.subtotalUSD,
    subtotalILS: costAggregates.subtotalILS,
    totalCustomerPriceILS,
    riskAdditionILS,
    totalQuoteILS,
    totalVATILS,
    finalTotalILS,
    totalCostILS,
    totalProfitILS,
    profitMarginPercent
  };
}

// ============ Item Renumbering ============
export function renumberItems(items: QuotationItem[], systems?: { id: string; order: number }[]): QuotationItem[] {
  // Create systemId to order mapping if systems provided
  const systemOrderMap: Record<string, number> = {};
  if (systems) {
    systems.forEach(system => {
      systemOrderMap[system.id] = system.order;
    });
  }

  // Group items by system
  const itemsBySystem = items.reduce((acc, item) => {
    if (!acc[item.systemId]) {
      acc[item.systemId] = [];
    }
    acc[item.systemId].push(item);
    return acc;
  }, {} as Record<string, QuotationItem[]>);

  // Sort items within each system and renumber
  const renumberedItems: QuotationItem[] = [];

  Object.keys(itemsBySystem).forEach(systemId => {
    // Get the correct system order (either from map or from first item)
    const systemOrder = systems ? systemOrderMap[systemId] : itemsBySystem[systemId][0]?.systemOrder || 1;

    const systemItems = itemsBySystem[systemId]
      .sort((a, b) => a.itemOrder - b.itemOrder)
      .map((item, index) => ({
        ...item,
        systemOrder: systemOrder, // Update system order
        itemOrder: index + 1,
        displayNumber: generateDisplayNumber(systemOrder, index + 1)
      }));

    renumberedItems.push(...systemItems);
  });

  return renumberedItems;
}

// ============ Currency Conversion ============
export function convertUSDtoILS(usdAmount: number, exchangeRate: number): number {
  return usdAmount * exchangeRate;
}

export function convertEURtoILS(eurAmount: number, exchangeRate: number): number {
  return eurAmount * exchangeRate;
}

// ============ Default Parameters ============
export function getDefaultQuotationParameters(): QuotationParameters {
  return {
    usdToIlsRate: 3.7, // Default exchange rate
    eurToIlsRate: 4.0, // Default exchange rate
    markupPercent: 25, // Default markup
    dayWorkCost: 800, // 800 ILS per day
    profitPercent: 20, // Target profit percentage
    riskPercent: 10, // 10% risk addition
    paymentTerms: '30 יום מהחשבונית',
    deliveryTime: '4-6 weeks',
    includeVAT: true,
    vatRate: 18
  };
}

// ============ Validation ============
export function validateQuotationItem(item: Partial<QuotationItem>): string[] {
  const errors: string[] = [];
  
  if (!item.componentName || item.componentName.trim() === '') {
    errors.push('Item name is required');
  }
  
  if (!item.quantity || item.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  
  if (!item.unitPriceUSD || item.unitPriceUSD < 0) {
    errors.push('USD unit price must be non-negative');
  }
  
  if (!item.unitPriceILS || item.unitPriceILS < 0) {
    errors.push('ILS unit price must be non-negative');
  }
  
  if (item.itemMarkupPercent !== undefined && item.itemMarkupPercent < 0) {
    errors.push('Markup percent cannot be negative');
  }
  
  return errors;
}

export function validateQuotationParameters(parameters: Partial<QuotationParameters>): string[] {
  const errors: string[] = [];
  
  if (parameters.usdToIlsRate !== undefined && parameters.usdToIlsRate <= 0) {
    errors.push('USD to ILS exchange rate must be positive');
  }
  
  if (parameters.eurToIlsRate !== undefined && parameters.eurToIlsRate <= 0) {
    errors.push('EUR to ILS exchange rate must be positive');
  }
  
  if (parameters.dayWorkCost !== undefined && parameters.dayWorkCost < 0) {
    errors.push('Day work cost cannot be negative');
  }
  
  if (parameters.riskPercent !== undefined && parameters.riskPercent < 0) {
    errors.push('Risk percent cannot be negative');
  }
  
  return errors;
}

// ============ Formatting Utilities ============
export function formatCurrency(amount: number, currency: 'USD' | 'ILS' | 'EUR'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
