/**
 * Tests for Pricing Settings Persistence
 * Ensures that pricing settings are properly saved to and loaded from Supabase
 * Settings auto-save on every change (no manual save button)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSetting, loadSetting } from '../settingsService';
import { getDefaultQuotationParameters } from '../../utils/quotationCalculations';

// Mock Supabase client
vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    })),
  },
}));

describe('Pricing Settings Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Settings Service', () => {
    it('should save pricing settings to localStorage cache', async () => {
      const pricingSettings = {
        usdToIlsRate: 4.5,
        eurToIlsRate: 5.0,
        autoUpdateRates: false,
        defaultMarkup: 30,
        defaultRisk: 8,
        dayWorkCost: 1500,
        vatRate: 18,
        deliveryTime: '6-8 שבועות',
      };

      await saveSetting('pricing', pricingSettings);

      // Verify saved to localStorage cache
      const cache = localStorage.getItem('cpq-settings-cache');
      expect(cache).toBeTruthy();

      const parsed = JSON.parse(cache!);
      expect(parsed.pricing).toEqual(pricingSettings);
    });

    it('should load pricing settings from localStorage cache', async () => {
      const pricingSettings = {
        usdToIlsRate: 4.5,
        eurToIlsRate: 5.0,
        autoUpdateRates: false,
        defaultMarkup: 30,
        defaultRisk: 8,
        dayWorkCost: 1500,
        vatRate: 18,
        deliveryTime: '6-8 שבועות',
      };

      // Save to cache
      localStorage.setItem(
        'cpq-settings-cache',
        JSON.stringify({
          pricing: pricingSettings,
        })
      );

      const result = await loadSetting<typeof pricingSettings>('pricing');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(pricingSettings);
    });
  });

  describe('Quotation Parameters', () => {
    it('should return default parameters when no settings cached', () => {
      const params = getDefaultQuotationParameters();

      expect(params).toEqual({
        usdToIlsRate: 3.7,
        eurToIlsRate: 4.0,
        markupPercent: 0.75,
        dayWorkCost: 1200,
        profitPercent: 20,
        riskPercent: 10,
        paymentTerms: '30 יום מהחשבונית',
        deliveryTime: '4-6 שבועות',
        includeVAT: true,
        vatRate: 17,
      });
    });

    it('should load parameters from cached settings', () => {
      // Set up cached pricing settings
      localStorage.setItem(
        'cpq-settings-cache',
        JSON.stringify({
          pricing: {
            usdToIlsRate: 4.5,
            eurToIlsRate: 5.0,
            defaultMarkup: 0.8,
            defaultRisk: 8,
            dayWorkCost: 1500,
            vatRate: 18,
            deliveryTime: '6-8 שבועות',
          },
        })
      );

      const params = getDefaultQuotationParameters();

      expect(params.usdToIlsRate).toBe(4.5);
      expect(params.eurToIlsRate).toBe(5.0);
      expect(params.markupPercent).toBe(0.8);
      expect(params.riskPercent).toBe(8);
      expect(params.dayWorkCost).toBe(1500);
      expect(params.vatRate).toBe(18);
      expect(params.deliveryTime).toBe('6-8 שבועות');
    });

    it('should handle partial cached settings with fallback to defaults', () => {
      // Set up partial cached pricing settings
      localStorage.setItem(
        'cpq-settings-cache',
        JSON.stringify({
          pricing: {
            usdToIlsRate: 4.5,
            // Other fields missing
          },
        })
      );

      const params = getDefaultQuotationParameters();

      // Should use cached value
      expect(params.usdToIlsRate).toBe(4.5);

      // Should fall back to defaults
      expect(params.eurToIlsRate).toBe(4.0);
      expect(params.markupPercent).toBe(0.75);
      expect(params.dayWorkCost).toBe(1200);
    });

    it('should fall back to defaults when cache is corrupted', () => {
      // Set corrupted cache
      localStorage.setItem('cpq-settings-cache', 'invalid json{{{');

      const params = getDefaultQuotationParameters();

      // Should return full defaults
      expect(params).toEqual({
        usdToIlsRate: 3.7,
        eurToIlsRate: 4.0,
        markupPercent: 0.75,
        dayWorkCost: 1200,
        profitPercent: 20,
        riskPercent: 10,
        paymentTerms: '30 יום מהחשבונית',
        deliveryTime: '4-6 שבועות',
        includeVAT: true,
        vatRate: 17,
      });
    });
  });

  describe('Settings Integration with BOM Calculations', () => {
    it('should use custom exchange rates in calculations', () => {
      // Set up custom pricing settings
      localStorage.setItem(
        'cpq-settings-cache',
        JSON.stringify({
          pricing: {
            usdToIlsRate: 4.5,
            eurToIlsRate: 5.0,
            defaultMarkup: 0.8,
            defaultRisk: 8,
            dayWorkCost: 1500,
            vatRate: 18,
            deliveryTime: '6-8 שבועות',
          },
        })
      );

      const params = getDefaultQuotationParameters();

      // Verify exchange rates are used
      expect(params.usdToIlsRate).toBe(4.5);
      expect(params.eurToIlsRate).toBe(5.0);

      // Calculate example conversion
      const usdPrice = 100;
      const ilsPrice = usdPrice * params.usdToIlsRate;
      expect(ilsPrice).toBe(450); // 100 * 4.5
    });

    it('should use custom markup and risk percentages', () => {
      // Set up custom pricing settings
      localStorage.setItem(
        'cpq-settings-cache',
        JSON.stringify({
          pricing: {
            usdToIlsRate: 3.7,
            eurToIlsRate: 4.0,
            defaultMarkup: 0.7,
            defaultRisk: 12,
            dayWorkCost: 1200,
            vatRate: 17,
            deliveryTime: '4-6 שבועות',
          },
        })
      );

      const params = getDefaultQuotationParameters();

      expect(params.markupPercent).toBe(0.7);
      expect(params.riskPercent).toBe(12);
    });
  });
});
