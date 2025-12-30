-- Fix RLS policies for user_settings table
-- Allow users to manage their own settings

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;

-- Enable RLS if not already enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy allowing users to SELECT their own settings
CREATE POLICY "Users can view own settings"
ON user_settings
FOR SELECT
USING (auth.uid()::text = user_id);

-- Create policy allowing users to INSERT their own settings
CREATE POLICY "Users can insert own settings"
ON user_settings
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Create policy allowing users to UPDATE their own settings
CREATE POLICY "Users can update own settings"
ON user_settings
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Create policy allowing users to DELETE their own settings
CREATE POLICY "Users can delete own settings"
ON user_settings
FOR DELETE
USING (auth.uid()::text = user_id);
