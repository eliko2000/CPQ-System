-- CRITICAL TEST: Test INSERT as the 'authenticated' role (what the API uses)
-- This simulates exactly what happens when your frontend makes the API call

-- First, check what the current role is
SELECT current_user, current_role;

-- Now, try to insert AS the authenticated role with a specific user
-- This uses Supabase's auth.uid() function to simulate an authenticated user

-- Set the JWT claims to simulate being your user
SET request.jwt.claims = '{"sub": "d938d248-830a-49b2-a8af-56130018ead0", "role": "authenticated"}';

-- Now try the insert (this should use RLS with authenticated role)
INSERT INTO teams (name, slug, created_by)
VALUES ('Test As Authenticated', 'test-as-auth', 'd938d248-830a-49b2-a8af-56130018ead0'::uuid)
RETURNING *;

-- Reset the session
RESET request.jwt.claims;

-- Clean up
-- DELETE FROM teams WHERE slug LIKE 'test-%';
