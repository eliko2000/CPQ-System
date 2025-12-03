-- Team Invitation Auto-Accept System
-- This migration creates a function that automatically adds users to teams
-- when they sign up with an email that has a pending invitation

-- Function to check and accept pending invitations on signup
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Look for pending invitations for this email
  FOR invitation_record IN
    SELECT id, team_id, email
    FROM team_invitations
    WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  LOOP
    -- Add user to the team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (invitation_record.team_id, NEW.id, 'member')
    ON CONFLICT (team_id, user_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE team_invitations
    SET status = 'accepted'
    WHERE id = invitation_record.id;
    
    RAISE LOG 'Auto-accepted invitation % for user %', invitation_record.id, NEW.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_accept_invitations ON user_profiles;

-- Create trigger that fires after a new user profile is created
CREATE TRIGGER trigger_accept_invitations
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_acceptance();

COMMENT ON FUNCTION handle_invitation_acceptance() IS 'Automatically accepts pending team invitations when a user signs up';
