-- Migration: Fix Supabase Security Linter Issues
-- Purpose: Address CRITICAL security vulnerabilities flagged by Supabase linter
-- Created: 2026-01-22
--
-- Issues Fixed:
-- 1. teams table - RLS disabled (was temp disabled, never re-enabled)
-- 2. bulk_operations table - RLS never enabled
-- 3. export_import_history view - Exposes auth.users to anon + SECURITY DEFINER
-- 4. quotation_activity view - SECURITY DEFINER (missing security_invoker)
-- 5. project_summary view - SECURITY DEFINER (missing security_invoker)

-- ============================================================================
-- STEP 1: Re-enable RLS on teams table
-- ============================================================================
-- RLS was temporarily disabled for debugging in temp-disable-teams-rls.sql
-- and was never re-enabled. Policies already exist from multi-tenant-auth-003.
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Enable RLS on bulk_operations table and add policies
-- ============================================================================
-- bulk_operations was created without RLS in 20260103120000_fix_bulk_operation_tracking.sql
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view their team's bulk operations
CREATE POLICY "Team members can view bulk operations"
  ON bulk_operations
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Team members can create bulk operations for their team
CREATE POLICY "Team members can create bulk operations"
  ON bulk_operations
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Team members can delete bulk operations for their team
CREATE POLICY "Team members can delete bulk operations"
  ON bulk_operations
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Fix export_import_history view
-- ============================================================================
-- The view was joining auth.users directly which:
-- a) Exposes auth.users to the anon role through the view
-- b) Has SECURITY DEFINER semantics (default) instead of SECURITY INVOKER
--
-- Fix: Use the existing get_user_email() helper function and add security_invoker

DROP VIEW IF EXISTS export_import_history;

CREATE VIEW export_import_history WITH (security_invoker = true) AS
SELECT
  eil.id,
  eil.team_id,
  eil.user_id,
  get_user_email(eil.user_id) as user_email,  -- Use helper function, not direct auth.users join
  eil.operation_type,
  eil.file_format,
  eil.file_size_bytes,
  eil.record_counts,
  eil.included_entities,
  eil.status,
  eil.error_message,
  eil.created_at,
  eil.completed_at,
  EXTRACT(EPOCH FROM (COALESCE(eil.completed_at, NOW()) - eil.created_at)) * 1000 AS duration_ms
FROM export_import_logs eil;

COMMENT ON VIEW export_import_history IS 'Export/import logs with user details and calculated duration (security_invoker enabled)';

-- Grant access to the view (RLS from base table will be enforced via security_invoker)
GRANT SELECT ON export_import_history TO authenticated;

-- ============================================================================
-- STEP 4: Fix quotation_activity view with security_invoker
-- ============================================================================
-- The view was recreated in 20251229120000 without security_invoker
-- This causes the view to run with SECURITY DEFINER (view owner's permissions)
-- instead of the invoking user's permissions

DROP VIEW IF EXISTS quotation_activity;

CREATE VIEW quotation_activity WITH (security_invoker = true) AS
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

COMMENT ON VIEW quotation_activity IS 'Quotation activity with user details (security_invoker enabled)';

-- Grant access to the view
GRANT SELECT ON quotation_activity TO authenticated;

-- ============================================================================
-- STEP 5: Fix project_summary view with security_invoker
-- ============================================================================
-- The view was recreated in update-project-summary-view-with-number.sql
-- without security_invoker, causing SECURITY DEFINER behavior

DROP VIEW IF EXISTS project_summary;

CREATE VIEW project_summary WITH (security_invoker = true) AS
SELECT
  p.id,
  p.project_number,
  p.company_name,
  p.project_name,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  p.team_id,
  COUNT(q.id) as quotation_count,
  MAX(q.updated_at) as last_quotation_update
FROM projects p
LEFT JOIN quotations q ON q.project_id = p.id
GROUP BY p.id, p.project_number, p.company_name, p.project_name, p.description, p.status, p.created_at, p.updated_at, p.team_id;

COMMENT ON VIEW project_summary IS 'Project summary with quotation counts (security_invoker enabled)';

-- Grant access to the view (RLS from base tables will be enforced via security_invoker)
GRANT SELECT ON project_summary TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================================================

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('teams', 'bulk_operations')
-- ORDER BY tablename;

-- Check views have security_invoker:
-- SELECT viewname,
--        (SELECT value FROM pg_options_to_table(reloptions) WHERE option = 'security_invoker') as security_invoker
-- FROM pg_views v
-- JOIN pg_class c ON v.viewname = c.relname
-- WHERE schemaname = 'public'
-- AND viewname IN ('export_import_history', 'quotation_activity', 'project_summary');

-- Check no views expose auth.users directly:
-- SELECT viewname, definition
-- FROM pg_views
-- WHERE schemaname = 'public'
-- AND definition ILIKE '%auth.users%';

-- Check RLS policies exist for bulk_operations:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'bulk_operations';
