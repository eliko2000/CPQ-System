/**
 * Analytics Calculation Types
 * Shared type definitions for all analytics modules
 */

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
