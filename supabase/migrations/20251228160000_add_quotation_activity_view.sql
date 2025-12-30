-- Migration: add-quotation-activity-view.sql
-- Purpose: Create a view that joins quotations with user info for activity display
-- Created: 2024-12-28

-- ============================================================================
-- STEP 1: Create a function to get user email from auth.users
-- This is needed because auth.users is protected
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create a view for quotation activity with user info
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
  get_user_email(q.updated_by) as updated_by_email
FROM quotations q;

-- ============================================================================
-- STEP 3: Grant access to the view
-- ============================================================================
GRANT SELECT ON quotation_activity TO authenticated;

-- ============================================================================
-- STEP 4: Add RLS policy for the view
-- ============================================================================
ALTER VIEW quotation_activity SET (security_invoker = true);

