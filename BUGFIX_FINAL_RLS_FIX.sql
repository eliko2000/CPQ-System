-- FINAL COMPREHENSIVE FIX FOR QUOTATIONS AND USER TABLE CONFIGS
-- Run this entire script in Supabase SQL Editor

-- ============================================================================
-- PART 1: FIX USER_TABLE_CONFIGS UNIQUE CONSTRAINT
-- ============================================================================

-- Drop old constraint
ALTER TABLE user_table_configs DROP CONSTRAINT IF EXISTS user_table_configs_user_id_table_name_key;
ALTER TABLE user_table_configs DROP CONSTRAINT IF EXISTS unique_user_setting;

-- Add correct constraint with team_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_table_configs_user_team_table_key'
    ) THEN
        ALTER TABLE user_table_configs
        ADD CONSTRAINT user_table_configs_user_team_table_key
        UNIQUE(user_id, team_id, table_name);
    END IF;
END $$;

-- ============================================================================
-- PART 2: FIX QUOTATIONS RLS POLICIES (TEMPORARILY PERMISSIVE)
-- ============================================================================
-- NOTE: These policies are permissive to work around JWT attachment issue
-- Once JWT issue is resolved, switch to team-based policies

-- Drop all existing quotation policies
DROP POLICY IF EXISTS "Enable all operations for quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can view quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can insert quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can update quotations" ON quotations;
DROP POLICY IF EXISTS "Team members can delete quotations" ON quotations;

-- Create permissive policies that work even without JWT
CREATE POLICY "Allow all authenticated users to view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete quotations"
  ON quotations FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 3: FIX QUOTATION_SYSTEMS RLS POLICIES (TEMPORARILY PERMISSIVE)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all operations for quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can view quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can insert quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can update quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Team members can delete quotation_systems" ON quotation_systems;

CREATE POLICY "Allow all authenticated users to view quotation_systems"
  ON quotation_systems FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert quotation_systems"
  ON quotation_systems FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update quotation_systems"
  ON quotation_systems FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete quotation_systems"
  ON quotation_systems FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 4: FIX QUOTATION_ITEMS RLS POLICIES (TEMPORARILY PERMISSIVE)
-- ============================================================================

DROP POLICY IF EXISTS "Enable all operations for quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can view quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can insert quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can update quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Team members can delete quotation_items" ON quotation_items;

CREATE POLICY "Allow all authenticated users to view quotation_items"
  ON quotation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert quotation_items"
  ON quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update quotation_items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete quotation_items"
  ON quotation_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('quotations', 'quotation_systems', 'quotation_items')
ORDER BY tablename, policyname;

-- Check constraint was created
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'user_table_configs'::regclass;
