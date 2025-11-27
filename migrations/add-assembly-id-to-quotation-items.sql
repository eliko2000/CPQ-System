-- Migration: Add assembly_id to quotation_items table
-- Date: 2024-02-XX
-- Description: Allows quotation items to be linked to assemblies

-- Add assembly_id column to quotation_items
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS assembly_id UUID REFERENCES assemblies(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotation_items_assembly_id
ON quotation_items(assembly_id);

-- Add comment to the column
COMMENT ON COLUMN quotation_items.assembly_id IS 'Reference to assembly if this item represents an assembly (null for regular components)';
