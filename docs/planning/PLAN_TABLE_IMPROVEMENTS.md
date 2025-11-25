# Table Improvements Implementation Plan

## Summary

The following improvements need to be applied to all AG Grid tables in the application:

1. **Remove column pinning** (unpin all columns)
2. **Enable RTL layout** (`enableRtl={true}`, `direction: 'rtl'`)
3. **Add column management UI** (Settings button with column visibility toggles)
4. **Add Custom Headers** (with filter and context menu support)
5. **Add table configuration persistence** (using `useTableConfig` hook)

## Files to Modify

### 1. QuotationDataGrid.tsx ✅ (Partially Complete)

**Status**: Column unpinned ✅, RTL enabled ✅, Custom headers added ✅

**Remaining**:

- Add visibleColumnDefs filtering based on config
- Add column management UI
- Add helper functions for config (toggleColumn, allColumns)
- Wire up onGridReady, onColumnResized, onColumnMoved, onFilterChanged

### 2. EnhancedComponentGrid.tsx ✅ (Already has everything)

**Status**: Complete - this is the reference implementation

### 3. QuotationEditor.tsx (BOM grid inside quotation editor)

**Changes Needed**:

- Remove `pinned: 'right'` from all column definitions
- Add `enableRtl={true}` to AgGridReact
- Add `direction: 'rtl'` to grid container div
- Keep existing column management (already present)

### 4. BOMEditor.tsx

**Changes Needed**:

- Add RTL configuration
- Check if column pinning exists and remove
- Verify table config hook is being used

### 5. ComponentGrid.tsx

**Changes Needed**:

- Remove column pinning if present
- Add RTL configuration
- Add column management if not present

### 6. BOMGrid.tsx

**Changes Needed**:

- Remove column pinning if present
- Add RTL configuration

## Quick Fix Code Snippets

### For Any AG Grid Component:

#### 1. Remove Pinning

```typescript
// BEFORE
{
  field: 'name',
  pinned: 'right',  // ❌ REMOVE THIS
  width: 200
}

// AFTER
{
  field: 'name',
  width: 200
}
```

#### 2. Enable RTL

```typescript
// In grid container
<div className="ag-theme-alpine" style={{ height: '600px', width: '100%', direction: 'rtl' }}>
  <AgGridReact
    ref={gridRef}
    enableRtl={true}  // ✅ ADD THIS
    // ... other props
  />
</div>
```

#### 3. Add Column Management (if not present)

```typescript
// After imports
import { Settings, ChevronDown } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTableConfig } from '../../hooks/useTableConfig';

// In component
const [showColumnManager, setShowColumnManager] = useState(false);

const { config, saveConfig } = useTableConfig('table_name', {
  columnOrder: ['field1', 'field2', 'actions'],
  columnWidths: {},
  visibleColumns: ['field1', 'field2', 'actions'],
  filterState: {},
});

const columnManagerRef = useClickOutside<HTMLDivElement>(() => {
  setShowColumnManager(false);
});

const toggleColumn = useCallback(
  (field: string) => {
    const newVisibleColumns = config.visibleColumns.includes(field)
      ? config.visibleColumns.filter(col => col !== field)
      : [...config.visibleColumns, field];

    saveConfig({ visibleColumns: newVisibleColumns });
  },
  [config.visibleColumns, saveConfig]
);

const allColumns = useMemo(() => {
  return columnDefs.map(col => ({
    field: col.field!,
    headerName: col.headerName!,
    isVisible: config.visibleColumns.includes(col.field!),
  }));
}, [columnDefs, config.visibleColumns]);

// Filter columns by visibility
const visibleColumnDefs = useMemo(() => {
  const visible = columnDefs.filter(col =>
    config.visibleColumns.includes(col.field!)
  );
  const ordered = config.columnOrder
    .filter(fieldId => visible.some(col => col.field === fieldId))
    .map(fieldId => visible.find(col => col.field === fieldId)!);
  return ordered;
}, [columnDefs, config.visibleColumns, config.columnOrder]);
```

#### 4. Column Manager UI

```tsx
<div className="flex items-center justify-between mb-4">
  <div className="relative">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowColumnManager(!showColumnManager)}
      className="flex items-center gap-2"
    >
      <Settings className="h-4 w-4" />
      ניהול עמודות
      <ChevronDown
        className={`h-4 w-4 transition-transform ${showColumnManager ? 'rotate-180' : ''}`}
      />
    </Button>

    {showColumnManager && (
      <div
        ref={columnManagerRef}
        className="absolute top-full mt-2 right-0 bg-background border border-border rounded-md shadow-lg z-50 p-4 min-w-64"
      >
        <h4 className="font-medium mb-3">בחר עמודות להצגה</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allColumns.map(col => (
            <label
              key={col.field}
              className="flex items-center space-x-2 space-x-reverse cursor-pointer hover:bg-muted p-1 rounded"
            >
              <input
                type="checkbox"
                checked={col.isVisible}
                onChange={() => toggleColumn(col.field)}
                className="rounded"
              />
              <span className="text-sm">{col.headerName}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              saveConfig({ visibleColumns: allColumns.map(col => col.field) })
            }
          >
            הצג הכל
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveConfig({ visibleColumns: ['name', 'actions'] })}
          >
            מינימלי
          </Button>
        </div>
      </div>
    )}
  </div>
</div>
```

## Implementation Priority

1. **HIGH**: QuotationEditor.tsx - Complete the quotation table improvements
2. **HIGH**: QuotationEditor.tsx (BOM grid) - Remove pinning, add RTL
3. **MEDIUM**: BOMEditor.tsx - Add RTL
4. **MEDIUM**: ComponentGrid.tsx - Verify/add features
5. **LOW**: BOMGrid.tsx - Add RTL if used

## Testing Checklist

After implementing:

- [ ] All tables display right-to-left
- [ ] No columns are pinned
- [ ] Horizontal scroll works (scrolls left)
- [ ] Column manager button appears on all tables
- [ ] Can toggle column visibility
- [ ] Column settings persist across page reloads
- [ ] Custom headers show filter icons
- [ ] Inline editing still works
- [ ] All existing functionality preserved

## Status

- [x] QuotationDataGrid - columns unpinned
- [x] QuotationDataGrid - RTL enabled
- [x] QuotationDataGrid - Custom headers added
- [ ] QuotationDataGrid - Column manager UI added
- [ ] QuotationDataGrid - Config wiring complete
- [ ] QuotationEditor BOM grid - Updated
- [ ] All other grids - Updated

## Next Steps

Would you like me to:

1. Complete QuotationDataGrid with column manager UI?
2. Move to QuotationEditor BOM grid next?
3. Create a script to batch-update all grids at once?
