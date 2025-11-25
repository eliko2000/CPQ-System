# Filter Implementation Guide

## Overview

This document explains how the custom filter system works in the CPQ application, why it's implemented this way, and how to prevent future regressions.

---

## The Filter Bug (November 2024)

### What Happened

Text column filters stopped working completely. The filter UI appeared to work (icon turned blue, config saved), but the table data was not filtered.

### Root Cause

The code was using **SetFilter format** (AG Grid Enterprise) with **TextFilter** (AG Grid Community):

```typescript
// ❌ WRONG - This doesn't work with TextFilter
const model = { values: ['Value1', 'Value2'] };
filterInstance.setModel(model); // Model is rejected, returns null
```

### Why It Happened

1. Column definitions specified `filter: 'agSetColumnFilter'`
2. AG Grid Community doesn't include `agSetColumnFilter` (Enterprise only)
3. AG Grid fell back to `TextFilter` silently
4. Code assumed `agSetColumnFilter` was being used
5. Filter model format was incompatible with TextFilter
6. No tests caught the mismatch

---

## AG Grid Filter Types

### Community Edition (Free)

| Filter Type  | Used For       | Model Format                                                     |
| ------------ | -------------- | ---------------------------------------------------------------- |
| TextFilter   | Text columns   | `{ filterType: 'text', type: 'equals', filter: 'value' }`        |
| NumberFilter | Number columns | `{ filterType: 'number', type: 'equals', filter: 123 }`          |
| DateFilter   | Date columns   | `{ filterType: 'date', type: 'equals', dateFrom: '2024-01-01' }` |

### Enterprise Edition (Paid)

| Filter Type | Used For          | Model Format                       |
| ----------- | ----------------- | ---------------------------------- |
| SetFilter   | Multi-select text | `{ values: ['value1', 'value2'] }` |
| MultiFilter | Combined filters  | Complex nested structure           |

**The CPQ application uses AG Grid Community, NOT Enterprise.**

---

## Correct Implementation

### Single Value Filter (TextFilter)

```typescript
const model = {
  filterType: 'text',
  type: 'equals',
  filter: 'Value1',
};

await filterInstance.setModel(model);
filterInstance.applyModel();
api.onFilterChanged();
```

### Multiple Values Filter (TextFilter with OR)

```typescript
const model = {
  filterType: 'text',
  operator: 'OR',
  conditions: [
    { filterType: 'text', type: 'equals', filter: 'Value1' },
    { filterType: 'text', type: 'equals', filter: 'Value2' },
    { filterType: 'text', type: 'equals', filter: 'Value3' },
  ],
};

await filterInstance.setModel(model);
filterInstance.applyModel();
api.onFilterChanged();
```

### SetFilter (Enterprise Only)

```typescript
// Only use this if ag-grid-enterprise is installed!
const model = {
  values: ['Value1', 'Value2', 'Value3'],
};

await filterInstance.setModel(model);
api.onFilterChanged();
```

---

## Critical Implementation Rules

### 1. Detect Filter Type First

```typescript
const filterInstance = await api.getColumnFilterInstance(colId);
const filterTypeName = filterInstance.constructor?.name;

if (filterTypeName === 'SetFilter') {
  // Use Enterprise format
} else if (filterTypeName === 'TextFilter') {
  // Use Community format
} else {
  console.warn(`Unexpected filter type: ${filterTypeName}`);
}
```

### 2. Proper Async Handling

```typescript
// ❌ WRONG - Race condition
api.getColumnFilterInstance(colId).then(async filter => {
  await filter.setModel(model);
  api.onFilterChanged(); // May fire before setModel completes
});

// ✅ CORRECT - Proper sequencing
const filter = await api.getColumnFilterInstance(colId);
await filter.setModel(model);
filter.applyModel(); // Some filters require this
api.onFilterChanged(); // Only after everything completes
```

### 3. Verify Filter Was Set

```typescript
await filter.setModel(model);

// Verify it worked
const verifyModel = filter.getModel();
const isActive = filter.isFilterActive();

if (!isActive || verifyModel === null) {
  console.error('Filter failed to apply!');
}
```

### 4. Convert All Values to Strings

```typescript
// ❌ WRONG - Mixed types can cause issues
const values = [123, 'text', null];

// ✅ CORRECT - All strings
const values = [123, 'text', null].map(v => String(v));
// Result: ['123', 'text', 'null']
```

---

## File Locations

### Implementation

- **CustomHeader.tsx** (`src/components/grid/CustomHeader.tsx`)
  - Lines 118-199: Filter model creation and application
  - Handles both TextFilter and SetFilter
  - Includes validation and logging

