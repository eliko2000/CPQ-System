# Bugs Backlog

## Table Configuration Persistence Issue

**Status**: Open  
**Priority**: High  
**Component**: Table Configuration Persistence

### Description

All table configs (order, widths, visibility, filters) are supposed to be saved to `user_table_configs` table, but the persistence is not working properly.

### Current Implementation

- `useTableConfig` hook attempts to save/load configs from Supabase
- `user_table_configs` table schema created in `scripts/table-config-schema.sql`
- Manual setup instructions provided in `scripts/MANUAL_TABLE_SETUP.md`
- Debug logging added to track persistence attempts

### Root Cause

The `user_table_configs` table doesn't exist in the Supabase database, causing silent failures in the persistence layer.

### Expected Behavior

- Column resizing should persist after page refresh
- Column visibility toggles should persist after page refresh
- Column reordering should persist after page refresh
- Filter states should persist after page refresh
- Console should show successful save/load operations

### Current Behavior

- Table configurations reset to defaults on page refresh
- Console may show errors about missing table
- Changes made by users are lost

### Fix Required

1. Execute SQL from `scripts/MANUAL_TABLE_SETUP.md` in Supabase dashboard
2. Verify table creation in Supabase
3. Test persistence functionality
4. Monitor console for debug messages

### Files Involved

- `src/hooks/useTableConfig.ts` - Persistence logic
- `scripts/table-config-schema.sql` - Table schema
- `scripts/MANUAL_TABLE_SETUP.md` - Setup instructions
- `src/components/library/EnhancedComponentGrid.tsx` - Component library table
- `src/components/quotations/QuotationEditor.tsx` - Quotation table

### Testing Steps

1. Navigate to Component Library
2. Resize a column
3. Refresh page
4. Verify column width persists
5. Repeat for visibility, ordering, and filters

### Notes

- This is a blocking issue for user experience
- Manual database setup required due to MCP tool limitations
- Debug logging will help verify fix once table is created
