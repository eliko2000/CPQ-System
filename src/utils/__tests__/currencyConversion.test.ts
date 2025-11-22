import { describe, it, expect, beforeEach } from 'vitest';
import {
  convertToAllCurrencies,
  detectOriginalCurrency,
  normalizeComponentPrices,
  getGlobalExchangeRates,
  type ExchangeRates
} from '../currencyConversion';

describe('Currency Conversion Utilities', () => {
  const mockRates: ExchangeRates = {
    usdToIlsRate: 3.7,
    eurToIlsRate: 4.0
  };

  beforeEach(() => {
    // Mock localStorage for getDefaultQuotationParameters
    const mockCache = {
      pricing: {
        usdToIlsRate: 3.7,
        eurToIlsRate: 4.0,
        defaultMarkup: 0.75,
        defaultRisk: 10,
        dayWorkCost: 1200,
        vatRate: 17,
        deliveryTime: '4-6 שבועות'
      }
    };
    localStorage.setItem('cpq-settings-cache', JSON.stringify(mockCache));
  });

  describe('convertToAllCurrencies', () => {
    it('should convert NIS to all currencies', () => {
      const result = convertToAllCurrencies(370, 'NIS', mockRates);

      expect(result.unitCostNIS).toBe(370);
      expect(result.unitCostUSD).toBe(100); // 370 / 3.7
      expect(result.unitCostEUR).toBe(92.5); // 370 / 4.0
      expect(result.currency).toBe('NIS');
      expect(result.originalCost).toBe(370);
    });

    it('should convert USD to all currencies', () => {
      const result = convertToAllCurrencies(100, 'USD', mockRates);

      expect(result.unitCostUSD).toBe(100);
      expect(result.unitCostNIS).toBe(370); // 100 * 3.7
      expect(result.unitCostEUR).toBe(92.5); // 100 * (3.7 / 4.0)
      expect(result.currency).toBe('USD');
      expect(result.originalCost).toBe(100);
    });

    it('should convert EUR to all currencies', () => {
      const result = convertToAllCurrencies(100, 'EUR', mockRates);

      expect(result.unitCostEUR).toBe(100);
      expect(result.unitCostNIS).toBe(400); // 100 * 4.0
      expect(result.unitCostUSD).toBe(108.11); // 100 * (4.0 / 3.7) rounded
      expect(result.currency).toBe('EUR');
      expect(result.originalCost).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      const result = convertToAllCurrencies(37.33, 'NIS', mockRates);

      expect(result.unitCostUSD).toBe(10.09); // 37.33 / 3.7 = 10.089189... → 10.09
      expect(result.unitCostEUR).toBe(9.33); // 37.33 / 4.0 = 9.3325 → 9.33
    });
  });

  describe('detectOriginalCurrency', () => {
    it('should detect NIS as original when only NIS is provided', () => {
      const result = detectOriginalCurrency(370, undefined, undefined, undefined);

      expect(result.currency).toBe('NIS');
      expect(result.amount).toBe(370);
    });

    it('should detect USD as original when only USD is provided', () => {
      const result = detectOriginalCurrency(undefined, 100, undefined, undefined);

      expect(result.currency).toBe('USD');
      expect(result.amount).toBe(100);
    });

    it('should detect EUR as original when only EUR is provided', () => {
      const result = detectOriginalCurrency(undefined, undefined, 100, undefined);

      expect(result.currency).toBe('EUR');
      expect(result.amount).toBe(100);
    });

    it('should use declared currency when provided', () => {
      // All currencies present, but USD is declared as original
      const result = detectOriginalCurrency(370, 100, 92.5, 'USD');

      expect(result.currency).toBe('USD');
      expect(result.amount).toBe(100);
    });

    it('should fallback to first non-zero currency when declared currency is zero', () => {
      const result = detectOriginalCurrency(370, 0, undefined, 'USD');

      expect(result.currency).toBe('NIS');
      expect(result.amount).toBe(370);
    });

    it('should default to NIS with 0 when no currencies provided', () => {
      const result = detectOriginalCurrency(undefined, undefined, undefined, undefined);

      expect(result.currency).toBe('NIS');
      expect(result.amount).toBe(0);
    });
  });

  describe('normalizeComponentPrices', () => {
    it('should normalize component with only USD price', () => {
      const component = {
        unitCostUSD: 100,
        currency: 'USD' as const
      };

      const result = normalizeComponentPrices(component, mockRates);

      expect(result.unitCostUSD).toBe(100);
      expect(result.unitCostNIS).toBe(370);
      expect(result.unitCostEUR).toBe(92.5);
      expect(result.currency).toBe('USD');
    });

    it('should normalize component with only EUR price', () => {
      const component = {
        unitCostEUR: 100,
        currency: 'EUR' as const
      };

      const result = normalizeComponentPrices(component, mockRates);

      expect(result.unitCostEUR).toBe(100);
      expect(result.unitCostNIS).toBe(400);
      expect(result.unitCostUSD).toBe(108.11);
      expect(result.currency).toBe('EUR');
    });

    it('should normalize component with only NIS price', () => {
      const component = {
        unitCostNIS: 370,
        currency: 'NIS' as const
      };

      const result = normalizeComponentPrices(component, mockRates);

      expect(result.unitCostNIS).toBe(370);
      expect(result.unitCostUSD).toBe(100);
      expect(result.unitCostEUR).toBe(92.5);
      expect(result.currency).toBe('NIS');
    });

    it('should use originalCost when provided', () => {
      const component = {
        unitCostUSD: 95, // Might be calculated/rounded
        currency: 'USD' as const,
        originalCost: 100 // Original input
      };

      const result = normalizeComponentPrices(component, mockRates);

      expect(result.unitCostUSD).toBe(100); // Uses originalCost
      expect(result.originalCost).toBe(100);
    });

    it('should handle smart import scenario - USD only component', () => {
      // Simulating a component extracted from a USD-based Excel file
      const extractedComponent = {
        unitCostUSD: 250.50,
        unitCostNIS: undefined,
        unitCostEUR: undefined,
        currency: 'USD' as const
      };

      const result = normalizeComponentPrices(extractedComponent, mockRates);

      expect(result.unitCostUSD).toBe(250.50);
      expect(result.unitCostNIS).toBe(926.85); // 250.50 * 3.7
      expect(result.unitCostEUR).toBe(231.71); // 250.50 * (3.7 / 4.0)
      expect(result.currency).toBe('USD');
    });

    it('should handle smart import scenario - EUR only component', () => {
      // Simulating a component extracted from a EUR-based PDF
      const extractedComponent = {
        unitCostEUR: 150.75,
        unitCostNIS: undefined,
        unitCostUSD: undefined,
        currency: 'EUR' as const
      };

      const result = normalizeComponentPrices(extractedComponent, mockRates);

      expect(result.unitCostEUR).toBe(150.75);
      expect(result.unitCostNIS).toBe(603); // 150.75 * 4.0
      expect(result.unitCostUSD).toBe(162.97); // 150.75 * (4.0 / 3.7)
      expect(result.currency).toBe('EUR');
    });

    it('should use global exchange rates when none provided', () => {
      const component = {
        unitCostUSD: 100,
        currency: 'USD' as const
      };

      const result = normalizeComponentPrices(component); // No rates provided

      // Should use rates from localStorage mock
      expect(result.unitCostNIS).toBe(370); // 100 * 3.7
      expect(result.unitCostEUR).toBe(92.5); // 100 * (3.7 / 4.0)
    });
  });

  describe('getGlobalExchangeRates', () => {
    it('should load exchange rates from cached settings', () => {
      const rates = getGlobalExchangeRates();

      expect(rates.usdToIlsRate).toBe(3.7);
      expect(rates.eurToIlsRate).toBe(4.0);
    });

    it('should use fallback rates when cache is invalid', () => {
      // Clear the cache
      localStorage.removeItem('cpq-settings-cache');

      const rates = getGlobalExchangeRates();

      // Should fallback to defaults from getDefaultQuotationParameters
      expect(rates.usdToIlsRate).toBe(3.7);
      expect(rates.eurToIlsRate).toBe(4.0);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero prices', () => {
      const result = convertToAllCurrencies(0, 'USD', mockRates);

      expect(result.unitCostUSD).toBe(0);
      expect(result.unitCostNIS).toBe(0);
      expect(result.unitCostEUR).toBe(0);
    });

    it('should handle very small prices', () => {
      const result = convertToAllCurrencies(0.01, 'USD', mockRates);

      expect(result.unitCostUSD).toBe(0.01);
      expect(result.unitCostNIS).toBe(0.04); // 0.01 * 3.7 = 0.037 → 0.04
      expect(result.unitCostEUR).toBe(0.01); // 0.01 * 0.925 = 0.00925 → 0.01
    });

    it('should handle very large prices', () => {
      const result = convertToAllCurrencies(1000000, 'USD', mockRates);

      expect(result.unitCostUSD).toBe(1000000);
      expect(result.unitCostNIS).toBe(3700000);
      expect(result.unitCostEUR).toBe(925000);
    });

    it('should handle component with all currencies already calculated', () => {
      const component = {
        unitCostNIS: 370,
        unitCostUSD: 100,
        unitCostEUR: 92.5,
        currency: 'USD' as const,
        originalCost: 100
      };

      const result = normalizeComponentPrices(component, mockRates);

      // Should recalculate based on original currency and amount
      expect(result.unitCostUSD).toBe(100);
      expect(result.unitCostNIS).toBe(370);
      expect(result.unitCostEUR).toBe(92.5);
      expect(result.currency).toBe('USD');
    });

    it('should handle zero exchange rate gracefully', () => {
      const zeroRates: ExchangeRates = {
        usdToIlsRate: 0,
        eurToIlsRate: 4.0
      };

      const result = convertToAllCurrencies(100, 'USD', zeroRates);

      // When USD rate is 0, calculations are: USD->ILS = 100*0 = 0, USD->EUR = 100*(0/4.0) = 0
      expect(result.unitCostUSD).toBe(100);
      expect(result.unitCostNIS).toBe(0); // 100 * 0
      // EUR calculation: 100 * (0 / 4.0) = 100 * 0 = 0 (not infinity as math rounds)
      expect(result.unitCostEUR).toBe(0);
    });
  });

  describe('Exchange Rate Change Scenarios (Regression Tests)', () => {
    // These tests verify the fix for the bug where changing exchange rates
    // incorrectly recalculated ALL items as if they were USD-based

    describe('ILS-native items (e.g., labor)', () => {
      it('should preserve ILS price when USD rate changes', () => {
        const oldRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
        const newRates: ExchangeRates = { usdToIlsRate: 4.0, eurToIlsRate: 4.0 };

        // Labor item: 1200 ILS/day, no USD/EUR
        const originalItem = {
          unitPriceILS: 1200,
          unitPriceUSD: 324.32, // Previously calculated: 1200 / 3.7
          unitPriceEUR: 300, // Previously calculated: 1200 / 4.0
          originalCurrency: 'NIS' as const,
          originalCost: 1200
        };

        // Detect currency
        const { currency, amount } = detectOriginalCurrency(
          originalItem.unitPriceILS,
          originalItem.unitPriceUSD,
          originalItem.unitPriceEUR,
          originalItem.originalCurrency
        );

        expect(currency).toBe('NIS');
        expect(amount).toBe(1200);

        // Recalculate with new rates
        const recalculated = convertToAllCurrencies(amount, currency, newRates);

        // CRITICAL: ILS price should NOT change
        expect(recalculated.unitCostNIS).toBe(1200);
        // USD should recalculate: 1200 / 4.0 = 300
        expect(recalculated.unitCostUSD).toBe(300);
        // EUR should recalculate: 1200 / 4.0 = 300
        expect(recalculated.unitCostEUR).toBe(300);
      });

      it('should preserve ILS price for labor when EUR rate changes', () => {
        const oldRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
        const newRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.5 };

        const laborItem = {
          unitPriceILS: 1200,
          unitPriceUSD: 324.32,
          unitPriceEUR: 300,
          originalCurrency: 'NIS' as const,
          originalCost: 1200
        };

        const { currency, amount } = detectOriginalCurrency(
          laborItem.unitPriceILS,
          laborItem.unitPriceUSD,
          laborItem.unitPriceEUR,
          laborItem.originalCurrency
        );

        const recalculated = convertToAllCurrencies(amount, currency, newRates);

        // ILS should stay 1200
        expect(recalculated.unitCostNIS).toBe(1200);
        // USD should stay same: 1200 / 3.7 = 324.32
        expect(recalculated.unitCostUSD).toBe(324.32);
        // EUR should recalculate: 1200 / 4.5 = 266.67
        expect(recalculated.unitCostEUR).toBe(266.67);
      });
    });

    describe('USD-native items (e.g., hardware)', () => {
      it('should preserve USD price when exchange rate changes', () => {
        const oldRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
        const newRates: ExchangeRates = { usdToIlsRate: 4.0, eurToIlsRate: 4.0 };

        // Hardware component: $2500 USD
        const hardwareItem = {
          unitPriceILS: 9250, // Previously: 2500 * 3.7
          unitPriceUSD: 2500,
          unitPriceEUR: 2312.5, // Previously: 2500 * (3.7 / 4.0)
          originalCurrency: 'USD' as const,
          originalCost: 2500
        };

        const { currency, amount } = detectOriginalCurrency(
          hardwareItem.unitPriceILS,
          hardwareItem.unitPriceUSD,
          hardwareItem.unitPriceEUR,
          hardwareItem.originalCurrency
        );

        expect(currency).toBe('USD');
        expect(amount).toBe(2500);

        const recalculated = convertToAllCurrencies(amount, currency, newRates);

        // CRITICAL: USD price should NOT change
        expect(recalculated.unitCostUSD).toBe(2500);
        // ILS should recalculate: 2500 * 4.0 = 10000
        expect(recalculated.unitCostNIS).toBe(10000);
        // EUR should recalculate: 2500 * (4.0 / 4.0) = 2500
        expect(recalculated.unitCostEUR).toBe(2500);
      });

      it('should preserve USD price when only EUR rate changes', () => {
        const oldRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
        const newRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.5 };

        const usdItem = {
          unitPriceILS: 3700,
          unitPriceUSD: 1000,
          unitPriceEUR: 925,
          originalCurrency: 'USD' as const,
          originalCost: 1000
        };

        const { currency, amount } = detectOriginalCurrency(
          usdItem.unitPriceILS,
          usdItem.unitPriceUSD,
          usdItem.unitPriceEUR,
          usdItem.originalCurrency
        );

        const recalculated = convertToAllCurrencies(amount, currency, newRates);

        // USD should stay 1000
        expect(recalculated.unitCostUSD).toBe(1000);
        // ILS should stay same: 1000 * 3.7 = 3700
        expect(recalculated.unitCostNIS).toBe(3700);
        // EUR should recalculate: 1000 * (3.7 / 4.5) = 822.22
        expect(recalculated.unitCostEUR).toBe(822.22);
      });
    });

    describe('EUR-native items', () => {
      it('should preserve EUR price when exchange rate changes', () => {
        const oldRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
        const newRates: ExchangeRates = { usdToIlsRate: 4.0, eurToIlsRate: 4.5 };

        const eurItem = {
          unitPriceILS: 400, // Previously: 100 * 4.0
          unitPriceUSD: 108.11, // Previously: 100 * (4.0 / 3.7)
          unitPriceEUR: 100,
          originalCurrency: 'EUR' as const,
          originalCost: 100
        };

        const { currency, amount } = detectOriginalCurrency(
          eurItem.unitPriceILS,
          eurItem.unitPriceUSD,
          eurItem.unitPriceEUR,
          eurItem.originalCurrency
        );

        expect(currency).toBe('EUR');
        expect(amount).toBe(100);

        const recalculated = convertToAllCurrencies(amount, currency, newRates);

        // CRITICAL: EUR price should NOT change
        expect(recalculated.unitCostEUR).toBe(100);
        // ILS should recalculate: 100 * 4.5 = 450
        expect(recalculated.unitCostNIS).toBe(450);
        // USD should recalculate: 100 * (4.5 / 4.0) = 112.5
        expect(recalculated.unitCostUSD).toBe(112.5);
      });
    });

    describe('Mixed currency quotation integration', () => {
      it('should correctly handle quotation with mixed currency items when rate changes', () => {
        const oldRates: ExchangeRates = { usdToIlsRate: 3.7, eurToIlsRate: 4.0 };
        const newRates: ExchangeRates = { usdToIlsRate: 4.0, eurToIlsRate: 4.0 };

        // Simulate a quotation with mixed items
        const quotationItems = [
          // Labor (ILS)
          {
            name: 'Engineering Labor',
            unitPriceILS: 1200,
            unitPriceUSD: 324.32,
            unitPriceEUR: 300,
            originalCurrency: 'NIS' as const,
            originalCost: 1200
          },
          // Hardware (USD)
          {
            name: 'PLC Module',
            unitPriceILS: 9250,
            unitPriceUSD: 2500,
            unitPriceEUR: 2312.5,
            originalCurrency: 'USD' as const,
            originalCost: 2500
          },
          // Software (EUR)
          {
            name: 'HMI License',
            unitPriceILS: 400,
            unitPriceUSD: 108.11,
            unitPriceEUR: 100,
            originalCurrency: 'EUR' as const,
            originalCost: 100
          }
        ];

        // Recalculate all items with new rates
        const recalculatedItems = quotationItems.map(item => {
          const { currency, amount } = detectOriginalCurrency(
            item.unitPriceILS,
            item.unitPriceUSD,
            item.unitPriceEUR,
            item.originalCurrency
          );

          const finalAmount = item.originalCost || amount;
          return {
            name: item.name,
            originalCurrency: currency,
            ...convertToAllCurrencies(finalAmount, currency, newRates)
          };
        });

        // Verify labor (ILS) - price in ILS unchanged
        expect(recalculatedItems[0].unitCostNIS).toBe(1200);
        expect(recalculatedItems[0].unitCostUSD).toBe(300); // 1200 / 4.0 (changed from 324.32)

        // Verify hardware (USD) - price in USD unchanged
        expect(recalculatedItems[1].unitCostUSD).toBe(2500);
        expect(recalculatedItems[1].unitCostNIS).toBe(10000); // 2500 * 4.0 (changed from 9250)

        // Verify software (EUR) - price in EUR unchanged
        expect(recalculatedItems[2].unitCostEUR).toBe(100);
        expect(recalculatedItems[2].unitCostUSD).toBe(100); // 100 * (4.0 / 4.0) (changed from 108.11)
      });

      it('should detect currency correctly even without originalCurrency field', () => {
        // Legacy scenario: items don't have originalCurrency stored
        const laborItemLegacy = {
          unitPriceILS: 1200,
          unitPriceUSD: 324.32,
          unitPriceEUR: 300
          // No originalCurrency or originalCost
        };

        // Should detect ILS as original (first non-zero)
        const { currency, amount } = detectOriginalCurrency(
          laborItemLegacy.unitPriceILS,
          laborItemLegacy.unitPriceUSD,
          laborItemLegacy.unitPriceEUR
        );

        expect(currency).toBe('NIS');
        expect(amount).toBe(1200);
      });

      it('should handle item with missing calculated currencies', () => {
        // Scenario: Item only has ILS, USD/EUR never calculated
        const partialItem = {
          unitPriceILS: 1500,
          unitPriceUSD: 0,
          unitPriceEUR: 0,
          originalCurrency: 'NIS' as const
        };

        const { currency, amount } = detectOriginalCurrency(
          partialItem.unitPriceILS,
          partialItem.unitPriceUSD,
          partialItem.unitPriceEUR,
          partialItem.originalCurrency
        );

        expect(currency).toBe('NIS');
        expect(amount).toBe(1500);

        const recalculated = convertToAllCurrencies(amount, currency, mockRates);
        expect(recalculated.unitCostNIS).toBe(1500);
        expect(recalculated.unitCostUSD).toBe(405.41); // 1500 / 3.7
        expect(recalculated.unitCostEUR).toBe(375); // 1500 / 4.0
      });
    });

    describe('Precision and rounding after rate changes', () => {
      it('should maintain precision to 2 decimal places after recalculation', () => {
        const rates: ExchangeRates = { usdToIlsRate: 3.73, eurToIlsRate: 4.12 };

        const item = {
          unitPriceUSD: 123.45,
          unitPriceILS: 460.47, // 123.45 * 3.73
          originalCurrency: 'USD' as const,
          originalCost: 123.45
        };

        const { currency, amount } = detectOriginalCurrency(
          item.unitPriceILS,
          item.unitPriceUSD,
          undefined,
          item.originalCurrency
        );

        const recalculated = convertToAllCurrencies(amount, currency, rates);

        // Check precision
        expect(recalculated.unitCostUSD).toBe(123.45);
        expect(recalculated.unitCostNIS).toBe(460.47); // 123.45 * 3.73
        expect(Number.isFinite(recalculated.unitCostNIS)).toBe(true);
        expect(recalculated.unitCostNIS.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      });

      it('should handle repeated rate changes without accumulating errors', () => {
        let currentItem = {
          unitPriceILS: 1000,
          unitPriceUSD: 270.27,
          originalCurrency: 'NIS' as const,
          originalCost: 1000
        };

        const rateChanges = [
          { usdToIlsRate: 3.7, eurToIlsRate: 4.0 },
          { usdToIlsRate: 4.0, eurToIlsRate: 4.0 },
          { usdToIlsRate: 3.5, eurToIlsRate: 4.0 },
          { usdToIlsRate: 3.7, eurToIlsRate: 4.0 } // Back to original
        ];

        for (const rates of rateChanges) {
          const { currency, amount } = detectOriginalCurrency(
            currentItem.unitPriceILS,
            currentItem.unitPriceUSD,
            undefined,
            currentItem.originalCurrency
          );

          const finalAmount = currentItem.originalCost || amount;
          const recalculated = convertToAllCurrencies(finalAmount, currency, rates);

          currentItem = {
            unitPriceILS: recalculated.unitCostNIS,
            unitPriceUSD: recalculated.unitCostUSD,
            originalCurrency: currency,
            originalCost: finalAmount
          };
        }

        // After cycling through rates, ILS should still be 1000
        expect(currentItem.unitPriceILS).toBe(1000);
        expect(currentItem.unitPriceUSD).toBe(270.27); // 1000 / 3.7
      });
    });
  });
});
