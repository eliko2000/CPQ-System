-- Fix RLS policy for user_profiles to allow authenticated users to view all profiles
-- This is required for the team member invitation feature

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view all user profiles" ON user_profiles;

-- Create policy that allows all authenticated users to view user profiles
-- This is safe because user_profiles only contains public information (email, name, avatar)
CREATE POLICY "Users can view all user profiles" 
ON user_profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Also ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
