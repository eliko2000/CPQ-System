-- ADD MISSING TRIGGER: Auto-add team creator as admin
-- When a team is created, the creator should automatically become an admin member

CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as an admin member of the new team
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_team_created_add_creator ON teams;

-- Create trigger on teams
CREATE TRIGGER on_team_created_add_creator
  AFTER INSERT ON teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();
