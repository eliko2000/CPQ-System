-- Migration: create-activity-logs-system.sql
-- Purpose: Comprehensive activity logging with detailed change tracking
-- Created: 2026-01-02

-- ============================================================================
-- STEP 1: Drop and recreate activity_logs table (clean start)
-- ============================================================================
DROP TABLE IF EXISTS activity_logs CASCADE;

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Entity information
  entity_type TEXT NOT NULL CHECK (entity_type IN ('quotation', 'component', 'project')),
  entity_id UUID NOT NULL,
  entity_name TEXT, -- Quick reference: quotation number, component name, project name

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',
    'updated',
    'deleted',
    'status_changed',
    'items_added',
    'items_removed',
    'items_updated',
    'parameters_changed',
    'bulk_update',
    'imported',
    'exported',
    'version_created'
  )),

  -- Change details (JSONB for flexibility)
  change_summary TEXT NOT NULL, -- Human-readable: "Added 3 items to System 1"
  change_details JSONB, -- Detailed changes:
  -- {
  --   "items_added": [{"name": "Robot Arm", "quantity": 2}, ...],
  --   "fields_changed": [{"field": "markup_percentage", "old": 25, "new": 30, "label": "Markup"}],
  --   "parameters": {"usdToIlsRate": {"old": 3.70, "new": 3.75}},
  --   "bulk_changes": {"field": "supplier", "value": "Acme Corp", "count": 47}
  -- }

  -- Source tracking (for imports)
  source_file_name TEXT, -- Original filename: "supplier_quote_2024.xlsx"
  source_file_type TEXT, -- "excel", "pdf", "csv"
  source_metadata JSONB, -- AI extraction confidence, parser used, etc.

  -- User tracking
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for fast querying
-- ============================================================================
CREATE INDEX idx_activity_logs_team_id ON activity_logs(team_id);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_activity_logs_team_entity ON activity_logs(team_id, entity_type, entity_id);
CREATE INDEX idx_activity_logs_team_created ON activity_logs(team_id, created_at DESC);

