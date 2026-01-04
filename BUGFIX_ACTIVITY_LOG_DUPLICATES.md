# Bugfix Report: Activity Log Duplicate Bulk Operations

**Date**: 2026-01-03
**Severity**: High
**Status**: ✅ Fixed

## Problem Description

When performing bulk operations (delete/import of multiple components), users saw **duplicate activity logs**:

- ✅ ONE bulk log (correct) - e.g., "נמחקו 26 רכיבים בקבוצה"
- ❌ PLUS individual logs for each item (incorrect) - e.g., 26 separate "נמחק רכיב: ..." entries

This created log spam and made the activity feed unusable for bulk operations.

## Root Cause Analysis

### Initial Approach (Failed)

**File**: `supabase/migrations/20260103100000_suppress_individual_bulk_logs.sql`

Used PostgreSQL session variables to track bulk operations:

```typescript
// Frontend set session variable
await supabase.rpc('set_config', {
  setting_name: 'app.in_bulk_operation',
  new_value: 'true',
  is_local: true,
});
```

```sql
-- Trigger checked session variable
v_in_bulk_operation := current_setting('app.in_bulk_operation', true)::boolean;
```

### Why It Failed: Supabase Connection Pooling

**Supabase uses connection pooling**, meaning:

- Request 1: Sets variable on Connection A
- Request 2: Uses Connection B (variable not set!)
- Request 3: Uses Connection C (variable not set!)
- Request 4: Uses Connection A (variable set, but too late)

Each database operation may use a **different connection** from the pool, so session variables set on one connection aren't visible to operations on other connections.

## Solution: Database Table Tracking

### Migration: `20260103120000_fix_bulk_operation_tracking.sql`

**Strategy**: Use a database table instead of session variables (connection-independent)

1. **Created `bulk_operations` table**:

   ```sql
   CREATE TABLE bulk_operations (
     operation_id TEXT PRIMARY KEY,
     team_id UUID NOT NULL,
     operation_type TEXT CHECK (operation_type IN ('import', 'delete', 'update')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Helper functions**:
   - `start_bulk_operation(p_operation_id, p_team_id, p_operation_type)` - Register start
   - `end_bulk_operation(p_operation_id)` - Clean up after completion

3. **Updated trigger**:

   ```sql
   -- Check if we're in a bulk operation by looking in bulk_operations table
   SELECT EXISTS (
     SELECT 1 FROM bulk_operations
     WHERE team_id = v_team_id
     LIMIT 1
   ) INTO v_in_bulk_operation;

   -- Skip individual logging if in bulk operation
   IF v_in_bulk_operation THEN
     RETURN COALESCE(NEW, OLD);
   END IF;
   ```

## Files Modified

### Database Migration

- ✅ `supabase/migrations/20260103120000_fix_bulk_operation_tracking.sql` - Created
  - Creates `bulk_operations` table
  - Updates `log_component_activity()` trigger
  - Adds helper functions
  - Auto-cleanup function (5-minute safety fallback)

### Frontend Changes

#### `src/components/library/EnhancedComponentGrid.tsx`

**Bulk Delete Logic** (lines 214-277):

```typescript
// Generate unique operation ID
const operationId = `bulk-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Start bulk operation tracking
await supabase.rpc('start_bulk_operation', {
  p_operation_id: operationId,
  p_team_id: currentTeam.id,
  p_operation_type: 'delete',
});

// Perform deletions...
for (const component of items) {
  await onDelete(component.id);
}

// End bulk operation tracking
await supabase.rpc('end_bulk_operation', {
  p_operation_id: operationId,
});

// Log ONE bulk activity
await logComponentBulkDelete(currentTeam.id, successCount, deletedNames);
```

#### `src/components/library/ComponentAIImport.tsx`

**Bulk Import Logic** (lines 182-277):

```typescript
// Generate unique operation ID
const operationId = `bulk-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Start bulk operation tracking
await supabase.rpc('start_bulk_operation', {
  p_operation_id: operationId,
  p_team_id: currentTeam.id,
  p_operation_type: 'import',
});

// Perform imports...
for (let i = 0; i < components.length; i++) {
  await addComponent(comp);
}

// End bulk operation tracking
await supabase.rpc('end_bulk_operation', {
  p_operation_id: operationId,
});

