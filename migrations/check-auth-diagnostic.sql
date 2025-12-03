-- DIAGNOSTIC: Check if user is actually authenticated
-- Run this to see if Supabase recognizes your session

-- This should return your user ID if you're authenticated
SELECT auth.uid() as my_user_id;

-- This should return 'authenticated' if you're logged in
SELECT auth.role() as my_role;

-- This should show your session info
SELECT 
  auth.uid() as user_id,
  auth.role() as role,
  auth.email() as email;
