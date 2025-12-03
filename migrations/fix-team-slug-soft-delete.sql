-- Fix team slug unique constraint to allow reusing slugs after soft delete
-- This allows the same team name/slug to be used again after a team is deleted

-- Drop the existing unique constraint on slug
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_slug_key;

-- Create a partial unique index that only enforces uniqueness for non-deleted teams
-- This allows soft-deleted teams to keep their slug while freeing it up for new teams
CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_unique_active 
ON teams (slug) 
WHERE deleted_at IS NULL;

-- Also update the regular index if it exists
DROP INDEX IF EXISTS idx_teams_slug;
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);

-- Verify the change
COMMENT ON INDEX teams_slug_unique_active IS 'Ensures slug uniqueness only for active (non-deleted) teams';
