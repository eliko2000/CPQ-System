/**
 * Component Analytics Module
 * Calculate component usage patterns, category breakdowns, and type ratios
 */

import type { QuotationProject } from '../../types';
import type { ComponentAnalytics } from './types';

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
      mostValuableComponents: [],
    };
  }

  // Aggregate component usage
  const componentUsage = new Map<
    string,
    {
      componentId: string;
      componentName: string;
      category: string;
      totalQuantity: number;
      totalSpendILS: number;
      totalValueILS: number;
      quotationIds: Set<string>;
      itemType: string;
    }
  >();

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
          itemType: item.itemType,
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
      avgPriceILS: Math.round(item.totalSpendILS / item.totalQuantity),
    }));

  // Most valuable components (by customer price)
  const mostValuableComponents = usageArray
    .sort((a, b) => b.totalValueILS - a.totalValueILS)
    .slice(0, 10)
    .map(item => ({
      componentId: item.componentId,
      componentName: item.componentName,
      totalValueILS: Math.round(item.totalValueILS),
      quotationCount: item.quotationIds.size,
    }));

  // Usage by category
  const categoryUsage = new Map<
    string,
    { count: number; totalSpendILS: number }
  >();
  usageArray.forEach(item => {
    if (!categoryUsage.has(item.category)) {
      categoryUsage.set(item.category, { count: 0, totalSpendILS: 0 });
    }
    const cat = categoryUsage.get(item.category)!;
    cat.count++;
    cat.totalSpendILS += item.totalSpendILS;
  });

  const totalSpend = usageArray.reduce(
    (sum, item) => sum + item.totalSpendILS,
    0
  );

  const usageByCategory = Array.from(categoryUsage.entries())
    .map(([category, data]) => ({
      category,
      count: data.count,
      totalSpendILS: Math.round(data.totalSpendILS),
      percentOfTotal:
        totalSpend > 0
          ? Number(((data.totalSpendILS / totalSpend) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.totalSpendILS - a.totalSpendILS);

  // Type ratio
  const typeRatio = calculateTypeRatio(quotations);

  return {
    topComponents,
    usageByCategory,
    typeRatio,
    mostValuableComponents,
  };
}

/**
 * Calculate HW:SW:Labor ratio
 */
function calculateTypeRatio(quotations: QuotationProject[]): {
  hardware: number;
  software: number;
  labor: number;
} {
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
    labor: Number(((laborTotal / total) * 100).toFixed(1)),
  };
}
