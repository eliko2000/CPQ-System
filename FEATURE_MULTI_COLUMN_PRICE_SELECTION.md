# Multi-Column Price Selection Feature

## Overview

Enables users to select from multiple detected price columns in supplier quotations, with live data updates when changing column selections.

## Problem Solved

Previously, when a supplier quotation had multiple price columns (e.g., "Camera+SDK" vs "Camera+Vision+Viz"), Claude AI auto-selected 2 columns, but users couldn't choose which columns to use. This caused issues when AI picked the wrong columns or when users wanted different package pricing.

## Solution Architecture

### 1. Enhanced Claude AI Extraction

**File**: `src/services/claudeAI.ts`

Added `allPriceColumns` field to extract ALL price columns from the document, not just auto-select 2:

```typescript
export interface PriceColumn {
  columnName: string; // Original column header name
  value: number | undefined; // Price value
  currency: 'NIS' | 'USD' | 'EUR'; // Currency detected
}

export interface AIExtractedComponent {
  // ... existing fields ...
  allPriceColumns?: PriceColumn[]; // All price columns found in the row
}
```

**Claude AI Prompt Update**:

- Now extracts ALL price columns (not just 2)
- Returns array of `{ columnName, value, currency }` for each row
- Example: `["Unit Price (USD) Camera+SDK", "Unit Price (USD) Camera+Vision+Viz", "MSRP (USD) Camera+SDK", ...]`

### 2. Column Selection UI

**File**: `src/components/library/AIExtractionPreview.tsx`

**State Management**:

```typescript
const [selectedPartnerColumn, setSelectedPartnerColumn] =
  useState<string>('auto');
const [selectedMsrpColumn, setSelectedMsrpColumn] = useState<string>('auto');
const availablePriceColumns =
  extractionResult.components[0]?.allPriceColumns || [];
```

**UI Components**:

