/**
 * Tests for Analytics Calculations
 *
 * Comprehensive test coverage for all analytics calculation functions
 * Target: 90%+ coverage with 37+ tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRevenueMetrics,
  calculateMarginAnalysis,
  calculateComponentAnalytics,
  calculateLaborMetrics,
  calculateTrends,
  calculateCustomerMetrics,
  calculateWinRate,
  filterQuotationsByDateRange,
  filterQuotationsByStatus,
  groupQuotationsByMonth,
  getPredefinedDateRange,
  type DateRange,
} from '../analyticsCalculations';
import type { QuotationProject, QuotationItem } from '../../types';

// ============ Test Helpers ============

/**
 * Create a mock quotation with sensible defaults
 */
function createMockQuotation(
  overrides: Partial<QuotationProject> = {}
): QuotationProject {
  return {
    id: 'test-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Project',
    customerName: 'Test Customer',
    status: 'won',
    systems: [],
    items: [],
    parameters: {
      usdToIlsRate: 3.7,
      eurToIlsRate: 4.0,
      markupPercent: 25,
      dayWorkCost: 2000,
      profitPercent: 25,
      riskPercent: 5,
      includeVAT: false,
      vatRate: 17,
    },
    calculations: {
      totalHardwareUSD: 10000,
      totalHardwareILS: 37000,
      totalSoftwareUSD: 2000,
      totalSoftwareILS: 7400,
      totalLaborUSD: 3000,
      totalLaborILS: 11100,
      totalEngineeringILS: 7000,
      totalCommissioningILS: 4100,
      totalInstallationILS: 0,
      totalProgrammingILS: 0,
      subtotalUSD: 15000,
      subtotalILS: 55500,
      totalCustomerPriceILS: 69375,
      riskAdditionILS: 3469,
      totalQuoteILS: 72844,
      totalVATILS: 0,
      finalTotalILS: 72844,
      totalCostILS: 55500,
      totalProfitILS: 17344,
      profitMarginPercent: 23.8,
    },
    createdAt: new Date('2025-01-15').toISOString(),
    updatedAt: new Date('2025-01-15').toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock quotation item
 */
function createMockItem(overrides: Partial<QuotationItem> = {}): QuotationItem {
  return {
    id: 'item-' + Math.random().toString(36).substr(2, 9),
    systemId: 'sys-1',
    systemOrder: 1,
    itemOrder: 1,
    displayNumber: '1.1',
    componentId: 'comp-1',
    componentName: 'Test Component',
    componentCategory: 'בקרים',
    itemType: 'hardware',
    quantity: 1,
    unitPriceUSD: 100,
    unitPriceILS: 370,
    totalPriceUSD: 100,
    totalPriceILS: 370,
    itemMarkupPercent: 25,
    customerPriceILS: 462.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============ Date Range Filtering Tests ============

describe('Date Range Filtering', () => {
  it('should filter quotations by Last 30 days preset', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const old = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

    const quotations = [
      createMockQuotation({ createdAt: recent.toISOString() }),
      createMockQuotation({ createdAt: old.toISOString() }),
    ];

    const dateRange = getPredefinedDateRange('30d');
    const filtered = filterQuotationsByDateRange(quotations, dateRange);

    expect(filtered.length).toBe(1);
    expect(filtered[0].createdAt).toBe(recent.toISOString());
  });

  it('should filter quotations by Last 90 days preset', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const old = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days ago

    const quotations = [
      createMockQuotation({ createdAt: recent.toISOString() }),
      createMockQuotation({ createdAt: old.toISOString() }),
    ];

    const dateRange = getPredefinedDateRange('90d');
    const filtered = filterQuotationsByDateRange(quotations, dateRange);

    expect(filtered.length).toBe(1);
    expect(filtered[0].createdAt).toBe(recent.toISOString());
  });

  it('should filter quotations by custom date range', () => {
    const quotations = [
      createMockQuotation({ createdAt: new Date('2025-01-15').toISOString() }),
      createMockQuotation({ createdAt: new Date('2025-02-15').toISOString() }),
      createMockQuotation({ createdAt: new Date('2025-03-15').toISOString() }),
    ];

    const dateRange: DateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-02-28'),
    };

    const filtered = filterQuotationsByDateRange(quotations, dateRange);

    expect(filtered.length).toBe(2);
  });

  it('should return empty array when no quotations match date range', () => {
    const quotations = [
      createMockQuotation({ createdAt: new Date('2024-01-15').toISOString() }),
    ];

    const dateRange: DateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const filtered = filterQuotationsByDateRange(quotations, dateRange);

    expect(filtered).toEqual([]);
  });
});

// ============ Revenue Metrics Tests ============

describe('Revenue Metrics', () => {
  it('should calculate total revenue from won quotations only', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 30000,
        },
      }),
      createMockQuotation({
        status: 'lost',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 20000,
        },
      }),
    ];

    const metrics = calculateRevenueMetrics(
      quotations,
      getPredefinedDateRange('all')
    );

    expect(metrics.totalRevenue).toBe(80000);
    expect(metrics.wonCount).toBe(2);
    expect(metrics.lostCount).toBe(1);
  });

  it('should calculate pipeline value from draft and sent quotations', () => {
    const quotations = [
      createMockQuotation({
        status: 'draft',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 40000,
        },
      }),
      createMockQuotation({
        status: 'sent',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 60000,
        },
      }),
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
    ];

    const metrics = calculateRevenueMetrics(
      quotations,
      getPredefinedDateRange('all')
    );

    expect(metrics.pipelineValue).toBe(100000); // 40000 + 60000
    expect(metrics.draftCount).toBe(1);
    expect(metrics.sentCount).toBe(1);
  });

  it('should return zeros for empty quotations array', () => {
    const metrics = calculateRevenueMetrics([], getPredefinedDateRange('all'));

    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.pipelineValue).toBe(0);
    expect(metrics.wonCount).toBe(0);
    expect(metrics.lostCount).toBe(0);
    expect(metrics.draftCount).toBe(0);
    expect(metrics.sentCount).toBe(0);
    expect(metrics.averageValue).toBe(0);
    expect(metrics.averageWonValue).toBe(0);
    expect(metrics.revenueByMonth).toEqual([]);
  });

  it('should group monthly revenue correctly with multiple months', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-01-15').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-01-20').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 30000,
        },
      }),
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-02-10').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 40000,
        },
      }),
    ];

    const metrics = calculateRevenueMetrics(
      quotations,
      getPredefinedDateRange('all')
    );

    expect(metrics.revenueByMonth.length).toBe(2);
    expect(metrics.revenueByMonth[0].month).toBe('2025-01');
    expect(metrics.revenueByMonth[0].revenue).toBe(80000); // 50000 + 30000
    expect(metrics.revenueByMonth[1].month).toBe('2025-02');
    expect(metrics.revenueByMonth[1].revenue).toBe(40000);
  });

  it('should calculate average values correctly', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 60000,
        },
      }),
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 40000,
        },
      }),
      createMockQuotation({
        status: 'draft',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
    ];

    const metrics = calculateRevenueMetrics(
      quotations,
      getPredefinedDateRange('all')
    );

    expect(metrics.averageValue).toBe(50000); // (60000 + 40000 + 50000) / 3
    expect(metrics.averageWonValue).toBe(50000); // (60000 + 40000) / 2
  });
});

