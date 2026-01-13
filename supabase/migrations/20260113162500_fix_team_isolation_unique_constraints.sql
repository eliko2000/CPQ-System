-- Migration: Fix Team Isolation for UNIQUE Constraints
-- Created: 2026-01-13
-- Purpose: Make quotation numbers, project numbers, and project names team-scoped
--
-- CRITICAL: These constraints were globally unique, causing cross-team conflicts
-- during import/export operations. Now they're scoped per team.

BEGIN;

-- ============================================================================
-- FIX 1: Quotations - quotation_number + version should be unique PER TEAM
-- ============================================================================

-- Drop old global constraint
ALTER TABLE quotations
  DROP CONSTRAINT IF EXISTS quotations_quotation_number_version_key;

-- Add new team-scoped constraint
ALTER TABLE quotations
  ADD CONSTRAINT quotations_team_unique
  UNIQUE (team_id, quotation_number, version);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quotations_team_number_version
  ON quotations(team_id, quotation_number, version);

-- ============================================================================
-- FIX 2: Projects - project_number should be unique PER TEAM
-- ============================================================================

-- Drop old global constraint
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_project_number_key;

-- Add new team-scoped constraint
ALTER TABLE projects
  ADD CONSTRAINT projects_project_number_team_unique
  UNIQUE (team_id, project_number);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_team_number
  ON projects(team_id, project_number);

-- ============================================================================
-- FIX 3: Projects - company_name + project_name should be unique PER TEAM
-- ============================================================================

-- Drop old global constraint
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_company_name_project_name_key;

-- Add new team-scoped constraint
ALTER TABLE projects
  ADD CONSTRAINT projects_name_team_unique
  UNIQUE (team_id, company_name, project_name);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_team_company_name
  ON projects(team_id, company_name, project_name);

COMMIT;

-- Verification queries (commented out - run manually if needed):
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'quotations'::regclass;
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'projects'::regclass;
