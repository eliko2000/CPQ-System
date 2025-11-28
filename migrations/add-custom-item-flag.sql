-- Add custom item flag to quotation_items table
-- This allows tracking of items created directly in quotations (not from library)

-- Add is_custom_item column
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS is_custom_item BOOLEAN DEFAULT FALSE;

-- Add comment explaining the column
COMMENT ON COLUMN quotation_items.is_custom_item IS 'TRUE if item was created directly in quotation (not from component library). Custom items are quotation-specific and not saved to the global component catalog.';

-- Create index for filtering custom vs library items
CREATE INDEX IF NOT EXISTS idx_quotation_items_is_custom ON quotation_items(is_custom_item);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quotation_items'
  AND column_name = 'is_custom_item';
