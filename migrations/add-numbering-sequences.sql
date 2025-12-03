-- Add Project and Quotation Numbering Sequences
-- This migration adds support for customizable project and quotation numbering

-- Step 1: Add project_number column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_number TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON projects(project_number);

-- Step 2: Create numbering_sequences table to track counters per team
CREATE TABLE IF NOT EXISTS numbering_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('project', 'quotation')),
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, sequence_type)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_numbering_sequences_team_type ON numbering_sequences(team_id, sequence_type);

-- Enable Row Level Security
ALTER TABLE numbering_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for numbering_sequences (team-isolated)
CREATE POLICY "Team members can access their numbering sequences"
  ON numbering_sequences
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_numbering_sequences_updated_at ON numbering_sequences;
CREATE TRIGGER update_numbering_sequences_updated_at
BEFORE UPDATE ON numbering_sequences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Create function to generate next project number
CREATE OR REPLACE FUNCTION generate_project_number(p_team_id UUID, p_prefix TEXT, p_padding INTEGER, p_separator TEXT)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
  project_number TEXT;
BEGIN
  -- Get and increment the sequence (with row-level lock to prevent race conditions)
  INSERT INTO numbering_sequences (team_id, sequence_type, current_value)
  VALUES (p_team_id, 'project', 1)
  ON CONFLICT (team_id, sequence_type)
  DO UPDATE SET
    current_value = numbering_sequences.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO next_number;

  -- Format the number with padding (e.g., 0001, 0002)
  formatted_number := LPAD(next_number::TEXT, p_padding, '0');

  -- Construct the project number (e.g., PRJ-0001)
  project_number := p_prefix || p_separator || formatted_number;

  RETURN project_number;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to generate next quotation number
CREATE OR REPLACE FUNCTION generate_quotation_number(
  p_team_id UUID,
  p_project_number TEXT,
  p_quotation_prefix TEXT,
  p_padding INTEGER,
  p_separator TEXT
)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
  quotation_number TEXT;
  quotation_count INTEGER;
BEGIN
  -- Count existing quotations for this project
  SELECT COUNT(*) INTO quotation_count
  FROM quotations
  WHERE project_id = (SELECT id FROM projects WHERE project_number = p_project_number AND team_id = p_team_id)
  AND team_id = p_team_id;

  -- Next quotation number for this project
  next_number := quotation_count + 1;

  -- Format the number with padding (e.g., 001, 002)
  formatted_number := LPAD(next_number::TEXT, p_padding, '0');

  -- Construct the quotation number (e.g., PRJ-0001-QT-001)
  quotation_number := p_project_number || p_separator || p_quotation_prefix || p_separator || formatted_number;

  RETURN quotation_number;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Add comment documentation
COMMENT ON TABLE numbering_sequences IS 'Tracks sequence counters for project and quotation numbering per team';
COMMENT ON FUNCTION generate_project_number IS 'Generates next project number with custom prefix and padding';
COMMENT ON FUNCTION generate_quotation_number IS 'Generates next quotation number including project number';

-- Step 6: Initialize default numbering settings for existing teams (if any)
-- This will be handled by the application when a team first configures their numbering
