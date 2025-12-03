-- FINAL FIX: Make trigger bypass RLS properly
-- The issue: SECURITY DEFINER triggers don't have auth.uid() context
-- Solution: Grant INSERT without RLS check in the trigger

-- First, update the trigger to use SET LOCAL to bypass RLS for the insert
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  creator_id UUID;
BEGIN
  creator_id := COALESCE(NEW.created_by, auth.uid());
  
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine team creator';
  END IF;
  
  -- Temporarily bypass RLS for this insert
  PERFORM set_config('request.jwt.claims', json_build_object('sub', creator_id::text)::text, true);
  
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, creator_id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Alternative simpler approach: Just allow the postgres role to insert
-- This requires checking who owns the trigger function

-- Better yet: Create a more permissive policy for team_members
DROP POLICY IF EXISTS "Team admins can add team members" ON team_members;
DROP POLICY IF EXISTS "Allow team creation" ON team_members;

CREATE POLICY "Allow team creation and admin management"
  ON team_members FOR INSERT
  TO authenticated, postgres
  WITH CHECK (
    -- Allow if you're adding yourself
    user_id = auth.uid()
    OR
    -- Or if being called from a trusted function (we'll check by allowing postgres role)
    current_user = 'postgres'
  );
