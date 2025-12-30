-- Migration: add-updated-by-field.sql
-- Purpose: Add updated_by field to track which user last modified records
-- Created: 2024-12-28

-- ============================================================================
-- STEP 1: Add updated_by field to quotations table
-- ============================================================================
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN quotations.updated_by IS 'UUID of the user who last updated this quotation';

-- ============================================================================
-- STEP 2: Add updated_by field to components table
-- ============================================================================
ALTER TABLE components
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN components.updated_by IS 'UUID of the user who last updated this component';

-- ============================================================================
-- STEP 3: Add updated_by field to projects table
-- ============================================================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN projects.updated_by IS 'UUID of the user who last updated this project';

-- ============================================================================
-- STEP 4: Create trigger function to auto-set updated_by
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Create triggers on tables
-- ============================================================================
DROP TRIGGER IF EXISTS set_quotations_updated_by ON quotations;
CREATE TRIGGER set_quotations_updated_by
BEFORE UPDATE ON quotations
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_components_updated_by ON components;
CREATE TRIGGER set_components_updated_by
BEFORE UPDATE ON components
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

DROP TRIGGER IF EXISTS set_projects_updated_by ON projects;
CREATE TRIGGER set_projects_updated_by
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_by();

-- ============================================================================
-- STEP 6: Create index for activity queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quotations_activity
ON quotations (team_id, updated_at DESC, updated_by);

