# Bug Report: Quotation Editor Column Width Issue

## Issue Summary

The quotation editor's item grid has persistent column width problems where columns are either too narrow or improperly sized, making the grid difficult to use and read.

## Affected Component

**File**: `src/components/quotations/QuotationItemsGrid.tsx`

**Related Files**:

- `src/components/quotations/quotationItemGridColumns.tsx` (column definitions)
- `src/components/quotations/QuotationEditor.tsx` (parent component)

## Problem Description

### Observed Behavior

The quotation items grid displays with column width issues:

1. **Description column is too narrow** - Often cuts off component names and descriptions
2. **Columns don't respect configured widths** - Even when `width` is specified in column definitions
3. **Width inconsistency** - Column widths may vary between sessions or after certain interactions
4. **No user control** - Users cannot easily resize columns to their preference
5. **Grid doesn't utilize available space** - Leaves whitespace while important columns are cramped

### User Impact

- **Low readability** - Users cannot see full component names without hovering or clicking
- **Poor UX** - Constant need to scroll horizontally or expand cells
- **Inefficient workflow** - Time wasted trying to read truncated information
- **Professional appearance** - Grid looks unprofessional with cut-off text

## Technical Context

### Current Implementation

The grid uses AG Grid React with custom column definitions:

```typescript
// From quotationItemGridColumns.tsx
const columnDefs = [
  {
    headerName: 'Description',
    field: 'componentName',
    width: 200, // This width is not being respected
    cellRenderer: DescriptionCellRenderer,
  },
  {
    headerName: 'Quantity',
    field: 'quantity',
    width: 100,
    // ...
  },
  // ... more columns
];
```

### Grid Configuration

```typescript
// From QuotationItemsGrid.tsx
<AgGridReact
  columnDefs={columnDefs}
  rowData={items}
  domLayout="autoHeight"
  suppressHorizontalScroll={false}
  // ... other props
/>
```

## What Has Been Tried

### Attempt 1: Set Explicit Column Widths

**Action**: Added explicit `width` property to column definitions

**Result**: ❌ **Failed** - Widths are still not respected, columns appear too narrow

**Code**:

```typescript
{
  headerName: 'Description',
  field: 'componentName',
  width: 300,  // Increased from 200
}
```

### Attempt 2: Use minWidth Instead of width

**Action**: Changed `width` to `minWidth` to ensure minimum column size

**Result**: ❌ **Partially Failed** - Some improvement but still not ideal, doesn't solve the core issue

**Code**:

```typescript
{
  headerName: 'Description',
  field: 'componentName',
  minWidth: 250,
}
```

### Attempt 3: Enable Column Resizing

**Action**: Added `resizable: true` to column definitions to allow manual resizing

**Result**: ⚠️ **Workaround Only** - Users can resize but must do it every time, settings not persisted

**Code**:

```typescript
const defaultColDef = {
  resizable: true,
  sortable: true,
};
```

### Attempt 4: Adjust Grid Container Width

**Action**: Modified parent container CSS to ensure full width availability

**Result**: ❌ **No Effect** - Container width is fine, issue is with column distribution

**Code**:

```css
.quotation-items-grid {
  width: 100%;
  height: auto;
}
```

### Attempt 5: Use autoSizeColumns API

**Action**: Attempted to call `gridApi.autoSizeColumns()` after grid initialization

**Result**: ❌ **Failed** - API call didn't resolve the width issues

**Code**:

```typescript
const onGridReady = (params: GridReadyEvent) => {
  params.api.autoSizeColumns(['componentName', 'description']);
};
```

### Attempt 6: Change domLayout Setting

**Action**: Tested different `domLayout` values ('normal', 'autoHeight', 'print')

**Result**: ❌ **No Improvement** - Changed grid height behavior but not column widths

### Attempt 7: Remove Custom Cell Renderers

**Action**: Temporarily removed custom cell renderers to test if they were causing the issue

**Result**: ❌ **Issue Persists** - Column widths still incorrect even with default rendering

## Current State

- Column width issue remains unresolved
- Description column is frequently too narrow to read
- No persistent column width preferences
- Users must manually resize columns each session (if resizable is enabled)

## Environment

- **AG Grid Version**: Check `package.json` for `ag-grid-react` version
- **React Version**: 18.x
- **Browser**: Tested on Chrome, Edge (likely affects all browsers)
- **Grid Mode**: Standard DOM layout with autoHeight

## Related Code Locations

1. **Column Definitions**: `src/components/quotations/quotationItemGridColumns.tsx`
2. **Grid Component**: `src/components/quotations/QuotationItemsGrid.tsx`
3. **Parent Component**: `src/components/quotations/QuotationEditor.tsx`
4. **Cell Renderers**: Various renderer components in `quotationItemGridColumns.tsx`

## Debug Information Needed

To diagnose this issue, we need to understand:

1. Why explicit `width` values are being ignored
2. How AG Grid calculates column widths in this configuration
3. Whether the issue is related to custom cell renderers
4. If there's a conflict with CSS styles or grid options
5. Whether `domLayout: 'autoHeight'` affects column width calculation

## Expected Behavior

The grid should:

1. Respect configured column widths
2. Automatically size columns appropriately for content
3. Use available horizontal space efficiently
4. Allow users to resize columns with settings persisted
5. Display full component names and descriptions without truncation

## Additional Notes

- This issue has been reported multiple times by users
- It affects the usability of the core quotation editing feature
- A proper fix (not just a workaround) is needed for production use
- Consider looking at AG Grid documentation for column sizing best practices
- May need to review the entire grid configuration and initialization flow

## Screenshots/Evidence

Check `.playwright-mcp/` directory for screenshots showing:

- `quotation-items-grid-before-drag.png` - Shows grid layout
- `quotation-items-grid-after-drag.png` - Shows grid after interaction

## Priority

**HIGH** - This affects a core feature and user experience significantly.

## Next Steps for Investigation

1. Review AG Grid documentation on column sizing
2. Check if there are conflicting CSS styles
3. Verify grid initialization and API calls
4. Test with minimal grid configuration to isolate the issue
5. Consider implementing column width persistence with local storage
6. Look for similar issues in AG Grid GitHub issues/Stack Overflow

---

**Created**: 2025-12-04
**Status**: UNRESOLVED
**Assigned**: Next debugging session
