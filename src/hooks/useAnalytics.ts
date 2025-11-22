import { useState, useMemo } from 'react';
import { useQuotations } from './useQuotations';
import {
  calculateRevenueMetrics,
  calculateMarginAnalysis,
  calculateComponentAnalytics,
  calculateLaborMetrics,
  calculateTrends,
  calculateCustomerMetrics,
  filterQuotationsByDateRange,
  getPredefinedDateRange,
  type DateRange,
  type RevenueMetrics,
  type MarginMetrics,
  type ComponentAnalytics,
  type LaborMetrics,
  type TrendMetrics,
  type CustomerMetrics
} from '../utils/analyticsCalculations';
import type { QuotationProject, DbQuotation, ComponentType } from '../types';

// Date range type for user-facing selections
type DateRangeType = '30d' | '90d' | 'year' | 'all' | 'custom';

/**
 * Analytics hook for the CPQ dashboard
 *
 * Provides comprehensive analytics calculations with filtering:
 * - Date range filtering (predefined or custom)
 * - Component category filtering
 * - All metrics calculated using useMemo for performance
 *
 * Default: Last 90 days
 */
export function useAnalytics() {
  // Get all quotations from Supabase
  const { quotations: dbQuotations, loading: quotationsLoading, error } = useQuotations();

  // Filter state
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('90d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // Transform DbQuotations to QuotationProjects
  // This is necessary because useQuotations returns DbQuotation[] from Supabase
  // but analytics calculations expect QuotationProject[]
  const quotations = useMemo<QuotationProject[]>(() => {
    return dbQuotations.map(transformDbQuotationToQuotationProject);
  }, [dbQuotations]);

  // Calculate current date range
  // Maps user-facing types ('30d', '90d', etc.) to utility function types
  const dateRange = useMemo<DateRange>(() => {
    if (dateRangeType === 'custom' && customDateRange) {
      return customDateRange;
    }
    // Use type assertion since our DateRangeType matches the utility function's parameter type
    return getPredefinedDateRange(dateRangeType as '30d' | '90d' | 'year' | 'all');
  }, [dateRangeType, customDateRange]);

  // Filter quotations by date range
  const filteredByDate = useMemo<QuotationProject[]>(() => {
    return filterQuotationsByDateRange(quotations, dateRange);
  }, [quotations, dateRange]);

  // Further filter by category if needed (filter items within quotations)
  const filteredQuotations = useMemo<QuotationProject[]>(() => {
    if (categoryFilter.length === 0) {
      return filteredByDate;
    }

    // Filter quotations to only include items from selected categories
    // Use reduce for single-pass filtering
    const categorySet = new Set(categoryFilter); // O(1) lookup
    return filteredByDate.reduce<QuotationProject[]>((acc, q) => {
      const filteredItems = q.items.filter(item =>
        categorySet.has(item.componentCategory || '')
      );

      // Only include quotation if it has matching items
      if (filteredItems.length > 0) {
        acc.push({
          ...q,
          items: filteredItems
        });
      }
      return acc;
    }, []);
  }, [filteredByDate, categoryFilter]);

  // Calculate all analytics with useMemo
  const revenueMetrics = useMemo<RevenueMetrics>(() =>
    calculateRevenueMetrics(filteredQuotations, dateRange),
    [filteredQuotations, dateRange]
  );

  const marginMetrics = useMemo<MarginMetrics>(() =>
    calculateMarginAnalysis(filteredQuotations),
    [filteredQuotations]
  );

  const componentAnalytics = useMemo<ComponentAnalytics>(() =>
    // Pass undefined since we already filtered quotations by category
    calculateComponentAnalytics(filteredQuotations, undefined),
    [filteredQuotations]
  );

  const laborMetrics = useMemo<LaborMetrics>(() =>
    calculateLaborMetrics(filteredQuotations),
    [filteredQuotations]
  );

  const trendMetrics = useMemo<TrendMetrics>(() =>
    calculateTrends(filteredQuotations, dateRange),
    [filteredQuotations, dateRange]
  );

  const customerMetrics = useMemo<CustomerMetrics>(() =>
    calculateCustomerMetrics(filteredQuotations),
    [filteredQuotations]
  );

  // Helper function to set date range by type or custom
  const setDateRange = (range: DateRange | DateRangeType) => {
    if (typeof range === 'string') {
      setDateRangeType(range);
      setCustomDateRange(null);
    } else {
      setDateRangeType('custom');
      setCustomDateRange(range);
    }
  };

  return {
    // Filters
    dateRange,
    dateRangeType,
    setDateRange,
    categoryFilter,
    setCategoryFilter,

    // Analytics
    revenueMetrics,
    marginMetrics,
    componentAnalytics,
    laborMetrics,
    trendMetrics,
    customerMetrics,

    // Meta
    loading: quotationsLoading,
    error,
    filteredQuotations,
    totalQuotationsCount: quotations.length,
    filteredCount: filteredQuotations.length
  };
}

/**
 * Transform DbQuotation (from Supabase) to QuotationProject (for analytics)
 *
 * DbQuotation has snake_case fields and nested structure:
 * - quotation_systems[] containing quotation_items[]
 *
 * QuotationProject has camelCase and flattened structure:
 * - systems[]
 * - items[]
 * - calculations
 */
function transformDbQuotationToQuotationProject(dbQuot: DbQuotation): QuotationProject {
  // Extract items from all systems with null checks
  const items = (dbQuot.quotation_systems || []).flatMap(system =>
    (system.quotation_items || []).map(item => {
      const unitCost = item.unit_cost || 0;
      const totalCost = item.total_cost || 0;
      const totalPrice = item.total_price || 0;
      const exchangeRate = dbQuot.exchange_rate || 3.7;

      return {
        id: item.id,
        systemId: system.id,
        systemOrder: system.sort_order || 0,
        itemOrder: item.sort_order || 0,
        displayNumber: `${system.sort_order || 0}.${item.sort_order || 0}`,

        componentId: item.component_id || undefined,
        componentName: item.item_name || 'Unknown',
        componentCategory: item.component?.category || 'אחר',
        itemType: (item.item_type || item.component?.component_type || 'hardware') as ComponentType,
        laborSubtype: item.labor_subtype || item.component?.labor_subtype,

        assemblyId: (item as any).assembly_id || undefined, // assembly_id may not be in type yet

        quantity: item.quantity || 0,
        unitPriceUSD: unitCost / exchangeRate,
        unitPriceILS: unitCost,
        totalPriceUSD: totalCost / exchangeRate,
        totalPriceILS: totalCost,

        originalCurrency: (item.original_currency || 'NIS') as 'NIS' | 'USD' | 'EUR',
        originalCost: item.original_cost || unitCost,

        itemMarkupPercent: item.margin_percentage || dbQuot.margin_percentage || 25,
        customerPriceILS: totalPrice,

        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at || item.created_at
      };
    })
  );

  // Transform systems
  const systems = (dbQuot.quotation_systems || []).map(system => ({
    id: system.id,
    name: system.system_name,
    description: system.system_description,
    order: system.sort_order || 0,
    quantity: system.quantity || 1,
    createdAt: system.created_at
  }));

  // Calculate totals from items
  const calculations = calculateQuotationCalculations(
    items,
    {
      usdToIlsRate: dbQuot.exchange_rate || 3.7,
      eurToIlsRate: 4.0, // Default EUR rate
      markupPercent: dbQuot.margin_percentage || 25,
      dayWorkCost: 1200, // Default
      profitPercent: 15, // Default
      riskPercent: 5, // Default
      includeVAT: true,
      vatRate: 17
    }
  );

  // Map database status to QuotationProject status
  // DB: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  // App: 'draft' | 'sent' | 'won' | 'lost'
  const mapStatus = (dbStatus: DbQuotation['status']): QuotationProject['status'] => {
    switch (dbStatus) {
      case 'accepted':
        return 'won';
      case 'rejected':
      case 'expired':
        return 'lost';
      case 'draft':
      case 'sent':
      default:
        return dbStatus as QuotationProject['status'];
    }
  };

  return {
    id: dbQuot.id,
    name: dbQuot.project_name || dbQuot.quotation_number,
    customerName: dbQuot.customer_name || 'Unknown Customer',
    description: dbQuot.project_description,
    projectId: dbQuot.project_id || undefined,
    projectName: dbQuot.project_name,
    status: mapStatus(dbQuot.status),
    createdAt: dbQuot.created_at,
    updatedAt: dbQuot.updated_at || dbQuot.created_at,

    systems,
    items,
    calculations,

    parameters: {
      usdToIlsRate: dbQuot.exchange_rate || 3.7,
      eurToIlsRate: dbQuot.eur_to_ils_rate || 4.0,
      markupPercent: dbQuot.margin_percentage || 25,
      dayWorkCost: 1200,
      profitPercent: 15,
      riskPercent: dbQuot.risk_percentage || 5,
      includeVAT: true,
      vatRate: 17
    }
  };
}

/**
 * Calculate quotation totals and metrics
 */
function calculateQuotationCalculations(
  items: QuotationProject['items'],
  parameters: QuotationProject['parameters']
): QuotationProject['calculations'] {
  // Type breakdown
  let totalHardwareILS = 0;
  let totalSoftwareILS = 0;
  let totalLaborILS = 0;
  let totalEngineeringILS = 0;
  let totalCommissioningILS = 0;
  let totalInstallationILS = 0;
  let totalProgrammingILS = 0;
  let totalCustomerPriceILS = 0;

  items.forEach(item => {
    const costILS = item.totalPriceILS;
    const customerPrice = item.customerPriceILS;

    totalCustomerPriceILS += customerPrice;

    switch (item.itemType) {
      case 'hardware':
        totalHardwareILS += costILS;
        break;
      case 'software':
        totalSoftwareILS += costILS;
        break;
      case 'labor':
        totalLaborILS += costILS;
        // Labor subtype breakdown
        switch (item.laborSubtype) {
          case 'engineering':
            totalEngineeringILS += costILS;
            break;
          case 'commissioning':
            totalCommissioningILS += costILS;
            break;
          case 'installation':
            totalInstallationILS += costILS;
            break;
          default:
            totalProgrammingILS += costILS;
        }
        break;
    }
  });

  const subtotalILS = totalHardwareILS + totalSoftwareILS + totalLaborILS;
  const subtotalUSD = subtotalILS / parameters.usdToIlsRate;

  // Risk addition
  const riskAdditionILS = totalCustomerPriceILS * (parameters.riskPercent / 100);

  // Quote total
  const totalQuoteILS = totalCustomerPriceILS + riskAdditionILS;

  // VAT
  const totalVATILS = parameters.includeVAT ? totalQuoteILS * (parameters.vatRate / 100) : 0;

  // Final total
  const finalTotalILS = totalQuoteILS + totalVATILS;

  // Profit calculations
  const totalCostILS = subtotalILS;
  const totalProfitILS = totalCustomerPriceILS - totalCostILS;
  const profitMarginPercent = totalCustomerPriceILS > 0
    ? (totalProfitILS / totalCustomerPriceILS) * 100
    : 0;

  return {
    totalHardwareUSD: totalHardwareILS / parameters.usdToIlsRate,
    totalHardwareILS,
    totalSoftwareUSD: totalSoftwareILS / parameters.usdToIlsRate,
    totalSoftwareILS,
    totalLaborUSD: totalLaborILS / parameters.usdToIlsRate,
    totalLaborILS,

    totalEngineeringILS,
    totalCommissioningILS,
    totalInstallationILS,
    totalProgrammingILS,

    subtotalUSD,
    subtotalILS,

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
