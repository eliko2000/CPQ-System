-- Add currency tracking fields to components table
-- This allows proper currency detection and conversion

ALTER TABLE components
ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('NIS', 'USD', 'EUR')) DEFAULT 'NIS';

ALTER TABLE components
ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2);

-- Add labor_subtype column if it doesn't exist
ALTER TABLE components
ADD COLUMN IF NOT EXISTS labor_subtype TEXT CHECK (labor_subtype IN ('engineering', 'commissioning', 'installation', 'programming'));

-- Add comment to explain the purpose
COMMENT ON COLUMN components.currency IS 'The original currency of the component price (NIS, USD, or EUR). Detected automatically based on price ratios.';
COMMENT ON COLUMN components.original_cost IS 'The original cost in the original currency. Used as the base for currency conversions.';
COMMENT ON COLUMN components.labor_subtype IS 'For labor components: engineering, commissioning, installation, or programming';

-- Update existing NULL values with intelligent currency detection
-- This detects USD/EUR based on price ratios
UPDATE components
SET currency = CASE
  -- If USD price exists and ILS/USD ratio is between 3-5, USD is original
  WHEN unit_cost_usd > 0 AND unit_cost_ils > 0
   AND (unit_cost_ils / unit_cost_usd) BETWEEN 3 AND 5
  THEN 'USD'
  -- If EUR price exists and ILS/EUR ratio is between 3.5-5, EUR is original
  WHEN unit_cost_eur > 0 AND unit_cost_ils > 0
   AND (unit_cost_ils / unit_cost_eur) BETWEEN 3.5 AND 5
  THEN 'EUR'
  -- Otherwise ILS is original
  ELSE 'NIS'
END,
original_cost = CASE
  -- Match the detected currency
  WHEN unit_cost_usd > 0 AND unit_cost_ils > 0
   AND (unit_cost_ils / unit_cost_usd) BETWEEN 3 AND 5
  THEN unit_cost_usd
  WHEN unit_cost_eur > 0 AND unit_cost_ils > 0
   AND (unit_cost_ils / unit_cost_eur) BETWEEN 3.5 AND 5
  THEN unit_cost_eur
  ELSE COALESCE(unit_cost_ils, 0)
END
WHERE currency IS NULL OR original_cost IS NULL;
