-- Add missing quotation parameters to database
-- This migration adds EUR/ILS exchange rate and risk percentage fields

-- Add eur_to_ils_rate column
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS eur_to_ils_rate DECIMAL(10,4) DEFAULT 4.0;

-- Add risk_percentage column
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS risk_percentage DECIMAL(5,2) DEFAULT 5.0;

-- Add comment for documentation
COMMENT ON COLUMN quotations.eur_to_ils_rate IS 'Euro to ILS exchange rate';
COMMENT ON COLUMN quotations.risk_percentage IS 'Risk buffer percentage applied to quotations';
