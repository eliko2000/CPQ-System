-- Migration: Fix search_path to use 'public' instead of empty
-- Purpose: Empty search_path breaks functions that don't use fully qualified table names
-- Created: 2026-01-22
--
-- The previous migration set search_path = '' which breaks table lookups.
-- This migration fixes it by setting search_path = 'public' which still protects
-- against search path injection while allowing unqualified table references.

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find all functions in public schema that have search_path set to empty string
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proconfig IS NOT NULL
      AND 'search_path=' = ANY(p.proconfig)
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public',
                     func_record.proname, func_record.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter function %: %', func_record.proname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Also explicitly fix the known functions that were altered in the previous migration
-- Using search_path = public instead of empty string

DO $$
BEGIN
  -- User info functions
  ALTER FUNCTION public.get_user_email(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_user_full_name(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.get_user_avatar(UUID) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.update_quotation_status_changed_at() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.set_updated_by() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.set_updated_by_on_insert() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.mark_assembly_incomplete_on_component_delete() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.log_project_activity() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.log_quotation_activity() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  ALTER FUNCTION public.log_component_activity() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_user_teams(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.switch_team(UUID, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.is_team_admin(UUID, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.soft_delete_team(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.cleanup_deleted_teams() SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_team_member_count(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.can_delete_team(UUID, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.check_feature_flag(TEXT, UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.start_bulk_operation(TEXT, UUID, TEXT, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.end_bulk_operation(TEXT) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.cleanup_old_bulk_operations() SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.log_export_operation(UUID, TEXT, TEXT, BIGINT, JSONB, TEXT[]) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.complete_export_import_operation(UUID, TEXT, TEXT, JSONB) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_export_import_duration(UUID) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.get_component_price_history(UUID, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.find_similar_components(TEXT, UUID, INTEGER) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE 'ALTER FUNCTION public.log_activity(UUID, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) SET search_path = public';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_project_number' AND pronamespace = 'public'::regnamespace AND pronargs = 4) THEN
    EXECUTE 'ALTER FUNCTION public.generate_project_number(UUID, TEXT, INTEGER, TEXT) SET search_path = public';
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_project_number' AND pronamespace = 'public'::regnamespace AND pronargs = 1) THEN
    EXECUTE 'ALTER FUNCTION public.generate_project_number(UUID) SET search_path = public';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_quotation_number' AND pronamespace = 'public'::regnamespace AND pronargs = 4) THEN
    EXECUTE 'ALTER FUNCTION public.generate_quotation_number(UUID, TEXT, INTEGER, TEXT) SET search_path = public';
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_quotation_number' AND pronamespace = 'public'::regnamespace AND pronargs = 2) THEN
    EXECUTE 'ALTER FUNCTION public.generate_quotation_number(TEXT, UUID) SET search_path = public';
  END IF;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
