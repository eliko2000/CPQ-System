-- Migration: Fix Activity Log Triggers
-- Purpose: Fix bugs in activity logging system
-- Created: 2026-01-03
--
-- Fixes:
-- 1. Prevent nested quotation update logs (only log direct changes)
-- 2. Add project name to quotation logs
-- 3. Support bulk import detection for components
-- 4. Add new action types: bulk_import, bulk_delete

-- ============================================================================
-- STEP 0: Add new action types to check constraint
-- ============================================================================
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check CHECK (action_type IN (
  'created',
  'updated',
  'deleted',
  'status_changed',
  'items_added',
  'items_removed',
  'items_updated',
  'parameters_changed',
  'bulk_update',
  'bulk_import',
  'bulk_delete',
  'imported',
  'exported',
  'version_created'
));

-- ============================================================================
-- STEP 1: Fix quotation trigger to prevent nested update logs
-- ============================================================================
CREATE OR REPLACE FUNCTION log_quotation_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_change_summary TEXT;
  v_change_details JSONB;
  v_action_type TEXT;
  v_entity_name TEXT;
  v_has_meaningful_change BOOLEAN := FALSE;
BEGIN
  -- Determine team_id
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  -- Handle different operation types
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'created';
    v_entity_name := NEW.quotation_number;

    -- Include project name if available
    IF NEW.project_name IS NOT NULL AND NEW.project_name != '' THEN
      v_entity_name := NEW.quotation_number || ' (פרויקט: ' || NEW.project_name || ')';
    END IF;

    v_change_summary := 'נוצרה הצעת מחיר ' || v_entity_name;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Check if this is a meaningful change (not just timestamp update)
    -- Only log if specific fields changed

    v_entity_name := NEW.quotation_number;
    IF NEW.project_name IS NOT NULL AND NEW.project_name != '' THEN
      v_entity_name := NEW.quotation_number || ' (פרויקט: ' || NEW.project_name || ')';
    END IF;

    -- Check if status changed
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_action_type := 'status_changed';
      v_change_summary := 'שינוי סטטוס: ' || OLD.status || ' ← ' || NEW.status;
      v_change_details := jsonb_build_object(
        'fields_changed', jsonb_build_array(
          jsonb_build_object(
            'field', 'status',
            'label', 'סטטוס',
            'old', OLD.status,
            'new', NEW.status
          )
        )
      );
      v_has_meaningful_change := TRUE;
    END IF;

    -- Check if margin changed
    IF (OLD.margin_percentage IS DISTINCT FROM NEW.margin_percentage) THEN
      v_action_type := COALESCE(v_action_type, 'parameters_changed');
      v_change_summary := COALESCE(v_change_summary, 'שינוי פרמטרים');
      v_change_details := COALESCE(v_change_details, jsonb_build_object('fields_changed', jsonb_build_array()));
      v_change_details := jsonb_set(
        v_change_details,
        '{fields_changed}',
        (v_change_details->'fields_changed') || jsonb_build_array(
          jsonb_build_object(
            'field', 'margin_percentage',
            'label', 'מרווח רווח',
            'old', OLD.margin_percentage,
            'new', NEW.margin_percentage
          )
        )
      );
      v_has_meaningful_change := TRUE;
    END IF;

    -- Check if USD exchange rate changed
    IF (OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate) THEN
      v_action_type := COALESCE(v_action_type, 'parameters_changed');
      v_change_summary := COALESCE(v_change_summary, 'שינוי פרמטרים');
      v_change_details := COALESCE(v_change_details, jsonb_build_object('fields_changed', jsonb_build_array()));
      v_change_details := jsonb_set(
        v_change_details,
        '{fields_changed}',
        (v_change_details->'fields_changed') || jsonb_build_array(
          jsonb_build_object(
            'field', 'exchange_rate',
            'label', 'שער USD/ILS',
            'old', OLD.exchange_rate,
            'new', NEW.exchange_rate
          )
        )
      );
      v_has_meaningful_change := TRUE;
    END IF;

    -- Check if EUR exchange rate changed
    IF (OLD.eur_to_ils_rate IS DISTINCT FROM NEW.eur_to_ils_rate) THEN
      v_action_type := COALESCE(v_action_type, 'parameters_changed');
      v_change_summary := COALESCE(v_change_summary, 'שינוי פרמטרים');
      v_change_details := COALESCE(v_change_details, jsonb_build_object('fields_changed', jsonb_build_array()));
      v_change_details := jsonb_set(
        v_change_details,
        '{fields_changed}',
        (v_change_details->'fields_changed') || jsonb_build_array(
          jsonb_build_object(
            'field', 'eur_to_ils_rate',
            'label', 'שער EUR/ILS',
            'old', OLD.eur_to_ils_rate,
            'new', NEW.eur_to_ils_rate
          )
        )
      );
      v_has_meaningful_change := TRUE;
    END IF;

    -- Check if customer name changed
    IF (OLD.customer_name IS DISTINCT FROM NEW.customer_name) THEN
      v_action_type := COALESCE(v_action_type, 'updated');
      v_change_summary := COALESCE(v_change_summary, 'עודכנה הצעת מחיר');
      v_change_details := COALESCE(v_change_details, jsonb_build_object('fields_changed', jsonb_build_array()));
      v_change_details := jsonb_set(
        v_change_details,
        '{fields_changed}',
        (v_change_details->'fields_changed') || jsonb_build_array(
          jsonb_build_object(
            'field', 'customer_name',
            'label', 'שם לקוח',
            'old', OLD.customer_name,
            'new', NEW.customer_name
          )
        )
      );
      v_has_meaningful_change := TRUE;
    END IF;

    -- Check if project name changed
    IF (OLD.project_name IS DISTINCT FROM NEW.project_name) THEN
      v_action_type := COALESCE(v_action_type, 'updated');
      v_change_summary := COALESCE(v_change_summary, 'עודכנה הצעת מחיר');
      v_change_details := COALESCE(v_change_details, jsonb_build_object('fields_changed', jsonb_build_array()));
      v_change_details := jsonb_set(
        v_change_details,
        '{fields_changed}',
        (v_change_details->'fields_changed') || jsonb_build_array(
          jsonb_build_object(
            'field', 'project_name',
            'label', 'שם פרויקט',
            'old', OLD.project_name,
            'new', NEW.project_name
          )
        )
      );
      v_has_meaningful_change := TRUE;
    END IF;

    -- If no meaningful change detected, skip logging
    IF NOT v_has_meaningful_change THEN
      RETURN NEW;
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'deleted';
    v_entity_name := OLD.quotation_number;
    IF OLD.project_name IS NOT NULL AND OLD.project_name != '' THEN
      v_entity_name := OLD.quotation_number || ' (פרויקט: ' || OLD.project_name || ')';
    END IF;
    v_change_summary := 'נמחקה הצעת מחיר ' || v_entity_name;
  END IF;

  -- Log the activity
  PERFORM log_activity(
    v_team_id,
    'quotation',
    COALESCE(NEW.id, OLD.id),
    v_entity_name,
    v_action_type,
    v_change_summary,
    v_change_details
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS log_quotation_activity_trigger ON quotations;
CREATE TRIGGER log_quotation_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON quotations
FOR EACH ROW
EXECUTE FUNCTION log_quotation_activity();

-- ============================================================================
-- STEP 2: Add bulk import support to component trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION log_component_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_change_summary TEXT;
  v_action_type TEXT;
  v_recent_inserts INTEGER;
BEGIN
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  IF (TG_OP = 'INSERT') THEN
    -- Check if this is part of a bulk import (multiple components created in last 5 seconds)
    SELECT COUNT(*) INTO v_recent_inserts
    FROM activity_logs
    WHERE team_id = v_team_id
      AND entity_type = 'component'
      AND action_type = 'created'
      AND created_at > NOW() - INTERVAL '5 seconds';

    -- Skip individual logs if bulk import is detected (logged separately by service)
    -- This prevents spam when importing multiple components
    IF v_recent_inserts > 3 THEN
      RETURN NEW;
    END IF;

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

-- ============================================================================
-- STEP 3: Update project trigger with Hebrew
-- ============================================================================
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_change_summary TEXT;
  v_action_type TEXT;
BEGIN
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'created';
    v_change_summary := 'נוצר פרויקט: ' || NEW.project_name;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'updated';
    v_change_summary := 'עודכן פרויקט: ' || NEW.project_name;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'deleted';
    v_change_summary := 'נמחק פרויקט: ' || OLD.project_name;
  END IF;

  PERFORM log_activity(
    v_team_id,
    'project',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.project_name, OLD.project_name),
    v_action_type,
    v_change_summary
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS log_project_activity_trigger ON projects;
CREATE TRIGGER log_project_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION log_project_activity();
