-- FIX RLS RECURSION ISSUES
-- The previous RLS policies for team_members and teams caused infinite recursion
-- because they selected from the same table they were protecting without a security definer break.

-- ============================================================================
-- FIX TEAM MEMBERS POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;

CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    -- Use the security definer function to break recursion
    team_id IN (SELECT team_id FROM get_user_teams(auth.uid()))
  );

-- ============================================================================
-- FIX TEAMS POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their teams" ON teams;

CREATE POLICY "Users can view their teams"
  ON teams FOR SELECT
  USING (
    -- Use the security definer function to break recursion
    id IN (SELECT team_id FROM get_user_teams(auth.uid()))
    AND deleted_at IS NULL
  );

-- ============================================================================
-- FIX TEAM INVITATIONS POLICY (Just in case)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invitations for their teams" ON team_invitations;

CREATE POLICY "Users can view invitations for their teams"
  ON team_invitations FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM get_user_teams(auth.uid()))
  );
