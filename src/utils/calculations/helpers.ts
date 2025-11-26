/**
 * Analytics Helper Functions
 * Shared utilities for filtering and grouping quotations
 */

import type { QuotationProject } from '../../types';
import type { DateRange } from './types';

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
export function getPredefinedDateRange(
  range: '30d' | '90d' | 'year' | 'all'
): DateRange {
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