1. **Dropdowns for column selection**:
   - Partner Price dropdown: Lists all detected price columns
   - MSRP dropdown: Lists all detected price columns
   - Default: "🤖 אוטומטי (זיהוי AI)" (uses Claude's auto-selection)

2. **Live Preview**:
   - Shows current partner price
   - Shows current MSRP price
   - Shows calculated discount %

3. **Apply Button**:
   - Disabled when both are set to "auto"
   - Recalculates all component prices when clicked

**Column Selection Logic** (`handleApplyColumnSelection`):

```typescript
// 1. Find selected column in component's allPriceColumns array
const partnerCol = c.allPriceColumns.find(
  col => col.columnName === selectedPartnerColumn
);

// 2. Update appropriate currency field
if (partnerCol.currency === 'USD') {
  updated.unitPriceUSD = partnerCol.value;
  updated.currency = 'USD';
}

// 3. Recalculate discount %
const discountPercent = ((msrpPrice - partnerPrice) / msrpPrice) * 100;
updated.partnerDiscountPercent = Math.round(discountPercent * 100) / 100;

// 4. Mark as modified
updated.status = 'modified';
```

### 3. Workflow

```
User uploads Excel/PDF
    ↓
Claude AI extracts:
  - Auto-selects partner price (first column)
  - Auto-selects MSRP (second column)
  - Extracts ALL price columns to allPriceColumns[]
    ↓
AIExtractionPreview UI:
  - Shows dropdowns with all detected columns
  - User can override AI's selection
  - Click "החל בחירה" (Apply Selection)
    ↓
handleApplyColumnSelection():
  - Updates all components with selected columns
  - Recalculates discount %
  - Marks components as "modified"
    ↓
User confirms import
  - Components saved with selected prices
```

## Example Use Cases

### Case 1: Camera with Multiple Packages

**Excel File**:

```
Product               | Unit Price (USD) Camera+SDK | Unit Price (USD) Camera+Vision+Viz | MSRP (USD) Camera+SDK | MSRP (USD) Camera+Vision+Viz
NANO-1300S-ON         | $4,400                       | $5,200                              | $6,670                | $7,890
```

**AI Auto-Detection**:

- Partner Price: $4,400 (Camera+SDK)
- MSRP: $6,670 (Camera+SDK)

**User Override**:

1. User selects "Unit Price (USD) Camera+Vision+Viz" for partner price
2. User selects "MSRP (USD) Camera+Vision+Viz" for MSRP
3. Clicks "החל בחירה" (Apply Selection)

**Result**:

- Partner Price: $5,200 (Camera+Vision+Viz)
- MSRP: $7,890 (Camera+Vision+Viz)
- Discount: 34.1%

### Case 2: Multiple Distributor Tiers

**Excel File**:

```
Product | Tier 1 Price | Tier 2 Price | Tier 3 Price | MSRP
PLC     | $1,200       | $1,350       | $1,500       | $2,000
```

**User Selection**:

- Select "Tier 2 Price" for partner price
- Select "MSRP" for MSRP
- All 150 components updated with Tier 2 pricing

## Technical Details

### TypeScript Types

```typescript
interface PriceColumn {
  columnName: string; // "Unit Price (USD) Camera+SDK"
  value: number | undefined; // 4400
  currency: 'NIS' | 'USD' | 'EUR'; // "USD"
}

interface AIExtractedComponent {
  unitPriceUSD?: number; // Auto-selected price
  msrpPrice?: number; // Auto-selected MSRP
  allPriceColumns?: PriceColumn[]; // All detected columns
}
```

### State Flow

1. **Initial Load**: `selectedPartnerColumn = 'auto'`, `selectedMsrpColumn = 'auto'`
2. **User Selects**: `selectedPartnerColumn = "Unit Price (USD) Camera+Vision+Viz"`
3. **Apply Button**: Enabled (not both auto)
4. **Click Apply**: `handleApplyColumnSelection()` runs
5. **Components Updated**: All components recalculated with new column data
6. **UI Updates**: Preview shows new prices, discount recalculated

### Performance

- No API calls needed (data already extracted by Claude)
- Client-side calculation only
- Instant feedback when applying selection
- Works with large files (150+ components)

## Files Modified

1. **src/services/claudeAI.ts**
   - Added `PriceColumn` interface
   - Added `allPriceColumns` field to `AIExtractedComponent`
   - Updated Claude prompt to extract ALL price columns
   - Updated JSON response format example

2. **src/components/library/AIExtractionPreview.tsx**
   - Added column selection state
   - Added `availablePriceColumns` detection
   - Added `handleApplyColumnSelection()` function
   - Replaced "Swap" button UI with dropdown selectors
   - Added live preview of current prices
   - Added "החל בחירה" (Apply Selection) button

## Testing Checklist

### Extraction Tests

- [ ] Upload Excel with 2 price columns - should show dropdowns
- [ ] Upload Excel with 4+ price columns - should show all in dropdowns
- [ ] Upload Excel with 1 price column - should NOT show column selector
- [ ] Verify `allPriceColumns` populated correctly
- [ ] Verify column names match Excel headers exactly

### UI Tests

- [ ] Dropdowns show all detected columns with values
- [ ] Default selection is "🤖 אוטומטי (זיהוי AI)"
- [ ] "החל בחירה" button disabled when both are "auto"
- [ ] "החל בחירה" button enabled when at least one column selected
- [ ] Preview updates when columns selected
- [ ] Discount % recalculates correctly

### Data Tests

- [ ] Select different partner column - prices update
- [ ] Select different MSRP column - MSRP updates
- [ ] Discount % recalculates: (MSRP - Partner) / MSRP × 100
- [ ] Currency matches selected column currency
- [ ] All components updated (not just first one)
- [ ] Components marked as "modified" status

### Edge Cases

- [ ] File with only 1 price column - no column selector shown
- [ ] File with 10+ price columns - dropdown scrolls correctly
- [ ] Select same column for both partner and MSRP - warning?
- [ ] Select column with missing values - handles gracefully
- [ ] Change selection multiple times - works correctly

## Future Enhancements

### 1. Smart Column Detection

Improve AI's auto-selection logic:

- Detect "Partner", "Distributor", "Your Price" keywords
- Detect "MSRP", "List", "Retail" keywords
- Auto-select most appropriate columns

### 2. Column Name Simplification

Shorten long column names in dropdowns:

```typescript
// Before: "Unit Price (USD) Camera+SDK with Vision License"
// After:  "Camera+SDK + Vision ($4,400)"
```

### 3. Batch Column Selection

Allow users to set default column preferences:

- "Always use Tier 2 pricing"
- "Always use Camera+Vision+Viz package"
- Save preferences per supplier

### 4. Visual Column Mapping

Show Excel-like table preview:

```
Product         | Col A ($4,400) | Col B ($5,200) | Col C ($6,670)
NANO-1300S-ON  |      ✓         |                |      ✓
                 (Partner)                          (MSRP)
```

### 5. Currency Mismatch Warning

Warn if selected columns have different currencies:

```
⚠️ Warning: Partner price is in USD but MSRP is in EUR
Convert MSRP to USD first?
```

## Migration Notes

**No database changes required** - this feature only affects extraction and preview, not storage.

**Backward Compatibility**:

- Old extractions without `allPriceColumns` still work
- Falls back to existing `unitPriceUSD` and `msrpPrice` fields
- Column selector only shows when `allPriceColumns.length > 0`

## Documentation

- **User Guide**: See GUIDE_FILE_IMPORT.md (to be updated)
- **Developer Guide**: See DEV_PARSERS_GUIDE.md (to be updated)
- **Technical Docs**: See CLAUDE.md Multi-Currency section

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ Excel File: 4 Price Columns                                  │
│  - Unit Price (USD) Camera+SDK                               │
│  - Unit Price (USD) Camera+Vision+Viz                        │
│  - MSRP (USD) Camera+SDK                                     │
│  - MSRP (USD) Camera+Vision+Viz                              │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Claude AI Extraction (claudeAI.ts)                           │
│  - Auto-select: unitPriceUSD = $4,400 (first column)         │
│  - Auto-select: msrpPrice = $6,670 (MSRP column)             │
│  - Extract ALL: allPriceColumns = [                          │
│      { columnName: "...", value: 4400, currency: "USD" },    │
│      { columnName: "...", value: 5200, currency: "USD" },    │
│      { columnName: "...", value: 6670, currency: "USD" },    │
│      { columnName: "...", value: 7890, currency: "USD" }     │
│    ]                                                          │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ AIExtractionPreview UI                                        │
│  ┌────────────────────────┬────────────────────────┐         │
│  │ Partner Price Dropdown │ MSRP Dropdown          │         │
│  │ ○ Auto (AI)            │ ○ Auto (AI)            │         │
│  │ ○ Camera+SDK ($4,400)  │ ○ Camera+SDK ($6,670)  │         │
│  │ ● Camera+Vision ($5,200)│ ● Camera+Vision ($7,890)│        │
│  └────────────────────────┴────────────────────────┘         │
│                                                                │
│  [החל בחירה] Apply Selection Button                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ handleApplyColumnSelection()                                  │
│  - Find "Camera+Vision" column in allPriceColumns             │
│  - Update: unitPriceUSD = $5,200                              │
│  - Update: msrpPrice = $7,890                                 │
│  - Calculate: discount = (7890 - 5200) / 7890 = 34.1%         │
│  - Mark all components as "modified"                          │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Component Preview (Updated)                                   │
│  Partner Price: $5,200                                        │
│  MSRP: $7,890                                                 │
│  Discount: -34.1%                                             │
│  Status: Modified                                             │
└──────────────────────────────────────────────────────────────┘
```

## Summary

This feature provides full control over which price columns to import when supplier quotations have multiple pricing tiers or package options. Users can:

1. See all detected price columns
2. Select specific columns for partner price and MSRP
3. See live updates of prices and discount calculations
4. Apply selection to all components at once

**Impact**: Saves time and reduces errors when importing complex quotations with multiple pricing options.
