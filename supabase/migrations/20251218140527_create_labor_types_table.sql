-- Create labor_types table for Internal vs External Labor
-- This separates labor from the component library

-- Drop table if exists (for development/testing)
DROP TABLE IF EXISTS labor_types CASCADE;

-- Create labor_types table
CREATE TABLE labor_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  labor_subtype TEXT CHECK (labor_subtype IN ('engineering', 'commissioning', 'installation', 'programming')),

  -- ⭐ Internal vs External Labor Pricing
  is_internal_labor BOOLEAN DEFAULT true NOT NULL, -- Internal team uses dayWorkCost
  external_rate DECIMAL(10,2), -- Fixed rate for external contractors

  description TEXT,
  default_days DECIMAL(6,2) DEFAULT 1.0 NOT NULL, -- Suggested quantity (e.g., 0.5, 1, 2)
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraint: External labor must have a rate
  CONSTRAINT external_labor_must_have_rate CHECK (
    is_internal_labor = true OR external_rate IS NOT NULL
  )
);

-- Create indexes for performance
CREATE INDEX idx_labor_types_team ON labor_types(team_id);
CREATE INDEX idx_labor_types_active ON labor_types(is_active);
CREATE INDEX idx_labor_types_internal ON labor_types(is_internal_labor);
CREATE INDEX idx_labor_types_subtype ON labor_types(labor_subtype);

-- Enable Row Level Security
ALTER TABLE labor_types ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view labor types in their team
CREATE POLICY "Users can view labor types in their team"
  ON labor_types FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policy: Users can insert labor types in their team
CREATE POLICY "Users can insert labor types in their team"
  ON labor_types FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policy: Users can update labor types in their team
CREATE POLICY "Users can update labor types in their team"
  ON labor_types FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- RLS Policy: Users can delete labor types in their team
CREATE POLICY "Users can delete labor types in their team"
  ON labor_types FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Labor types table created successfully';
END $$;
