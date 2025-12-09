-- Fix infinite recursion in team_members RLS policies
-- Problem: The existing policies query team_members within the policy check,
-- causing infinite recursion when trying to verify admin status.
-- Solution: Use the is_team_admin() security definer function instead.

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Team admins can add team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can remove team members" ON team_members;

-- Recreate INSERT policy using is_team_admin() function
-- This avoids recursion by using SECURITY DEFINER function
CREATE POLICY "Team admins can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    is_team_admin(auth.uid(), team_id)
  );

-- Recreate UPDATE policy using is_team_admin() function
CREATE POLICY "Team admins can update team members"
  ON team_members FOR UPDATE
  USING (
    is_team_admin(auth.uid(), team_id)
  );

-- Recreate DELETE policy using is_team_admin() function
CREATE POLICY "Team admins can remove team members"
  ON team_members FOR DELETE
  USING (
    is_team_admin(auth.uid(), team_id)
  );

-- Keep existing SELECT policy (it doesn't have recursion issues)
-- Users can view members of their own teams
-- (This policy should already exist from a previous migration)

-- Verify RLS is enabled
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Verification query (run manually to check):
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'team_members';