- **SmartFilter.tsx** (`src/components/grid/SmartFilter.tsx`)
  - Filter selection UI
  - Returns array of selected values
  - Called by CustomHeader

### Tests

- **CustomHeader.filter.test.tsx** (`src/components/grid/__tests__/CustomHeader.filter.test.tsx`)
  - Unit tests for filter model formatting
  - Tests both Community and Enterprise formats
  - Validates async handling

- **CustomHeader.integration.test.tsx** (`src/components/grid/__tests__/CustomHeader.integration.test.tsx`)
  - End-to-end filter flow tests
  - Verifies complete user interaction flow
  - Tests state persistence

### Documentation

- **IMPL_FILTERS.md** (this file)
- **../../CLAUDE.md** - Project overview

---

## Testing Checklist

Before committing filter changes, verify:

- [ ] **Unit tests pass** - Run `npm test CustomHeader.filter.test.tsx`
- [ ] **Integration tests pass** - Run `npm test CustomHeader.integration.test.tsx`
- [ ] **Manual testing completed:**
  - [ ] Single value filter works
  - [ ] Multiple value filter works
  - [ ] Filter persists after page reload
  - [ ] Filter icon shows active state (blue)
  - [ ] Table actually filters data
  - [ ] Clear filter works
  - [ ] Tested on multiple columns
  - [ ] Console shows no errors

---

## Common Pitfalls

### ❌ Using SetFilter Format with Community Edition

```typescript
// This will fail silently!
const model = { values: ['a', 'b'] };
await textFilter.setModel(model);
// Result: filter.getModel() returns null
```

### ❌ Not Awaiting Async Operations

```typescript
// This creates a race condition!
filterInstance.setModel(model).then(() => {
  api.onFilterChanged(); // May fire too early
});
```

### ❌ Not Calling applyModel()

```typescript
// Some filters require applyModel() to activate
await filterInstance.setModel(model);
// ❌ Missing: filterInstance.applyModel()
api.onFilterChanged();
```

### ❌ Not Validating Filter Type

```typescript
// Assuming SetFilter without checking
const model = { values: [...] }
// What if it's actually TextFilter?
```

---

## Future-Proofing

### If Upgrading to Enterprise

1. Install `ag-grid-enterprise` package
2. Tests will automatically detect SetFilter
3. Code already supports both formats
4. No changes needed to CustomHeader.tsx

### If Staying with Community

1. Keep using current TextFilter format
2. Do NOT use `agSetColumnFilter` in column definitions
3. Use `filter: 'agTextColumnFilter'` or `filter: true`
4. Tests will verify correct format is used

---

## Debugging

### Enable Filter Logging

Filter operations are already logged to console:

```
[CustomHeader] Filter instance type: TextFilter
[CustomHeader] Using TextFilter (Community) format for column_name
[CustomHeader] Setting filter for column_name: {...}
[CustomHeader] Filter model set, triggering onFilterChanged for column_name
[CustomHeader] Filter verification for column_name: {modelSet: {...}, isActive: true, ...}
[CustomHeader] Filter applied successfully for column_name
```

### Check Filter State

```javascript
// In browser console
const api = window.gridApi; // Get grid API reference
const filterModel = api.getFilterModel();
console.log('Active filters:', filterModel);

// Check specific column
const filter = await api.getColumnFilterInstance('column_name');
console.log('Filter model:', filter.getModel());
console.log('Is active:', filter.isFilterActive());
```

### Common Issues

**Problem**: Filter icon turns blue but table doesn't filter

- **Cause**: Wrong model format
- **Solution**: Check filter type, verify model format

**Problem**: `filterModel.getModel()` returns `null`

- **Cause**: Model was rejected by filter
- **Solution**: Format doesn't match filter type

**Problem**: Filter works once but breaks on reload

- **Cause**: Filter state not persisting
- **Solution**: Check `onFilterChanged` is calling `saveConfig`

---

## Summary

1. **Always detect filter type** before setting model
2. **Use TextFilter format** for Community edition
3. **Properly await** all async operations
4. **Call applyModel()** when available
5. **Verify filter was set** after setting
6. **Test thoroughly** before committing

**Do not modify filter implementation without understanding these requirements.**

---

## Contact

If you need to modify filter functionality:

1. Read this document thoroughly
2. Review existing tests
3. Run all tests before committing
4. Add new tests for new functionality
5. Update this documentation

Last Updated: November 2024
Last Bug Fix: Filter format mismatch (TextFilter vs SetFilter)
