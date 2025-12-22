-- Add day_work_cost parameter to quotations table
-- Purpose: Store the internal labor cost per day for each quotation
--
-- This allows quotations to have their own labor cost rate independent of global settings
-- and ensures the rate is preserved when quotations are reopened

-- Add day_work_cost column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS day_work_cost DECIMAL(10,2) DEFAULT 1200.00;

-- Add comment
COMMENT ON COLUMN quotations.day_work_cost IS 'Internal labor cost per day for this quotation (can override global setting)';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Successfully added day_work_cost column to quotations table';
END $$;
