# Filter Test Requirements

## Purpose

This document defines the minimum test requirements for any changes to the filter system. These requirements exist because a critical bug (November 2024) broke text filtering completely due to filter format mismatch.

---

## Required Tests

### Before ANY commit that touches filter code:

#### 1. Unit Tests Must Pass

```bash
npm test CustomHeader.filter.test.tsx
```

**Must show**: All tests passing (0 failures)

#### 2. Integration Tests Must Pass

```bash
npm test CustomHeader.integration.test.tsx
```

**Must show**: All tests passing (0 failures)

#### 3. Manual Testing Checklist

Test on **at least 2 different text columns** (e.g., customer_name, project_name):

- [ ] **Single Value Filter**
  - Select one value
  - Click "Apply Filter"
  - ✅ Table shows only rows with that value
  - ✅ Filter icon turns blue
  - ✅ Console shows no errors

- [ ] **Multiple Value Filter**
  - Select 2-3 values
  - Click "Apply Filter"
  - ✅ Table shows rows with any of those values (OR logic)
  - ✅ Filter icon turns blue
  - ✅ Console shows no errors

- [ ] **Filter Persistence**
  - Apply a filter
  - Reload the page (F5)
  - ✅ Filter is still active
  - ✅ Table is still filtered
  - ✅ Filter icon is still blue

- [ ] **Clear Filter**
  - With active filter, click filter icon
  - Click "נקה" (Clear)
  - ✅ All rows return
  - ✅ Filter icon turns gray
  - ✅ Table shows all data

- [ ] **Console Verification**
  - No red errors
  - Logs show: `[CustomHeader] Filter applied successfully for column_name`
  - Logs show: `isActive: true` in verification

---

## Files That Require Testing

Any changes to these files MUST be tested:

### Critical Files (Always Test)

- `src/components/grid/CustomHeader.tsx`
- `src/components/grid/SmartFilter.tsx`
- `src/hooks/useTableConfig.ts`

### Important Files (Test If Modified)

- `src/components/quotations/QuotationDataGrid.tsx`
- `src/components/library/EnhancedComponentGrid.tsx`
- `src/components/shared/BOMGrid.tsx`

### Configuration Files (Test If Modified)

- Column definitions with `filter` property
- Any file importing `CustomHeader`

---

## Test Data Requirements

### Minimum Test Data

For manual testing, ensure database has:

- **At least 10 quotations** with diverse customer names
- **At least 5 unique customer names** to test filtering
- **At least 5 unique project names** to test filtering
- **At least 20 components** with diverse manufacturers

### Test Scenarios

1. **Empty Filter** - No values selected, should show all rows
2. **Single Value** - One value, should filter to exact matches
3. **Multiple Values** - 2-3 values, should show rows matching ANY value
4. **All Values** - Select all, should show all rows (same as no filter)
5. **Non-existent Value** - Value not in data, should show no rows

---

## Expected Console Output

When filter is applied, console MUST show:

```
Filter clicked: column_name
[CustomHeader] Filter instance type: TextFilter
[CustomHeader] Using TextFilter (Community) format for column_name
[CustomHeader] Setting filter for column_name: {filterType: "text", ...}
[CustomHeader] Filter model set, triggering onFilterChanged for column_name
[CustomHeader] Calling applyModel() for column_name
[CustomHeader] Filter verification for column_name: {modelSet: {...}, isActive: true, fullFilterModel: {...}}
[CustomHeader] Filter applied successfully for column_name
[useTableConfig] Saving config for table_name: {...}
[useTableConfig] Successfully saved config for table_name
```

**Red flags (must fix before commit)**:
- ❌ `modelSet: null` (filter not set)
- ❌ `isActive: false` (filter not active)
- ❌ Any red errors in console
- ❌ Warning about unexpected filter type

---

## Rollback Criteria

If ANY of these occur after deploying filter changes, **immediately rollback**:

1. Text filters don't work at all
2. Filter icon stays gray after applying
3. Table doesn't filter data
4. Console shows filter errors
5. Filter doesn't persist after reload
6. User reports filters are broken

---

## Adding New Filter Features

When adding new filter functionality:

### 1. Write Tests First (TDD)

```typescript
// Example: Adding "contains" filter type
describe('Contains Filter', () => {
  it('should filter rows containing search term', () => {
    // Test implementation
  })
})
```

### 2. Update Documentation

- Add to `FILTER_IMPLEMENTATION.md`
- Update this file with new test requirements
- Add JSDoc comments to code

### 3. Test All Existing Functionality

- Run full test suite
- Manual test existing filters still work
- Verify backward compatibility

### 4. Update Tests

- Add new test cases
- Update integration tests
- Ensure 100% coverage of new code

---

## CI/CD Integration (Future)

### Recommended GitHub Actions Workflow

```yaml
name: Filter Tests
on: [push, pull_request]

jobs:
  test-filters:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test CustomHeader.filter.test.tsx
      - run: npm test CustomHeader.integration.test.tsx
      - name: Block if tests fail
        if: failure()
        run: exit 1
```

---

## Known Issues to Watch For

### Issue 1: Filter Format Mismatch

**Symptom**: `modelSet: null` in verification
**Cause**: Wrong model format for filter type
**Fix**: Check filter type detection logic

### Issue 2: Async Race Condition

**Symptom**: Filter works sometimes, fails randomly
**Cause**: Not awaiting async operations
**Fix**: Ensure proper await chain

### Issue 3: Missing applyModel()

**Symptom**: Model is set but filter not active
**Cause**: Some filters require applyModel() call
**Fix**: Always call applyModel() if available

### Issue 4: State Not Persisting

**Symptom**: Filter works but clears on reload
**Cause**: onFilterChanged not saving state
**Fix**: Verify saveConfig is called

---

## Emergency Debug Commands

If filters break in production:

```javascript
// In browser console

// 1. Check AG Grid version
console.log(window.agGrid.VERSION)

// 2. Check filter instance type
const api = window.gridApi
const filter = await api.getColumnFilterInstance('column_name')
console.log('Filter type:', filter.constructor.name)

// 3. Check current filter model
console.log('Filter model:', filter.getModel())
console.log('Is active:', filter.isFilterActive())

// 4. Check grid filter state
console.log('All filters:', api.getFilterModel())

// 5. Check saved config
const { data } = await supabase
  .from('user_table_configs')
  .select('*')
  .eq('table_name', 'quotation_data_grid')
console.log('Saved config:', data)
```

---

## Version History

- **v1.0** (Nov 2024) - Initial version after filter bug fix
- Bug: Filter format mismatch (TextFilter vs SetFilter)
- Fix: Dynamic filter type detection and format selection
- Tests: 30+ unit and integration tests added

---

## Summary

**DO NOT SKIP TESTING FILTERS**

The November 2024 bug showed that:
1. Manual testing alone isn't enough
2. Unit tests are critical
3. Integration tests catch edge cases
4. Documentation prevents repeat mistakes

**Minimum requirement**: Run all tests + manual checklist before committing any filter code changes.
