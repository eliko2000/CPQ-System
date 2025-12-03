-- Fix missing relationship between team_members and user_profiles
-- This is required for PostgREST to allow joining team_members with user_profiles

-- Drop existing constraint if it exists (to make this migration idempotent)
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS fk_team_members_profile;

-- Add explicit foreign key from team_members.user_id to user_profiles.id
-- This allows the query: .select('*, user:user_profiles(*)')
ALTER TABLE team_members
ADD CONSTRAINT fk_team_members_profile
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Verify the constraint
COMMENT ON CONSTRAINT fk_team_members_profile ON team_members IS 'Enables PostgREST join between team_members and user_profiles';
