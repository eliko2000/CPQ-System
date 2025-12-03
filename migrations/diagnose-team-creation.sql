-- COMPREHENSIVE DIAGNOSTIC FOR TEAM CREATION ISSUE

-- 1. Check if RLS is enabled on teams table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'teams' AND schemaname = 'public';

-- 2. List ALL policies on teams table (to see if there's a hidden restrictive one)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY cmd, policyname;

-- 3. Check what role the current session is using
SELECT current_user, session_user, current_role;

-- 4. Try to manually insert a team AS THE AUTHENTICATED USER
-- Replace 'YOUR_USER_ID' with your actual user ID: d938d248-830a-49b2-a8af-56130018ead0
-- This will tell us if the policy is the issue or something else

-- First, let's see if we can insert without created_by
INSERT INTO teams (name, slug)
VALUES ('Test Team Manual', 'test-team-manual')
RETURNING *;

-- If that works, try with created_by
-- INSERT INTO teams (name, slug, created_by)
-- VALUES ('Test Team With Creator', 'test-with-creator', 'd938d248-830a-49b2-a8af-56130018ead0'::uuid)
-- RETURNING *;

-- Clean up test data after
-- DELETE FROM teams WHERE slug LIKE 'test-%';
