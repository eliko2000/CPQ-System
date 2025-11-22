-- Migration: Add Component Type Classification
-- Purpose: Add type fields to components and quotation_items for HW/SW/Labor tracking
-- Date: 2025-01-16

-- Add component_type to components table
ALTER TABLE components
ADD COLUMN IF NOT EXISTS component_type TEXT
CHECK (component_type IN ('hardware', 'software', 'labor'));

-- Set default value for existing components (hardware)
UPDATE components
SET component_type = 'hardware'
WHERE component_type IS NULL;

-- Make component_type NOT NULL after setting defaults
ALTER TABLE components
ALTER COLUMN component_type SET DEFAULT 'hardware',
ALTER COLUMN component_type SET NOT NULL;

-- Add item_type to quotation_items table
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS item_type TEXT
CHECK (item_type IN ('hardware', 'software', 'labor'));

-- Add labor_subtype to quotation_items table
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS labor_subtype TEXT
CHECK (labor_subtype IN ('engineering', 'commissioning', 'installation', 'programming'));

-- Set default value for existing quotation items (hardware)
UPDATE quotation_items
SET item_type = 'hardware'
WHERE item_type IS NULL;

-- Make item_type NOT NULL after setting defaults
ALTER TABLE quotation_items
ALTER COLUMN item_type SET DEFAULT 'hardware',
ALTER COLUMN item_type SET NOT NULL;

-- Create index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_components_type ON components(component_type);
CREATE INDEX IF NOT EXISTS idx_quotation_items_type ON quotation_items(item_type);
CREATE INDEX IF NOT EXISTS idx_quotation_items_labor_subtype ON quotation_items(labor_subtype)
WHERE labor_subtype IS NOT NULL;

-- Add comment documentation
COMMENT ON COLUMN components.component_type IS 'Component classification: hardware, software, or labor';
COMMENT ON COLUMN quotation_items.item_type IS 'Item classification: hardware, software, or labor';
COMMENT ON COLUMN quotation_items.labor_subtype IS 'Labor activity type: engineering, commissioning, installation, or programming (only for labor items)';
