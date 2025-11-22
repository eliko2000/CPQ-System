/**
 * Analytics Calculations Utility
 *
 * Provides comprehensive analytics calculations for the CPQ analytics dashboard.
 * All monetary values are normalized to ILS for consistent aggregation.
 *
 * Key Features:
 * - Revenue metrics (won quotations, pipeline value)
 * - Margin analysis (weighted averages, distribution)
 * - Component analytics (usage patterns, spend analysis)
 * - Labor metrics (breakdown by subtype, trends)
 * - Trend analysis (growth rates, win rates)
 * - Customer metrics (top customers, repeat rates)
 */

import type {
  QuotationProject,
  QuotationItem,
  QuotationCalculations
} from '../types';

// ============ Type Definitions ============

export interface DateRange {
  start: Date;
  end: Date;
  label?: string;
}

export interface RevenueMetrics {
  totalRevenue: number; // ILS - won quotations only
  pipelineValue: number; // ILS - draft + sent quotations
  wonCount: number;
  lostCount: number;
  draftCount: number;
  sentCount: number;
  averageValue: number; // Average quotation value (all statuses)
  averageWonValue: number; // Average won quotation value
  revenueByMonth: Array<{ month: string; revenue: number }>; // Time series
}

export interface MarginMetrics {
  averageMargin: number; // % - weighted by quotation value
  marginDistribution: Array<{ range: string; count: number }>;
  minMargin: { value: number; quotationId: string; quotationName: string };
  maxMargin: { value: number; quotationId: string; quotationName: string };
  marginByStatus: Array<{ status: string; avgMargin: number; count: number }>;
  marginByType: { hw: number; sw: number; labor: number }; // Average margins
}

export interface ComponentAnalytics {
  topComponents: Array<{
    componentId: string;
    componentName: string;
    totalQuantity: number;
    totalSpendILS: number;
    quotationCount: number;
    avgPriceILS: number;
  }>;
  usageByCategory: Array<{
    category: string;
    count: number;
    totalSpendILS: number;
    percentOfTotal: number;
  }>;
  typeRatio: { hardware: number; software: number; labor: number }; // Percentages
  mostValuableComponents: Array<{
    componentId: string;
    componentName: string;
    totalValueILS: number;
    quotationCount: number;
  }>;
}

export interface LaborMetrics {
  totalLaborDays: number;
  totalLaborCostILS: number;
  laborBySubtype: {
    engineering: { days: number; costILS: number; percent: number };
    commissioning: { days: number; costILS: number; percent: number };
    installation: { days: number; costILS: number; percent: number };
  };
  avgLaborPercentPerQuotation: number; // Average % of labor in quotations
  laborTrend: Array<{ month: string; laborCostILS: number }>; // Time series
  materialHeavyCount: number; // Quotations with >60% material
  laborHeavyCount: number; // Quotations with >60% labor
}

export interface TrendMetrics {
  monthOverMonthGrowth: number; // % change in revenue
  winRate: number; // % of sent that became won
  avgMarginTrend: Array<{ month: string; avgMargin: number }>;
  volumeTrend: Array<{ month: string; quotationCount: number }>;
  seasonalPatterns?: {
    bestMonth: string;
    worstMonth: string;
    avgRevenueByMonth: Array<{ month: string; avgRevenue: number }>;
  };
}

export interface CustomerMetrics {
  topCustomers: Array<{
    customerName: string;
    totalValueILS: number;
    quotationCount: number;
    wonCount: number;
    winRate: number;
    avgProjectSizeILS: number;
  }>;
  repeatCustomerPercent: number; // % of customers with 2+ quotations
  totalCustomerCount: number;
  avgProjectsPerCustomer: number;
}

// ============ Date Range Helpers ============

/**
 * Filter quotations by date range
 */
export function filterQuotationsByDateRange(
  quotations: QuotationProject[],
  dateRange: DateRange,
  dateField: 'createdAt' | 'updatedAt' = 'createdAt'
): QuotationProject[] {
  return quotations.filter(q => {
    const date = new Date(q[dateField]);
    return date >= dateRange.start && date <= dateRange.end;
  });
}

/**
 * Filter quotations by status
 */
export function filterQuotationsByStatus(
  quotations: QuotationProject[],
  statuses: Array<'draft' | 'sent' | 'won' | 'lost'>
): QuotationProject[] {
  return quotations.filter(q => statuses.includes(q.status));
}

