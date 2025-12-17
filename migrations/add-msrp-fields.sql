-- Add MSRP and partner discount fields to components table
-- Purpose: Track MSRP (list prices) and partner discounts for distributed components
--
-- Design:
-- - MSRP is stored in ONE currency (manufacturer's currency)
-- - Partner discount % is stored for historical tracking
-- - User can import MSRP in two ways:
--   1. File contains separate MSRP column (map both Partner + MSRP, calculate discount)
--   2. File contains MSRP prices + user knows discount % (calculate partner cost from MSRP × (1 - discount%))
-- - Partner cost stored in unit_cost_usd/ils/eur
-- - In quotations, MSRP can be used as selling price (converted on-the-fly)

-- Components table: Add MSRP and discount tracking (3 fields)
ALTER TABLE components
ADD COLUMN IF NOT EXISTS msrp_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS msrp_currency TEXT CHECK (msrp_currency IN ('NIS', 'USD', 'EUR')),
ADD COLUMN IF NOT EXISTS partner_discount_percent DECIMAL(5,2);

-- Add comments for clarity
COMMENT ON COLUMN components.msrp_price IS 'Manufacturer Suggested Retail Price (list price)';
COMMENT ON COLUMN components.msrp_currency IS 'Currency of the MSRP price';
COMMENT ON COLUMN components.partner_discount_percent IS 'Partner discount percentage (historical tracking)';

-- Quotation items table: Add MSRP toggle flag
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS use_msrp_pricing BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN quotation_items.use_msrp_pricing IS 'True if using MSRP price instead of cost + margin for this line item';

-- Create index for faster queries on components with MSRP
CREATE INDEX IF NOT EXISTS idx_components_has_msrp ON components(msrp_price) WHERE msrp_price IS NOT NULL;

-- Migration complete
--
-- Usage examples:
--
-- Example 1: File with both Partner and MSRP columns
--   File data: Partner $4,400 | MSRP $6,670
--   Calculate: Discount = (6670 - 4400) / 6670 × 100 = 34%
--   Stored:
--     unit_cost_usd: 4400
--     msrp_price: 6670
--     msrp_currency: 'USD'
--     partner_discount_percent: 34
--
-- Example 2: File with MSRP prices + user enters 34% partner discount
--   File data: $6,670 (MSRP)
--   Calculate: Partner = 6670 × (1 - 0.34) = $4,402
--   Stored:
--     unit_cost_usd: 4402
--     msrp_price: 6670
--     msrp_currency: 'USD'
--     partner_discount_percent: 34
--
-- Example 3: Regular import (no MSRP)
--   File data: $4,400 (cost)
--   Stored:
--     unit_cost_usd: 4400
--     msrp_price: NULL
--     msrp_currency: NULL
--     partner_discount_percent: NULL
--
-- Quotation pricing:
--   When use_msrp_pricing = true:
--     Selling price = msrp_price (converted to quotation currency)
--     Your cost = unit_cost_usd
--     Margin = msrp_price - unit_cost = $2,270 (34%)
