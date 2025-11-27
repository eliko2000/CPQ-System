# Manual Table Setup for user_table_configs

## Problem

The `user_table_configs` table doesn't exist in Supabase, causing table configuration persistence to fail silently.

## Solution

Execute the following SQL in your Supabase dashboard:

### Method 1: Supabase SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/uxkvfghfcwnynshmzeck/sql
2. Copy and paste the SQL below
3. Click "Run" to execute

### Method 2: Supabase Table Editor

1. Go to: https://supabase.com/dashboard/project/uxkvfghfcwnynshmzeck/table
2. Click "Create a new table"
3. Set table name to: `user_table_configs`
4. Add columns manually (see schema below)

## SQL to Execute

```sql
-- Table configuration persistence
CREATE TABLE IF NOT EXISTS user_table_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL, -- 'component_library' or 'quotation_editor'
    config JSONB NOT NULL, -- stores: columnOrder, columnWidths, visibleColumns, filterState
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

ALTER TABLE user_table_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for user_table_configs" ON user_table_configs FOR ALL USING (true) WITH CHECK (true);
```

## Verification

After running the SQL, you should see:

- Table `user_table_configs` created in your database
- RLS policies enabled
- No errors in the console

## Test the Fix

1. Restart your development server: `npm run dev`
2. Open browser to: http://localhost:3003
3. Navigate to Component Library
4. Check console for: `[useTableConfig] Loaded config for component_library: ...` or `[useTableConfig] No saved config for component_library, using defaults`
5. Make a change (resize column, hide/show column, apply filter)
6. Check console for: `[useTableConfig] Saving config for component_library: ...`
7. Refresh page - your changes should persist

## Expected Console Output

```
[useTableConfig] No saved config for component_library, using defaults
[useTableConfig] Saving config for component_library: {columnOrder: [...], visibleColumns: [...], ...}
[useTableConfig] Loaded config for component_library: {columnOrder: [...], visibleColumns: [...], ...}
```

## Troubleshooting

- If you see "relation 'user_table_configs' does not exist" - the SQL didn't run properly
- If you see permission errors - check RLS policies
- If configs don't persist - check Supabase connection in browser network tab
