-- Fix team_members RLS policies to allow team admins to add members
-- The issue: The policy checks if the user is an admin, but this check might be failing

-- Drop existing policies
DROP POLICY IF EXISTS "Team admins can add team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can remove team members" ON team_members;

-- Recreate INSERT policy: Team admins can add members
-- Use a more explicit check that handles the case properly
CREATE POLICY "Team admins can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- Recreate UPDATE policy: Team admins can update members
CREATE POLICY "Team admins can update team members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- Recreate DELETE policy: Team admins can remove members
CREATE POLICY "Team admins can remove team members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- Verify RLS is enabled
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
