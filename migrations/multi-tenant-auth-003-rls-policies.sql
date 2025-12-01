-- Multi-Tenant Authentication System - Part 3: Row-Level Security Policies
-- This migration replaces permissive RLS policies with team-based security
-- Run this AFTER multi-tenant-auth-002-add-team-isolation.sql

-- ============================================================================
-- DROP EXISTING PERMISSIVE POLICIES
-- ============================================================================

-- Components
DROP POLICY IF EXISTS "Enable all operations for components" ON components;

-- Assemblies
DROP POLICY IF EXISTS "Enable all operations for assemblies" ON assemblies;
DROP POLICY IF EXISTS "Enable all operations for assembly_components" ON assembly_components;

-- Quotations
DROP POLICY IF EXISTS "Enable all operations for quotations" ON quotations;
DROP POLICY IF EXISTS "Enable all operations for quotation_systems" ON quotation_systems;
DROP POLICY IF EXISTS "Enable all operations for quotation_items" ON quotation_items;

-- Projects (if exists)
DROP POLICY IF EXISTS "Enable all operations for projects" ON projects;

-- User configs
DROP POLICY IF EXISTS "Enable all operations for user_table_configs" ON user_table_configs;
DROP POLICY IF EXISTS "Enable all operations for user_settings" ON user_settings;

-- ============================================================================
-- COMPONENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Team members can view components"
  ON components FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert components"
  ON components FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update components"
  ON components FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete components"
  ON components FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- ASSEMBLIES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Team members can view assemblies"
  ON assemblies FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert assemblies"
  ON assemblies FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update assemblies"
  ON assemblies FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete assemblies"
  ON assemblies FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- ASSEMBLY COMPONENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Team members can view assembly components"
  ON assembly_components FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert assembly components"
  ON assembly_components FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update assembly components"
  ON assembly_components FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete assembly components"
  ON assembly_components FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUOTATIONS TABLE POLICIES
-- ============================================================================

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
  );

CREATE POLICY "Team members can delete quotations"
  ON quotations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUOTATION SYSTEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Team members can view quotation systems"
  ON quotation_systems FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert quotation systems"
  ON quotation_systems FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quotation systems"
  ON quotation_systems FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete quotation systems"
  ON quotation_systems FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUOTATION ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Team members can view quotation items"
  ON quotation_items FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert quotation items"
  ON quotation_items FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update quotation items"
  ON quotation_items FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete quotation items"
  ON quotation_items FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PROJECTS TABLE POLICIES (if table exists)
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    EXECUTE 'CREATE POLICY "Team members can view projects"
      ON projects FOR SELECT
      USING (
        team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "Team members can insert projects"
      ON projects FOR INSERT
      WITH CHECK (
        team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "Team members can update projects"
      ON projects FOR UPDATE
      USING (
        team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "Team members can delete projects"
      ON projects FOR DELETE
      USING (
        team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- ============================================================================
-- USER TABLE CONFIGS POLICIES
-- ============================================================================
-- Allow users to manage their own configs (team-specific or global)

CREATE POLICY "Users can view their own table configs"
  ON user_table_configs FOR SELECT
  USING (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global config
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own table configs"
  ON user_table_configs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global config
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own table configs"
  ON user_table_configs FOR UPDATE
  USING (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global config
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own table configs"
  ON user_table_configs FOR DELETE
  USING (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global config
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- USER SETTINGS POLICIES
-- ============================================================================
-- Allow users to manage their own settings (team-specific or global)

CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global setting
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global setting
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global setting
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own settings"
  ON user_settings FOR DELETE
  USING (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global setting
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- TEAMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team admins can update teams"
  ON teams FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team admins can delete teams"
  ON teams FOR DELETE
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- TEAM MEMBERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team admins can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team admins can update team members"
  ON team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team admins can remove team members"
  ON team_members FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- USER PROFILES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view all user profiles"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- TEAM INVITATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view invitations for their teams"
  ON team_invitations FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team admins can update invitations"
  ON team_invitations FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team admins can delete invitations"
  ON team_invitations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- FEATURE FLAGS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  USING (true);

CREATE POLICY "System admins can manage feature flags"
  ON feature_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_system_admin = true
    )
  );

-- ============================================================================
-- TEAM FEATURE ACCESS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Team members can view their team feature access"
  ON team_feature_access FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "System admins can manage team feature access"
  ON team_feature_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND is_system_admin = true
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify policies were created:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Verify permissive policies are dropped (should return 0):
-- SELECT COUNT(*) FROM pg_policies 
-- WHERE policyname LIKE '%Enable all operations%';
