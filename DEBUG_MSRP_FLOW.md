# MSRP Flow Debug Logging Summary

## Overview

Comprehensive debug logging has been added throughout the MSRP data flow to identify where data is being lost. This document tracks all logging points.

## Debug Logging Points

### 1. AIExtractionPreview.tsx (Component Processing)

**Location**: Lines 116-153

**Logs Mode A Detection** (Dual columns - Partner + MSRP):

```typescript
logger.debug('[AIExtractionPreview] Mode A detected - dual columns', {
  componentIndex: idx,
  componentName: c.name,
  msrpPrice: c.msrpPrice,
  msrpCurrency: c.msrpCurrency,
  unitPriceUSD: c.unitPriceUSD,
  unitPriceNIS: c.unitPriceNIS,
  unitPriceEUR: c.unitPriceEUR,
});
```

**Logs Discount Calculation**:

```typescript
logger.debug('[AIExtractionPreview] Calculated discount %', {
  componentIndex: idx,
  msrpPrice: c.msrpPrice,
  partnerPrice: partnerPrice,
  discountPercent: processedComponent.partnerDiscountPercent,
});
```

**Logs Mode B Detection** (User-entered discount %):

```typescript
logger.debug('[AIExtractionPreview] Mode B detected - discount %', {
  componentIndex: idx,
  componentName: c.name,
  mode: msrpOptions.mode,
  partnerDiscountPercent: msrpOptions.partnerDiscountPercent,
  msrpCurrency: msrpOptions.msrpCurrency,
});
```

### 2. AIExtractionPreview.tsx (Column Detection UI)

**Location**: Lines 425-439

**Logs UI Condition Check**:

```typescript
logger.debug('[AIExtractionPreview] Column detection UI condition check', {
  msrpOptionsMode: msrpOptions?.mode,
  hasColumnHeaders: !!extractionResult.metadata.columnHeaders,
  columnHeadersLength: extractionResult.metadata.columnHeaders?.length,
  showColumnUI,
});
```

**Purpose**: Identify why column matching UI doesn't show when user selects "הקובץ מכיל עמודת MSRP"

### 3. AIExtractionPreview.tsx (onConfirm)

**Location**: Lines 322-337

**Logs Component Data Before Passing**:

```typescript
logger.debug('[AIExtractionPreview] Passing component to onConfirm', {
  componentName: c.name,
  msrpPrice: component.msrpPrice,
  msrpCurrency: component.msrpCurrency,
  partnerDiscountPercent: component.partnerDiscountPercent,
  unitPriceUSD: component.unitCostUSD,
  unitPriceNIS: component.unitCostNIS,
});
```

**Logs Import Summary**:

```typescript
logger.info('[AIExtractionPreview] Confirming import', {
  totalComponents: approvedComponents.length,
  componentsWithMSRP: approvedComponents.filter(c => c.msrpPrice).length,
});
```

**Purpose**: Verify MSRP data is present in components array passed to onConfirm

### 4. ComponentAIImport.tsx

**Location**: Lines 37-41

**Logs Received Components**:

```typescript
logger.info('[ComponentAIImport] onImport received components', {
  totalComponents: components.length,
  componentsWithMSRP: components.filter(c => c.msrpPrice).length,
  sampleComponent: components[0],
});
```

**Purpose**: Verify MSRP data survives through ComponentAIImport wrapper

### 5. useComponents.ts (componentToDb)

**Location**: Lines 10-58

**Logs Input to Transformation**:

```typescript
logger.debug('[useComponents] componentToDb INPUT', {
  name: component.name,
  msrpPrice: component.msrpPrice,
  msrpCurrency: component.msrpCurrency,
  partnerDiscountPercent: component.partnerDiscountPercent,
});
```

**Logs Output After Transformation**:

```typescript
logger.debug('[useComponents] componentToDb OUTPUT', {
  name: result.name,
  msrp_price: result.msrp_price,
  msrp_currency: result.msrp_currency,
  partner_discount_percent: result.partner_discount_percent,
});
```

**Purpose**: Verify field mapping from Component → DbComponent works correctly

### 6. useComponents.ts (addComponent)

**Location**: Lines 160-166

