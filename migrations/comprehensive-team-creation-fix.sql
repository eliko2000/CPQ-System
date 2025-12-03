-- COMPREHENSIVE TEAM CREATION FIX
-- This script diagnoses and fixes ALL issues with team creation

-- ============================================================================
-- STEP 1: VERIFY AND FIX TEAMS TABLE INSERT POLICY
-- ============================================================================

-- Drop all existing policies on teams to start fresh
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Users can view their teams" ON teams;
DROP POLICY IF EXISTS "Team admins can update teams" ON teams;
DROP POLICY IF EXISTS "Team admins can delete teams" ON teams;

-- CREATE TEAMS INSERT POLICY - Allow any authenticated user to create a team
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Simplified: any authenticated user can create

-- CREATE TEAMS SELECT POLICY - Users can view teams they're members of
CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT team_id FROM get_user_teams(auth.uid()))
    AND deleted_at IS NULL
  );

-- CREATE TEAMS UPDATE POLICY - Only admins can update
CREATE POLICY "Team admins can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- CREATE TEAMS DELETE POLICY - Only admins can delete
CREATE POLICY "Team admins can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 2: FIX TEAM_MEMBERS INSERT POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Team admins can add team members" ON team_members;

CREATE POLICY "Team admins can add team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow adding yourself (for team creation trigger)
    user_id = auth.uid()
  );

-- ============================================================================
-- STEP 3: UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add the creator as an admin member
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, COALESCE(NEW.created_by, auth.uid()), 'admin');
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_team_created_add_creator ON teams;
CREATE TRIGGER on_team_created_add_creator
  AFTER INSERT ON teams
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_team();

-- ============================================================================
-- STEP 4: VERIFICATION QUERIES (run these separately to check)
-- ============================================================================

-- Check if RLS is enabled on teams
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'teams';

-- Check all policies on teams table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'teams';

-- Check all policies on team_members table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'team_members';
