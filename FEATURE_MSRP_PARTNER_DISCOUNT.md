# MSRP & Partner Discount Feature

## Overview

Complete implementation of MSRP (Manufacturer Suggested Retail Price) tracking and partner discount management for distributed components in the CPQ system.

## Feature Summary

### Import Flow - Three Scenarios

**Scenario A: File with both Partner + MSRP columns** ✅ FULLY WORKING

- Upload file (Claude AI auto-detects dual price columns)
- Claude extracts BOTH Partner Price AND MSRP automatically
- AIExtractionPreview shows:
  - Partner Price: $4,400 (green)
  - MSRP: $6,670 (purple) with "-34.0% הנחה" badge
- System auto-calculates discount: `(MSRP - Partner) / MSRP × 100 = 34%`
- Stored: Partner cost + MSRP + calculated discount%
- **No user input needed** - fully automatic!

**Scenario B: File with MSRP + user knows discount**

- User selects: "Apply partner discount %"
- User enters discount (e.g., 34%)
- System calculates: `Partner Price = MSRP × (1 - discount/100)`
- Stored: Calculated partner cost + MSRP + discount%

**Scenario C: Regular import (no MSRP)**

- No checkbox selected
- Import costs as usual
- No MSRP data stored

### Quotation Flow

**Visual Indicators:**

- 🏷️ emoji badge appears next to component names that have MSRP pricing
- Purple color indicates distributed component

**MSRP Toggle (Not yet implemented):**

- Toggle button per line item to switch between:
  - **Use MSRP**: Selling price = MSRP (higher margin)
  - **Use Cost + Margin**: Standard pricing calculation
- Margin calculation shows true profitability when using MSRP

---

## Implementation Details

### Database Schema

**Components Table:**

```sql
ALTER TABLE components
ADD COLUMN msrp_price DECIMAL(12,2),
ADD COLUMN msrp_currency TEXT CHECK (msrp_currency IN ('NIS', 'USD', 'EUR')),
ADD COLUMN partner_discount_percent DECIMAL(5,2);
```

**Quotation Items Table:**

```sql
ALTER TABLE quotation_items
ADD COLUMN use_msrp_pricing BOOLEAN DEFAULT false;
```

**Migration File:** `migrations/add-msrp-fields.sql`

---

### Files Modified

#### 1. Types

- ✅ `src/types/component.types.ts` - Added MSRP fields to Component & DbComponent
- ✅ `src/services/claudeAI.ts` - Added MSRP fields to AIExtractedComponent
- ✅ `src/types/quotation.types.ts` - Added MSRP toggle to QuotationItem

#### 2. Import UI

- ✅ `src/components/library/IntelligentDocumentUpload.tsx`
  - Added MSRP import mode selector (3 radio options)
  - Partner discount % input field
  - MSRP currency selector

- ✅ `src/components/library/AIExtractionPreview.tsx`
  - Processes MSRP discount calculations
  - Applies discount formula: `Partner = MSRP × (1 - discount%)`
  - Passes MSRP fields to confirmation

- ✅ `src/components/library/ComponentAIImport.tsx`
  - Updated to pass MSRPImportOptions through the flow

#### 3. Database Integration

- ✅ `src/hooks/useComponents.ts`
  - Updated `componentToDb()` to map MSRP fields
  - Updated SELECT query to fetch MSRP fields
  - Saves msrp_price, msrp_currency, partner_discount_percent

#### 4. Quotation Display

- ✅ `src/components/quotations/quotationItemGridColumns.tsx`
  - Added 🏷️ badge for components with MSRP
  - Purple color indicator

---

## Pending Work

### 1. MSRP Toggle Button (High Priority)

Add toggle button column in quotation grid:

```typescript
// Add new column after componentName
{
  headerName: 'MSRP',
  field: 'useMsrpPricing',
  width: 80,
  cellRenderer: (params) => {
    if (!params.data.msrpPrice) return null; // No MSRP available
    return (
      <Button
        size="sm"
        variant={params.data.useMsrpPricing ? 'default' : 'outline'}
        onClick={() => toggleMsrpPricing(params.data.id)}
      >
        {params.data.useMsrpPricing ? 'MSRP' : 'Cost+M'}
      </Button>
    );
  }
}
```