// Log ONE bulk activity
await logComponentBulkImport(currentTeam.id, successCount, fileName, fileType);
```

### Regression Tests

- ✅ `src/hooks/__tests__/useActivityLog.bulk-operations.test.ts` - Created
  - Tests bulk delete creates only ONE log
  - Tests bulk import creates only ONE log
  - Tests single operations still create individual logs
  - Tests connection pooling safety
  - Tests cleanup failure handling

## Validation

### TypeScript Compilation

```bash
npx tsc --noEmit
```

✅ **Passed** - No errors

### Migration Status

```bash
npx supabase migration list
```

✅ **Applied** - `20260103120000` visible in remote

### Expected Behavior

**Before Fix**:

- Delete 26 components → 27 logs (1 bulk + 26 individual)
- Import 6 components → 7 logs (1 bulk + 6 individual)

**After Fix**:

- Delete 26 components → 1 log ("נמחקו 26 רכיבים בקבוצה")
- Import 6 components → 1 log ("ייבוא קבוצתי של 6 רכיבים...")

## Testing Instructions

### Test 1: Bulk Delete

1. Go to Component Library
2. Select 26+ components using checkboxes
3. Click delete button and confirm
4. Check Activity Log
5. **Expected**: ONLY ONE log: "נמחקו 26 רכיבים בקבוצה"
6. **Should NOT see**: Individual "נמחק רכיב: ..." entries

### Test 2: Bulk Import

1. Go to Component Library
2. Click "Import Components with AI"
3. Upload Excel file with 6+ components
4. Confirm import
5. Check Activity Log
6. **Expected**: ONLY ONE log: "ייבוא קבוצתי של 6 רכיבים מ-[filename]"
7. **Should NOT see**: Individual "נוצר רכיב: ..." entries

### Test 3: Single Operations (Should Still Log)

1. Delete a single component
2. Check Activity Log
3. **Expected**: Individual log "נמחק רכיב: [name]"

## Technical Details

### Why Table-Based Approach Works

Unlike session variables, database tables are:

- **Connection-independent**: All connections see the same data
- **Immediately visible**: Changes committed in one connection are visible to all
- **Reliable with pooling**: Works regardless of which connection executes the trigger

### Safety Features

1. **Unique Operation IDs**: `bulk-delete-${Date.now()}-${Math.random()}`
   - Prevents ID collisions
   - Allows tracking specific operations

2. **Graceful Error Handling**:
   - Failed cleanup doesn't crash the operation
   - Warnings logged, operation continues

3. **Auto-Cleanup Function**:

   ```sql
   DELETE FROM bulk_operations
   WHERE created_at < NOW() - INTERVAL '5 minutes';
   ```

   - Prevents table bloat if frontend forgets to clean up
   - Can be scheduled as a cron job

4. **Team Isolation**:
   - Bulk operations filtered by `team_id`
   - One team's bulk operations don't affect another

## Performance Impact

- **Minimal**: Single EXISTS query per component trigger
- **Indexed**: `bulk_operations.team_id` indexed for fast lookups
- **Clean Table**: Auto-cleanup prevents table growth

## Future Improvements

1. **Scheduled Cleanup**: Add PostgreSQL cron job to run `cleanup_old_bulk_operations()` every hour
2. **Operation Metadata**: Track operation progress in `bulk_operations` table
3. **Bulk Update Support**: Extend to bulk rename/edit operations
4. **Metrics Dashboard**: Show bulk operation statistics

## Lessons Learned

1. **Connection Pooling Awareness**: Always consider connection pooling when using session-scoped features in Supabase/PostgreSQL
2. **Testing with Real Infrastructure**: Session variables work in local PostgreSQL but fail in production with pooling
3. **Database Tables > Session Variables**: For distributed systems, prefer database tables for state tracking
4. **Comprehensive Regression Tests**: Prevent recurrence by testing the exact scenario that failed

## References

- PostgreSQL Connection Pooling: https://www.postgresql.org/docs/current/runtime-config-connection.html
- Supabase Connection Pooling: https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- Database Triggers: https://www.postgresql.org/docs/current/sql-createtrigger.html

---

**Status**: ✅ Ready for Production Testing
**Rollback Plan**: Revert to previous migration, accept duplicate logs temporarily
**Next Steps**: User validation in production environment