// ============ Margin Analysis Tests ============

describe('Margin Analysis', () => {
  it('should calculate weighted average margin with varied margins', () => {
    const quotations = [
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 100000,
          profitMarginPercent: 5,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 100000,
          profitMarginPercent: 15,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 100000,
          profitMarginPercent: 25,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 100000,
          profitMarginPercent: 35,
        },
      }),
    ];

    const metrics = calculateMarginAnalysis(quotations);

    // Weighted average: (5*100000 + 15*100000 + 25*100000 + 35*100000) / 400000 = 20
    expect(metrics.averageMargin).toBe(20);
  });

  it('should categorize margins into distribution buckets correctly', () => {
    const quotations = [
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 5,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 15,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 25,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 35,
        },
      }),
    ];

    const metrics = calculateMarginAnalysis(quotations);

    expect(metrics.marginDistribution).toEqual([
      { range: '0-10%', count: 1 },
      { range: '10-20%', count: 1 },
      { range: '20-30%', count: 1 },
      { range: '30%+', count: 1 },
    ]);
  });

  it('should identify min and max margins correctly', () => {
    const quotations = [
      createMockQuotation({
        id: 'low-margin',
        name: 'Low Margin Project',
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 8,
        },
      }),
      createMockQuotation({
        id: 'high-margin',
        name: 'High Margin Project',
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 35,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 20,
        },
      }),
    ];

    const metrics = calculateMarginAnalysis(quotations);

    expect(metrics.minMargin.value).toBe(8);
    expect(metrics.minMargin.quotationId).toBe('low-margin');
    expect(metrics.minMargin.quotationName).toBe('Low Margin Project');
    expect(metrics.maxMargin.value).toBe(35);
    expect(metrics.maxMargin.quotationId).toBe('high-margin');
    expect(metrics.maxMargin.quotationName).toBe('High Margin Project');
  });

  it('should calculate average margin by status separately', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 30,
        },
      }),
      createMockQuotation({
        status: 'won',
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 20,
        },
      }),
      createMockQuotation({
        status: 'draft',
        calculations: {
          ...createMockQuotation().calculations,
          profitMarginPercent: 15,
        },
      }),
    ];

    const metrics = calculateMarginAnalysis(quotations);

    const wonMargin = metrics.marginByStatus.find(m => m.status === 'won');
    const draftMargin = metrics.marginByStatus.find(m => m.status === 'draft');

    expect(wonMargin?.avgMargin).toBe(25); // (30 + 20) / 2
    expect(wonMargin?.count).toBe(2);
    expect(draftMargin?.avgMargin).toBe(15);
    expect(draftMargin?.count).toBe(1);
  });

  it('should calculate margin by type (HW/SW/Labor) from items', () => {
    const quotations = [
      createMockQuotation({
        items: [
          createMockItem({
            itemType: 'hardware',
            totalPriceILS: 1000,
            customerPriceILS: 1250, // 20% margin
          }),
          createMockItem({
            itemType: 'software',
            totalPriceILS: 500,
            customerPriceILS: 600, // 16.67% margin
          }),
          createMockItem({
            itemType: 'labor',
            totalPriceILS: 2000,
            customerPriceILS: 2400, // 16.67% margin
          }),
        ],
      }),
    ];

    const metrics = calculateMarginAnalysis(quotations);

    expect(metrics.marginByType.hw).toBeCloseTo(20, 0);
    expect(metrics.marginByType.sw).toBeCloseTo(16.7, 0);
    expect(metrics.marginByType.labor).toBeCloseTo(16.7, 0);
  });

  it('should return safe defaults for empty quotations array', () => {
    const metrics = calculateMarginAnalysis([]);

    expect(metrics.averageMargin).toBe(0);
    expect(metrics.marginDistribution).toEqual([]);
    expect(metrics.minMargin.value).toBe(0);
    expect(metrics.maxMargin.value).toBe(0);
    expect(metrics.marginByStatus).toEqual([]);
    expect(metrics.marginByType).toEqual({ hw: 0, sw: 0, labor: 0 });
  });
});

