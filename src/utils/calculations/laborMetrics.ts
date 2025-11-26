/**
 * Labor Metrics Module
 * Calculate labor metrics, subtype breakdowns, and labor trends
 */

import type { QuotationProject } from '../../types';
import type { LaborMetrics } from './types';
import { groupQuotationsByMonth } from './helpers';

// ============ Labor Metrics ============

/**
 * Calculate labor metrics
 */
export function calculateLaborMetrics(
  quotations: QuotationProject[]
): LaborMetrics {
  if (quotations.length === 0) {
    return {
      totalLaborDays: 0,
      totalLaborCostILS: 0,
      laborBySubtype: {
        engineering: { days: 0, costILS: 0, percent: 0 },
        commissioning: { days: 0, costILS: 0, percent: 0 },
        installation: { days: 0, costILS: 0, percent: 0 },
      },
      avgLaborPercentPerQuotation: 0,
      laborTrend: [],
      materialHeavyCount: 0,
      laborHeavyCount: 0,
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
    const materialILS =
      calculations.totalHardwareILS + calculations.totalSoftwareILS;
    const laborPercent =
      totalILS > 0 ? (calculations.totalLaborILS / totalILS) * 100 : 0;
    const materialPercent = totalILS > 0 ? (materialILS / totalILS) * 100 : 0;

    if (materialPercent > 60) {
      materialHeavyCount++;
    }
    if (laborPercent > 60) {
      laborHeavyCount++;
    }
  });

  // Average labor percentage per quotation
  const avgLaborPercentPerQuotation =
    quotations.reduce((sum, q) => {
      const totalILS = q.calculations?.subtotalILS || 0;
      const laborILS = q.calculations?.totalLaborILS || 0;
      const percent = totalILS > 0 ? (laborILS / totalILS) * 100 : 0;
      return sum + percent;
    }, 0) / quotations.length;

  // Labor by subtype
  const laborBySubtype = {
    engineering: {
      days:
        engineeringCost > 0
          ? engineeringCost / (quotations[0]?.parameters?.dayWorkCost || 1200)
          : 0,
      costILS: Math.round(engineeringCost),
      percent:
        totalLaborCostILS > 0
          ? Number(((engineeringCost / totalLaborCostILS) * 100).toFixed(1))
          : 0,
    },
    commissioning: {
      days:
        commissioningCost > 0
          ? commissioningCost / (quotations[0]?.parameters?.dayWorkCost || 1200)
          : 0,
      costILS: Math.round(commissioningCost),
      percent:
        totalLaborCostILS > 0
          ? Number(((commissioningCost / totalLaborCostILS) * 100).toFixed(1))
          : 0,
    },
    installation: {
      days:
        installationCost > 0
          ? installationCost / (quotations[0]?.parameters?.dayWorkCost || 1200)
          : 0,
      costILS: Math.round(installationCost),
      percent:
        totalLaborCostILS > 0
          ? Number(((installationCost / totalLaborCostILS) * 100).toFixed(1))
          : 0,
    },
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
    laborHeavyCount,
  };
}

/**
 * Calculate labor cost trend by month
 */
function calculateLaborTrend(
  quotations: QuotationProject[]
): Array<{ month: string; laborCostILS: number }> {
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
      laborCostILS: Math.round(laborCostILS),
    });
  });

  return result;
}
