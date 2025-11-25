# Table Configuration Setup Instructions

## Problem

You're seeing `404 (Not Found)` errors for `user_table_configs` because the table doesn't exist in your Supabase database yet.

## Solution

Run the SQL migration to create the table.

## Steps to Fix

### 1. Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/uxkvfghfcwnynshmzeck/sql
2. Click "New Query"

### 2. Run the Migration

Copy and paste this SQL:

```sql
-- Create user_table_configs table
CREATE TABLE IF NOT EXISTS user_table_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

-- Enable Row Level Security
ALTER TABLE user_table_configs ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Enable all operations for user_table_configs" ON user_table_configs;
CREATE POLICY "Enable all operations for user_table_configs"
    ON user_table_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_table_configs_lookup
    ON user_table_configs(user_id, table_name);
```

### 3. Click "Run" (or press Cmd/Ctrl + Enter)

### 4. Verify Success

You should see:

- "Success. No rows returned" message
- No error messages

### 5. Check the Table

Go to: https://supabase.com/dashboard/project/uxkvfghfcwnynshmzeck/editor

You should now see `user_table_configs` in your tables list.

## What Gets Saved

The table will store these configurations for each table:

- **columnOrder**: The order of columns (left to right)
- **columnWidths**: Width of each column in pixels
- **visibleColumns**: Which columns are shown/hidden
- **filterState**: Active filters and their values

## Testing

After creating the table:

1. **Refresh your browser** (important!)
2. Go to Quotations page
3. **Resize a column** → Check browser console for "Saving config"
4. **Move a column** → Drag a column header to reorder
5. **Hide a column** → Click "ניהול עמודות" button, uncheck a column
6. **Refresh the page** → Your changes should persist!

## Troubleshooting

### Still seeing 404 errors?

- Make sure the SQL ran successfully (no errors)
- Refresh your browser (Ctrl+F5 / Cmd+Shift+R)
- Check browser console for the actual error message

### Table exists but configs don't save?

- Check browser Network tab for the POST/PUT requests
- Verify RLS policy is active
- Check Supabase logs for errors

### Columns disappear after moving them?

- This is now fixed with the `isInitialMount` ref
- The grid won't save configs during the first 500ms after load
- Try moving a column again - it should work now

## What Changed

**Fixed Issues:**

1. ✅ Added `isInitialMount` ref to prevent saving during initial render
2. ✅ Config saves only happen when `isInitialMount.current === false`
3. ✅ Added 500ms delay before enabling config saves
4. ✅ All grid event handlers check `!isInitialMount.current` before saving

**How It Works:**

- When grid loads, `isInitialMount.current = true`
- Grid applies saved config (widths, order, filters)
- After 500ms, `isInitialMount.current = false`
- Now user interactions (resize, move, filter) will save to Supabase
- On page refresh, saved config loads automatically

## Files Modified

- `QuotationDataGrid.tsx` - Added column move data loss fix
- `scripts/create-user-table-configs.sql` - Migration script (NEW)
- `SETUP_TABLE_CONFIG.md` - This file (NEW)

## Next Steps

After the table is created and tested:

1. Apply same RTL + column management to other tables
2. Test all table configurations persist
3. Verify RTL layout works everywhere