-- GIN index for JSONB searching
CREATE INDEX idx_activity_logs_change_details ON activity_logs USING GIN (change_details);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activity logs for their team
CREATE POLICY "Users can view team activity logs"
  ON activity_logs
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert activity logs for their team
CREATE POLICY "Users can insert team activity logs"
  ON activity_logs
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Create helper function to log activity
-- ============================================================================
CREATE OR REPLACE FUNCTION log_activity(
  p_team_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_action_type TEXT,
  p_change_summary TEXT,
  p_change_details JSONB DEFAULT NULL,
  p_source_file_name TEXT DEFAULT NULL,
  p_source_file_type TEXT DEFAULT NULL,
  p_source_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user info
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT full_name INTO v_user_name FROM user_profiles WHERE id = auth.uid();

  -- Insert activity log
  INSERT INTO activity_logs (
    team_id,
    entity_type,
    entity_id,
    entity_name,
    action_type,
    change_summary,
    change_details,
    source_file_name,
    source_file_type,
    source_metadata,
    user_id,
    user_email,
    user_name
  ) VALUES (
    p_team_id,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action_type,
    p_change_summary,
    p_change_details,
    p_source_file_name,
    p_source_file_type,
    p_source_metadata,
    auth.uid(),
    v_user_email,
    v_user_name
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;

-- ============================================================================
-- STEP 5: Create triggers for automatic activity logging
-- ============================================================================

-- Trigger function for quotations
CREATE OR REPLACE FUNCTION log_quotation_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_change_summary TEXT;
  v_change_details JSONB;
  v_action_type TEXT;
BEGIN
  -- Determine team_id
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  -- Handle different operation types
  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'created';
    v_change_summary := 'Created quotation ' || NEW.quotation_number;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Check if status changed
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_action_type := 'status_changed';
      v_change_summary := 'Status changed: ' || OLD.status || ' → ' || NEW.status;
      v_change_details := jsonb_build_object(
        'fields_changed', jsonb_build_array(
          jsonb_build_object(
            'field', 'status',
            'label', 'Status',
            'old', OLD.status,
            'new', NEW.status
          )
        )
      );
    ELSE
      v_action_type := 'updated';
      v_change_summary := 'Updated quotation ' || NEW.quotation_number;

      -- Track specific field changes
      v_change_details := jsonb_build_object('fields_changed', jsonb_build_array());

      -- Track margin percentage changes
      IF (OLD.margin_percentage IS DISTINCT FROM NEW.margin_percentage) THEN
        v_change_details := jsonb_set(
          v_change_details,
          '{fields_changed}',
          (v_change_details->'fields_changed') || jsonb_build_array(
            jsonb_build_object(
              'field', 'margin_percentage',
              'label', 'Markup',
              'old', OLD.margin_percentage,
              'new', NEW.margin_percentage
            )
          )
        );
      END IF;

      -- Track exchange rate changes
      IF (OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate) THEN
        v_change_details := jsonb_set(
          v_change_details,
          '{fields_changed}',
          (v_change_details->'fields_changed') || jsonb_build_array(
            jsonb_build_object(
              'field', 'exchange_rate',
              'label', 'USD/ILS Rate',
              'old', OLD.exchange_rate,
              'new', NEW.exchange_rate
            )
          )
        );
      END IF;

      -- Track EUR exchange rate changes
      IF (OLD.eur_to_ils_rate IS DISTINCT FROM NEW.eur_to_ils_rate) THEN
        v_change_details := jsonb_set(
          v_change_details,
          '{fields_changed}',
          (v_change_details->'fields_changed') || jsonb_build_array(
            jsonb_build_object(
              'field', 'eur_to_ils_rate',
              'label', 'EUR/ILS Rate',
              'old', OLD.eur_to_ils_rate,
              'new', NEW.eur_to_ils_rate
            )
          )
        );
      END IF;
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'deleted';
    v_change_summary := 'Deleted quotation ' || OLD.quotation_number;
  END IF;

  -- Log the activity
  PERFORM log_activity(
    v_team_id,
    'quotation',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.quotation_number, OLD.quotation_number),
    v_action_type,
    v_change_summary,
    v_change_details
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to quotations table
DROP TRIGGER IF EXISTS log_quotation_activity_trigger ON quotations;
CREATE TRIGGER log_quotation_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON quotations
FOR EACH ROW
EXECUTE FUNCTION log_quotation_activity();

-- ============================================================================
-- STEP 6: Trigger function for components
-- ============================================================================
CREATE OR REPLACE FUNCTION log_component_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_change_summary TEXT;
  v_action_type TEXT;
BEGIN
  v_team_id := COALESCE(NEW.team_id, OLD.team_id);

  IF (TG_OP = 'INSERT') THEN
    v_action_type := 'created';
    v_change_summary := 'Created component: ' || NEW.name;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'updated';
    v_change_summary := 'Updated component: ' || NEW.name;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'deleted';
    v_change_summary := 'Deleted component: ' || OLD.name;
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

DROP TRIGGER IF EXISTS log_component_activity_trigger ON components;
CREATE TRIGGER log_component_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON components
FOR EACH ROW
EXECUTE FUNCTION log_component_activity();

-- ============================================================================
-- STEP 7: Trigger function for projects
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
    v_change_summary := 'Created project: ' || NEW.project_name;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_action_type := 'updated';
    v_change_summary := 'Updated project: ' || NEW.project_name;

  ELSIF (TG_OP = 'DELETE') THEN
    v_action_type := 'deleted';
    v_change_summary := 'Deleted project: ' || OLD.project_name;
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

DROP TRIGGER IF EXISTS log_project_activity_trigger ON projects;
CREATE TRIGGER log_project_activity_trigger
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION log_project_activity();

-- ============================================================================
-- STEP 8: Grant permissions
-- ============================================================================
GRANT SELECT, INSERT ON activity_logs TO authenticated;