// ============ Component Analytics Tests ============

describe('Component Analytics', () => {
  it('should identify top 10 components by quantity', () => {
    const items: QuotationItem[] = [];
    for (let i = 0; i < 15; i++) {
      items.push(
        createMockItem({
          componentId: `comp-${i}`,
          componentName: `Component ${i}`,
          quantity: 15 - i, // Descending quantities
        })
      );
    }

    const quotations = [createMockQuotation({ items })];
    const analytics = calculateComponentAnalytics(quotations);

    expect(analytics.topComponents.length).toBe(10);
    expect(analytics.topComponents[0].componentName).toBe('Component 0');
    expect(analytics.topComponents[0].totalQuantity).toBe(15);
    expect(analytics.topComponents[9].componentName).toBe('Component 9');
    expect(analytics.topComponents[9].totalQuantity).toBe(6);
  });

  it('should aggregate component usage by category', () => {
    const quotations = [
      createMockQuotation({
        items: [
          createMockItem({
            componentId: 'comp-1',
            componentCategory: 'בקרים',
            totalPriceILS: 1000,
          }),
          createMockItem({
            componentId: 'comp-2', // Different component ID
            componentCategory: 'בקרים',
            totalPriceILS: 1500,
          }),
          createMockItem({
            componentId: 'comp-3',
            componentCategory: 'חיישנים',
            totalPriceILS: 800,
          }),
        ],
      }),
    ];

    const analytics = calculateComponentAnalytics(quotations);

    expect(analytics.usageByCategory.length).toBe(2);

    const controllers = analytics.usageByCategory.find(
      c => c.category === 'בקרים'
    );
    expect(controllers?.count).toBe(2); // 2 unique components
    expect(controllers?.totalSpendILS).toBe(2500);
    expect(controllers?.percentOfTotal).toBeCloseTo(75.8, 0);

    const sensors = analytics.usageByCategory.find(
      c => c.category === 'חיישנים'
    );
    expect(sensors?.count).toBe(1);
    expect(sensors?.totalSpendILS).toBe(800);
    expect(sensors?.percentOfTotal).toBeCloseTo(24.2, 0);
  });

  it('should calculate HW:SW:Labor ratio matching quotationStatistics', () => {
    const quotations = [
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          totalHardwareILS: 50000,
          totalSoftwareILS: 10000,
          totalLaborILS: 40000,
        },
      }),
    ];

    const analytics = calculateComponentAnalytics(quotations);

    expect(analytics.typeRatio.hardware).toBe(50.0);
    expect(analytics.typeRatio.software).toBe(10.0);
    expect(analytics.typeRatio.labor).toBe(40.0);
  });

  it('should filter components by category when filter parameter provided', () => {
    const quotations = [
      createMockQuotation({
        items: [
          createMockItem({
            componentCategory: 'בקרים',
            componentName: 'PLC',
            totalPriceILS: 1000,
          }),
          createMockItem({
            componentCategory: 'חיישנים',
            componentName: 'Sensor',
            totalPriceILS: 500,
          }),
        ],
      }),
    ];

    const analytics = calculateComponentAnalytics(quotations, 'בקרים');

    expect(analytics.usageByCategory.length).toBe(1);
    expect(analytics.usageByCategory[0].category).toBe('בקרים');
    expect(analytics.topComponents.length).toBe(1);
    expect(analytics.topComponents[0].componentName).toBe('PLC');
  });

  it('should handle quotations with no items gracefully', () => {
    const quotations = [
      createMockQuotation({
        items: [],
        calculations: {
          ...createMockQuotation().calculations,
          totalHardwareILS: 0,
          totalSoftwareILS: 0,
          totalLaborILS: 0,
          totalCostILS: 0,
          finalTotalILS: 0,
        },
      }),
    ];
    const analytics = calculateComponentAnalytics(quotations);

    expect(analytics.topComponents).toEqual([]);
    expect(analytics.usageByCategory).toEqual([]);
    expect(analytics.typeRatio).toEqual({ hardware: 0, software: 0, labor: 0 });
    expect(analytics.mostValuableComponents).toEqual([]);
  });

  it('should return empty analytics for empty quotations array', () => {
    const analytics = calculateComponentAnalytics([]);

    expect(analytics.topComponents).toEqual([]);
    expect(analytics.usageByCategory).toEqual([]);
    expect(analytics.typeRatio).toEqual({ hardware: 0, software: 0, labor: 0 });
    expect(analytics.mostValuableComponents).toEqual([]);
  });
});

