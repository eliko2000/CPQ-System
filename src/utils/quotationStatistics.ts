/**
 * Quotation Statistics Calculator
 *
 * Calculates business intelligence metrics for quotations:
 * - HW:Engineering:Commissioning ratios
 * - Material vs Labor breakdown
 * - Robot-specific analysis
 * - Profit margins by type
 */

import type {
  QuotationProject,
  QuotationItem,
  // QuotationCalculations, // unused
  QuotationStatistics
} from '../types';
import { isRobotComponent } from '../services/componentTypeClassifier';
import { logger } from '@/lib/logger';

// ============ Main Statistics Function ============

/**
 * Calculate comprehensive statistics for a quotation
 */
export function calculateQuotationStatistics(
  project: QuotationProject
): QuotationStatistics {
  const { items, calculations } = project;

  if (!calculations) {
    throw new Error('Quotation must be calculated before generating statistics');
  }

  // Get total for percentage calculations
  const totalILS = calculations.subtotalILS;

  // DEBUG: Log calculations to understand the issue
  logger.debug('📊 Statistics Debug:', {
    totalILS,
    totalHardwareILS: calculations.totalHardwareILS,
    totalSoftwareILS: calculations.totalSoftwareILS,
    totalLaborILS: calculations.totalLaborILS,
    totalEngineeringILS: calculations.totalEngineeringILS,
    totalCommissioningILS: calculations.totalCommissioningILS,
    itemCount: items.length
  });

  // Safe division helper
  const safePercent = (value: number, total: number): number => {
    return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
  };

  // Calculate type percentages
  const hardwarePercent = safePercent(calculations.totalHardwareILS, totalILS);
  const softwarePercent = safePercent(calculations.totalSoftwareILS, totalILS);
  const laborPercent = safePercent(calculations.totalLaborILS, totalILS);

  // Calculate labor subtype percentages
  const engineeringPercent = safePercent(calculations.totalEngineeringILS, totalILS);
  const commissioningPercent = safePercent(calculations.totalCommissioningILS, totalILS);

  // Material vs Labor
  const materialILS = calculations.totalHardwareILS + calculations.totalSoftwareILS;
  const materialPercent = safePercent(materialILS, totalILS);
  const laborOnlyPercent = laborPercent;

  // Format HW:Engineering:Commissioning ratio
  const hwEngineeringCommissioningRatio = `${hardwarePercent}:${engineeringPercent}:${commissioningPercent}`;

  // Robot analysis
  const robotComponents = analyzeRobotComponents(items);

  // Component counts
  const componentCounts = {
    hardware: items.filter(item => item.itemType === 'hardware').length,
    software: items.filter(item => item.itemType === 'software').length,
    labor: items.filter(item => item.itemType === 'labor').length,
    total: items.length
  };

  // Profit by type
  const profitByType = calculateProfitByType(items, project);

  return {
    hardwarePercent,
    softwarePercent,
    laborPercent,
    engineeringPercent,
    commissioningPercent,
    materialPercent,
    laborOnlyPercent,
    hwEngineeringCommissioningRatio,
    robotComponents,
    componentCounts,
    profitByType
  };
}

// ============ Robot Analysis ============

/**
 * Analyze robot-related components
 */
function analyzeRobotComponents(items: QuotationItem[]): QuotationStatistics['robotComponents'] {
  const robotItems = items.filter(item =>
    isRobotComponent(item.componentName, item.componentCategory)
  );

  if (robotItems.length === 0) {
    return undefined;
  }

  const totalCostILS = robotItems.reduce(
    (sum, item) => sum + item.totalPriceILS,
    0
  );

  const allItemsTotal = items.reduce(
    (sum, item) => sum + item.totalPriceILS,
    0
  );

  const percentOfTotal = allItemsTotal > 0
    ? Number(((totalCostILS / allItemsTotal) * 100).toFixed(1))
    : 0;

  return {
    totalCostILS,
    percentOfTotal,
    count: robotItems.length
  };
}

// ============ Profit Analysis ============

/**
 * Calculate profit and margin by component type
 */
function calculateProfitByType(
  items: QuotationItem[],
  project: QuotationProject
): QuotationStatistics['profitByType'] {
  const { parameters } = project;
  // calculations is unused but destructured from project for future use

  // Helper to calculate profit for a group
  const calculateProfit = (typeItems: QuotationItem[], itemType: 'hardware' | 'software' | 'labor') => {
    const profitCoefficient = parameters.markupPercent ?? 0.75;

    // Calculate cost
    const cost = typeItems.reduce((sum, item) => sum + item.totalPriceILS, 0);

    // Labor gets NO markup - sold at cost
    // Hardware and Software get markup
    const customerPrice = itemType === 'labor'
      ? cost
      : cost / profitCoefficient;

    const profit = customerPrice - cost;
    const margin = customerPrice > 0 ? (profit / customerPrice) * 100 : 0;

    logger.debug('💰 Profit Calc Debug:', {
      itemCount: typeItems.length,
      cost,
      customerPrice,
      profit,
      margin,
      sampleItem: typeItems[0] ? {
        name: typeItems[0].componentName,
        totalPriceILS: typeItems[0].totalPriceILS,
        customerPriceILS: typeItems[0].customerPriceILS
      } : null
    });

    return {
      profit: Number(profit.toFixed(2)),
      margin: Number(margin.toFixed(1))
    };
  };

  const hardwareItems = items.filter(item => item.itemType === 'hardware');
  const softwareItems = items.filter(item => item.itemType === 'software');
  const laborItems = items.filter(item => item.itemType === 'labor');

  return {
    hardware: calculateProfit(hardwareItems, 'hardware'),
    software: calculateProfit(softwareItems, 'software'),
    labor: calculateProfit(laborItems, 'labor')
  };
}

