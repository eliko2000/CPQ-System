-- Remove category and default_days columns from labor_types table
-- These fields were removed from the TypeScript types and are no longer needed
-- Migration created: 2025-12-21

-- Begin transaction for safety
BEGIN;

-- Drop category column (nullable, safe to remove)
ALTER TABLE labor_types DROP COLUMN IF EXISTS category;

-- Drop default_days column (has default value, safe to remove)
ALTER TABLE labor_types DROP COLUMN IF EXISTS default_days;

-- Commit the changes
COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed category and default_days columns from labor_types table';
  RAISE NOTICE 'Migration: remove-labor-category-and-default-days.sql completed';
END $$;
