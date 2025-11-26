/**
 * Margin Calculations Module
 * Calculate margin analysis, distribution, and breakdowns by status/type
 */

import type { QuotationProject } from '../../types';
import type { MarginMetrics } from './types';

// ============ Margin Analysis ============

/**
 * Calculate margin analysis
 */
export function calculateMarginAnalysis(
  quotations: QuotationProject[]
): MarginMetrics {
  if (quotations.length === 0) {
    return {
      averageMargin: 0,
      marginDistribution: [],
      minMargin: { value: 0, quotationId: '', quotationName: '' },
      maxMargin: { value: 0, quotationId: '', quotationName: '' },
      marginByStatus: [],
      marginByType: { hw: 0, sw: 0, labor: 0 },
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
    marginByType,
  };
}

/**
 * Calculate margin distribution buckets
 */
function calculateMarginDistribution(
  quotations: QuotationProject[]
): Array<{ range: string; count: number }> {
  const buckets = {
    '0-10%': 0,
    '10-20%': 0,
    '20-30%': 0,
    '30%+': 0,
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
function calculateMarginByStatus(
  quotations: QuotationProject[]
): Array<{ status: string; avgMargin: number; count: number }> {
  const statuses: Array<'draft' | 'sent' | 'won' | 'lost'> = [
    'draft',
    'sent',
    'won',
    'lost',
  ];
  const result: Array<{ status: string; avgMargin: number; count: number }> =
    [];

  statuses.forEach(status => {
    const statusQuotations = quotations.filter(q => q.status === status);

    if (statusQuotations.length === 0) {
      return;
    }

    const avgMargin =
      statusQuotations.reduce((sum, q) => {
        return sum + (q.calculations?.profitMarginPercent || 0);
      }, 0) / statusQuotations.length;

    result.push({
      status,
      avgMargin: Number(avgMargin.toFixed(1)),
      count: statusQuotations.length,
    });
  });

  return result;
}

/**
 * Calculate average margin by component type
 */
function calculateMarginByType(quotations: QuotationProject[]): {
  hw: number;
  sw: number;
  labor: number;
} {
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
    labor: Number(
      calculateMargin(laborTotalCost, laborTotalCustomerPrice).toFixed(1)
    ),
  };
}
