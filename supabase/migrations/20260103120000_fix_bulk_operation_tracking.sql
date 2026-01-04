-- Migration: Fix Bulk Operation Tracking (Connection Pool Safe)
-- Purpose: Use database table instead of session variables for bulk operation detection
-- Created: 2026-01-03
--
-- Why: PostgreSQL session variables don't work reliably with Supabase connection pooling.
-- Each DB operation may use a different connection from the pool, so session variables
-- set on one connection aren't visible to operations on other connections.
--
-- Solution: Use a database table to track active bulk operations (connection-independent)

-- ============================================================================
-- STEP 1: Create table to track active bulk operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_operations (
  operation_id TEXT PRIMARY KEY,
  team_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('import', 'delete', 'update')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bulk_operations_team_id ON bulk_operations(team_id);

-- Auto-cleanup: Delete old operations (safety fallback if frontend doesn't clean up)
CREATE OR REPLACE FUNCTION cleanup_old_bulk_operations()
RETURNS void AS $$
BEGIN
  DELETE FROM bulk_operations
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Update component trigger to check bulk_operations table
-- ============================================================================
CREATE OR REPLACE FUNCTION log_component_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_change_summary TEXT;
  v_action_type TEXT;
  v_in_bulk_operation BOOLEAN;
BEGIN
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  -- Check if we're in a bulk operation by looking in bulk_operations table
  SELECT EXISTS (
    SELECT 1 FROM bulk_operations
    WHERE team_id = v_team_id
    LIMIT 1
  ) INTO v_in_bulk_operation;

  -- Skip individual logging if in bulk operation
  IF v_in_bulk_operation THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Generate log entry based on operation type
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'created';
    v_change_summary := 'נוצר רכיב: ' || NEW.name;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'updated';
    v_change_summary := 'עודכן רכיב: ' || NEW.name;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'deleted';
    v_change_summary := 'נמחק רכיב: ' || OLD.name;
  END IF;

  -- Log the activity
  PERFORM log_activity(
    v_team_id,
    'component',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.name, OLD.name),
    v_action_type,
    v_change_summary
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (ensure it's active)
DROP TRIGGER IF EXISTS log_component_activity_trigger ON components;
CREATE TRIGGER log_component_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON components
FOR EACH ROW
EXECUTE FUNCTION log_component_activity();

-- ============================================================================
-- STEP 3: Helper functions for frontend to manage bulk operations
-- ============================================================================

-- Start a bulk operation (call before bulk import/delete)
CREATE OR REPLACE FUNCTION start_bulk_operation(
  p_operation_id TEXT,
  p_team_id UUID,
  p_operation_type TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO bulk_operations (operation_id, team_id, operation_type)
  VALUES (p_operation_id, p_team_id, p_operation_type)
  ON CONFLICT (operation_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End a bulk operation (call after bulk import/delete completes)
CREATE OR REPLACE FUNCTION end_bulk_operation(
  p_operation_id TEXT
)
RETURNS void AS $$
BEGIN
  DELETE FROM bulk_operations
  WHERE operation_id = p_operation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON bulk_operations TO authenticated;
