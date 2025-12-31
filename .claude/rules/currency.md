# Multi-Currency System

The CPQ system supports multi-currency pricing (NIS/ILS, USD, EUR) with intelligent original currency tracking.

## Core Principles

1. **Original Currency Preservation**: Each component has an original currency that NEVER changes
2. **Dynamic Conversion**: Other currencies are calculated from the original using exchange rates
3. **Exchange Rate Flexibility**: Changing rates recalculates conversions while preserving originals
4. **Database Persistence**: Original currency and cost are stored in the database

## Currency Tracking Fields

### Components Table
```sql
ALTER TABLE components
ADD COLUMN currency TEXT CHECK (currency IN ('NIS', 'USD', 'EUR')) DEFAULT 'NIS',
ADD COLUMN original_cost DECIMAL(12,2);
```

### Quotation Items Table
```sql
ALTER TABLE quotation_items
ADD COLUMN original_currency TEXT CHECK (original_currency IN ('NIS', 'USD', 'EUR')),
ADD COLUMN original_cost DECIMAL(12,2);
```

## How It Works

### Component Level (Global Catalog)
**File**: `src/hooks/useComponents.ts`

Each component stores:
- `currency`: The original currency (NIS, USD, or EUR)
- `originalCost`: The price in the original currency
- `unitCostNIS`, `unitCostUSD`, `unitCostEUR`: Converted prices

### Quotation Item Level
**File**: `src/lib/utils.ts` (convertDbQuotationToQuotationProject)

When components are added to a quotation:
- `originalCurrency`: Copied from component's currency
- `originalCost`: Copied from component's originalCost

### Exchange Rate Changes
**File**: `src/components/quotations/QuotationEditor.tsx`

When exchange rates change:
1. System reads each item's `originalCurrency` and `originalCost`
2. Keeps the original currency value fixed
3. Recalculates other currencies using new rates

## Currency Conversion Function

**File**: `src/utils/currencyConversion.ts`

```typescript
convertToAllCurrencies(
  amount: number,
  originalCurrency: Currency,
  rates: ExchangeRates
): CurrencyPrices
```

## Critical Implementation

### Database Loading (src/lib/utils.ts)
```typescript
// CRITICAL: Use original_currency and original_cost fields
const originalCurrency = dbItem.original_currency || 'NIS';
const originalCost = dbItem.original_cost || dbItem.unit_cost || 0;

// CRITICAL: Preserve original currency and cost in QuotationItem
items.push({
  unitPriceUSD,
  unitPriceILS,
  originalCurrency: originalCurrency, // Must be included!
  originalCost: originalCost,         // Must be included!
});
```

## Best Practices

1. **Always Set Original Currency**: When creating components, always set `currency` and `originalCost`
2. **Never Modify Original Values**: Original currency/cost only change when user explicitly edits
3. **Use Conversion Functions**: Always use `convertToAllCurrencies`, never calculate manually
4. **Preserve on Database Save**: Include `original_currency` and `original_cost`
5. **Test Exchange Rate Changes**: Verify changing rates preserves original prices

## Architecture Summary

```
Component Library (Global)
├── Component 1: USD original ($2,500)
│   ├── unitCostUSD: $2,500 (original)
│   ├── unitCostNIS: ₪9,250 (converted)
│   └── unitCostEUR: €2,200 (converted)

Quotation (Local)
├── Parameters
│   ├── usdToIlsRate: 3.7
│   └── eurToIlsRate: 4.0
├── Item 1 (from Component 1)
│   ├── originalCurrency: "USD"
│   ├── originalCost: 2500
│   ├── unitPriceUSD: $2,500 (stays fixed)
│   └── unitPriceILS: ₪9,250 (recalculates on rate change)
```
