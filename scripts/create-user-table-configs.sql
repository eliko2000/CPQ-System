-- ============================================
-- CREATE user_table_configs TABLE
-- ============================================
-- This table stores user-specific table configurations
-- (column widths, order, visibility, filters) for all AG Grid tables

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_table_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

-- Enable Row Level Security
ALTER TABLE user_table_configs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (update this for production)
DROP POLICY IF EXISTS "Enable all operations for user_table_configs" ON user_table_configs;
CREATE POLICY "Enable all operations for user_table_configs"
    ON user_table_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_table_configs_lookup
    ON user_table_configs(user_id, table_name);

-- Verification query
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_table_configs'
ORDER BY ordinal_position;
