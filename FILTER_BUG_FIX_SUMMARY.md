# Pricing Settings Persistence Bug Fix - November 2024

## Issue Summary

**Bug:** Pricing settings (USD/ILS rate, EUR/ILS rate, markup %, day work cost, VAT rate, delivery time) were not being saved when changed in the settings modal. Values would revert to hard-coded defaults (USD/ILS: 3.7) after navigation.

**Severity:** HIGH - All BOMs and quotations were using incorrect pricing parameters, leading to inaccurate calculations.

## Root Causes

1. **PricingSettings Component Not Persisting Data**
   - File: `src/components/settings/SettingsPage.tsx:532-629`
   - Issues:
     - Hard-coded `defaultValue` props instead of controlled inputs
     - No `onChange` handlers to capture user changes
     - No save functionality or integration with `settingsService.ts`
     - No state management

2. **Hard-Coded Default Parameters**
   - File: `src/utils/quotationCalculations.ts:230-243`
   - `getDefaultQuotationParameters()` returned hard-coded values
   - Did not check Supabase or localStorage for user settings

3. **DB Conversion Using Hard-Coded Values**
   - File: `src/lib/utils.ts:92-117`
   - `convertDbQuotationToQuotationProject()` used hard-coded defaults
   - Did not integrate with settings system

## Solution Implemented

### 1. Refactored PricingSettings Component

**Changes:**
- Added state management for all pricing fields
- Added `useEffect` to load settings from Supabase on mount
- Implemented controlled inputs with `value` and `onChange` handlers
- **Auto-save on every change** (no manual save button - matches other settings)
- Added loading state with spinner
- Migrated old localStorage settings to Supabase automatically

### 2. Updated Quotation Parameter Functions

**File:** `src/utils/quotationCalculations.ts`

- Updated `getDefaultQuotationParameters()` to read from localStorage cache (synced with Supabase)
- Added `loadDefaultQuotationParameters()` async function for fresh Supabase data
- Falls back to hard-coded defaults only if cache unavailable

### 3. Updated DB Quotation Converter

**File:** `src/lib/utils.ts`

- `convertDbQuotationToQuotationProject()` now calls `getDefaultQuotationParameters()`
- Uses cached settings for all parameter defaults
- Maintains backward compatibility with DB-stored values

## Testing

**File:** `src/services/__tests__/pricingSettings.test.ts`

**Test Results:** ✓ 8 tests passed (8)

1. ✓ Should save pricing settings to localStorage cache
2. ✓ Should load pricing settings from localStorage cache
3. ✓ Should return default parameters when no settings cached
4. ✓ Should load parameters from cached settings
5. ✓ Should handle partial cached settings with fallback
6. ✓ Should fall back to defaults when cache is corrupted
7. ✓ Should use custom exchange rates in calculations
8. ✓ Should use custom markup and risk percentages

## Files Modified

1. ✅ `src/components/settings/SettingsPage.tsx` - Refactored PricingSettings component
2. ✅ `src/utils/quotationCalculations.ts` - Updated default parameter functions
3. ✅ `src/lib/utils.ts` - Updated DB quotation converter
4. ✅ `src/services/__tests__/pricingSettings.test.ts` - Created comprehensive tests

## Verification Steps

1. Go to Settings → הגדרות תמחור (Pricing Settings)
2. Change USD/ILS rate from 3.7 to 4.5
3. **Settings auto-save immediately** (no save button needed)
4. Navigate away then return to Settings
5. Verify USD/ILS still shows 4.5 ✓
6. Create new BOM/Quotation
7. Verify calculations use 4.5 rate ✓

## Impact

**After Fix:**
- ✅ Settings persist correctly
- ✅ All quotations use correct rates
- ✅ Pricing calculations accurate
- ✅ User confidence restored

---

**Date Fixed:** 2025-11-12
**Status:** ✅ Complete - All tests passing

---

# Filter Bug Fix Summary - November 2024

## Issue

Text column filters were completely non-functional. Users could click filter icons, select values, and see the filter UI respond, but the table data would not filter.

## Root Cause Analysis

### The Problem

The codebase was using **AG Grid Enterprise filter format** (`agSetColumnFilter`) but the project only has **AG Grid Community Edition** installed.

```typescript
// ❌ Code expected this (Enterprise)
filter: 'agSetColumnFilter'
filterModel = { values: ['Value1', 'Value2'] }

// ✅ But AG Grid created this (Community)
// Falls back to TextFilter when agSetColumnFilter is not available
filterInstance.constructor.name === 'TextFilter'

// Result: TextFilter rejected the model format and returned null
```

### Why It Wasn't Caught

1. **No error messages** - AG Grid silently falls back to TextFilter
2. **UI appeared to work** - Filter icon turned blue, config saved
3. **No unit tests** - Filter functionality had zero test coverage
4. **Async race condition masked issue** - Timing made debugging difficult

## The Fix

### Code Changes

**File**: `src/components/grid/CustomHeader.tsx` (lines 118-199)

1. **Dynamic filter type detection**
   ```typescript
   const filterTypeName = filterInstance.constructor?.name
   ```

