-- Add labor_subtype column to components table
-- This allows storing labor classification directly in the component library

-- Add the column (nullable since existing components won't have this)
ALTER TABLE components
ADD COLUMN IF NOT EXISTS labor_subtype VARCHAR(20);

-- Add check constraint to ensure only valid values
-- Note: 'engineering' now includes development/programming work (פיתוח)
ALTER TABLE components
ADD CONSTRAINT components_labor_subtype_check
CHECK (labor_subtype IS NULL OR labor_subtype IN ('engineering', 'commissioning', 'installation'));

-- Add comment for documentation
COMMENT ON COLUMN components.labor_subtype IS 'Labor subtype for labor components: engineering (includes development/programming), commissioning, or installation. Only applicable when component_type = ''labor''.';

-- Optional: Create index for faster filtering by labor subtype
CREATE INDEX IF NOT EXISTS idx_components_labor_subtype
ON components(labor_subtype)
WHERE component_type = 'labor';

-- Note: The quotation_items table already has labor_subtype column
-- so no changes needed there