// ============ Labor Metrics Tests ============

describe('Labor Metrics', () => {
  it('should aggregate total labor days and cost', () => {
    const quotations = [
      createMockQuotation({
        parameters: {
          ...createMockQuotation().parameters,
          dayWorkCost: 2000,
        },
        calculations: {
          ...createMockQuotation().calculations,
          totalLaborILS: 10000, // 5 days
        },
      }),
      createMockQuotation({
        parameters: {
          ...createMockQuotation().parameters,
          dayWorkCost: 2000,
        },
        calculations: {
          ...createMockQuotation().calculations,
          totalLaborILS: 6000, // 3 days
        },
      }),
    ];

    const metrics = calculateLaborMetrics(quotations);

    expect(metrics.totalLaborCostILS).toBe(16000);
    expect(metrics.totalLaborDays).toBeCloseTo(8, 0); // 5 + 3
  });

  it('should breakdown labor by subtype (engineering/commissioning/installation)', () => {
    const quotations = [
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          totalLaborILS: 10000,
          totalEngineeringILS: 5000,
          totalCommissioningILS: 3000,
          totalInstallationILS: 2000,
        },
      }),
    ];

    const metrics = calculateLaborMetrics(quotations);

    expect(metrics.laborBySubtype.engineering.costILS).toBe(5000);
    expect(metrics.laborBySubtype.engineering.percent).toBe(50);
    expect(metrics.laborBySubtype.commissioning.costILS).toBe(3000);
    expect(metrics.laborBySubtype.commissioning.percent).toBe(30);
    expect(metrics.laborBySubtype.installation.costILS).toBe(2000);
    expect(metrics.laborBySubtype.installation.percent).toBe(20);
  });

  it('should classify material-heavy vs labor-heavy quotations', () => {
    const quotations = [
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          subtotalILS: 100000,
          totalHardwareILS: 70000,
          totalSoftwareILS: 10000,
          totalLaborILS: 20000,
        },
      }),
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          subtotalILS: 100000,
          totalHardwareILS: 20000,
          totalSoftwareILS: 10000,
          totalLaborILS: 70000,
        },
      }),
    ];

    const metrics = calculateLaborMetrics(quotations);

    expect(metrics.materialHeavyCount).toBe(1); // 80% material (70+10)
    expect(metrics.laborHeavyCount).toBe(1); // 70% labor
  });

  it('should calculate labor trend by month time series', () => {
    const quotations = [
      createMockQuotation({
        createdAt: new Date('2025-01-15').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          totalLaborILS: 5000,
        },
      }),
      createMockQuotation({
        createdAt: new Date('2025-01-20').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          totalLaborILS: 3000,
        },
      }),
      createMockQuotation({
        createdAt: new Date('2025-02-10').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          totalLaborILS: 7000,
        },
      }),
    ];

    const metrics = calculateLaborMetrics(quotations);

    expect(metrics.laborTrend.length).toBe(2);
    expect(metrics.laborTrend[0].month).toBe('2025-01');
    expect(metrics.laborTrend[0].laborCostILS).toBe(8000); // 5000 + 3000
    expect(metrics.laborTrend[1].month).toBe('2025-02');
    expect(metrics.laborTrend[1].laborCostILS).toBe(7000);
  });

  it('should return safe defaults for empty quotations array', () => {
    const metrics = calculateLaborMetrics([]);

    expect(metrics.totalLaborDays).toBe(0);
    expect(metrics.totalLaborCostILS).toBe(0);
    expect(metrics.laborBySubtype.engineering.days).toBe(0);
    expect(metrics.avgLaborPercentPerQuotation).toBe(0);
    expect(metrics.laborTrend).toEqual([]);
    expect(metrics.materialHeavyCount).toBe(0);
    expect(metrics.laborHeavyCount).toBe(0);
  });
});