2. **Format selection based on type**
   ```typescript
   if (filterTypeName === 'SetFilter') {
     // Enterprise format
     model = { values: [...] }
   } else {
     // Community format (TextFilter)
     model = {
       filterType: 'text',
       operator: 'OR',
       conditions: [...]
     }
   }
   ```

3. **Proper async handling**
   ```typescript
   const filter = await api.getColumnFilterInstance(colId)
   await filter.setModel(model)
   filter.applyModel()  // Required for some filters
   api.onFilterChanged()
   ```

4. **Runtime validation**
   ```typescript
   if (filterTypeName !== 'SetFilter' && filterTypeName !== 'TextFilter') {
     console.warn(`Unexpected filter type: ${filterTypeName}`)
   }
   ```

### Tests Added

1. **Unit Tests** (`CustomHeader.filter.test.tsx`)
   - 12 test cases
   - Filter model format validation
   - Async operation ordering
   - Error handling
   - Enterprise vs Community format detection

2. **Integration Tests** (`CustomHeader.integration.test.tsx`)
   - End-to-end filter flow
   - State persistence
   - Multi-value OR logic
   - Filter type detection

### Documentation Created

1. **FILTER_IMPLEMENTATION.md**
   - Complete implementation guide
   - Filter type differences
   - Common pitfalls
   - Debugging instructions

2. **FILTER_TEST_REQUIREMENTS.md**
   - Mandatory testing checklist
   - Manual test procedures
   - Expected console output
   - Rollback criteria

## Prevention Measures

### 1. Comprehensive Testing

- **30+ tests** covering all filter scenarios
- **Integration tests** for end-to-end flows
- **Manual testing checklist** before any commit

### 2. Runtime Validation

- Warns if unexpected filter type detected
- Validates filter model was actually set
- Logs all filter operations for debugging

### 3. Documentation

- Complete implementation guide
- Common pitfalls documented
- Emergency debugging commands
- Version history tracked

### 4. Code Comments

- Critical sections marked with warnings
- Model format requirements documented
- Async operation ordering explained

## Verification

### Before Fix
```
Filter clicked: project_name
[CustomHeader] Setting filter for project_name: {values: ['Project A']}
[CustomHeader] Filter verification: {modelSet: null, isActive: false}  ❌
Table: No filtering occurs ❌
```

### After Fix
```
Filter clicked: project_name
[CustomHeader] Filter instance type: TextFilter
[CustomHeader] Using TextFilter (Community) format
[CustomHeader] Setting filter: {filterType: 'text', operator: 'OR', ...}
[CustomHeader] Filter verification: {modelSet: {...}, isActive: true}  ✅
Table: Correctly filtered ✅
```

## Impact

- **Severity**: HIGH (Complete feature failure)
- **Affected Users**: All users using text column filters
- **Duration**: Unknown (bug existed before detection)
- **Data Loss**: None (read-only operation)
- **Pricing Impact**: None

## Lessons Learned

1. **Silent failures are dangerous**
   - AG Grid's silent fallback hid the problem
   - Always validate library behavior matches expectations

2. **UI feedback isn't enough**
   - Filter icon turned blue, but feature didn't work
   - Always test actual functionality, not just UI state

3. **Test coverage is critical**
   - Zero tests allowed this bug to exist
   - Now have 30+ tests preventing regression

4. **Async operations need care**
   - Race conditions made debugging harder
   - Proper await chains are essential

5. **Documentation prevents repeats**
   - Comprehensive docs ensure future developers understand
   - Test requirements prevent skipping validation

## Files Modified

### Implementation
- `src/components/grid/CustomHeader.tsx` - Filter logic fixed

### Tests (New)
- `src/components/grid/__tests__/CustomHeader.filter.test.tsx` - Unit tests
- `src/components/grid/__tests__/CustomHeader.integration.test.tsx` - Integration tests

### Documentation (New)
- `docs/FILTER_IMPLEMENTATION.md` - Implementation guide
- `docs/FILTER_TEST_REQUIREMENTS.md` - Testing requirements
- `FILTER_BUG_FIX_SUMMARY.md` - This document

## Future Recommendations

1. **Consider AG Grid Enterprise**
   - If budget allows, Enterprise edition provides better set filters
   - Code already supports both formats

2. **Add CI/CD checks**
   - Run filter tests on every PR
   - Block merges if tests fail

3. **Regular filter testing**
   - Include in QA checklist
   - Test after any AG Grid version updates

4. **Monitor console logs**
   - Watch for filter warnings in production
   - Set up alerting for filter errors

## Timeline

- **Bug Reported**: November 12, 2024
- **Root Cause Identified**: Same day (filter format mismatch)
- **Fix Implemented**: Same day
- **Tests Added**: Same day (30+ tests)
- **Documentation Created**: Same day
- **Verification**: Confirmed working by user

## Contact

For questions about this fix:
- Review `docs/FILTER_IMPLEMENTATION.md` for implementation details
- Check `docs/FILTER_TEST_REQUIREMENTS.md` before modifying filters
- Run all tests before committing filter changes

---

**DO NOT modify filter code without reading the documentation and running all tests.**

This bug showed that filters are critical functionality that require comprehensive testing and validation.