**Logs Database INSERT Result**:

```typescript
logger.info('[useComponents] INSERT successful', {
  id: data.id,
  name: data.name,
  msrp_price: data.msrp_price,
  msrp_currency: data.msrp_currency,
  partner_discount_percent: data.partner_discount_percent,
});
```

**Purpose**: Verify MSRP data was actually saved to database

### 7. CPQProvider.tsx (Component Mapping)

**Location**: Lines 191-200

**Logs Database → UI Mapping**:

```typescript
if (comp.msrp_price) {
  logger.debug('[CPQProvider] Mapping MSRP from DB', {
    componentName: comp.name,
    dbMsrpPrice: comp.msrp_price,
    dbMsrpCurrency: comp.msrp_currency,
    dbPartnerDiscountPercent: comp.partner_discount_percent,
    mappedMsrpPrice: mapped.msrpPrice,
    mappedMsrpCurrency: mapped.msrpCurrency,
  });
}
```

**Purpose**: Verify MSRP data is correctly mapped when loading from database

### 8. quotationItemGridColumns.tsx (MSRP Toggle)

**Location**: Lines 517-608

**Logs Cell Renderer Calls**:

```typescript
logger.debug('[QuotationGrid] MSRP Toggle Cell Renderer called', {
  itemName: cellParams.data?.componentName,
  isSystemGroup: cellParams.data?.isSystemGroup,
  msrpPrice: cellParams.data?.msrpPrice,
  msrpCurrency: cellParams.data?.msrpCurrency,
  useMsrpPricing: cellParams.data?.useMsrpPricing,
  fullItemData: cellParams.data,
});
```

**Logs When Showing Toggle**:

```typescript
logger.debug('[QuotationGrid] Showing MSRP toggle button', {
  itemName: cellParams.data.componentName,
  msrpPrice: cellParams.data.msrpPrice,
  msrpCurrency: cellParams.data.msrpCurrency,
});
```

**Logs When Showing Placeholder**:

```typescript
logger.debug('[QuotationGrid] No MSRP - showing placeholder', {
  itemName: cellParams.data?.componentName,
});
```

**Purpose**: Identify why MSRP toggle button doesn't show in quotation editor grid

## How to Use This Debug Logging

### Step 1: Open Browser Console

1. Press F12 in Chrome/Edge
2. Go to Console tab
3. Enable verbose logging (click gear icon → Enable verbose)

### Step 2: Import MSRP File

1. Upload Excel file with MSRP columns
2. Select "הקובץ מכיל עמודת MSRP" option
3. Watch console for:
   - `[AIExtractionPreview] Mode A detected` - Should see MSRP values
   - `[AIExtractionPreview] Column detection UI condition check` - Check why UI doesn't show
   - `[AIExtractionPreview] Passing component to onConfirm` - Verify MSRP in components array

### Step 3: Confirm Import

1. Click "ייבא לספרייה"
2. Watch console for:
   - `[ComponentAIImport] onImport received components` - Verify MSRP present
   - `[useComponents] componentToDb INPUT/OUTPUT` - Verify field mapping
   - `[useComponents] INSERT successful` - Verify database save

### Step 4: Check Component Library

1. Navigate to Component Library page
2. Watch console for:
   - `[CPQProvider] Mapping MSRP from DB` - Should see MSRP values if saved correctly
3. Search for imported component
4. Open component card - check if MSRP fields are populated

### Step 5: Add to Quotation

1. Create/open quotation
2. Add MSRP component to quotation
3. Watch console for:
   - `[QuotationGrid] MSRP Toggle Cell Renderer called` - Check fullItemData structure
   - `[QuotationGrid] Showing MSRP toggle button` - Should appear if MSRP present
   - `[QuotationGrid] No MSRP - showing placeholder` - Why no MSRP?

## Expected Console Output (Success Scenario)

