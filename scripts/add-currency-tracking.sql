-- Add currency tracking fields to quotation_items table
-- This allows proper currency conversion when exchange rates change

ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS original_currency TEXT CHECK (original_currency IN ('NIS', 'USD', 'EUR'));

ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2);

-- Add comment to explain the purpose
COMMENT ON COLUMN quotation_items.original_currency IS 'The original currency of the component (NIS, USD, or EUR). Used to preserve correct pricing when exchange rates change.';
COMMENT ON COLUMN quotation_items.original_cost IS 'The original cost in the original currency. Used to recalculate prices when exchange rates change.';

-- Update existing NULL values with detected currency based on price ratios
-- This is a one-time fix for existing data
UPDATE quotation_items
SET original_currency = CASE
  WHEN unit_cost IS NOT NULL AND unit_cost > 0 THEN 'NIS'
  ELSE 'NIS'
END,
original_cost = COALESCE(unit_cost, 0)
WHERE original_currency IS NULL;
