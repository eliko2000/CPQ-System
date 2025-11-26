/**
 * Revenue Calculations Module
 * Calculate revenue metrics, pipeline value, and revenue trends
 */

import type { QuotationProject } from '../../types';
import type { DateRange, RevenueMetrics } from './types';
import { filterQuotationsByDateRange, groupQuotationsByMonth } from './helpers';

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
      revenueByMonth: [],
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
  const pipelineValue = [...draftQuotations, ...sentQuotations].reduce(
    (sum, q) => {
      return sum + (q.calculations?.finalTotalILS || 0);
    },
    0
  );

  // Calculate average values
  const totalValue = filteredQuotations.reduce((sum, q) => {
    return sum + (q.calculations?.finalTotalILS || 0);
  }, 0);
  const averageValue =
    filteredQuotations.length > 0 ? totalValue / filteredQuotations.length : 0;
  const averageWonValue =
    wonQuotations.length > 0 ? totalRevenue / wonQuotations.length : 0;

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
    revenueByMonth,
  };
}

/**
 * Calculate revenue by month
 */
function calculateRevenueByMonth(
  quotations: QuotationProject[]
): Array<{ month: string; revenue: number }> {
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
      revenue: Math.round(revenue),
    });
  });

  return result;
}
