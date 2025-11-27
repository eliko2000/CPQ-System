/**
 * Tests for Quotation Statistics Calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQuotationStatistics,
  getQuotationSummaryText,
  getDominantCategory,
  getQuotationType,
  validateStatistics,
  formatStatisticsForExport,
  compareQuotationStatistics,
} from '../quotationStatistics';
import type { QuotationProject } from '../../types';

// Helper to create a test quotation
function createTestQuotation(
  overrides: Partial<QuotationProject> = {}
): QuotationProject {
  return {
    id: 'test-1',
    name: 'Test Quotation',
    customerName: 'Test Customer',
    projectId: 'proj-1',
    projectName: 'Test Project',
    status: 'draft',
    systems: [],
    items: [],
    parameters: {
      usdToIlsRate: 3.7,
      eurToIlsRate: 4.0,
      markupPercent: 0.75, // 25% margin
      dayWorkCost: 2500,
      profitPercent: 25,
      riskPercent: 5,
      includeVAT: false,
      vatRate: 17,
    },
    calculations: {
      totalHardwareILS: 0,
      totalHardwareUSD: 0,
      totalSoftwareILS: 0,
      totalSoftwareUSD: 0,
      totalLaborILS: 0,
      totalLaborUSD: 0,
      totalEngineeringILS: 0,
      totalCommissioningILS: 0,
      totalInstallationILS: 0,
      totalProgrammingILS: 0,
      subtotalILS: 0,
      subtotalUSD: 0,
      totalCostILS: 0,
      totalProfitILS: 0,
      riskAdditionILS: 0,
      totalQuoteILS: 0,
      totalVATILS: 0,
      finalTotalILS: 0,
      totalCustomerPriceILS: 0,
      profitMarginPercent: 25,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('calculateQuotationStatistics', () => {
  it('should calculate statistics for a hardware-heavy quotation', () => {
    const quotation = createTestQuotation({
      calculations: {
        totalHardwareUSD: 21621,
        totalHardwareILS: 80000,
        totalSoftwareUSD: 2703,
        totalSoftwareILS: 10000,
        totalLaborUSD: 2703,
        totalLaborILS: 10000,
        totalEngineeringILS: 5000,
        totalCommissioningILS: 5000,
        totalInstallationILS: 0,
        totalProgrammingILS: 0,
        subtotalUSD: 27027,
        subtotalILS: 100000,
        totalCustomerPriceILS: 130000,
        riskAdditionILS: 5000,
        totalQuoteILS: 130000,
        totalVATILS: 0,
        finalTotalILS: 130000,
        totalCostILS: 100000,
        totalProfitILS: 25000,
        profitMarginPercent: 25,
      },
      items: [
        {
          id: '1',
          systemId: 'sys-1',
          systemOrder: 1,
          itemOrder: 1,
          displayNumber: '1.1',
          componentId: 'comp-1',
          componentName: 'Siemens PLC',
          componentCategory: 'בקרים',
          itemType: 'hardware',
          quantity: 1,
          unitPriceUSD: 2000,
          unitPriceILS: 7400,
          totalPriceUSD: 2000,
          totalPriceILS: 7400,
          itemMarkupPercent: 25,
          customerPriceILS: 9250,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          systemId: 'sys-1',
          systemOrder: 1,
          itemOrder: 2,
          displayNumber: '1.2',
          componentId: 'comp-2',
          componentName: 'Engineering Work',
          componentCategory: 'עבודה',
          itemType: 'labor',
          laborSubtype: 'engineering',
          quantity: 1,
          unitPriceUSD: 500,
          unitPriceILS: 1850,
          totalPriceUSD: 500,
          totalPriceILS: 1850,
          itemMarkupPercent: 25,
          customerPriceILS: 2312.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const stats = calculateQuotationStatistics(quotation);

    expect(stats.hardwarePercent).toBe(80.0);
    expect(stats.softwarePercent).toBe(10.0);
    expect(stats.laborPercent).toBe(10.0);
    expect(stats.engineeringPercent).toBe(5.0);
    expect(stats.commissioningPercent).toBe(5.0);
    expect(stats.materialPercent).toBe(90.0);
    expect(stats.laborOnlyPercent).toBe(10.0);
    expect(stats.hwEngineeringCommissioningRatio).toBe('80:5:5');
    expect(stats.componentCounts.hardware).toBe(1);
    expect(stats.componentCounts.labor).toBe(1);
    expect(stats.componentCounts.total).toBe(2);
  });

  it('should calculate statistics for a labor-heavy quotation', () => {
    const quotation = createTestQuotation({
      calculations: {
        totalHardwareUSD: 5405,
        totalHardwareILS: 20000,
        totalSoftwareUSD: 1351,
        totalSoftwareILS: 5000,
        totalLaborUSD: 20270,
        totalLaborILS: 75000,
        totalEngineeringILS: 50000,
        totalCommissioningILS: 25000,
        totalInstallationILS: 0,
        totalProgrammingILS: 0,
        subtotalUSD: 27027,
        subtotalILS: 100000,
        totalCustomerPriceILS: 130000,
        riskAdditionILS: 5000,
        totalQuoteILS: 130000,
        totalVATILS: 0,
        finalTotalILS: 130000,
        totalCostILS: 100000,
        totalProfitILS: 25000,
        profitMarginPercent: 25,
      },
      items: [],
    });

    const stats = calculateQuotationStatistics(quotation);

    expect(stats.hardwarePercent).toBe(20.0);
    expect(stats.softwarePercent).toBe(5.0);
    expect(stats.laborPercent).toBe(75.0);
    expect(stats.engineeringPercent).toBe(50.0);
    expect(stats.commissioningPercent).toBe(25.0);
    expect(stats.materialPercent).toBe(25.0);
    expect(stats.laborOnlyPercent).toBe(75.0);
    expect(stats.hwEngineeringCommissioningRatio).toBe('20:50:25');
  });

  it('should calculate statistics for a balanced quotation', () => {
    const quotation = createTestQuotation({
      calculations: {
        totalHardwareUSD: 13514,
        totalHardwareILS: 50000,
        totalSoftwareUSD: 2703,
        totalSoftwareILS: 10000,
        totalLaborUSD: 10811,
        totalLaborILS: 40000,
        totalEngineeringILS: 25000,
        totalCommissioningILS: 15000,
        totalInstallationILS: 0,
        totalProgrammingILS: 0,
        subtotalUSD: 27027,
        subtotalILS: 100000,
        totalCustomerPriceILS: 130000,
        riskAdditionILS: 5000,
        totalQuoteILS: 130000,
        totalVATILS: 0,
        finalTotalILS: 130000,
        totalCostILS: 100000,
        totalProfitILS: 25000,
        profitMarginPercent: 25,
      },
      items: [],
    });

    const stats = calculateQuotationStatistics(quotation);

    expect(stats.hardwarePercent).toBe(50.0);
    expect(stats.softwarePercent).toBe(10.0);
    expect(stats.laborPercent).toBe(40.0);
    expect(stats.materialPercent).toBe(60.0);
    expect(stats.laborOnlyPercent).toBe(40.0);
  });

  it('should handle zero totals gracefully', () => {
    const quotation = createTestQuotation({
      calculations: {
        totalHardwareUSD: 0,
        totalHardwareILS: 0,
        totalSoftwareUSD: 0,
        totalSoftwareILS: 0,
        totalLaborILS: 0,
        totalLaborUSD: 0,
        totalEngineeringILS: 0,
        totalCommissioningILS: 0,
        totalInstallationILS: 0,
        totalProgrammingILS: 0,
        subtotalILS: 0,
        subtotalUSD: 0,
        totalCostILS: 0,
        totalProfitILS: 0,
        riskAdditionILS: 0,
        totalQuoteILS: 0,
        totalVATILS: 0,
        finalTotalILS: 0,
        totalCustomerPriceILS: 0,
        profitMarginPercent: 0,
      },
      items: [],
    });

    const stats = calculateQuotationStatistics(quotation);

    expect(stats.hardwarePercent).toBe(0);
    expect(stats.softwarePercent).toBe(0);
    expect(stats.laborPercent).toBe(0);
    expect(stats.hwEngineeringCommissioningRatio).toBe('0:0:0');
  });

  it('should throw error if calculations are missing', () => {
    const quotation = createTestQuotation();
    delete (quotation as any).calculations;

    expect(() => calculateQuotationStatistics(quotation)).toThrow(
      'Quotation must be calculated before generating statistics'
    );
  });
});

describe('getDominantCategory', () => {
  it('should identify hardware as dominant', () => {
    const stats = {
      hardwarePercent: 70,
      softwarePercent: 10,
      laborPercent: 20,
      engineeringPercent: 15,
      commissioningPercent: 5,
      materialPercent: 80,
      laborOnlyPercent: 20,
      hwEngineeringCommissioningRatio: '70:15:5',
      componentCounts: { hardware: 10, software: 2, labor: 3, total: 15 },
      profitByType: {
        hardware: { profit: 10000, margin: 20 },
        software: { profit: 1000, margin: 25 },
        labor: { profit: 2000, margin: 18 },
      },
    };

    const dominant = getDominantCategory(stats);
    expect(dominant.name).toBe('hardware');
    expect(dominant.nameHe).toBe('חומרה');
    expect(dominant.percent).toBe(70);
  });

  it('should identify engineering as dominant', () => {
    const stats = {
      hardwarePercent: 20,
      softwarePercent: 5,
      laborPercent: 75,
      engineeringPercent: 60,
      commissioningPercent: 15,
      materialPercent: 25,
      laborOnlyPercent: 75,
      hwEngineeringCommissioningRatio: '20:60:15',
      componentCounts: { hardware: 3, software: 1, labor: 10, total: 14 },
      profitByType: {
        hardware: { profit: 2000, margin: 20 },
        software: { profit: 500, margin: 25 },
        labor: { profit: 10000, margin: 18 },
      },
    };

    const dominant = getDominantCategory(stats);
    expect(dominant.name).toBe('engineering');
    expect(dominant.nameHe).toBe('הנדסה');
    expect(dominant.percent).toBe(60);
  });
});

describe('getQuotationType', () => {
  it('should classify as material-heavy', () => {
    const stats = {
      materialPercent: 80,
      laborOnlyPercent: 20,
    } as any;

    expect(getQuotationType(stats)).toBe('material-heavy');
  });

  it('should classify as labor-heavy', () => {
    const stats = {
      materialPercent: 20,
      laborOnlyPercent: 80,
    } as any;

    expect(getQuotationType(stats)).toBe('labor-heavy');
  });

  it('should classify as balanced', () => {
    const stats = {
      materialPercent: 55,
      laborOnlyPercent: 45,
    } as any;

    expect(getQuotationType(stats)).toBe('balanced');
  });
});

describe('validateStatistics', () => {
  it('should validate correct statistics', () => {
    const stats = {
      hardwarePercent: 60,
      softwarePercent: 10,
      laborPercent: 30,
      materialPercent: 70,
      laborOnlyPercent: 30,
      componentCounts: { hardware: 10, software: 2, labor: 5, total: 17 },
    } as any;

    const validation = validateStatistics(stats);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid type percentages', () => {
    const stats = {
      hardwarePercent: 60,
      softwarePercent: 10,
      laborPercent: 25, // Should sum to 100
      materialPercent: 70,
      laborOnlyPercent: 30,
      componentCounts: { hardware: 10, software: 2, labor: 5, total: 17 },
    } as any;

    const validation = validateStatistics(stats);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should detect invalid component counts', () => {
    const stats = {
      hardwarePercent: 60,
      softwarePercent: 10,
      laborPercent: 30,
      materialPercent: 70,
      laborOnlyPercent: 30,
      componentCounts: { hardware: 10, software: 2, labor: 5, total: 20 }, // Should sum to 17
    } as any;

    const validation = validateStatistics(stats);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Component counts'))).toBe(
      true
    );
  });
});

describe('getQuotationSummaryText', () => {
  it('should generate summary text without robots', () => {
    const stats = {
      hardwarePercent: 60,
      softwarePercent: 10,
      engineeringPercent: 20,
      commissioningPercent: 10,
    } as any;

    const summary = getQuotationSummaryText(stats);
    expect(summary).toContain('חומרה: 60%');
    expect(summary).toContain('תוכנה: 10%');
    expect(summary).toContain('הנדסה: 20%');
    expect(summary).toContain('הרצה: 10%');
  });

  it('should include robot information when present', () => {
    const stats = {
      hardwarePercent: 60,
      softwarePercent: 10,
      engineeringPercent: 20,
      commissioningPercent: 10,
      robotComponents: {
        totalCostILS: 50000,
        percentOfTotal: 35.5,
        count: 2,
      },
    } as any;

    const summary = getQuotationSummaryText(stats);
    expect(summary).toContain('רובוטיקה');
    expect(summary).toContain('50,000');
    expect(summary).toContain('35.5%');
  });
});

describe('formatStatisticsForExport', () => {
  it('should format statistics for export', () => {
    const stats = {
      hardwarePercent: 60,
      softwarePercent: 10,
      laborPercent: 30,
      engineeringPercent: 20,
      commissioningPercent: 10,
      materialPercent: 70,
      hwEngineeringCommissioningRatio: '60:20:10',
      componentCounts: { hardware: 10, software: 2, labor: 5, total: 17 },
      robotComponents: { totalCostILS: 50000, percentOfTotal: 35.5, count: 2 },
      profitByType: {
        hardware: { profit: 10000, margin: 20 },
        software: { profit: 1000, margin: 25 },
        labor: { profit: 2000, margin: 18 },
      },
    } as any;

    const exported = formatStatisticsForExport(stats);

    expect(exported['Hardware %']).toBe(60);
    expect(exported['Software %']).toBe(10);
    expect(exported['Labor %']).toBe(30);
    expect(exported['HW:Eng:Comm Ratio']).toBe('60:20:10');
    expect(exported['Total Components']).toBe(17);
    expect(exported['Robot Components']).toBe(2);
    expect(exported['Hardware Profit Margin']).toBe(20);
  });
});

describe('compareQuotationStatistics', () => {
  it('should calculate deltas between statistics', () => {
    const current = {
      hardwarePercent: 65,
      laborPercent: 35,
      componentCounts: { total: 20 },
    } as any;

    const previous = {
      hardwarePercent: 60,
      laborPercent: 40,
      componentCounts: { total: 15 },
    } as any;

    const comparison = compareQuotationStatistics(current, previous);

    expect(comparison.hardwarePercentDelta).toBe(5.0);
    expect(comparison.laborPercentDelta).toBe(-5.0);
    expect(comparison.totalComponentsDelta).toBe(5);
  });
});
