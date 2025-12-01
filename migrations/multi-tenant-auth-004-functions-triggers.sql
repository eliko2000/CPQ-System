-- Multi-Tenant Authentication System - Part 4: Database Functions & Triggers
-- This migration creates helper functions and triggers for team management
-- Run this AFTER multi-tenant-auth-003-rls-policies.sql

-- ============================================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GET USER'S ACTIVE TEAMS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  user_role TEXT,
  last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    tm.role,
    tm.last_accessed_at
  FROM teams t
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid
    AND t.deleted_at IS NULL
  ORDER BY tm.last_accessed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SWITCH ACTIVE TEAM
-- ============================================================================

CREATE OR REPLACE FUNCTION switch_team(user_uuid UUID, target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify user is member of target team
  IF NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = user_uuid AND team_id = target_team_id
  ) THEN
    RETURN false;
  END IF;

  -- Update last accessed timestamp for team member
  UPDATE team_members
  SET last_accessed_at = NOW()
  WHERE user_id = user_uuid AND team_id = target_team_id;

  -- Update last accessed timestamp for team
  UPDATE teams
  SET last_accessed_at = NOW()
  WHERE id = target_team_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHECK IF USER IS TEAM ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION is_team_admin(user_uuid UUID, target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid 
      AND team_id = target_team_id 
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SOFT DELETE TEAM (90-day retention)
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_team(target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE teams
  SET deleted_at = NOW()
  WHERE id = target_team_id AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP DELETED TEAMS (>90 days old)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_deleted_teams()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM teams
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHECK FEATURE FLAG FOR TEAM
-- ============================================================================

CREATE OR REPLACE FUNCTION check_feature_flag(
  flag_key_input TEXT,
  target_team_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  global_enabled BOOLEAN;
  team_enabled BOOLEAN;
BEGIN
  -- Check global flag
  SELECT is_enabled INTO global_enabled
  FROM feature_flags
  WHERE flag_key = flag_key_input;

  -- If global flag doesn't exist or is disabled, return false
  IF global_enabled IS NULL OR NOT global_enabled THEN
    RETURN false;
  END IF;

  -- Check team-specific override
  SELECT tfa.is_enabled INTO team_enabled
  FROM team_feature_access tfa
  INNER JOIN feature_flags ff ON ff.id = tfa.feature_flag_id
  WHERE ff.flag_key = flag_key_input AND tfa.team_id = target_team_id;

  -- If no team-specific setting, use global
  RETURN COALESCE(team_enabled, global_enabled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET TEAM MEMBER COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_team_member_count(target_team_id UUID)
RETURNS INTEGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE team_id = target_team_id;
  
  RETURN member_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHECK IF USER CAN DELETE TEAM
-- ============================================================================
-- A team can only be deleted if user is admin and it's not the last team

CREATE OR REPLACE FUNCTION can_delete_team(user_uuid UUID, target_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  user_team_count INTEGER;
BEGIN
  -- Check if user is admin of this team
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = user_uuid 
      AND team_id = target_team_id 
      AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN false;
  END IF;

  -- Check how many teams the user belongs to
  SELECT COUNT(*) INTO user_team_count
  FROM team_members
  WHERE user_id = user_uuid;

  -- Don't allow deletion if it's the user's only team
  IF user_team_count <= 1 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify functions were created:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN (
--   'handle_new_user', 'get_user_teams', 'switch_team',
--   'is_team_admin', 'soft_delete_team', 'cleanup_deleted_teams',
--   'check_feature_flag', 'get_team_member_count', 'can_delete_team'
-- );
