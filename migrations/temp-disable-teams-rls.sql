-- TEMPORARY: Disable RLS to confirm this is the issue
-- Run this, try creating a team, then immediately re-enable

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- After testing, RE-ENABLE with:
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
