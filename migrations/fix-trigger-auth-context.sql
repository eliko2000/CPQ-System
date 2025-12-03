-- FIX TRIGGER: auth.uid() returns NULL in SECURITY DEFINER context
-- We must use NEW.created_by which is set by the frontend

CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- NEW.created_by is set by the frontend (TeamContext.tsx)
  -- Don't use auth.uid() here as it returns NULL in SECURITY DEFINER context
  IF NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'created_by must be set when creating a team';
  END IF;
  
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  
  RETURN NEW;
END;
$$;