// ============ Ratio Formatting ============

/**
 * Format ratio as "A:B:C" string
 */
export function formatRatio(values: number[]): string {
  return values.map(v => v.toFixed(1)).join(':');
}

/**
 * Parse ratio string "A:B:C" to numbers
 */
export function parseRatio(ratio: string): number[] {
  return ratio.split(':').map(parseFloat);
}

// ============ Comparison Functions ============

/**
 * Compare two quotations and return delta statistics
 */
export function compareQuotationStatistics(
  current: QuotationStatistics,
  previous: QuotationStatistics
): {
  hardwarePercentDelta: number;
  laborPercentDelta: number;
  totalComponentsDelta: number;
} {
  return {
    hardwarePercentDelta: Number((current.hardwarePercent - previous.hardwarePercent).toFixed(1)),
    laborPercentDelta: Number((current.laborPercent - previous.laborPercent).toFixed(1)),
    totalComponentsDelta: current.componentCounts.total - previous.componentCounts.total
  };
}

// ============ Summary Helpers ============

/**
 * Get text summary of quotation breakdown
 */
export function getQuotationSummaryText(stats: QuotationStatistics): string {
  const lines = [
    `חומרה: ${stats.hardwarePercent}%`,
    `תוכנה: ${stats.softwarePercent}%`,
    `הנדסה: ${stats.engineeringPercent}%`,
    `הרצה: ${stats.commissioningPercent}%`
  ];

  if (stats.robotComponents) {
    lines.push(
      `רובוטיקה: ₪${stats.robotComponents.totalCostILS.toLocaleString()} (${stats.robotComponents.percentOfTotal}%)`
    );
  }

  return lines.join(' | ');
}

/**
 * Get the dominant category (highest percentage)
 */
export function getDominantCategory(stats: QuotationStatistics): {
  name: string;
  percent: number;
  nameHe: string;
} {
  const categories = [
    { name: 'hardware', nameHe: 'חומרה', percent: stats.hardwarePercent },
    { name: 'software', nameHe: 'תוכנה', percent: stats.softwarePercent },
    { name: 'engineering', nameHe: 'הנדסה', percent: stats.engineeringPercent },
    { name: 'commissioning', nameHe: 'הרצה', percent: stats.commissioningPercent }
  ];

  return categories.reduce((max, cat) => (cat.percent > max.percent ? cat : max));
}

/**
 * Check if quotation is material-heavy or labor-heavy
 */
export function getQuotationType(stats: QuotationStatistics): 'material-heavy' | 'labor-heavy' | 'balanced' {
  const { materialPercent, laborOnlyPercent } = stats;

  if (materialPercent > laborOnlyPercent + 20) {
    return 'material-heavy';
  } else if (laborOnlyPercent > materialPercent + 20) {
    return 'labor-heavy';
  } else {
    return 'balanced';
  }
}

// ============ Validation ============

/**
 * Validate that statistics percentages add up correctly
 */
export function validateStatistics(stats: QuotationStatistics): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that HW + SW + Labor ≈ 100% (within 1% tolerance for rounding)
  const totalPercent = stats.hardwarePercent + stats.softwarePercent + stats.laborPercent;
  if (Math.abs(totalPercent - 100) > 1) {
    errors.push(`Type percentages don't add to 100% (${totalPercent}%)`);
  }

  // Check that material + labor ≈ 100%
  const materialLaborTotal = stats.materialPercent + stats.laborOnlyPercent;
  if (Math.abs(materialLaborTotal - 100) > 1) {
    errors.push(`Material + Labor don't add to 100% (${materialLaborTotal}%)`);
  }

  // Check component counts
  const { hardware, software, labor, total } = stats.componentCounts;
  if (hardware + software + labor !== total) {
    errors.push(`Component counts don't match total (${hardware}+${software}+${labor} ≠ ${total})`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============ Export Helpers ============

/**
 * Format statistics for export/reporting
 */
export function formatStatisticsForExport(stats: QuotationStatistics): Record<string, any> {
  return {
    'Hardware %': stats.hardwarePercent,
    'Software %': stats.softwarePercent,
    'Labor %': stats.laborPercent,
    'Engineering %': stats.engineeringPercent,
    'Commissioning %': stats.commissioningPercent,
    'Material %': stats.materialPercent,
    'HW:Eng:Comm Ratio': stats.hwEngineeringCommissioningRatio,
    'Total Components': stats.componentCounts.total,
    'Hardware Items': stats.componentCounts.hardware,
    'Software Items': stats.componentCounts.software,
    'Labor Items': stats.componentCounts.labor,
    'Robot Components': stats.robotComponents?.count || 0,
    'Robot Cost (ILS)': stats.robotComponents?.totalCostILS || 0,
    'Robot % of Total': stats.robotComponents?.percentOfTotal || 0,
    'Hardware Profit Margin': stats.profitByType.hardware.margin,
    'Software Profit Margin': stats.profitByType.software.margin,
    'Labor Profit Margin': stats.profitByType.labor.margin
  };
}