```
[AIExtractionPreview] Mode A detected - dual columns {
  componentIndex: 0,
  componentName: "1734-AENT/B",
  msrpPrice: 6670,
  msrpCurrency: "USD",
  unitPriceUSD: 4400,
  ...
}

[AIExtractionPreview] Calculated discount % {
  componentIndex: 0,
  msrpPrice: 6670,
  partnerPrice: 4400,
  discountPercent: 34.03
}

[AIExtractionPreview] Passing component to onConfirm {
  componentName: "1734-AENT/B",
  msrpPrice: 6670,
  msrpCurrency: "USD",
  partnerDiscountPercent: 34.03,
  ...
}

[ComponentAIImport] onImport received components {
  totalComponents: 1,
  componentsWithMSRP: 1,
  sampleComponent: { name: "1734-AENT/B", msrpPrice: 6670, ... }
}

[useComponents] componentToDb INPUT {
  name: "1734-AENT/B",
  msrpPrice: 6670,
  msrpCurrency: "USD",
  partnerDiscountPercent: 34.03
}

[useComponents] componentToDb OUTPUT {
  name: "1734-AENT/B",
  msrp_price: 6670,
  msrp_currency: "USD",
  partner_discount_percent: 34.03
}

[useComponents] INSERT successful {
  id: "abc-123",
  name: "1734-AENT/B",
  msrp_price: 6670,
  msrp_currency: "USD",
  partner_discount_percent: 34.03
}

[CPQProvider] Mapping MSRP from DB {
  componentName: "1734-AENT/B",
  dbMsrpPrice: 6670,
  dbMsrpCurrency: "USD",
  mappedMsrpPrice: 6670,
  mappedMsrpCurrency: "USD"
}

[QuotationGrid] MSRP Toggle Cell Renderer called {
  itemName: "1734-AENT/B",
  msrpPrice: 6670,
  msrpCurrency: "USD",
  useMsrpPricing: false,
  fullItemData: { ... }
}

[QuotationGrid] Showing MSRP toggle button {
  itemName: "1734-AENT/B",
  msrpPrice: 6670,
  msrpCurrency: "USD"
}
```

## Common Failure Points to Look For

### Issue 1: Column UI Not Showing

**Check**: `[AIExtractionPreview] Column detection UI condition check`

- `msrpOptionsMode` should be `'column'`
- `hasColumnHeaders` should be `true`
- `columnHeadersLength` should be > 0
- If any false, Claude AI didn't return `metadata.columnHeaders`

### Issue 2: MSRP Lost After Preview

**Check**: `[AIExtractionPreview] Passing component to onConfirm`

- If `msrpPrice` is `undefined`, data lost during component processing
- Compare with `[AIExtractionPreview] Mode A detected` to see original values

### Issue 3: MSRP Not Saved to Database

**Check**: `[useComponents] componentToDb INPUT/OUTPUT`

- If INPUT has `msrpPrice` but OUTPUT has `undefined msrp_price`, field mapping broken
  **Check**: `[useComponents] INSERT successful`
- If `msrp_price` is `null`, database rejected the value or RLS policy blocked it

### Issue 4: MSRP Not Loaded from Database

**Check**: `[CPQProvider] Mapping MSRP from DB`

- If no log appears, no components have MSRP in database
- If log shows `dbMsrpPrice: null`, data wasn't saved
- If log shows `mappedMsrpPrice: undefined`, mapping logic broken

### Issue 5: MSRP Toggle Not Visible

**Check**: `[QuotationGrid] MSRP Toggle Cell Renderer called`

- Inspect `fullItemData` - does it have `msrpPrice` and `msrpCurrency`?
- If `isSystemGroup: true`, toggle won't show (expected)
- If `msrpPrice` is `undefined`, component doesn't have MSRP data

## Files Modified

1. `src/components/library/AIExtractionPreview.tsx` (Lines 116-153, 322-337, 425-439)
2. `src/components/library/ComponentAIImport.tsx` (Lines 37-41)
3. `src/hooks/useComponents.ts` (Lines 10-58, 160-166)
4. `src/contexts/CPQProvider.tsx` (Lines 191-200)
5. `src/components/quotations/quotationItemGridColumns.tsx` (Lines 517-608)

## Next Steps

1. **Run test import** with MSRP Excel file
2. **Capture console logs** at each step
3. **Identify failure point** where MSRP data is lost
4. **Fix root cause** based on debug output
5. **Remove debug logging** once issue resolved (or keep for troubleshooting)
