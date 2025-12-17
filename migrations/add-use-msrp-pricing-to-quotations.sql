-- Add use_msrp_pricing parameter to quotations table
-- Purpose: Store the global MSRP pricing toggle state per quotation
--
-- When enabled, all quotation items with MSRP data will use MSRP as customer price
-- instead of cost + margin formula

-- Add use_msrp_pricing column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS use_msrp_pricing BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN quotations.use_msrp_pricing IS 'Global toggle: if true, use MSRP pricing for items that have MSRP data';

-- Migration complete
