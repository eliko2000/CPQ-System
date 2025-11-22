/**
 * Currency Conversion Utilities
 *
 * Provides centralized currency conversion for the CPQ system.
 * Exchange rates are loaded from global settings for library components,
 * or from quotation parameters for quotation-specific conversions.
 */

import { getDefaultQuotationParameters } from './quotationCalculations';

export type Currency = 'NIS' | 'USD' | 'EUR';

export interface CurrencyPrices {
  unitCostNIS: number;
  unitCostUSD: number;
  unitCostEUR: number;
  currency: Currency; // Original currency
  originalCost: number; // Original price value
}

export interface ExchangeRates {
  usdToIlsRate: number;
  eurToIlsRate: number;
}

/**
 * Get exchange rates from global settings
 */
export function getGlobalExchangeRates(): ExchangeRates {
  const params = getDefaultQuotationParameters();
  return {
    usdToIlsRate: params.usdToIlsRate,
    eurToIlsRate: params.eurToIlsRate
  };
}

/**
 * Calculate USD to EUR rate from USD->ILS and EUR->ILS rates
 */
function calculateUsdToEurRate(rates: ExchangeRates): number {
  return rates.usdToIlsRate / rates.eurToIlsRate;
}

/**
 * Convert a price from one currency to all three currencies
 *
 * @param amount - The price amount in the original currency
 * @param originalCurrency - The currency of the original price
 * @param rates - Exchange rates to use for conversion
 * @returns Object with all three currency values
 */
export function convertToAllCurrencies(
  amount: number,
  originalCurrency: Currency,
  rates: ExchangeRates
): CurrencyPrices {
  let unitCostNIS = 0;
  let unitCostUSD = 0;
  let unitCostEUR = 0;

  const usdToEurRate = calculateUsdToEurRate(rates);

  switch (originalCurrency) {
    case 'NIS':
      unitCostNIS = amount;
      unitCostUSD = Math.round((amount / rates.usdToIlsRate) * 100) / 100;
      unitCostEUR = Math.round((amount / rates.eurToIlsRate) * 100) / 100;
      break;

    case 'USD':
      unitCostUSD = amount;
      unitCostNIS = Math.round((amount * rates.usdToIlsRate) * 100) / 100;
      unitCostEUR = Math.round((amount * usdToEurRate) * 100) / 100;
      break;

    case 'EUR':
      unitCostEUR = amount;
      unitCostNIS = Math.round((amount * rates.eurToIlsRate) * 100) / 100;
      unitCostUSD = Math.round((amount / usdToEurRate) * 100) / 100;
      break;
  }

  return {
    unitCostNIS,
    unitCostUSD,
    unitCostEUR,
    currency: originalCurrency,
    originalCost: amount
  };
}

/**
 * Detect which currency is the original (non-zero and likely source)
 * Priority:
 * 1. Explicitly declared currency (most reliable)
 * 2. Detect based on relative values (fallback)
 */
export function detectOriginalCurrency(
  unitCostNIS?: number,
  unitCostUSD?: number,
  unitCostEUR?: number,
  declaredCurrency?: Currency
): { currency: Currency; amount: number } {
  // PRIORITY 1: If currency is explicitly declared and has a value, ALWAYS use it
  if (declaredCurrency) {
    if (declaredCurrency === 'NIS' && unitCostNIS && unitCostNIS > 0) {
      return { currency: 'NIS', amount: unitCostNIS };
    }
    if (declaredCurrency === 'USD' && unitCostUSD && unitCostUSD > 0) {
      return { currency: 'USD', amount: unitCostUSD };
    }
    if (declaredCurrency === 'EUR' && unitCostEUR && unitCostEUR > 0) {
      return { currency: 'EUR', amount: unitCostEUR };
    }
  }

  // PRIORITY 2: Otherwise, find the first non-zero currency
  // (This is fallback for legacy data without declared currency)
  if (unitCostNIS && unitCostNIS > 0) {
    return { currency: 'NIS', amount: unitCostNIS };
  }
  if (unitCostUSD && unitCostUSD > 0) {
    return { currency: 'USD', amount: unitCostUSD };
  }
  if (unitCostEUR && unitCostEUR > 0) {
    return { currency: 'EUR', amount: unitCostEUR };
  }

  // Default to NIS with 0
  return { currency: 'NIS', amount: 0 };
}

/**
 * Normalize component prices - ensure all three currencies are calculated
 * This is the main function to use when importing or creating components
 *
 * @param component - Component with at least one currency price
 * @param rates - Optional exchange rates (uses global settings if not provided)
 * @returns Complete currency prices object
 */
export function normalizeComponentPrices(
  component: {
    unitCostNIS?: number;
    unitCostUSD?: number;
    unitCostEUR?: number;
    currency?: Currency;
    originalCost?: number;
  },
  rates?: ExchangeRates
): CurrencyPrices {
  const exchangeRates = rates || getGlobalExchangeRates();

  // Detect the original currency and amount
  const { currency, amount } = detectOriginalCurrency(
    component.unitCostNIS,
    component.unitCostUSD,
    component.unitCostEUR,
    component.currency
  );

  // Use originalCost if available and matches the currency
  const finalAmount = component.originalCost || amount;

  // Convert to all currencies
  return convertToAllCurrencies(finalAmount, currency, exchangeRates);
}
