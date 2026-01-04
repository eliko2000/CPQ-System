-- Migration: Suppress Individual Logs During Bulk Operations
-- Purpose: Prevent duplicate logs when bulk delete/import happens
-- Created: 2026-01-03

-- The issue: Bulk operations create ONE bulk log + individual logs for each item
-- Solution: Use PostgreSQL session variables to detect bulk operations

-- ============================================================================
-- STEP 1: Update component trigger to skip during bulk operations
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

  -- Check if we're in a bulk operation (session variable set by application)
  BEGIN
    v_in_bulk_operation := current_setting('app.in_bulk_operation', true)::boolean;
  EXCEPTION
    WHEN OTHERS THEN
      v_in_bulk_operation := false;
  END;

  -- Skip individual logging if in bulk operation
  IF v_in_bulk_operation THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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

-- Re-attach trigger
DROP TRIGGER IF EXISTS log_component_activity_trigger ON components;
CREATE TRIGGER log_component_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON components
FOR EACH ROW
EXECUTE FUNCTION log_component_activity();
