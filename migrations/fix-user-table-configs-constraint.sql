-- Fix user_table_configs table to add team_id and correct unique constraint
-- This fixes the "42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification" error

-- STEP 1: Drop all RLS policies first (they prevent column type changes)
DROP POLICY IF EXISTS "Enable all operations for user_table_configs" ON user_table_configs;
DROP POLICY IF EXISTS "Users can view their own table configs" ON user_table_configs;
DROP POLICY IF EXISTS "Users can insert their own table configs" ON user_table_configs;
DROP POLICY IF EXISTS "Users can update their own table configs" ON user_table_configs;
DROP POLICY IF EXISTS "Users can delete their own table configs" ON user_table_configs;
DROP POLICY IF EXISTS user_table_configs_policy ON user_table_configs;

-- STEP 2: Drop the old unique constraint if it exists
ALTER TABLE user_table_configs DROP CONSTRAINT IF EXISTS user_table_configs_user_id_table_name_key;
ALTER TABLE user_table_configs DROP CONSTRAINT IF EXISTS user_table_configs_unique_constraint;

-- STEP 3: Add team_id column if it doesn't exist
ALTER TABLE user_table_configs ADD COLUMN IF NOT EXISTS team_id UUID;

-- STEP 4: Update user_id to UUID if it's TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_table_configs'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Now safe to alter since policies are dropped
    ALTER TABLE user_table_configs ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;
END $$;

-- Create the correct unique constraint that matches ON CONFLICT clause
-- This must match: on_conflict=user_id,team_id,table_name
ALTER TABLE user_table_configs
  DROP CONSTRAINT IF EXISTS user_table_configs_unique_constraint;

ALTER TABLE user_table_configs
  ADD CONSTRAINT user_table_configs_unique_constraint
  UNIQUE(user_id, team_id, table_name);

-- Add foreign key constraints if they don't exist
ALTER TABLE user_table_configs
  DROP CONSTRAINT IF EXISTS fk_user_table_configs_user;

ALTER TABLE user_table_configs
  ADD CONSTRAINT fk_user_table_configs_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE user_table_configs
  DROP CONSTRAINT IF EXISTS fk_user_table_configs_team;

ALTER TABLE user_table_configs
  ADD CONSTRAINT fk_user_table_configs_team
  FOREIGN KEY (team_id)
  REFERENCES teams(id)
  ON DELETE CASCADE;

-- Recreate index for the new constraint
DROP INDEX IF EXISTS idx_user_table_configs_lookup;
CREATE INDEX idx_user_table_configs_lookup
  ON user_table_configs(user_id, team_id, table_name);

-- Update RLS policies to include team_id
DROP POLICY IF EXISTS "Enable all operations for user_table_configs" ON user_table_configs;

CREATE POLICY user_table_configs_policy ON user_table_configs
  FOR ALL
  USING (
    auth.uid() = user_id
    AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Verify the constraint
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_table_configs'::regclass
  AND contype = 'u';  -- unique constraints
