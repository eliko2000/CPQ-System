-- Migration: fix-activity-view-with-avatar.sql
-- Purpose: Fix updated_by triggers and add avatar_url to quotation_activity view
-- Created: 2024-12-29

-- ============================================================================
-- STEP 1: Add INSERT trigger for quotations (so new records get updated_by)
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_by_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add INSERT triggers
DROP TRIGGER IF EXISTS set_quotations_updated_by_insert ON quotations;
CREATE TRIGGER set_quotations_updated_by_insert
BEFORE INSERT ON quotations
FOR EACH ROW
EXECUTE FUNCTION set_updated_by_on_insert();

DROP TRIGGER IF EXISTS set_components_updated_by_insert ON components;
CREATE TRIGGER set_components_updated_by_insert
BEFORE INSERT ON components
FOR EACH ROW
EXECUTE FUNCTION set_updated_by_on_insert();

DROP TRIGGER IF EXISTS set_projects_updated_by_insert ON projects;
CREATE TRIGGER set_projects_updated_by_insert
BEFORE INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION set_updated_by_on_insert();

-- ============================================================================
-- STEP 2: Create helper function to get user avatar from user_profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_avatar(user_id UUID)
RETURNS TEXT AS $$
  SELECT avatar_url FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create helper function to get user full name from user_profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_full_name(user_id UUID)
RETURNS TEXT AS $$
  SELECT full_name FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Update the quotation_activity view to include avatar and full name
-- ============================================================================
CREATE OR REPLACE VIEW quotation_activity AS
SELECT
  q.id,
  q.team_id,
  q.quotation_number,
  q.customer_name,
  q.project_name,
  q.status,
  q.total_price,
  q.created_at,
  q.updated_at,
  q.status_changed_at,
  q.updated_by,
  get_user_email(q.updated_by) as updated_by_email,
  get_user_full_name(q.updated_by) as updated_by_name,
  get_user_avatar(q.updated_by) as updated_by_avatar
FROM quotations q;

-- ============================================================================
-- STEP 5: Ensure permissions
-- ============================================================================
GRANT SELECT ON quotation_activity TO authenticated;

-- ============================================================================
-- STEP 6: Backfill updated_by for existing quotations (set to first team admin)
-- This is a best-effort attempt to populate historical data
-- ============================================================================
UPDATE quotations q
SET updated_by = (
  SELECT tm.user_id
  FROM team_members tm
  WHERE tm.team_id = q.team_id
    AND tm.role = 'admin'
  LIMIT 1
)
WHERE q.updated_by IS NULL;