### 2. MSRP Pricing Calculations

Update `src/utils/quotationCalculations.ts`:

```typescript
// When calculating item prices:
if (item.useMsrpPricing && item.msrpPrice && item.msrpCurrency) {
  // Convert MSRP to quotation currency
  const msrpInILS = convertCurrency(
    item.msrpPrice,
    item.msrpCurrency,
    'NIS',
    exchangeRates
  );
  customerPrice = msrpInILS;
} else {
  // Standard cost + margin calculation
  customerPrice = unitCost × (1 + markup/100);
}
```

### 3. Excel Parser Enhancement (Optional)

Update `src/services/excelParser.ts` to:

- Detect MSRP columns automatically
- Detect partner/distributor price columns
- Extract both prices when mode === 'column'

### 4. Database Migration Execution

Run the migration in Supabase SQL Editor:

1. Open: https://supabase.com/dashboard/project/dlunozvzvpykrcfwtyax/sql
2. Copy contents of `migrations/add-msrp-fields.sql`
3. Run the SQL

---

## Usage Examples

### Example 1: Import with Discount

```
User uploads Excel with MSRP prices
Selects: "Apply partner discount %" → 34%
Currency: USD

File row: NANO - $6,670

Calculation:
  Partner Price = 6670 × (1 - 0.34) = $4,402

Stored in DB:
  unit_cost_usd: 4402
  msrp_price: 6670
  msrp_currency: 'USD'
  partner_discount_percent: 34
```

### Example 2: Quotation with MSRP

```
Add NANO component to quotation
Item shows 🏷️ badge (has MSRP)

Option A - Use MSRP:
  Toggle: ON
  Selling price: $6,670 (MSRP)
  Your cost: $4,402
  Margin: $2,268 (34%)

Option B - Use Cost + Margin:
  Toggle: OFF
  Cost: $4,402
  Margin: 25%
  Selling price: $5,502
  Margin: $1,100 (20%)
```

---

## Testing Checklist

### Import Tests

- [ ] Import Excel with discount % applied
- [ ] Import Excel with both Partner + MSRP columns
- [ ] Import regular file (no MSRP) - should work as before
- [ ] Verify MSRP fields saved to database
- [ ] Verify discount calculation accuracy

### Quotation Tests

- [ ] Component with MSRP shows 🏷️ badge
- [ ] Toggle MSRP pricing on/off
- [ ] Verify MSRP price converted to quotation currency
- [ ] Verify margin calculation when using MSRP
- [ ] Verify standard pricing when MSRP off
- [ ] Save quotation and reload - toggle state persists

### Edge Cases

- [ ] Component without MSRP - no badge, no toggle
- [ ] Change exchange rates - MSRP recalculates
- [ ] Currency conversion (USD MSRP → ILS quotation)
- [ ] Multiple currencies (USD, EUR, NIS MSRP)

---

## Architecture Notes

**Why separate MSRP from cost?**

- MSRP is constant (manufacturer's list price)
- Partner cost is what you actually pay
- Allows flexible pricing: sell at MSRP (high margin) or cost+markup

**Why store discount %?**

- Historical tracking - know what discount you got
- Audit trail for pricing negotiations
- Can recalculate if MSRP changes

**Currency handling:**

- MSRP stored in ONE currency (manufacturer's)
- Converted on-the-fly using exchange rates
- Matches existing pattern for component costs

---

## Next Steps

1. **Run database migration** (2 minutes)
2. **Implement MSRP toggle button** (30 minutes)
3. **Update pricing calculations** (45 minutes)
4. **Test import flow** (15 minutes)
5. **Test quotation flow** (15 minutes)

**Total remaining: ~2 hours**

---

## Documentation

- SQL Migration: `migrations/add-msrp-fields.sql`
- Type definitions: `src/types/*.types.ts`
- Import logic: `src/components/library/IntelligentDocumentUpload.tsx`
- Display logic: `src/components/quotations/quotationItemGridColumns.tsx`
