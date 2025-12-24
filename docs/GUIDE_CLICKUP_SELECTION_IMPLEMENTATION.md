# ClickUp-Style Selection Implementation Guide

## Overview

This guide documents the complete implementation of ClickUp-style row selection for AG Grid tables with:

- ✅ Checkboxes that appear on hover (hidden by default)
- ✅ Selected rows show filled checkboxes (always visible)
- ✅ Multi-select with Ctrl/Shift support
- ✅ Floating action toolbar at bottom-center
- ✅ Row background highlighting when selected

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Required Files](#required-files)
3. [Implementation Steps](#implementation-steps)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

### Component Structure

```
Grid Component (e.g., EnhancedComponentGrid)
├── useGridSelection hook (manages selection state)
├── SelectionCheckboxRenderer (renders checkboxes in selection column)
├── FloatingActionToolbar (bottom-center action bar)
└── CSS for hover effects and styling
```

### Data Flow

```
User hovers row → CSS shows checkbox (opacity: 0 → 1)
User clicks checkbox → toggleSelection() → updates selectedIds state
selectedIds changes → FloatingActionToolbar shows/hides
User clicks action → handleAction() → executes action → clears selection
```

---

## Required Files

### 1. Hook: `useGridSelection.ts`

**Location**: `src/hooks/useGridSelection.ts`

**Purpose**: Manages selection state, multi-select logic, and action execution

**Key Features**:

- Tracks selected row IDs and data
- Handles Ctrl+Click (add/remove)
- Handles Shift+Click (range selection)
- Syncs with AG Grid API
- Clears selection on unmount

**Already exists** - no changes needed

---

### 2. Component: `SelectionCheckboxRenderer.tsx`

**Location**: `src/components/grid/SelectionCheckboxRenderer.tsx`

**Purpose**: Renders checkboxes in the selection column

**Key Implementation**:

```typescript
export const SelectionCheckboxRenderer = (
  props: SelectionCheckboxRendererProps
) => {
  const { data, onSelectionToggle, isSelected } = props;

  if (!data) return null;

  const handleClick = (event: React.MouseEvent) => {
    // CRITICAL: Stop propagation to prevent cell click
    event.stopPropagation();

    if (onSelectionToggle && data.id) {
      onSelectionToggle(data.id, data, event);
    }
  };

  const checked = isSelected ? isSelected(data.id) : false;

  return (
    <div
      className={`flex items-center justify-center h-full selection-checkbox-cell ${checked ? 'checkbox-selected' : ''}`}
      onClick={handleClick}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => {}} // Handled by onClick above
        className="cursor-pointer checkbox-hover-target focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 !border !border-zinc-900"
        style={{
          opacity: checked ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      />
    </div>
  );
};
```

**Critical Details**:

- `event.stopPropagation()` prevents row click from opening edit form
- `!border !border-zinc-900` uses Tailwind `!important` to force border visibility
- `opacity: checked ? 1 : 0` hides unchecked boxes (CSS overrides on hover)
- `className="checkbox-hover-target"` targets CSS hover rules

---

### 3. Component: `FloatingActionToolbar.tsx`

**Location**: `src/components/grid/FloatingActionToolbar.tsx`

**Purpose**: Bottom-center floating action bar

**Key Implementation**:

```typescript
export const FloatingActionToolbar = ({ ... }) => {
  if (selectionCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {selectionCount}
          </span>
          <span>נבחרו</span>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {actions.map(action => (
            <Button key={action.type} onClick={() => handleAction(action)}>
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>

        {/* Clear selection button */}
        <button onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
```

---

## Implementation Steps

### Step 1: Add Selection Hook

In your grid component (e.g., `EnhancedComponentGrid.tsx`):

```typescript
import { useGridSelection } from '../../hooks/useGridSelection';
import { SelectionCheckboxRenderer } from '../grid/SelectionCheckboxRenderer';
import { FloatingActionToolbar } from '../grid/FloatingActionToolbar';
import { GridAction } from '../../types/grid.types';

export function YourGrid({ data, onEdit, onDelete, onDuplicate, onView }) {
  const gridRef = useRef<AgGridReact>(null);

  // Initialize selection hook
  const selection = useGridSelection({
    gridApi: gridRef.current?.api,
    getRowId: (item) => item.id,
  });

  // Define grid actions
  const gridActions: GridAction[] = [
    {
      type: 'view',
      label: 'צפייה',
      icon: <Eye className="h-4 w-4" />,
      handler: async (ids, items) => {
        if (items[0]) onView?.(items[0]);
      },
      singleOnly: true,
    },
    {
      type: 'edit',
      label: 'עריכה',
      icon: <Edit className="h-4 w-4" />,
      handler: async (ids, items) => {
        if (items[0]) onEdit(items[0]);
      },
      singleOnly: true,
    },
    {
      type: 'delete',
      label: 'מחיקה',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      handler: async (ids, items) => {
        // Show confirmation dialog
        // Then delete items
      },
    },
    {
      type: 'duplicate',
      label: 'שכפול',
      icon: <Copy className="h-4 w-4" />,
      handler: async (ids, items) => {
        items.forEach(item => onDuplicate?.(item));
      },
    },
  ];

  // ...rest of component
}
```

---

### Step 2: Add Selection Column to Column Definitions

**CRITICAL**: Add selection column to the **END** of columnDefs array (in RTL this appears on the LEFT)

```typescript
const columnDefs = useMemo(() => {
  return [
    // ... all your existing columns ...

    // Selection column - MUST BE LAST
    {
      headerName: '',
      field: 'selection',
      sortable: false,
      filter: false,
      resizable: false,
      width: 48, // Enough space to not obstruct next column
      maxWidth: 48,
      minWidth: 48,
      pinned: 'right' as const, // RIGHT in RTL = visually LEFT
      lockPosition: true,
      lockVisible: true,
      suppressMenu: true,
      suppressMovable: true,
      suppressNavigable: true,
      cellRenderer: SelectionCheckboxRenderer,
      cellRendererParams: {
        onSelectionToggle: selection.toggleSelection,
        isSelected: selection.isSelected,
      },
    },
  ];
}, [selection.toggleSelection, selection.isSelected /* other deps */]);
```

**Key Configuration**:

- `width: 48` - Wide enough to prevent obstructing adjacent column (36px was too narrow)
- `pinned: 'right'` - In RTL mode, this shows on the LEFT (outside scrollable area)
- `lockPosition: true` - Prevents user from moving column
- `suppressNavigable: true` - Prevents keyboard navigation to checkbox cell

---

### Step 3: Add CSS for Hover Effects

Add this CSS inside your grid component (in a `<style>` tag or styled component):

```css
/* Add grid class for scoping */
.cpq-selection-grid {
  /* Grid-specific styles */
}

/* Selection column cell - transparent background */
.cpq-selection-grid .ag-cell[col-id='selection'] {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

/* CRITICAL: Show checkbox on row hover - overrides inline opacity */
.cpq-selection-grid .ag-row:hover .checkbox-hover-target,
.cpq-selection-grid .ag-row-hover .checkbox-hover-target {
  opacity: 1 !important;
}

/* Row highlighting when selected - light blue background */
.cpq-selection-grid .ag-row.row-selected {
  background-color: #eff6ff !important;
}

/* Remove focus ring from checkbox (but KEEP border for visibility) */
.cpq-selection-grid .ag-cell[col-id='selection'] button {
  outline: none !important;
  box-shadow: none !important;
  /* DO NOT add border: none here - it breaks checkbox visibility! */
}

.cpq-selection-grid .ag-cell[col-id='selection'] button:focus {
  outline: none !important;
  box-shadow: none !important;
  ring: 0 !important;
}

/* Remove AG Grid's blue cell focus border */
.cpq-selection-grid .ag-cell[col-id='selection']:focus,
.cpq-selection-grid .ag-cell[col-id='selection'].ag-cell-focus,
.cpq-selection-grid .ag-cell[col-id='selection']:focus-within {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}
```

**Why Two Selectors for Hover?**

- `.ag-row:hover` - Standard CSS :hover pseudo-class
- `.ag-row-hover` - AG Grid adds this CLASS when hovering (more reliable)

---

### Step 4: Configure AG Grid Props

```typescript
<AgGridReact
  ref={gridRef}
  rowData={data}
  columnDefs={columnDefs}
  enableRtl={true}
  suppressRowClickSelection={true}  // CRITICAL: Prevent row click selecting
  rowSelection="multiple"
  suppressCellSelection={true}
  rowClassRules={{
    'row-selected': (params) => selection.isSelected(params.data?.id),
  }}
  onGridReady={onGridReady}
  onCellClicked={onCellClicked}
  // ... other props
/>
```

**Critical Props**:

- `suppressRowClickSelection={true}` - Prevents row click from selecting
- `rowSelection="multiple"` - Enables multi-select
- `rowClassRules` - Adds `row-selected` class for styling

---

### Step 5: Handle Cell Clicks

Prevent selection column clicks from opening edit form:

```typescript
const onCellClicked = useCallback(
  (params: any) => {
    // Don't open form if clicking selection checkbox column
    if (params.colDef.field === 'selection') return;

    if (params.data && onEdit) {
      onEdit(params.data);
    }
  },
  [onEdit]
);
```

---

### Step 6: Add Floating Action Toolbar

```typescript
return (
  <div className="relative">
    {/* Grid */}
    <div className="ag-theme-alpine cpq-selection-grid">
      <AgGridReact {...props} />
    </div>

    {/* Floating Action Toolbar */}
    <FloatingActionToolbar
      selectionCount={selection.selectionCount}
      actions={gridActions}
      onAction={selection.handleAction}
      onClearSelection={selection.clearSelection}
    />
  </div>
);
```

---

## Common Issues & Solutions

### Issue 1: Checkbox Not Visible on Hover

**Symptom**: Hovering over row doesn't show checkbox

**Root Causes**:

1. CSS rule has `border: none !important` on checkbox button
2. Missing `.ag-row-hover` selector (AG Grid uses CLASS not :hover)
3. Inline `opacity: 0` not being overridden

**Solution**:

```css
/* ❌ WRONG - removes border */
.cpq-selection-grid .ag-cell[col-id='selection'] button {
  border: none !important;
}

/* ✅ CORRECT - keeps border */
.cpq-selection-grid .ag-cell[col-id='selection'] button {
  outline: none !important;
  box-shadow: none !important;
  /* NO border: none here! */
}

/* ✅ Must include BOTH hover selectors */
.cpq-selection-grid .ag-row:hover .checkbox-hover-target,
.cpq-selection-grid .ag-row-hover .checkbox-hover-target {
  opacity: 1 !important;
}
```

**In Checkbox Renderer**:

```typescript
// ✅ Use Tailwind !important to force border
className = '!border !border-zinc-900';
```

---

### Issue 2: Checkbox Obstructs Component Name

**Symptom**: Checkbox overlaps with first data column text

**Root Cause**: Selection column width too narrow (36px)

**Solution**: Increase width to 48px

```typescript
{
  field: 'selection',
  width: 48,    // ✅ Was 36px - increased to prevent overlap
  maxWidth: 48,
  minWidth: 48,
}
```

---

### Issue 3: Row Click Opens Edit Form Even When Clicking Checkbox

**Symptom**: Clicking checkbox also triggers row click handler

**Root Cause**: Missing `event.stopPropagation()` in checkbox click handler

**Solution**:

```typescript
const handleClick = (event: React.MouseEvent) => {
  // ✅ CRITICAL: Stop propagation
  event.stopPropagation();

  if (onSelectionToggle && data.id) {
    onSelectionToggle(data.id, data, event);
  }
};
```

---

### Issue 4: Checkbox Border Not Showing

**Symptom**: Checkbox has no visible border even though opacity is 1

**Root Causes**:

1. CSS overrides with `border: none !important`
2. Tailwind border classes not applied with sufficient specificity
3. Inline styles overriding class-based styles

**Solution**:

```typescript
// ✅ Use Tailwind !important utilities
className="!border !border-zinc-900"

// ❌ Don't use inline border styles - they get overridden
// style={{ border: '1px solid #18181b' }}  // WRONG!

// ✅ Use inline styles only for opacity/transition
style={{
  opacity: checked ? 1 : 0,
  transition: 'opacity 0.15s ease',
}}
```

**Remove conflicting CSS**:

```css
/* ❌ REMOVE THIS - it breaks checkbox border */
.cpq-selection-grid .ag-cell[col-id='selection'] button {
  border: none !important; /* DELETE THIS LINE */
}
```

---

### Issue 5: Selection Not Cleared on Navigation

**Symptom**: Selected rows persist when navigating away and back

**Root Cause**: Selection state not cleared on unmount

**Solution**: `useGridSelection` hook already handles this:

```typescript
useEffect(() => {
  return () => {
    setSelectedIds([]);
    setSelectedData([]);
  };
}, []);
```

---

### Issue 6: Multi-Select Not Working

**Symptom**: Ctrl+Click or Shift+Click doesn't work

**Root Causes**:

1. `rowSelection` not set to "multiple"
2. Selection logic not checking for Ctrl/Shift keys
3. AG Grid's built-in selection interfering

**Solution**:

```typescript
// ✅ AG Grid config
<AgGridReact
  rowSelection="multiple"
  suppressRowClickSelection={true}  // Disable AG Grid's selection
/>

// ✅ Selection handler checks modifier keys
const toggleSelection = useCallback((id, data, event) => {
  if (event?.ctrlKey || event?.metaKey) {
    // Add/remove from selection
  } else if (event?.shiftKey) {
    // Range selection
  } else {
    // Regular click - toggle single item
  }
}, []);
```

---

## Testing Checklist

Before marking implementation complete, verify:

### Visual Tests

- [ ] Checkbox is invisible when row is not hovered and not selected
- [ ] Checkbox appears when hovering over unselected row
- [ ] Checkbox has visible border (not transparent)
- [ ] Checkbox is always visible when row is selected (filled checkbox)
- [ ] Selection column doesn't obstruct adjacent column text
- [ ] Selected rows have light blue background (#eff6ff)
- [ ] Floating toolbar appears at bottom-center when items selected
- [ ] Floating toolbar shows correct selection count

### Interaction Tests

- [ ] Clicking checkbox selects/deselects row
- [ ] Clicking checkbox does NOT open edit form
- [ ] Clicking row (not checkbox) DOES open edit form
- [ ] Ctrl+Click adds/removes items from selection
- [ ] Shift+Click selects range of rows
- [ ] Regular click toggles individual row (ClickUp behavior)
- [ ] Selecting multiple rows shows all action buttons
- [ ] Single-only actions are enabled only when 1 row selected
- [ ] Actions execute correctly on selected items
- [ ] Selection clears after delete action
- [ ] Clear button (X) clears all selections

### Edge Cases

- [ ] Selection persists when scrolling grid
- [ ] Selection works correctly with filtered data
- [ ] Selection works correctly with sorted data
- [ ] Selection clears when navigating away from page
- [ ] RTL mode works correctly (checkbox on visual left)
- [ ] Pinned columns work correctly with selection column

---

## Code Checklist

Copy this checklist when implementing on a new grid:

```markdown
### Implementation Checklist for [Grid Name]

- [ ] Import `useGridSelection` hook
- [ ] Import `SelectionCheckboxRenderer` component
- [ ] Import `FloatingActionToolbar` component
- [ ] Initialize `useGridSelection({ gridApi, getRowId })`
- [ ] Define `gridActions` array
- [ ] Add selection column to columnDefs (at END, width: 48)
- [ ] Add `cpq-selection-grid` class to grid container
- [ ] Add CSS for hover effects (with BOTH :hover and .ag-row-hover)
- [ ] Remove `border: none` from checkbox CSS if present
- [ ] Add `suppressRowClickSelection={true}` to AG Grid
- [ ] Add `rowSelection="multiple"` to AG Grid
- [ ] Add `rowClassRules` for selected row styling
- [ ] Add `onCellClicked` handler with selection column guard
- [ ] Add `<FloatingActionToolbar />` component
- [ ] Test checkbox visibility on hover
- [ ] Test checkbox doesn't obstruct adjacent column
- [ ] Test Ctrl+Click multi-select
- [ ] Test Shift+Click range selection
- [ ] Test action execution
- [ ] Test selection clear
```

---

## Migration Notes

### Converting Existing Action Column to Selection

If you have an existing action column (View/Edit/Delete buttons), follow these steps:

1. **Keep your action column** OR **remove it** - your choice:
   - Option A: Keep both (action buttons + selection toolbar)
   - Option B: Remove action column, use selection toolbar only

2. **Update column definitions**:

```typescript
// OLD: Action column
{
  field: 'actions',
  cellRenderer: ActionsCellRenderer,
  width: 120,
}

// NEW: Replace with selection column (or add alongside)
{
  field: 'selection',
  cellRenderer: SelectionCheckboxRenderer,
  width: 48,
  // ... (see Step 2 above)
}
```

3. **Migrate action handlers**:

```typescript
// OLD: onEdit={handleEdit}
// NEW: gridActions with 'edit' type
const gridActions: GridAction[] = [
  {
    type: 'edit',
    handler: async (ids, items) => handleEdit(items[0]),
    singleOnly: true,
  },
];
```

---

## Performance Considerations

### Large Datasets (1000+ rows)

The selection system is optimized for large datasets:

1. **Selection state** uses Set internally for O(1) lookups
2. **Row rendering** only re-renders changed rows
3. **Checkbox visibility** uses CSS (no JS per-row)
4. **AG Grid virtualization** renders only visible rows

### Memory Usage

Selection state stores:

- Array of IDs (strings): ~50 bytes per ID
- Array of row data objects: Varies by object size

Example: 100 selected rows × 2KB per object = ~200KB

---

## Accessibility Notes

Current implementation provides:

- ✅ Keyboard navigation (Tab to checkbox, Space to toggle)
- ✅ Focus indicators (outline on focus)
- ⚠️ Screen reader support (partial - improve with aria-labels)

**Recommended improvements**:

```typescript
<Checkbox
  aria-label={`Select ${componentName}`}
  aria-checked={checked}
  role="checkbox"
/>
```

---

## Related Documentation

- [AG Grid RTL Support](https://www.ag-grid.com/react-data-grid/rtl/)
- [useGridSelection Hook API](../src/hooks/useGridSelection.ts)
- [SelectionCheckboxRenderer Component](../src/components/grid/SelectionCheckboxRenderer.tsx)
- [FloatingActionToolbar Component](../src/components/grid/FloatingActionToolbar.tsx)

---

## Version History

- **v1.0.0** (2024-12-24): Initial implementation on Component Library grid
  - ClickUp-style hover checkboxes
  - Multi-select with Ctrl/Shift
  - Floating action toolbar
  - Fixed checkbox border visibility issue
  - Fixed checkbox obstruction issue (36px → 48px width)

---

## Support

If you encounter issues:

1. Check [Common Issues & Solutions](#common-issues--solutions)
2. Verify all items in [Testing Checklist](#testing-checklist)
3. Review [Code Checklist](#code-checklist)
4. Inspect CSS with browser DevTools for conflicting rules
