-- Migration: add-avatar-to-activity-logs.sql
-- Purpose: Add user avatar URL to activity logs
-- Created: 2026-01-04

-- ============================================================================
-- STEP 1: Add avatar_url column to activity_logs table
-- ============================================================================
ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;

-- ============================================================================
-- STEP 2: Update log_activity function to fetch and store avatar_url
-- ============================================================================
CREATE OR REPLACE FUNCTION log_activity(
  p_team_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_action_type TEXT,
  p_change_summary TEXT,
  p_change_details JSONB DEFAULT NULL,
  p_source_file_name TEXT DEFAULT NULL,
  p_source_file_type TEXT DEFAULT NULL,
  p_source_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_user_avatar_url TEXT;
BEGIN
  -- Get user info from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  -- Get user profile info (name and avatar)
  SELECT full_name, avatar_url
  INTO v_user_name, v_user_avatar_url
  FROM user_profiles
  WHERE id = auth.uid();

  -- Insert activity log
  INSERT INTO activity_logs (
    team_id,
    entity_type,
    entity_id,
    entity_name,
    action_type,
    change_summary,
    change_details,
    source_file_name,
    source_file_type,
    source_metadata,
    user_id,
    user_email,
    user_name,
    user_avatar_url
  ) VALUES (
    p_team_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action_type,
    p_change_summary,
    p_change_details,
    p_source_file_name,
    p_source_file_type,
    p_source_metadata,
    auth.uid(),
    v_user_email,
    v_user_name,
    v_user_avatar_url
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Backfill avatar URLs for existing logs
-- ============================================================================
UPDATE activity_logs al
SET user_avatar_url = up.avatar_url
FROM user_profiles up
WHERE al.user_id = up.id
  AND al.user_avatar_url IS NULL;
