-- SIMPLEST FIX: Remove the trigger and do it in the frontend
-- The trigger is causing more problems than it solves

-- Drop the trigger
DROP TRIGGER IF EXISTS on_team_created_add_creator ON teams;

-- Keep the function in case we need it later, but don't use it
-- We'll handle adding the creator as admin in the frontend code