/**
 * Group quotations by month
 */
export function groupQuotationsByMonth(
  quotations: QuotationProject[],
  dateField: 'createdAt' | 'updatedAt' = 'createdAt'
): Map<string, QuotationProject[]> {
  const grouped = new Map<string, QuotationProject[]>();

  quotations.forEach(q => {
    const date = new Date(q[dateField]);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(q);
  });

  return grouped;
}

/**
 * Get predefined date ranges
 */
export function getPredefinedDateRange(range: '30d' | '90d' | 'year' | 'all'): DateRange {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case '30d':
      start.setDate(now.getDate() - 30);
      return { start, end: now, label: 'Last 30 Days' };
    case '90d':
      start.setDate(now.getDate() - 90);
      return { start, end: now, label: 'Last 90 Days' };
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      return { start, end: now, label: 'Last Year' };
    case 'all':
      return { start: new Date(2020, 0, 1), end: now, label: 'All Time' };
  }
}

// ============ Revenue Metrics ============

/**
 * Calculate revenue metrics
 */
export function calculateRevenueMetrics(
  quotations: QuotationProject[],
  dateRange?: DateRange
): RevenueMetrics {
  // Filter by date if provided
  const filteredQuotations = dateRange
    ? filterQuotationsByDateRange(quotations, dateRange)
    : quotations;

  if (filteredQuotations.length === 0) {
    return {
      totalRevenue: 0,
      pipelineValue: 0,
      wonCount: 0,
      lostCount: 0,
      draftCount: 0,
      sentCount: 0,
      averageValue: 0,
      averageWonValue: 0,
      revenueByMonth: []
    };
  }

  // Count by status
  const wonQuotations = filteredQuotations.filter(q => q.status === 'won');
  const lostQuotations = filteredQuotations.filter(q => q.status === 'lost');
  const draftQuotations = filteredQuotations.filter(q => q.status === 'draft');
  const sentQuotations = filteredQuotations.filter(q => q.status === 'sent');

  // Calculate total revenue (won only)
  const totalRevenue = wonQuotations.reduce((sum, q) => {
    return sum + (q.calculations?.finalTotalILS || 0);
  }, 0);

  // Calculate pipeline value (draft + sent)
  const pipelineValue = [...draftQuotations, ...sentQuotations].reduce((sum, q) => {
    return sum + (q.calculations?.finalTotalILS || 0);
  }, 0);

  // Calculate average values
  const totalValue = filteredQuotations.reduce((sum, q) => {
    return sum + (q.calculations?.finalTotalILS || 0);
  }, 0);
  const averageValue = filteredQuotations.length > 0 ? totalValue / filteredQuotations.length : 0;
  const averageWonValue = wonQuotations.length > 0 ? totalRevenue / wonQuotations.length : 0;

  // Revenue by month (won quotations only)
  const revenueByMonth = calculateRevenueByMonth(wonQuotations);

  return {
    totalRevenue: Math.round(totalRevenue),
    pipelineValue: Math.round(pipelineValue),
    wonCount: wonQuotations.length,
    lostCount: lostQuotations.length,
    draftCount: draftQuotations.length,
    sentCount: sentQuotations.length,
    averageValue: Math.round(averageValue),
    averageWonValue: Math.round(averageWonValue),
    revenueByMonth
  };
}

/**
 * Calculate revenue by month
 */
function calculateRevenueByMonth(quotations: QuotationProject[]): Array<{ month: string; revenue: number }> {
  const grouped = groupQuotationsByMonth(quotations, 'createdAt');
  const result: Array<{ month: string; revenue: number }> = [];

  // Sort by month
  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach(monthKey => {
    const monthQuotations = grouped.get(monthKey)!;
    const revenue = monthQuotations.reduce((sum, q) => {
      return sum + (q.calculations?.finalTotalILS || 0);
    }, 0);

    result.push({
      month: monthKey,
      revenue: Math.round(revenue)
    });
  });

  return result;
}

// ============ Margin Analysis ============

/**
 * Calculate margin analysis
 */
