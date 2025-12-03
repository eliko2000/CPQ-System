-- TEMPORARY TEST: Disable RLS on teams table to see if that's the issue
-- WARNING: This makes the table accessible to everyone - only for testing!

ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- After testing team creation, RE-ENABLE IT with:
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
