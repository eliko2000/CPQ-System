-- Migration: Add Team-Scoped Settings Isolation
-- Purpose: Isolate settings between teams for multi-tenant support
-- Date: 2025-12-10

BEGIN;

-- Add team-scoped unique constraint
-- Drop old constraint if it exists
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS unique_user_setting;

-- Add new team+user+key constraint
ALTER TABLE user_settings ADD CONSTRAINT unique_team_user_setting
  UNIQUE(team_id, user_id, setting_key);

-- Create index for team-based queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_user_settings_team_key
  ON user_settings(team_id, setting_key);

-- Update RLS policies for team isolation
DROP POLICY IF EXISTS "Enable all operations for user_settings" ON user_settings;
DROP POLICY IF EXISTS "Users can manage their settings" ON user_settings;

-- New team-scoped RLS policy
CREATE POLICY "Users can manage their team's settings"
  ON user_settings
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE user_settings IS 'User settings with team-level isolation. Each team has independent settings.';

COMMIT;

-- Rollback plan (commented out):
-- BEGIN;
-- ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS unique_team_user_setting;
-- ALTER TABLE user_settings ADD CONSTRAINT unique_user_setting UNIQUE(user_id, setting_key);
-- DROP INDEX IF EXISTS idx_user_settings_team_key;
-- DROP POLICY IF EXISTS "Users can manage their team's settings" ON user_settings;
-- CREATE POLICY "Users can manage their settings" ON user_settings FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- COMMIT;