// ============ Trend Analysis Tests ============

describe('Trend Analysis', () => {
  it('should calculate month-over-month growth rate', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-01-15').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-02-15').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 60000,
        },
      }),
    ];

    const trends = calculateTrends(quotations, getPredefinedDateRange('all'));

    // Growth: ((60000 - 50000) / 50000) * 100 = 20%
    expect(trends.monthOverMonthGrowth).toBe(20);
  });

  it('should calculate win rate (won / (won + lost))', () => {
    const quotations = [
      createMockQuotation({ status: 'won' }),
      createMockQuotation({ status: 'won' }),
      createMockQuotation({ status: 'won' }),
      createMockQuotation({ status: 'lost' }),
      createMockQuotation({ status: 'draft' }), // Not included
    ];

    const trends = calculateTrends(quotations, getPredefinedDateRange('all'));

    // Win rate: 3 / (3 + 1) = 75% (draft excluded)
    expect(trends.winRate).toBe(75);
  });

  it('should return zero growth with only 1 month of data', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-01-15').toISOString(),
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
    ];

    const trends = calculateTrends(quotations, getPredefinedDateRange('all'));

    expect(trends.monthOverMonthGrowth).toBe(0);
  });

  it('should detect seasonal patterns with 12+ months of data', () => {
    const quotations: QuotationProject[] = [];

    // Create 12 months of won quotations
    for (let month = 0; month < 12; month++) {
      quotations.push(
        createMockQuotation({
          status: 'won',
          createdAt: new Date(2024, month, 15).toISOString(),
          calculations: {
            ...createMockQuotation().calculations,
            finalTotalILS: 50000 + month * 5000, // Increasing revenue
          },
        })
      );
    }

    const trends = calculateTrends(quotations, getPredefinedDateRange('all'));

    expect(trends.seasonalPatterns).toBeDefined();
    expect(trends.seasonalPatterns?.bestMonth).toBeDefined();
    expect(trends.seasonalPatterns?.worstMonth).toBeDefined();
    expect(trends.seasonalPatterns?.avgRevenueByMonth).toBeDefined();
  });

  it('should return undefined seasonal patterns with less than 12 months', () => {
    const quotations = [
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-01-15').toISOString(),
      }),
      createMockQuotation({
        status: 'won',
        createdAt: new Date('2025-02-15').toISOString(),
      }),
    ];

    const trends = calculateTrends(quotations, getPredefinedDateRange('all'));

    expect(trends.seasonalPatterns).toBeUndefined();
  });

  it('should return safe defaults for empty quotations array', () => {
    const trends = calculateTrends([]);

    expect(trends.monthOverMonthGrowth).toBe(0);
    expect(trends.winRate).toBe(0);
    expect(trends.avgMarginTrend).toEqual([]);
    expect(trends.volumeTrend).toEqual([]);
    expect(trends.seasonalPatterns).toBeUndefined();
  });
});

