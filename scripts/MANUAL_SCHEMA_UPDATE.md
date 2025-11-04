# Manual Schema Update Required

## Issue
The Euro currency column (`unit_cost_eur`) is missing from the `components` table in Supabase.

## Required Action
Please run the following SQL in your Supabase SQL Editor:

```sql
ALTER TABLE components ADD COLUMN IF NOT EXISTS unit_cost_eur DECIMAL(12,2);
```

## Steps to Apply
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Paste and run the SQL above
4. Verify the column was added by running: `SELECT column_name FROM information_schema.columns WHERE table_name = 'components' AND column_name = 'unit_cost_eur';`

## After Schema Update
Once the column is added, the Euro currency field will work correctly in the component library table.

## Current Status
- ✅ Code updated to handle Euro currency
- ✅ Transformation functions include Euro field
- ✅ UI components ready for Euro currency
- ❌ Database schema needs manual update