export function calculateMarginAnalysis(quotations: QuotationProject[]): MarginMetrics {
  if (quotations.length === 0) {
    return {
      averageMargin: 0,
      marginDistribution: [],
      minMargin: { value: 0, quotationId: '', quotationName: '' },
      maxMargin: { value: 0, quotationId: '', quotationName: '' },
      marginByStatus: [],
      marginByType: { hw: 0, sw: 0, labor: 0 }
    };
  }

  // Calculate weighted average margin
  let totalValue = 0;
  let weightedMarginSum = 0;
  let minMargin = { value: 100, quotationId: '', quotationName: '' };
  let maxMargin = { value: 0, quotationId: '', quotationName: '' };

  quotations.forEach(q => {
    const value = q.calculations?.finalTotalILS || 0;
    const margin = q.calculations?.profitMarginPercent || 0;

    totalValue += value;
    weightedMarginSum += margin * value;

    if (margin < minMargin.value) {
      minMargin = { value: margin, quotationId: q.id, quotationName: q.name };
    }
    if (margin > maxMargin.value) {
      maxMargin = { value: margin, quotationId: q.id, quotationName: q.name };
    }
  });

  const averageMargin = totalValue > 0 ? weightedMarginSum / totalValue : 0;

  // Margin distribution
  const marginDistribution = calculateMarginDistribution(quotations);

  // Margin by status
  const marginByStatus = calculateMarginByStatus(quotations);

  // Margin by type (HW, SW, Labor)
  const marginByType = calculateMarginByType(quotations);

  return {
    averageMargin: Number(averageMargin.toFixed(1)),
    marginDistribution,
    minMargin: { ...minMargin, value: Number(minMargin.value.toFixed(1)) },
    maxMargin: { ...maxMargin, value: Number(maxMargin.value.toFixed(1)) },
    marginByStatus,
    marginByType
  };
}

/**
 * Calculate margin distribution buckets
 */