// ============ Customer Metrics Tests ============

describe('Customer Metrics', () => {
  it('should aggregate quotations by customer name', () => {
    const quotations = [
      createMockQuotation({
        customerName: 'Customer A',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 50000,
        },
      }),
      createMockQuotation({
        customerName: 'Customer A',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 30000,
        },
      }),
      createMockQuotation({
        customerName: 'Customer B',
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 40000,
        },
      }),
    ];

    const metrics = calculateCustomerMetrics(quotations);

    const customerA = metrics.topCustomers.find(
      c => c.customerName === 'Customer A'
    );
    expect(customerA?.totalValueILS).toBe(80000);
    expect(customerA?.quotationCount).toBe(2);
  });

  it('should sort top 10 customers by total value', () => {
    const quotations: QuotationProject[] = [];

    for (let i = 0; i < 15; i++) {
      quotations.push(
        createMockQuotation({
          customerName: `Customer ${i}`,
          calculations: {
            ...createMockQuotation().calculations,
            finalTotalILS: (15 - i) * 10000, // Descending values
          },
        })
      );
    }

    const metrics = calculateCustomerMetrics(quotations);

    expect(metrics.topCustomers.length).toBe(10);
    expect(metrics.topCustomers[0].customerName).toBe('Customer 0');
    expect(metrics.topCustomers[0].totalValueILS).toBe(150000);
    expect(metrics.topCustomers[9].customerName).toBe('Customer 9');
  });

  it('should calculate repeat customer percentage correctly', () => {
    const quotations = [
      createMockQuotation({ customerName: 'Customer A' }),
      createMockQuotation({ customerName: 'Customer A' }), // Repeat
      createMockQuotation({ customerName: 'Customer B' }),
      createMockQuotation({ customerName: 'Customer B' }), // Repeat
      createMockQuotation({ customerName: 'Customer C' }), // Single
    ];

    const metrics = calculateCustomerMetrics(quotations);

    // 2 repeat customers out of 3 total = 66.7%
    expect(metrics.repeatCustomerPercent).toBeCloseTo(66.7, 0);
    expect(metrics.totalCustomerCount).toBe(3);
    expect(metrics.avgProjectsPerCustomer).toBeCloseTo(1.7, 0); // 5 / 3
  });

  it('should return safe defaults for empty quotations array', () => {
    const metrics = calculateCustomerMetrics([]);

    expect(metrics.topCustomers).toEqual([]);
    expect(metrics.repeatCustomerPercent).toBe(0);
    expect(metrics.totalCustomerCount).toBe(0);
    expect(metrics.avgProjectsPerCustomer).toBe(0);
  });
});

// ============ Edge Cases Tests ============

