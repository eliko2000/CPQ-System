-- Multi-Tenant Authentication System - Part 2: Add Team Isolation
-- This migration adds team_id columns to all existing tables
-- Run this AFTER multi-tenant-auth-001-core-tables.sql

-- ============================================================================
-- HANDLE EXISTING DATA
-- ============================================================================
-- You have two options for handling existing data:
-- OPTION 1: Delete all existing data (recommended for fresh start)
-- OPTION 2: Create a default team and assign all existing data to it

-- CHOOSE ONE OPTION BELOW AND UNCOMMENT IT:

-- ============================================================================
-- OPTION 1: DELETE ALL EXISTING DATA (RECOMMENDED FOR FRESH START)
-- ============================================================================
-- Uncomment these lines to delete all existing data:

-- DELETE FROM quotation_items;
-- DELETE FROM quotation_systems;
-- DELETE FROM quotations;
-- DELETE FROM assembly_components;
-- DELETE FROM assemblies;
-- DELETE FROM components;
-- DELETE FROM user_table_configs;
-- DELETE FROM user_settings;
-- DO $$ 
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_schema = 'public' AND table_name = 'projects'
--   ) THEN
--     DELETE FROM projects;
--   END IF;
-- END $$;

-- ============================================================================
-- OPTION 2: CREATE DEFAULT TEAM AND MIGRATE EXISTING DATA
-- ============================================================================
-- Uncomment these lines to create a default team and migrate data:

-- -- Create a default team (you can change the name)
-- INSERT INTO teams (id, name, slug, created_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   'Default Team',
--   'default-team',
--   NOW()
-- )
-- ON CONFLICT (id) DO NOTHING;

-- -- Note: You'll need to manually add users to this team after they sign up
-- -- Or you can add a specific user now if you know their user_id:
-- -- INSERT INTO team_members (team_id, user_id, role)
-- -- VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'YOUR_USER_ID'::uuid, 'admin');

-- ============================================================================
-- ADD TEAM_ID COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Components table
ALTER TABLE components 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_components_team_id ON components(team_id);

-- Assemblies table
ALTER TABLE assemblies 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_assemblies_team_id ON assemblies(team_id);

-- Assembly components table (inherits team isolation from assemblies)
ALTER TABLE assembly_components 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_assembly_components_team_id ON assembly_components(team_id);

-- Quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quotations_team_id ON quotations(team_id);

-- Quotation systems table
ALTER TABLE quotation_systems 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quotation_systems_team_id ON quotation_systems(team_id);

-- Quotation items table
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quotation_items_team_id ON quotation_items(team_id);

-- Projects table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
  END IF;
END $$;

-- User table configs (can be team-specific or global)
ALTER TABLE user_table_configs 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_table_configs_team_id ON user_table_configs(team_id);

-- User settings (can be team-specific or global)
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_settings_team_id ON user_settings(team_id);

-- ============================================================================
-- MIGRATE EXISTING DATA TO DEFAULT TEAM (IF USING OPTION 2)
-- ============================================================================
-- Uncomment these lines if you chose OPTION 2 above:

-- UPDATE components SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- UPDATE assemblies SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- UPDATE assembly_components SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- UPDATE quotations SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- UPDATE quotation_systems SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- UPDATE quotation_items SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- DO $$ 
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_schema = 'public' AND table_name = 'projects'
--   ) THEN
--     UPDATE projects SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
--   END IF;
-- END $$;

-- ============================================================================
-- SET NOT NULL CONSTRAINTS
-- ============================================================================
-- Only run after data is deleted OR migrated to default team

-- Data tables require team_id
ALTER TABLE components ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE assemblies ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE assembly_components ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE quotations ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE quotation_systems ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE quotation_items ALTER COLUMN team_id SET NOT NULL;

-- Projects table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects ALTER COLUMN team_id SET NOT NULL;
  END IF;
END $$;

-- Config tables can have NULL team_id for global configs
-- user_table_configs.team_id can be NULL (global config)
-- user_settings.team_id can be NULL (global settings)

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify team_id columns were added:
-- SELECT table_name, column_name, is_nullable, data_type
-- FROM information_schema.columns 
-- WHERE column_name = 'team_id' 
-- AND table_schema = 'public'
-- ORDER BY table_name;

-- Verify no NULL values in data tables:
-- SELECT 
--   'components' as table_name, COUNT(*) as null_count FROM components WHERE team_id IS NULL
-- UNION ALL
-- SELECT 'assemblies', COUNT(*) FROM assemblies WHERE team_id IS NULL
-- UNION ALL
-- SELECT 'quotations', COUNT(*) FROM quotations WHERE team_id IS NULL;
-- All counts should be 0

