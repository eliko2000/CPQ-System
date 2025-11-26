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
 *
 * NOTE: This file has been refactored. Core calculation modules are in ./calculations/
 * Trend metrics, customer metrics, and utility functions remain here for now.
 */

import type { QuotationProject } from '../types';

// Re-export all modular calculations
export * from './calculations';

// Import helpers from the calculations module
import {
  filterQuotationsByDateRange,
  groupQuotationsByMonth,
} from './calculations/helpers';
import type {
  DateRange,
  TrendMetrics,
  CustomerMetrics,
} from './calculations/types';

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
      seasonalPatterns: undefined,
    };
  }

  // Month-over-month growth
  const monthOverMonthGrowth =
    calculateMonthOverMonthGrowth(filteredQuotations);

  // Win rate
  const winRate = calculateWinRate(filteredQuotations);

  // Average margin trend
  const avgMarginTrend = calculateAvgMarginTrend(filteredQuotations);

  // Volume trend
  const volumeTrend = calculateVolumeTrend(filteredQuotations);

  // Seasonal patterns (only if enough data)
  const seasonalPatterns =
    filteredQuotations.length >= 12
      ? calculateSeasonalPatterns(filteredQuotations)
      : undefined;

  return {
    monthOverMonthGrowth,
    winRate,
    avgMarginTrend,
    volumeTrend,
    seasonalPatterns,
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

  return Number(
    (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1)
  );
}

/**
 * Calculate win rate
 */
export function calculateWinRate(quotations: QuotationProject[]): number {
  const sentOrWonOrLost = quotations.filter(
    q => q.status === 'sent' || q.status === 'won' || q.status === 'lost'
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
function calculateAvgMarginTrend(
  quotations: QuotationProject[]
): Array<{ month: string; avgMargin: number }> {
  const grouped = groupQuotationsByMonth(quotations, 'createdAt');
  const result: Array<{ month: string; avgMargin: number }> = [];

  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach(monthKey => {
    const monthQuotations = grouped.get(monthKey)!;

    const avgMargin =
      monthQuotations.reduce((sum, q) => {
        return sum + (q.calculations?.profitMarginPercent || 0);
      }, 0) / monthQuotations.length;

    result.push({
      month: monthKey,
      avgMargin: Number(avgMargin.toFixed(1)),
    });
  });

  return result;
}

/**
 * Calculate quotation volume trend
 */
function calculateVolumeTrend(
  quotations: QuotationProject[]
): Array<{ month: string; quotationCount: number }> {
  const grouped = groupQuotationsByMonth(quotations, 'createdAt');
  const result: Array<{ month: string; quotationCount: number }> = [];

  const sortedKeys = Array.from(grouped.keys()).sort();

  sortedKeys.forEach(monthKey => {
    const monthQuotations = grouped.get(monthKey)!;

    result.push({
      month: monthKey,
      quotationCount: monthQuotations.length,
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
  // Group by calendar month (ignoring year)
  const monthlyRevenue = new Map<string, number[]>();

  quotations
    .filter(q => q.status === 'won')
    .forEach(q => {
      const date = new Date(q.createdAt);
      const monthName = date.toLocaleString('default', { month: 'long' });
      const revenue = q.calculations?.finalTotalILS || 0;

      if (!monthlyRevenue.has(monthName)) {
        monthlyRevenue.set(monthName, []);
      }
      monthlyRevenue.get(monthName)!.push(revenue);
    });

  // Calculate average revenue per month
  const avgRevenueByMonth: Array<{ month: string; avgRevenue: number }> = [];
  let bestMonth = '';
  let worstMonth = '';
  let maxAvg = 0;
  let minAvg = Infinity;

  monthlyRevenue.forEach((revenues, monthName) => {
    const avgRevenue =
      revenues.reduce((sum, r) => sum + r, 0) / revenues.length;

    avgRevenueByMonth.push({
      month: monthName,
      avgRevenue: Math.round(avgRevenue),
    });

    if (avgRevenue > maxAvg) {
      maxAvg = avgRevenue;
      bestMonth = monthName;
    }
    if (avgRevenue < minAvg) {
      minAvg = avgRevenue;
      worstMonth = monthName;
    }
  });

  return {
    bestMonth,
    worstMonth,
    avgRevenueByMonth,
  };
}

// ============ Customer Metrics ============

/**
 * Calculate customer metrics
 */
export function calculateCustomerMetrics(
  quotations: QuotationProject[]
): CustomerMetrics {
  if (quotations.length === 0) {
    return {
      topCustomers: [],
      repeatCustomerPercent: 0,
      totalCustomerCount: 0,
      avgProjectsPerCustomer: 0,
    };
  }

  // Group quotations by customer
  const customerData = new Map<
    string,
    {
      totalValueILS: number;
      quotationCount: number;
      wonCount: number;
    }
  >();

  quotations.forEach(q => {
    const customerName = q.customerName || 'Unknown';

    if (!customerData.has(customerName)) {
      customerData.set(customerName, {
        totalValueILS: 0,
        quotationCount: 0,
        wonCount: 0,
      });
    }

    const data = customerData.get(customerName)!;
    data.quotationCount++;
    data.totalValueILS += q.calculations?.finalTotalILS || 0;

    if (q.status === 'won') {
      data.wonCount++;
    }
  });

  // Top 10 customers
  const topCustomers = Array.from(customerData.entries())
    .map(([customerName, data]) => ({
      customerName,
      totalValueILS: Math.round(data.totalValueILS),
      quotationCount: data.quotationCount,
      wonCount: data.wonCount,
      winRate:
        data.quotationCount > 0
          ? Number(((data.wonCount / data.quotationCount) * 100).toFixed(1))
          : 0,
      avgProjectSizeILS: Math.round(data.totalValueILS / data.quotationCount),
    }))
    .sort((a, b) => b.totalValueILS - a.totalValueILS)
    .slice(0, 10);

  // Repeat customer percentage
  const repeatCustomers = Array.from(customerData.values()).filter(
    data => data.quotationCount >= 2
  ).length;
  const repeatCustomerPercent =
    customerData.size > 0
      ? Number(((repeatCustomers / customerData.size) * 100).toFixed(1))
      : 0;

  // Average projects per customer
  const totalProjects = quotations.length;
  const avgProjectsPerCustomer =
    customerData.size > 0
      ? Number((totalProjects / customerData.size).toFixed(1))
      : 0;

  return {
    topCustomers,
    repeatCustomerPercent,
    totalCustomerCount: customerData.size,
    avgProjectsPerCustomer,
  };
}

// ============ Utility Functions ============

/**
 * Format month key to readable format
 */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

/**
 * Format currency in ILS
 */
export function formatCurrencyILS(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format currency in USD
 */
export function formatCurrencyUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