describe('Edge Cases', () => {
  it('should handle all functions with empty quotations array safely', () => {
    const emptyArray: QuotationProject[] = [];

    expect(() => calculateRevenueMetrics(emptyArray)).not.toThrow();
    expect(() => calculateMarginAnalysis(emptyArray)).not.toThrow();
    expect(() => calculateComponentAnalytics(emptyArray)).not.toThrow();
    expect(() => calculateLaborMetrics(emptyArray)).not.toThrow();
    expect(() => calculateTrends(emptyArray)).not.toThrow();
    expect(() => calculateCustomerMetrics(emptyArray)).not.toThrow();
  });

  it('should handle single quotation without division by zero errors', () => {
    const quotations = [createMockQuotation()];

    const revenue = calculateRevenueMetrics(quotations);
    const margin = calculateMarginAnalysis(quotations);
    calculateComponentAnalytics(quotations); // Called for side effects
    const labor = calculateLaborMetrics(quotations);
    calculateTrends(quotations); // Called for side effects
    calculateCustomerMetrics(quotations); // Called for side effects

    expect(revenue.averageValue).toBeGreaterThan(0);
    expect(margin.averageMargin).toBeGreaterThan(0);
    expect(labor.totalLaborCostILS).toBeGreaterThan(0);
  });

  it('should handle quotations with missing calculations object', () => {
    const quotations = [
      createMockQuotation({
        calculations: undefined as any,
      }),
    ];

    const revenue = calculateRevenueMetrics(quotations);
    expect(revenue.totalRevenue).toBe(0);

    const margin = calculateMarginAnalysis(quotations);
    expect(margin.averageMargin).toBe(0);
  });

  it('should handle quotations with zero-value calculations', () => {
    const quotations = [
      createMockQuotation({
        calculations: {
          ...createMockQuotation().calculations,
          finalTotalILS: 0,
          subtotalILS: 0,
          totalHardwareILS: 0,
          totalSoftwareILS: 0,
          totalLaborILS: 0,
        },
      }),
    ];

    const revenue = calculateRevenueMetrics(quotations);
    expect(revenue.totalRevenue).toBe(0);

    const components = calculateComponentAnalytics(quotations);
    expect(components.typeRatio).toEqual({
      hardware: 0,
      software: 0,
      labor: 0,
    });
  });

  it('should handle date range with no matching quotations', () => {
    const quotations = [
      createMockQuotation({
        createdAt: new Date('2024-01-15').toISOString(),
      }),
    ];

    const dateRange: DateRange = {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    };

    const revenue = calculateRevenueMetrics(quotations, dateRange);
    expect(revenue.totalRevenue).toBe(0);

    const trends = calculateTrends(quotations, dateRange);
    expect(trends.monthOverMonthGrowth).toBe(0);
  });
});

// ============ Helper Function Tests ============

describe('Helper Functions', () => {
  it('should filter quotations by status correctly', () => {
    const quotations = [
      createMockQuotation({ status: 'draft' }),
      createMockQuotation({ status: 'sent' }),
      createMockQuotation({ status: 'won' }),
      createMockQuotation({ status: 'lost' }),
    ];

    const wonOnly = filterQuotationsByStatus(quotations, ['won']);
    expect(wonOnly.length).toBe(1);
    expect(wonOnly[0].status).toBe('won');

    const draftAndSent = filterQuotationsByStatus(quotations, [
      'draft',
      'sent',
    ]);
    expect(draftAndSent.length).toBe(2);
  });

  it('should group quotations by month correctly', () => {
    const quotations = [
      createMockQuotation({ createdAt: new Date('2025-01-05').toISOString() }),
      createMockQuotation({ createdAt: new Date('2025-01-20').toISOString() }),
      createMockQuotation({ createdAt: new Date('2025-02-10').toISOString() }),
    ];

    const grouped = groupQuotationsByMonth(quotations, 'createdAt');

    expect(grouped.size).toBe(2);
    expect(grouped.get('2025-01')?.length).toBe(2);
    expect(grouped.get('2025-02')?.length).toBe(1);
  });

  it('should calculate standalone win rate correctly', () => {
    const quotations = [
      createMockQuotation({ status: 'won' }),
      createMockQuotation({ status: 'won' }),
      createMockQuotation({ status: 'lost' }),
      createMockQuotation({ status: 'sent' }),
      createMockQuotation({ status: 'draft' }),
    ];

    const winRate = calculateWinRate(quotations);

    // Won / (sent + won + lost) = 2 / 4 = 50%
    expect(winRate).toBe(50);
  });

  it('should return zero win rate for quotations with no sent/won/lost', () => {
    const quotations = [
      createMockQuotation({ status: 'draft' }),
      createMockQuotation({ status: 'draft' }),
    ];

    const winRate = calculateWinRate(quotations);
    expect(winRate).toBe(0);
  });

  it('should generate predefined date ranges correctly', () => {
    const thirtyDays = getPredefinedDateRange('30d');
    expect(thirtyDays.label).toBe('Last 30 Days');

    const ninetyDays = getPredefinedDateRange('90d');
    expect(ninetyDays.label).toBe('Last 90 Days');

    const year = getPredefinedDateRange('year');
    expect(year.label).toBe('Last Year');

    const all = getPredefinedDateRange('all');
    expect(all.label).toBe('All Time');
  });
});
