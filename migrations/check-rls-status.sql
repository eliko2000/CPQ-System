-- ============================================================================
-- RLS STATUS CHECK SCRIPT
-- ============================================================================
-- Run this script in Supabase SQL Editor to verify RLS policies are applied
-- This script checks the status of all Row-Level Security policies

-- ============================================================================
-- 1. CHECK WHICH TABLES HAVE RLS ENABLED
-- ============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles', 'teams', 'team_members', 'team_invitations',
    'feature_flags', 'team_feature_access',
    'components', 'assemblies', 'assembly_components',
    'quotations', 'quotation_systems', 'quotation_items',
    'projects', 'user_table_configs', 'user_settings'
  )
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- ============================================================================
-- 2. LIST ALL RLS POLICIES
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN roles = '{public}' THEN 'public'
    ELSE array_to_string(roles, ', ')
  END as roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. CHECK FOR OLD PERMISSIVE POLICIES (SHOULD BE 0)
-- ============================================================================
SELECT
  tablename,
  policyname,
  'FOUND OLD PERMISSIVE POLICY - SHOULD BE REMOVED!' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Enable all operations%';

-- Expected: 0 rows (all old permissive policies should be dropped)

-- ============================================================================
-- 4. COUNT POLICIES PER TABLE
-- ============================================================================
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN tablename IN ('components', 'assemblies', 'assembly_components',
                       'quotations', 'quotation_systems', 'quotation_items',
                       'projects') THEN
      CASE WHEN COUNT(*) >= 4 THEN '✓ OK' ELSE '✗ MISSING POLICIES' END
    WHEN tablename IN ('teams', 'team_members', 'user_profiles',
                       'team_invitations', 'feature_flags', 'team_feature_access') THEN
      CASE WHEN COUNT(*) >= 2 THEN '✓ OK' ELSE '✗ MISSING POLICIES' END
    ELSE '? Unknown table'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected policy counts:
-- components: 4 (SELECT, INSERT, UPDATE, DELETE)
-- assemblies: 4
-- assembly_components: 4
-- quotations: 4
-- quotation_systems: 4
-- quotation_items: 4
-- projects: 4
-- user_table_configs: 4
-- user_settings: 4
-- teams: 4
-- team_members: 4
-- user_profiles: 3 (SELECT, INSERT, UPDATE)
-- team_invitations: 4
-- feature_flags: 2 (SELECT, ALL for admins)
-- team_feature_access: 2 (SELECT, ALL for admins)

-- ============================================================================
-- 5. CHECK FOR MISSING TEAM-BASED POLICIES ON DATA TABLES
-- ============================================================================
WITH data_tables AS (
  SELECT unnest(ARRAY[
    'components', 'assemblies', 'assembly_components',
    'quotations', 'quotation_systems', 'quotation_items', 'projects'
  ]) as table_name
),
policy_check AS (
  SELECT
    dt.table_name,
    COUNT(DISTINCT pp.cmd) as operations_covered
  FROM data_tables dt
  LEFT JOIN pg_policies pp ON pp.tablename = dt.table_name
    AND pp.schemaname = 'public'
    AND pp.policyname LIKE '%Team members%'
  GROUP BY dt.table_name
)
SELECT
  table_name,
  operations_covered,
  CASE
    WHEN operations_covered >= 4 THEN '✓ COMPLETE (SELECT, INSERT, UPDATE, DELETE)'
    WHEN operations_covered = 0 THEN '✗ NO TEAM POLICIES FOUND'
    ELSE '⚠ INCOMPLETE (' || operations_covered || '/4 operations)'
  END as status
FROM policy_check
ORDER BY table_name;

-- Expected: All data tables should have 4 operations covered

-- ============================================================================
-- 6. VERIFY DATABASE FUNCTIONS EXIST
-- ============================================================================
SELECT
  routine_name,
  routine_type,
  '✓ Function exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'handle_new_user',
    'get_user_teams',
    'switch_team',
    'is_team_admin',
    'soft_delete_team',
    'cleanup_deleted_teams',
    'check_feature_flag',
    'get_team_member_count',
    'can_delete_team'
  )
ORDER BY routine_name;

-- Expected: 9 functions

