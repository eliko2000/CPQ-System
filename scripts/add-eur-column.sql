-- Add Euro column to components table
-- Run this in your Supabase SQL Editor

ALTER TABLE components 
ADD COLUMN IF NOT EXISTS unit_cost_eur DECIMAL(12,2);

-- Optional: Update existing components to have a default EUR value of 0
-- UPDATE components SET unit_cost_eur = 0 WHERE unit_cost_eur IS NULL;
