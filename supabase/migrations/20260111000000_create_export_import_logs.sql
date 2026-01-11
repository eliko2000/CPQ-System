-- Migration: create_export_import_logs.sql
-- Purpose: Create audit trail for export/import operations
-- Created: 2026-01-11
-- Feature: Import/Export System

-- ============================================================================
-- STEP 1: Create export_import_logs table
-- ============================================================================
CREATE TABLE IF NOT EXISTS export_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('export', 'import')),
  file_format TEXT NOT NULL CHECK (file_format IN ('json', 'excel', 'xml')),
  file_size_bytes BIGINT,
  record_counts JSONB,
  included_entities JSONB,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add comments for documentation
COMMENT ON TABLE export_import_logs IS 'Audit trail for all export and import operations';
COMMENT ON COLUMN export_import_logs.team_id IS 'Team that owns this operation';
COMMENT ON COLUMN export_import_logs.user_id IS 'User who initiated the operation';
COMMENT ON COLUMN export_import_logs.operation_type IS 'Type of operation: export or import';
COMMENT ON COLUMN export_import_logs.file_format IS 'File format used: json, excel, or xml';
COMMENT ON COLUMN export_import_logs.file_size_bytes IS 'Size of exported/imported file in bytes';
COMMENT ON COLUMN export_import_logs.record_counts IS 'JSON object with counts per entity type (components, assemblies, quotations)';
COMMENT ON COLUMN export_import_logs.included_entities IS 'JSON object indicating which entities were included (components, assemblies, quotations, settings, priceHistory, activityLogs, attachments)';
COMMENT ON COLUMN export_import_logs.status IS 'Operation status: started, completed, or failed';
COMMENT ON COLUMN export_import_logs.error_message IS 'Error message if operation failed';
COMMENT ON COLUMN export_import_logs.created_at IS 'When the operation started';
COMMENT ON COLUMN export_import_logs.completed_at IS 'When the operation completed (success or failure)';

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================
-- Index for team-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_export_import_logs_team_date
ON export_import_logs (team_id, created_at DESC);

-- Index for user history
CREATE INDEX IF NOT EXISTS idx_export_import_logs_user
ON export_import_logs (user_id, created_at DESC);

-- Index for filtering by operation type and status
CREATE INDEX IF NOT EXISTS idx_export_import_logs_type_status
ON export_import_logs (team_id, operation_type, status, created_at DESC);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE export_import_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Policy 1: Users can view logs for their team
CREATE POLICY "Users can view their team's export/import logs"
ON export_import_logs
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Only admins can create export/import logs
CREATE POLICY "Admins can create export/import logs"
ON export_import_logs
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 3: Only admins can update logs (for status changes)
CREATE POLICY "Admins can update export/import logs"
ON export_import_logs
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 4: System admins can delete old logs (cleanup)
CREATE POLICY "System admins can delete export/import logs"
ON export_import_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
    AND is_system_admin = true
  )
);

-- ============================================================================
-- STEP 5: Create helper function to calculate operation duration
-- ============================================================================
CREATE OR REPLACE FUNCTION get_export_import_duration(log_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  SELECT created_at, completed_at INTO start_time, end_time
  FROM export_import_logs
  WHERE id = log_id;

  IF end_time IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN end_time - start_time;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_export_import_duration IS 'Calculate duration of an export/import operation';

-- ============================================================================
-- STEP 6: Create view for export/import history with user details
-- ============================================================================
CREATE OR REPLACE VIEW export_import_history AS
SELECT
  eil.id,
  eil.team_id,
  eil.user_id,
  au.email as user_email,
  eil.operation_type,
  eil.file_format,
  eil.file_size_bytes,
  eil.record_counts,
  eil.included_entities,
  eil.status,
  eil.error_message,
  eil.created_at,
  eil.completed_at,
  EXTRACT(EPOCH FROM (COALESCE(eil.completed_at, NOW()) - eil.created_at)) * 1000 AS duration_ms
FROM export_import_logs eil
LEFT JOIN auth.users au ON eil.user_id = au.id;

COMMENT ON VIEW export_import_history IS 'Export/import logs with user details and calculated duration';

-- Grant access to the view (inherits RLS from base table)
GRANT SELECT ON export_import_history TO authenticated;

-- ============================================================================
-- STEP 7: Create function to log export operations
-- ============================================================================
CREATE OR REPLACE FUNCTION log_export_operation(
  p_team_id UUID,
  p_user_id UUID,
  p_file_format TEXT,
  p_file_size_bytes BIGINT,
  p_record_counts JSONB,
  p_included_entities JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO export_import_logs (
    team_id,
    user_id,
    operation_type,
    file_format,
    file_size_bytes,
    record_counts,
    included_entities,
    status
  ) VALUES (
    p_team_id,
    p_user_id,
    'export',
    p_file_format,
    p_file_size_bytes,
    p_record_counts,
    p_included_entities,
    'started'
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_export_operation IS 'Create a new export operation log entry';

-- ============================================================================
-- STEP 8: Create function to complete export/import operations
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_export_import_operation(
  p_log_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE export_import_logs
  SET
    status = p_status,
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_log_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION complete_export_import_operation IS 'Mark an export/import operation as completed or failed';

-- ============================================================================
-- VERIFICATION: Show table structure
-- ============================================================================
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'export_import_logs'
-- ORDER BY ordinal_position;

-- VERIFICATION: Check RLS policies
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'export_import_logs';
