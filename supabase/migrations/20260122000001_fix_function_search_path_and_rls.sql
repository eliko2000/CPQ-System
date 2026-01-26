-- Migration: Fix Function Search Path and Overly Permissive RLS Policies
-- Purpose: Address security warnings from Supabase linter
-- Created: 2026-01-22
--
-- Issues Fixed:
-- 1. Function Search Path Mutable - Add SET search_path = ''
-- 2. RLS Policy Always True - Remove duplicate permissive policies, add team-based policies

-- ============================================================================
-- PART 1: FIX FUNCTION SEARCH PATH
-- Using DO blocks to safely alter only functions that exist
-- ============================================================================

DO $$
BEGIN
  -- User info functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_email' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.get_user_email(UUID) SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_full_name' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.get_user_full_name(UUID) SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_avatar' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.get_user_avatar(UUID) SET search_path = '';
  END IF;

  -- Trigger functions (no params)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_quotation_status_changed_at' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.update_quotation_status_changed_at() SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_by' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.set_updated_by() SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_by_on_insert' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.set_updated_by_on_insert() SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_assembly_incomplete_on_component_delete' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.mark_assembly_incomplete_on_component_delete() SET search_path = '';
  END IF;

  -- Auth/user functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = '';
  END IF;

  -- Activity logging trigger functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_project_activity' AND pronamespace = 'public'::regnamespace AND pronargs = 0) THEN
    ALTER FUNCTION public.log_project_activity() SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_quotation_activity' AND pronamespace = 'public'::regnamespace AND pronargs = 0) THEN
    ALTER FUNCTION public.log_quotation_activity() SET search_path = '';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_component_activity' AND pronamespace = 'public'::regnamespace AND pronargs = 0) THEN
    ALTER FUNCTION public.log_component_activity() SET search_path = '';
  END IF;
END $$;

-- Team management functions (with specific signatures)
DO $$
BEGIN
  -- get_user_teams(UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_teams' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.get_user_teams(UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- switch_team(UUID, UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'switch_team' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.switch_team(UUID, UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- is_team_admin(UUID, UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_team_admin' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.is_team_admin(UUID, UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- soft_delete_team(UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'soft_delete_team' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.soft_delete_team(UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- cleanup_deleted_teams()
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_deleted_teams' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_deleted_teams() SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- get_team_member_count(UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_team_member_count' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.get_team_member_count(UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- can_delete_team(UUID, UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_delete_team' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.can_delete_team(UUID, UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  -- check_feature_flag(TEXT, UUID)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_feature_flag' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.check_feature_flag(TEXT, UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Bulk operations functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'start_bulk_operation' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.start_bulk_operation(TEXT, UUID, TEXT, INTEGER) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'end_bulk_operation' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.end_bulk_operation(TEXT) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_bulk_operations' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_old_bulk_operations() SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Export/import functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_export_operation' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.log_export_operation(UUID, TEXT, TEXT, BIGINT, JSONB, TEXT[]) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_export_import_operation' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.complete_export_import_operation(UUID, TEXT, TEXT, JSONB) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_export_import_duration' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.get_export_import_duration(UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Component functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_component_price_history' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.get_component_price_history(UUID, INTEGER) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'find_similar_components' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.find_similar_components(TEXT, UUID, INTEGER) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- log_activity with full signature
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_activity' AND pronamespace = 'public'::regnamespace AND pronargs = 10) THEN
    EXECUTE 'ALTER FUNCTION public.log_activity(UUID, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Numbering functions (may have different signatures)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_project_number' AND pronamespace = 'public'::regnamespace AND pronargs = 4) THEN
    EXECUTE 'ALTER FUNCTION public.generate_project_number(UUID, TEXT, INTEGER, TEXT) SET search_path = ''''';
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_project_number' AND pronamespace = 'public'::regnamespace AND pronargs = 1) THEN
    EXECUTE 'ALTER FUNCTION public.generate_project_number(UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_quotation_number' AND pronamespace = 'public'::regnamespace AND pronargs = 4) THEN
    EXECUTE 'ALTER FUNCTION public.generate_quotation_number(UUID, TEXT, INTEGER, TEXT) SET search_path = ''''';
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_quotation_number' AND pronamespace = 'public'::regnamespace AND pronargs = 2) THEN
    EXECUTE 'ALTER FUNCTION public.generate_quotation_number(TEXT, UUID) SET search_path = ''''';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- ============================================================================
-- PART 2: FIX RLS POLICIES
-- Remove duplicate permissive policies that bypass team-based security
-- ============================================================================

-- Drop overly permissive policies on quotations
DROP POLICY IF EXISTS "Allow all authenticated users to delete quotations" ON public.quotations;
DROP POLICY IF EXISTS "Allow all authenticated users to insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Allow all authenticated users to update quotations" ON public.quotations;

-- Drop overly permissive policies on quotation_systems
DROP POLICY IF EXISTS "Allow all authenticated users to delete quotation_systems" ON public.quotation_systems;
DROP POLICY IF EXISTS "Allow all authenticated users to insert quotation_systems" ON public.quotation_systems;
DROP POLICY IF EXISTS "Allow all authenticated users to update quotation_systems" ON public.quotation_systems;

-- Drop overly permissive policies on quotation_items
DROP POLICY IF EXISTS "Allow all authenticated users to delete quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Allow all authenticated users to insert quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "Allow all authenticated users to update quotation_items" ON public.quotation_items;

-- ============================================================================
-- PART 3: FIX component_quote_history RLS
-- ============================================================================

DROP POLICY IF EXISTS "Enable all operations for component_quote_history" ON public.component_quote_history;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'component_quote_history') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'component_quote_history' AND policyname = 'Team members can view component quote history') THEN
      CREATE POLICY "Team members can view component quote history"
        ON public.component_quote_history FOR SELECT
        USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'component_quote_history' AND policyname = 'Team members can insert component quote history') THEN
      CREATE POLICY "Team members can insert component quote history"
        ON public.component_quote_history FOR INSERT
        WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'component_quote_history' AND policyname = 'Team members can update component quote history') THEN
      CREATE POLICY "Team members can update component quote history"
        ON public.component_quote_history FOR UPDATE
        USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'component_quote_history' AND policyname = 'Team members can delete component quote history') THEN
      CREATE POLICY "Team members can delete component quote history"
        ON public.component_quote_history FOR DELETE
        USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;
  END IF;
END $$;

-- ============================================================================
-- PART 4: FIX supplier_quotes RLS
-- ============================================================================

DROP POLICY IF EXISTS "Enable all operations for supplier_quotes" ON public.supplier_quotes;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_quotes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_quotes' AND policyname = 'Team members can view supplier quotes') THEN
      CREATE POLICY "Team members can view supplier quotes"
        ON public.supplier_quotes FOR SELECT
        USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_quotes' AND policyname = 'Team members can insert supplier quotes') THEN
      CREATE POLICY "Team members can insert supplier quotes"
        ON public.supplier_quotes FOR INSERT
        WITH CHECK (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_quotes' AND policyname = 'Team members can update supplier quotes') THEN
      CREATE POLICY "Team members can update supplier quotes"
        ON public.supplier_quotes FOR UPDATE
        USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_quotes' AND policyname = 'Team members can delete supplier quotes') THEN
      CREATE POLICY "Team members can delete supplier quotes"
        ON public.supplier_quotes FOR DELETE
        USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));
    END IF;
  END IF;
END $$;
