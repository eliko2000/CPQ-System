/**
 * Assembly Pricing Calculations
 *
 * Provides currency-aware pricing calculations for assemblies.
 * Each component's price is respected in its original currency,
 * then converted using current exchange rates.
 */

import type { Assembly, AssemblyComponent, AssemblyPricing, Component } from '../types';
import { getGlobalExchangeRates, type ExchangeRates } from './currencyConversion';

/**
 * Calculate total pricing for an assembly
 * Respects each component's original currency and converts using exchange rates
 *
 * @param assembly - Assembly with populated component data
 * @param customRates - Optional custom exchange rates (defaults to global settings)
 * @returns AssemblyPricing with breakdown by currency
 */
export function calculateAssemblyPricing(
  assembly: Assembly,
  customRates?: ExchangeRates
): AssemblyPricing {
  const rates = customRates || getGlobalExchangeRates();

  let totalCostNIS = 0;
  let totalCostUSD = 0;
  let totalCostEUR = 0;

  let nisCount = 0;
  let nisTotal = 0;
  let usdCount = 0;
  let usdTotal = 0;
  let eurCount = 0;
  let eurTotal = 0;

  let componentCount = 0;
  let missingComponentCount = 0;

  for (const assemblyComp of assembly.components) {
    // Skip if component was deleted
    if (!assemblyComp.component || !assemblyComp.componentId) {
      missingComponentCount++;
      continue;
    }

    const component = assemblyComp.component;
    const quantity = assemblyComp.quantity;
    componentCount++;

    // Get the component's original currency and cost
    const currency = component.currency || 'NIS';
    const originalCost = component.originalCost || component.unitCostNIS;

    // Calculate line total in original currency
    const lineTotal = originalCost * quantity;

    // Add to breakdown by original currency
    switch (currency) {
      case 'NIS':
        nisCount++;
        nisTotal += lineTotal;
        totalCostNIS += lineTotal;
        totalCostUSD += lineTotal / rates.usdToIlsRate;
        totalCostEUR += lineTotal / rates.eurToIlsRate;
        break;

      case 'USD':
        usdCount++;
        usdTotal += lineTotal;
        totalCostNIS += lineTotal * rates.usdToIlsRate;
        totalCostUSD += lineTotal;
        totalCostEUR += (lineTotal * rates.usdToIlsRate) / rates.eurToIlsRate;
        break;

      case 'EUR':
        eurCount++;
        eurTotal += lineTotal;
        totalCostNIS += lineTotal * rates.eurToIlsRate;
        totalCostUSD += (lineTotal * rates.eurToIlsRate) / rates.usdToIlsRate;
        totalCostEUR += lineTotal;
        break;
    }
  }

  return {
    totalCostNIS: Math.round(totalCostNIS * 100) / 100,
    totalCostUSD: Math.round(totalCostUSD * 100) / 100,
    totalCostEUR: Math.round(totalCostEUR * 100) / 100,
    componentCount,
    missingComponentCount,
    breakdown: {
      nisComponents: { count: nisCount, total: Math.round(nisTotal * 100) / 100 },
      usdComponents: { count: usdCount, total: Math.round(usdTotal * 100) / 100 },
      eurComponents: { count: eurCount, total: Math.round(eurTotal * 100) / 100 },
    },
  };
}

/**
 * Format assembly pricing for display
 * Shows all three currencies with appropriate formatting
 *
 * @param pricing - AssemblyPricing object
 * @returns Formatted string showing all currencies
 */
export function formatAssemblyPricing(pricing: AssemblyPricing): {
  nis: string;
  usd: string;
  eur: string;
  primary: string; // Main display (NIS)
} {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return {
    nis: formatCurrency(pricing.totalCostNIS, 'ILS'),
    usd: formatCurrency(pricing.totalCostUSD, 'USD'),
    eur: formatCurrency(pricing.totalCostEUR, 'EUR'),
    primary: formatCurrency(pricing.totalCostNIS, 'ILS'),
  };
}

/**
 * Get a summary description of assembly pricing breakdown
 * Shows which currencies are represented in the assembly
 *
 * @param pricing - AssemblyPricing object
 * @returns Human-readable breakdown description
 */
export function getAssemblyPricingBreakdown(pricing: AssemblyPricing): string {
  const parts: string[] = [];

  if (pricing.breakdown.nisComponents.count > 0) {
    parts.push(
      `${pricing.breakdown.nisComponents.count} רכיבים בש"ח (${pricing.breakdown.nisComponents.total.toFixed(2)} ₪)`
    );
  }

  if (pricing.breakdown.usdComponents.count > 0) {
    parts.push(
      `${pricing.breakdown.usdComponents.count} רכיבים ב-USD ($${pricing.breakdown.usdComponents.total.toFixed(2)})`
    );
  }

  if (pricing.breakdown.eurComponents.count > 0) {
    parts.push(
      `${pricing.breakdown.eurComponents.count} רכיבים ב-EUR (€${pricing.breakdown.eurComponents.total.toFixed(2)})`
    );
  }

  if (pricing.missingComponentCount > 0) {
    parts.push(`${pricing.missingComponentCount} רכיבים חסרים`);
  }

  return parts.join(' • ');
}

/**
 * Validate assembly data before save
 * Ensures assembly has at least one component and valid data
 *
 * @param name - Assembly name
 * @param components - Array of assembly components
 * @returns Validation result with error message if invalid
 */
export function validateAssembly(
  name: string,
  components: AssemblyComponent[]
): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'שם ההרכבה הוא שדה חובה' };
  }

  if (components.length === 0) {
    return { valid: false, error: 'חייב להוסיף לפחות רכיב אחד להרכבה' };
  }

  // Check for valid quantities
  const invalidQuantity = components.find((c) => c.quantity <= 0);
  if (invalidQuantity) {
    return { valid: false, error: 'כמות הרכיבים חייבת להיות גדולה מאפס' };
  }

  return { valid: true };
}
