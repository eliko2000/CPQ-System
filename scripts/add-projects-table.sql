-- CPQ System - Projects Feature Migration
-- Add projects table and update quotations to link with projects
-- Run this in your Supabase SQL Editor AFTER the main schema

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_name, project_name)
);

-- Add project_id to quotations table (nullable for backward compatibility)
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for efficient project-quotation lookups
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);

-- Enable Row Level Security for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for projects (allow all operations for now)
CREATE POLICY "Enable all operations for projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for projects updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for projects with quotation counts
CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id,
  p.company_name,
  p.project_name,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  COUNT(q.id) as quotation_count,
  MAX(q.updated_at) as last_quotation_update
FROM projects p
LEFT JOIN quotations q ON q.project_id = p.id
GROUP BY p.id, p.company_name, p.project_name, p.description, p.status, p.created_at, p.updated_at;

-- Grant access to the view
GRANT SELECT ON project_summary TO authenticated, anon;
