-- Check if the problematic trigger still exists
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled
FROM pg_trigger 
WHERE tgname = 'on_team_created_add_creator';

-- If it returns a row, run this to delete it:
-- DROP TRIGGER IF EXISTS on_team_created_add_creator ON teams;
