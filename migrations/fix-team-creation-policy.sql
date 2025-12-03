-- FIX TEAM CREATION CHICKEN-EGG PROBLEM
-- The issue: trigger tries to add creator as admin, but policy requires being admin first!

-- ============================================================================
-- STEP 1: Fix team_members INSERT policy to allow self-insertion
-- ============================================================================

DROP POLICY IF EXISTS "Team admins can add team members" ON team_members;

CREATE POLICY "Team admins can add team members"
  ON team_members FOR INSERT
  WITH CHECK (
    -- Allow adding yourself as a member (for team creation)
    user_id = auth.uid()
    OR
    -- Or you must be an admin of the team to add others
    team_id IN (
      SELECT team_id FROM get_user_teams(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_members.team_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 2: Update the trigger to use created_by field
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as an admin member of the new team
  -- Use created_by if available, otherwise fall back to auth.uid()
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin');
  ELSE
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'admin');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger is already created from the previous script, so no need to recreate it
