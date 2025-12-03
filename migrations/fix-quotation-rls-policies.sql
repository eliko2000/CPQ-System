-- Fix Quotation RLS Policies
-- This script ensures quotations can be created with proper team isolation

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Team members can view quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can insert quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can update quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can delete quotations" ON quotations;

-- Create permissive policies for quotations
CREATE POLICY "Team members can view quotations"
  ON quotations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert quotations"
  ON quotations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quotations"
  ON quotations FOR UPDATE
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

CREATE POLICY "Team members can delete quotations"
  ON quotations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Also update quotation_systems and quotation_items policies
DROP POLICY IF EXISTS "Team members can view quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can insert quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can update quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can delete quotation_systems" ON quotation_systems;

CREATE POLICY "Team members can view quotation_systems"
  ON quotation_systems FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert quotation_systems"
  ON quotation_systems FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quotation_systems"
  ON quotation_systems FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete quotation_systems"
  ON quotation_systems FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Quotation items policies
DROP POLICY IF EXISTS "Team members can view quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can insert quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can update quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can delete quotation_items" ON quotation_items;

CREATE POLICY "Team members can view quotation_items"
  ON quotation_items FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert quotation_items"
  ON quotation_items FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quotation_items"
  ON quotation_items FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete quotation_items"
  ON quotation_items FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );
