-- Add MSRP fields to quotation_items table
-- Purpose: When a component is added to a quotation, copy its MSRP data
--          so that MSRP pricing is preserved even if the component library changes
--
-- Design: quotation_items gets its own copy of msrp_price, msrp_currency, partner_discount_percent
--         copied from the component when the item is added to the quotation

-- Add MSRP fields to quotation_items
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS msrp_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS msrp_currency TEXT CHECK (msrp_currency IN ('NIS', 'USD', 'EUR')),
ADD COLUMN IF NOT EXISTS partner_discount_percent DECIMAL(5,2);

-- Add comments
COMMENT ON COLUMN quotation_items.msrp_price IS 'MSRP price copied from component when added to quotation';
COMMENT ON COLUMN quotation_items.msrp_currency IS 'Currency of MSRP price';
COMMENT ON COLUMN quotation_items.partner_discount_percent IS 'Partner discount % copied from component';

-- Migration complete
--
-- Note: use_msrp_pricing column was added in previous migration (add-msrp-fields.sql)
-- This migration adds the actual MSRP data fields
