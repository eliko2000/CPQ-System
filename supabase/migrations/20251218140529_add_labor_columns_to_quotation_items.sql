-- Add labor_type_id and is_internal_labor columns to quotation_items table
-- This enables tracking which labor type was used and whether it's internal or external

-- Add labor_type_id column (reference to labor_types table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items'
    AND column_name = 'labor_type_id'
  ) THEN
    ALTER TABLE quotation_items
    ADD COLUMN labor_type_id UUID REFERENCES labor_types(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added labor_type_id column to quotation_items';
  ELSE
    RAISE NOTICE 'labor_type_id column already exists in quotation_items';
  END IF;
END $$;

-- Add is_internal_labor column (track if this item uses internal rate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotation_items'
    AND column_name = 'is_internal_labor'
  ) THEN
    ALTER TABLE quotation_items
    ADD COLUMN is_internal_labor BOOLEAN;

    RAISE NOTICE 'Added is_internal_labor column to quotation_items';
  ELSE
    RAISE NOTICE 'is_internal_labor column already exists in quotation_items';
  END IF;
END $$;

-- Create index for labor_type_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotation_items_labor_type
ON quotation_items(labor_type_id)
WHERE labor_type_id IS NOT NULL;

-- Mark existing labor items as internal labor (backward compatibility)
-- This ensures old labor items will recalculate with dayWorkCost changes
UPDATE quotation_items
SET is_internal_labor = true
WHERE item_type = 'labor'
  AND is_internal_labor IS NULL;

-- Report results
DO $$
DECLARE
  labor_items_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO labor_items_count
  FROM quotation_items
  WHERE item_type = 'labor';

  SELECT COUNT(*) INTO updated_count
  FROM quotation_items
  WHERE item_type = 'labor' AND is_internal_labor = true;

  RAISE NOTICE 'Found % total labor items', labor_items_count;
  RAISE NOTICE 'Marked % existing labor items as internal', updated_count;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added labor columns to quotation_items table';
END $$;
