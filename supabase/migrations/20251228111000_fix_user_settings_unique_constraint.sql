-- Fix user_settings unique constraint for upsert operations
-- The saveNumberingConfig function uses ON CONFLICT (user_id, setting_key)
-- but this constraint doesn't exist

-- First, remove duplicate entries (keep the most recent one)
DELETE FROM user_settings a
USING user_settings b
WHERE a.user_id = b.user_id
  AND a.setting_key = b.setting_key
  AND a.id < b.id;

-- Drop existing constraint if exists
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS user_settings_user_id_setting_key_key;

-- Add unique constraint on (user_id, setting_key) for upsert to work
ALTER TABLE user_settings
ADD CONSTRAINT user_settings_user_id_setting_key_key
UNIQUE (user_id, setting_key);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key
ON user_settings(user_id, setting_key);