-- ============================================================================
-- 7. VERIFY TRIGGERS EXIST
-- ============================================================================
SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation,
  action_timing,
  '✓ Trigger exists' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND (
    trigger_name LIKE '%update%updated_at%'
    OR trigger_name = 'on_auth_user_created'
  )
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- - on_auth_user_created (on auth.users)
-- - update_user_profiles_updated_at
-- - update_teams_updated_at
-- - update_feature_flags_updated_at
-- - update_team_feature_access_updated_at

-- ============================================================================
-- 8. CHECK TEAM_ID COLUMNS EXIST
-- ============================================================================
SELECT
  table_name,
  column_name,
  is_nullable,
  data_type,
  CASE
    WHEN table_name IN ('components', 'assemblies', 'assembly_components',
                        'quotations', 'quotation_systems', 'quotation_items',
                        'projects') THEN
      CASE WHEN is_nullable = 'NO' THEN '✓ NOT NULL (required)'
           ELSE '⚠ NULLABLE (should be NOT NULL)' END
    WHEN table_name IN ('user_table_configs', 'user_settings') THEN
      CASE WHEN is_nullable = 'YES' THEN '✓ NULLABLE (global configs allowed)'
           ELSE '⚠ NOT NULL (should be nullable)' END
    ELSE '? Unknown requirement'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'team_id'
  AND table_name IN (
    'components', 'assemblies', 'assembly_components',
    'quotations', 'quotation_systems', 'quotation_items',
    'projects', 'user_table_configs', 'user_settings'
  )
ORDER BY table_name;

-- Expected:
-- All data tables: team_id NOT NULL
-- user_table_configs, user_settings: team_id NULLABLE

-- ============================================================================
-- 9. CHECK FEATURE FLAGS SEEDED
-- ============================================================================
SELECT
  flag_key,
  flag_name,
  is_enabled,
  CASE WHEN is_enabled THEN '✓ ENABLED' ELSE '○ DISABLED' END as status
FROM feature_flags
ORDER BY flag_key;

-- Expected: 8 feature flags (ai_import, analytics, advanced_pricing, etc.)

-- ============================================================================
-- 10. OVERALL MIGRATION STATUS SUMMARY
-- ============================================================================
WITH status_checks AS (
  SELECT 'Auth Tables' as check_name,
    CASE WHEN COUNT(*) = 6 THEN '✓' ELSE '✗' END as status
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('user_profiles', 'teams', 'team_members',
                       'team_invitations', 'feature_flags', 'team_feature_access')

  UNION ALL

  SELECT 'RLS Enabled on All Tables',
    CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false
    AND tablename IN (
      'user_profiles', 'teams', 'team_members', 'team_invitations',
      'feature_flags', 'team_feature_access', 'components', 'assemblies',
      'quotations', 'quotation_systems', 'quotation_items'
    )

  UNION ALL

  SELECT 'Old Permissive Policies Removed',
    CASE WHEN COUNT(*) = 0 THEN '✓' ELSE '✗' END
  FROM pg_policies
  WHERE policyname LIKE '%Enable all operations%'

  UNION ALL

  SELECT 'Database Functions Created',
    CASE WHEN COUNT(*) >= 9 THEN '✓' ELSE '✗' END
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'handle_new_user', 'get_user_teams', 'switch_team',
      'is_team_admin', 'soft_delete_team', 'check_feature_flag'
    )

  UNION ALL

  SELECT 'Feature Flags Seeded',
    CASE WHEN COUNT(*) >= 5 THEN '✓' ELSE '✗' END
  FROM feature_flags
)
SELECT * FROM status_checks;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- ✓ = Pass (everything working)
-- ✗ = Fail (needs attention)
-- ⚠ = Warning (might need review)
-- ○ = Info (disabled but OK)
-- ? = Unknown status

-- If any checks show ✗, you need to run the corresponding migration:
-- - Missing auth tables: Run multi-tenant-auth-001-core-tables.sql
-- - Missing team_id columns: Run multi-tenant-auth-002-add-team-isolation.sql
-- - Missing RLS policies: Run multi-tenant-auth-003-rls-policies.sql
-- - Missing functions: Run multi-tenant-auth-004-functions-triggers.sql
-- - Missing feature flags: Run multi-tenant-auth-005-seed-feature-flags.sql
