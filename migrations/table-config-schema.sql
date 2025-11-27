-- Table configuration persistence
CREATE TABLE IF NOT EXISTS user_table_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL, -- 'component_library' or 'quotation_editor'
    config JSONB NOT NULL, -- stores: columnOrder, columnWidths, visibleColumns, filterState
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, table_name)
);

ALTER TABLE user_table_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for user_table_configs" ON user_table_configs FOR ALL USING (true) WITH CHECK (true);
