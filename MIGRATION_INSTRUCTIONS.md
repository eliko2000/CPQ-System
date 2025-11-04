# Database Migration Instructions

## IMPORTANT: Run This SQL Migration First!

Before testing the new duplicate/version features, you **MUST** run the following SQL migration in your Supabase SQL Editor.

### Migration File Location
`scripts/add-version-to-quotations.sql`

### What This Migration Does
1. Adds a `version` column to the `quotations` table
2. Updates the unique constraint to allow multiple versions of the same quotation number
3. Sets all existing quotations to version = 1

### Steps to Apply Migration

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste This SQL**
```sql
-- Migration: Add version column to quotations table

-- Add version column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='quotations' AND column_name='version') THEN
        ALTER TABLE quotations ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Drop the old unique constraint on quotation_number if it exists
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_quotation_number_key;

-- Add new unique constraint on (quotation_number, version)
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_quotation_number_version_key;
ALTER TABLE quotations ADD CONSTRAINT quotations_quotation_number_version_key UNIQUE (quotation_number, version);

-- Update existing quotations to have version = 1
UPDATE quotations SET version = 1 WHERE version IS NULL;
```

4. **Run the Migration**
   - Click "Run" button (or press Cmd/Ctrl + Enter)
   - Wait for "Success. No rows returned"

5. **Verify Migration**
```sql
-- Check that version column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'quotations' AND column_name = 'version';

-- Check existing quotations have version = 1
SELECT id, quotation_number, version FROM quotations LIMIT 10;
```

## What's Fixed

### 1. **Duplicate Quotation**
- ✅ Now copies **all systems and items** from source quotation
- ✅ Creates new quotation with proper parameters (no more calculation errors)
- ✅ Opens in editor with full data loaded

### 2. **New Version**
- ✅ Creates new version with incrementing number (e.g., Q-123-V2, Q-123-V3)
- ✅ Copies all systems and items
- ✅ Tracks version number in database

### 3. **UI Improvements**
- ✅ Removed card view (table-only interface)
- ✅ Fixed RTL layout for Hebrew
- ✅ Columns pinned to left (rightmost position for RTL)
- ✅ New columns appear on left when scrolling

### 4. **Data Flow**
- ✅ Single source of truth: Supabase
- ✅ Proper conversion from DbQuotation → QuotationProject
- ✅ All quotation operations persist to database

## Testing Checklist

After running the migration, test:

- [ ] **Open quotation from table** - Double-click any quotation → Should open in editor
- [ ] **Duplicate quotation** - Click duplicate icon → Should create copy with all systems/items
- [ ] **New version** - Click version icon → Should create V2 with all data
- [ ] **Edit quotation** - Change customer name → Should save to database
- [ ] **Add system** - Add new system → Should persist
- [ ] **Add item** - Add item to system → Should persist
- [ ] **RTL layout** - Table should be right-aligned, scroll left for more columns

## Troubleshooting

### Error: "Could not find the 'version' column"
**Solution**: You haven't run the SQL migration yet. Follow steps above.

### Error: "Quotation parameters are required for calculations"
**Solution**: This is fixed. Duplicate/version now properly initialize parameters.

### Duplicate creates empty quotation
**Solution**: Fixed. New `duplicateQuotation` helper copies all systems and items.

## Files Modified

- `scripts/add-version-to-quotations.sql` - Migration script (NEW)
- `scripts/database-schema.sql` - Updated schema with version column
- `src/types.ts` - Added version to DbQuotation interface
- `src/hooks/useQuotations.ts` - Added duplicateQuotation helper
- `src/components/quotations/QuotationDataGrid.tsx` - Fixed duplicate/version + RTL
- `src/components/quotations/QuotationList.tsx` - Removed card view
- `src/lib/utils.ts` - No changes (conversion function already correct)

## Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify migration ran successfully
4. Refresh the page after migration