function calculateMarginDistribution(quotations: QuotationProject[]): Array<{ range: string; count: number }> {
  const buckets = {
    '0-10%': 0,
    '10-20%': 0,
    '20-30%': 0,
    '30%+': 0
  };

  quotations.forEach(q => {
    const margin = q.calculations?.profitMarginPercent || 0;

    if (margin < 10) {
      buckets['0-10%']++;
    } else if (margin < 20) {
      buckets['10-20%']++;
    } else if (margin < 30) {
      buckets['20-30%']++;
    } else {
      buckets['30%+']++;
    }
  });

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

/**
 * Calculate average margin by status
 */
function calculateMarginByStatus(quotations: QuotationProject[]): Array<{ status: string; avgMargin: number; count: number }> {
  const statuses: Array<'draft' | 'sent' | 'won' | 'lost'> = ['draft', 'sent', 'won', 'lost'];
  const result: Array<{ status: string; avgMargin: number; count: number }> = [];

  statuses.forEach(status => {
    const statusQuotations = quotations.filter(q => q.status === status);

    if (statusQuotations.length === 0) {
      return;
    }

    const avgMargin = statusQuotations.reduce((sum, q) => {
      return sum + (q.calculations?.profitMarginPercent || 0);
    }, 0) / statusQuotations.length;

    result.push({
      status,
      avgMargin: Number(avgMargin.toFixed(1)),
      count: statusQuotations.length
    });
  });

  return result;
}

/**
 * Calculate average margin by component type
 */
function calculateMarginByType(quotations: QuotationProject[]): { hw: number; sw: number; labor: number } {
  let hwTotalCost = 0;
  let hwTotalCustomerPrice = 0;
  let swTotalCost = 0;
  let swTotalCustomerPrice = 0;
  let laborTotalCost = 0;
  let laborTotalCustomerPrice = 0;

  quotations.forEach(q => {
    q.items.forEach(item => {
      const cost = item.totalPriceILS;
      const customerPrice = item.customerPriceILS;

      switch (item.itemType) {
        case 'hardware':
          hwTotalCost += cost;
          hwTotalCustomerPrice += customerPrice;
          break;
        case 'software':
          swTotalCost += cost;
          swTotalCustomerPrice += customerPrice;
          break;
        case 'labor':
          laborTotalCost += cost;
          laborTotalCustomerPrice += customerPrice;
          break;
      }
    });
  });

  const calculateMargin = (cost: number, customerPrice: number): number => {
    if (customerPrice === 0) return 0;
    const profit = customerPrice - cost;
    return (profit / customerPrice) * 100;
  };

  return {
    hw: Number(calculateMargin(hwTotalCost, hwTotalCustomerPrice).toFixed(1)),
    sw: Number(calculateMargin(swTotalCost, swTotalCustomerPrice).toFixed(1)),
    labor: Number(calculateMargin(laborTotalCost, laborTotalCustomerPrice).toFixed(1))
  };
}

// ============ Component Analytics ============

/**
 * Calculate component analytics
 */
export function calculateComponentAnalytics(
  quotations: QuotationProject[],
  categoryFilter?: string
): ComponentAnalytics {
  if (quotations.length === 0) {
    return {
      topComponents: [],
      usageByCategory: [],
      typeRatio: { hardware: 0, software: 0, labor: 0 },
      mostValuableComponents: []
    };
  }

  // Aggregate component usage
  const componentUsage = new Map<string, {
    componentId: string;
    componentName: string;
    category: string;
    totalQuantity: number;
    totalSpendILS: number;
    totalValueILS: number;
    quotationIds: Set<string>;
    itemType: string;
  }>();

  quotations.forEach(q => {
    q.items.forEach(item => {
      // Filter by category if provided
      if (categoryFilter && item.componentCategory !== categoryFilter) {
        return;
      }

      const key = item.componentId || item.componentName;

      if (!componentUsage.has(key)) {
        componentUsage.set(key, {
          componentId: item.componentId || '',
          componentName: item.componentName,
          category: item.componentCategory,
          totalQuantity: 0,
          totalSpendILS: 0,
          totalValueILS: 0,
          quotationIds: new Set(),
          itemType: item.itemType
        });
      }

      const usage = componentUsage.get(key)!;
      usage.totalQuantity += item.quantity;
      usage.totalSpendILS += item.totalPriceILS;
      usage.totalValueILS += item.customerPriceILS;
      usage.quotationIds.add(q.id);
    });
  });

  // Convert to arrays
  const usageArray = Array.from(componentUsage.values());

  // Top 10 components by quantity
  const topComponents = usageArray
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10)
    .map(item => ({
      componentId: item.componentId,
      componentName: item.componentName,
      totalQuantity: item.totalQuantity,
      totalSpendILS: Math.round(item.totalSpendILS),
      quotationCount: item.quotationIds.size,
      avgPriceILS: Math.round(item.totalSpendILS / item.totalQuantity)
    }));

  // Most valuable components (by customer price)
  const mostValuableComponents = usageArray
    .sort((a, b) => b.totalValueILS - a.totalValueILS)
    .slice(0, 10)
    .map(item => ({
      componentId: item.componentId,
      componentName: item.componentName,
      totalValueILS: Math.round(item.totalValueILS),
      quotationCount: item.quotationIds.size
    }));

  // Usage by category
  const categoryUsage = new Map<string, { count: number; totalSpendILS: number }>();
  usageArray.forEach(item => {
    if (!categoryUsage.has(item.category)) {
      categoryUsage.set(item.category, { count: 0, totalSpendILS: 0 });
    }
    const cat = categoryUsage.get(item.category)!;
    cat.count++;
    cat.totalSpendILS += item.totalSpendILS;
  });

  const totalSpend = usageArray.reduce((sum, item) => sum + item.totalSpendILS, 0);

  const usageByCategory = Array.from(categoryUsage.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalSpendILS: Math.round(data.totalSpendILS),
      percentOfTotal: totalSpend > 0 ? Number(((data.totalSpendILS / totalSpend) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.totalSpendILS - a.totalSpendILS);

  // Type ratio
  const typeRatio = calculateTypeRatio(quotations);

  return {
    topComponents,
    usageByCategory,
    typeRatio,
    mostValuableComponents
  };
}

/**
 * Calculate HW:SW:Labor ratio
 */
function calculateTypeRatio(quotations: QuotationProject[]): { hardware: number; software: number; labor: number } {
  let hwTotal = 0;
  let swTotal = 0;
  let laborTotal = 0;

  quotations.forEach(q => {
    hwTotal += q.calculations?.totalHardwareILS || 0;
    swTotal += q.calculations?.totalSoftwareILS || 0;
    laborTotal += q.calculations?.totalLaborILS || 0;
  });

  const total = hwTotal + swTotal + laborTotal;

  if (total === 0) {
    return { hardware: 0, software: 0, labor: 0 };
  }

  return {
    hardware: Number(((hwTotal / total) * 100).toFixed(1)),
    software: Number(((swTotal / total) * 100).toFixed(1)),
    labor: Number(((laborTotal / total) * 100).toFixed(1))
  };
}

// ============ Labor Metrics ============

/**
 * Calculate labor metrics
 */
export function calculateLaborMetrics(quotations: QuotationProject[]): LaborMetrics {
  if (quotations.length === 0) {
    return {
      totalLaborDays: 0,
      totalLaborCostILS: 0,
      laborBySubtype: {
        engineering: { days: 0, costILS: 0, percent: 0 },
        commissioning: { days: 0, costILS: 0, percent: 0 },
        installation: { days: 0, costILS: 0, percent: 0 }
      },
      avgLaborPercentPerQuotation: 0,
      laborTrend: [],
      materialHeavyCount: 0,
      laborHeavyCount: 0
    };
  }

  // Aggregate labor data
  let totalLaborCostILS = 0;
  let engineeringCost = 0;
  let commissioningCost = 0;
  let installationCost = 0;
  let totalLaborDays = 0;
  let materialHeavyCount = 0;
  let laborHeavyCount = 0;

  quotations.forEach(q => {
    const calculations = q.calculations;
    if (!calculations) return;

    totalLaborCostILS += calculations.totalLaborILS;
    engineeringCost += calculations.totalEngineeringILS;
    commissioningCost += calculations.totalCommissioningILS;
    installationCost += calculations.totalInstallationILS;

    // Estimate days (assuming dayWorkCost from parameters)
    const dayWorkCost = q.parameters?.dayWorkCost || 1200;
    totalLaborDays += calculations.totalLaborILS / dayWorkCost;

    // Material-heavy vs Labor-heavy
    const totalILS = calculations.subtotalILS;
    const materialILS = calculations.totalHardwareILS + calculations.totalSoftwareILS;
    const laborPercent = totalILS > 0 ? (calculations.totalLaborILS / totalILS) * 100 : 0;
    const materialPercent = totalILS > 0 ? (materialILS / totalILS) * 100 : 0;

    if (materialPercent > 60) {
      materialHeavyCount++;
    }
    if (laborPercent > 60) {
      laborHeavyCount++;
    }
  });

  // Average labor percentage per quotation
  const avgLaborPercentPerQuotation = quotations.reduce((sum, q) => {
    const totalILS = q.calculations?.subtotalILS || 0;
    const laborILS = q.calculations?.totalLaborILS || 0;
    const percent = totalILS > 0 ? (laborILS / totalILS) * 100 : 0;
    return sum + percent;
  }, 0) / quotations.length;

  // Labor by subtype
  const laborBySubtype = {
    engineering: {
      days: engineeringCost > 0 ? engineeringCost / (quotations[0]?.parameters?.dayWorkCost || 1200) : 0,
      costILS: Math.round(engineeringCost),
      percent: totalLaborCostILS > 0 ? Number(((engineeringCost / totalLaborCostILS) * 100).toFixed(1)) : 0
    },
    commissioning: {
      days: commissioningCost > 0 ? commissioningCost / (quotations[0]?.parameters?.dayWorkCost || 1200) : 0,
      costILS: Math.round(commissioningCost),
      percent: totalLaborCostILS > 0 ? Number(((commissioningCost / totalLaborCostILS) * 100).toFixed(1)) : 0
    },
    installation: {
      days: installationCost > 0 ? installationCost / (quotations[0]?.parameters?.dayWorkCost || 1200) : 0,
      costILS: Math.round(installationCost),
      percent: totalLaborCostILS > 0 ? Number(((installationCost / totalLaborCostILS) * 100).toFixed(1)) : 0
    }
  };

  // Labor trend over time
  const laborTrend = calculateLaborTrend(quotations);

  return {
    totalLaborDays: Number(totalLaborDays.toFixed(1)),
    totalLaborCostILS: Math.round(totalLaborCostILS),
    laborBySubtype,
    avgLaborPercentPerQuotation: Number(avgLaborPercentPerQuotation.toFixed(1)),
    laborTrend,
    materialHeavyCount,
    laborHeavyCount
  };
}

/**
 * Calculate labor cost trend by month
 */
function calculateLaborTrend(quotations: QuotationProject[]): Array<{ month: string; laborCostILS: number }> {
  const grouped = groupQuotationsByMonth(quotations, 'createdAt');
  const result: Array<{ month: string; laborCostILS: number }> = [];

  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach(monthKey => {
    const monthQuotations = grouped.get(monthKey)!;
    const laborCostILS = monthQuotations.reduce((sum, q) => {
      return sum + (q.calculations?.totalLaborILS || 0);
    }, 0);

    result.push({
      month: monthKey,
      laborCostILS: Math.round(laborCostILS)
    });
  });

  return result;
}

// ============ Trend Metrics ============

/**
 * Calculate trend metrics
 */
export function calculateTrends(
  quotations: QuotationProject[],
  dateRange?: DateRange
): TrendMetrics {
  const filteredQuotations = dateRange
    ? filterQuotationsByDateRange(quotations, dateRange)
    : quotations;

  if (filteredQuotations.length === 0) {
    return {
      monthOverMonthGrowth: 0,
      winRate: 0,
      avgMarginTrend: [],
      volumeTrend: [],
      seasonalPatterns: undefined
    };
  }

  // Month-over-month growth
  const monthOverMonthGrowth = calculateMonthOverMonthGrowth(filteredQuotations);

  // Win rate
  const winRate = calculateWinRate(filteredQuotations);

  // Average margin trend
  const avgMarginTrend = calculateAvgMarginTrend(filteredQuotations);

  // Volume trend
  const volumeTrend = calculateVolumeTrend(filteredQuotations);

  // Seasonal patterns (only if enough data)
  const seasonalPatterns = filteredQuotations.length >= 12
    ? calculateSeasonalPatterns(filteredQuotations)
    : undefined;

  return {
    monthOverMonthGrowth,
    winRate,
    avgMarginTrend,
    volumeTrend,
    seasonalPatterns
  };
}

/**
 * Calculate month-over-month revenue growth
 */
function calculateMonthOverMonthGrowth(quotations: QuotationProject[]): number {
  const wonQuotations = quotations.filter(q => q.status === 'won');
  const grouped = groupQuotationsByMonth(wonQuotations, 'createdAt');
  const sortedKeys = Array.from(grouped.keys()).sort();

  if (sortedKeys.length < 2) {
    return 0;
  }

  const currentMonth = sortedKeys[sortedKeys.length - 1];
  const previousMonth = sortedKeys[sortedKeys.length - 2];

  const currentRevenue = grouped.get(currentMonth)!.reduce((sum, q) => {
    return sum + (q.calculations?.finalTotalILS || 0);
  }, 0);

  const previousRevenue = grouped.get(previousMonth)!.reduce((sum, q) => {
    return sum + (q.calculations?.finalTotalILS || 0);
  }, 0);

  if (previousRevenue === 0) {
    return 0;
  }

  return Number((((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1));
}

/**
 * Calculate win rate
 */
export function calculateWinRate(quotations: QuotationProject[]): number {
  const sentOrWonOrLost = quotations.filter(q =>
    q.status === 'sent' || q.status === 'won' || q.status === 'lost'
  );

  if (sentOrWonOrLost.length === 0) {
    return 0;
  }

  const wonCount = quotations.filter(q => q.status === 'won').length;

  return Number(((wonCount / sentOrWonOrLost.length) * 100).toFixed(1));
}

/**
 * Calculate average margin trend by month
 */
function calculateAvgMarginTrend(quotations: QuotationProject[]): Array<{ month: string; avgMargin: number }> {
  const grouped = groupQuotationsByMonth(quotations, 'createdAt');
  const result: Array<{ month: string; avgMargin: number }> = [];

  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach(monthKey => {
    const monthQuotations = grouped.get(monthKey)!;
    const avgMargin = monthQuotations.reduce((sum, q) => {
      return sum + (q.calculations?.profitMarginPercent || 0);
    }, 0) / monthQuotations.length;

    result.push({
      month: monthKey,
      avgMargin: Number(avgMargin.toFixed(1))
    });
  });

  return result;
}

/**
 * Calculate quotation volume trend by month
 */
function calculateVolumeTrend(quotations: QuotationProject[]): Array<{ month: string; quotationCount: number }> {
  const grouped = groupQuotationsByMonth(quotations, 'createdAt');
  const result: Array<{ month: string; quotationCount: number }> = [];

  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach(monthKey => {
    const monthQuotations = grouped.get(monthKey)!;
    result.push({
      month: monthKey,
      quotationCount: monthQuotations.length
    });
  });

  return result;
}

/**
 * Calculate seasonal patterns
 */
function calculateSeasonalPatterns(quotations: QuotationProject[]): {
  bestMonth: string;
  worstMonth: string;
  avgRevenueByMonth: Array<{ month: string; avgRevenue: number }>;
} {
  const wonQuotations = quotations.filter(q => q.status === 'won');
  const revenueByCalendarMonth = new Map<string, number[]>();

  // Group by calendar month (1-12)
  wonQuotations.forEach(q => {
    const date = new Date(q.createdAt);
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    const revenue = q.calculations?.finalTotalILS || 0;

    if (!revenueByCalendarMonth.has(monthName)) {
      revenueByCalendarMonth.set(monthName, []);
    }
    revenueByCalendarMonth.get(monthName)!.push(revenue);
  });

  // Calculate averages
  const avgRevenueByMonth: Array<{ month: string; avgRevenue: number }> = [];
  let bestMonth = { name: '', avgRevenue: 0 };
  let worstMonth = { name: '', avgRevenue: Infinity };

  revenueByCalendarMonth.forEach((revenues, monthName) => {
    const avgRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length;

    avgRevenueByMonth.push({
      month: monthName,
      avgRevenue: Math.round(avgRevenue)
    });

    if (avgRevenue > bestMonth.avgRevenue) {
      bestMonth = { name: monthName, avgRevenue };
    }
    if (avgRevenue < worstMonth.avgRevenue) {
      worstMonth = { name: monthName, avgRevenue };
    }
  });

  return {
    bestMonth: bestMonth.name,
    worstMonth: worstMonth.name,
    avgRevenueByMonth
  };
}

// ============ Customer Metrics ============

/**
 * Calculate customer metrics
 */
export function calculateCustomerMetrics(quotations: QuotationProject[]): CustomerMetrics {
  if (quotations.length === 0) {
    return {
      topCustomers: [],
      repeatCustomerPercent: 0,
      totalCustomerCount: 0,
      avgProjectsPerCustomer: 0
    };
  }

  // Group by customer
  const customerData = new Map<string, {
    totalValueILS: number;
    quotationCount: number;
    wonCount: number;
    quotations: QuotationProject[];
  }>();

  quotations.forEach(q => {
    const customerName = q.customerName.trim();

    if (!customerData.has(customerName)) {
      customerData.set(customerName, {
        totalValueILS: 0,
        quotationCount: 0,
        wonCount: 0,
        quotations: []
      });
    }

    const customer = customerData.get(customerName)!;
    customer.totalValueILS += q.calculations?.finalTotalILS || 0;
    customer.quotationCount++;
    if (q.status === 'won') {
      customer.wonCount++;
    }
    customer.quotations.push(q);
  });

  // Top 10 customers
  const topCustomers = Array.from(customerData.entries())
    .map(([customerName, data]) => ({
      customerName,
      totalValueILS: Math.round(data.totalValueILS),
      quotationCount: data.quotationCount,
      wonCount: data.wonCount,
      winRate: data.quotationCount > 0 ? Number(((data.wonCount / data.quotationCount) * 100).toFixed(1)) : 0,
      avgProjectSizeILS: Math.round(data.totalValueILS / data.quotationCount)
    }))
    .sort((a, b) => b.totalValueILS - a.totalValueILS)
    .slice(0, 10);

  // Repeat customer percentage
  const repeatCustomerCount = Array.from(customerData.values()).filter(c => c.quotationCount >= 2).length;
  const repeatCustomerPercent = customerData.size > 0
    ? Number(((repeatCustomerCount / customerData.size) * 100).toFixed(1))
    : 0;

  // Average projects per customer
  const avgProjectsPerCustomer = customerData.size > 0
    ? Number((quotations.length / customerData.size).toFixed(1))
    : 0;

  return {
    topCustomers,
    repeatCustomerPercent,
    totalCustomerCount: customerData.size,
    avgProjectsPerCustomer
  };
}

// ============ Utility Functions ============

/**
 * Format month key to readable string
 */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format currency value
 */
export function formatCurrencyILS(value: number): string {
  return `₪${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
