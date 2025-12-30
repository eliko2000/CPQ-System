-- Migration: add-action-tracking-fields.sql
-- Purpose: Add fields for action-oriented dashboard (follow-up dates, priority, status tracking)
-- Created: 2024-12-28

-- ============================================================================
-- STEP 1: Add follow_up_date for reminder tracking
-- ============================================================================
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS follow_up_date DATE;

COMMENT ON COLUMN quotations.follow_up_date IS 'Date for follow-up reminder on this quotation';

-- ============================================================================
-- STEP 2: Add priority field for urgency tracking
-- ============================================================================
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS priority TEXT
CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
DEFAULT 'medium';

COMMENT ON COLUMN quotations.priority IS 'Priority level: low, medium, high, urgent';

-- ============================================================================
-- STEP 3: Add status_changed_at for tracking status transitions
-- ============================================================================
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN quotations.status_changed_at IS 'Timestamp of last status change';

-- ============================================================================
-- STEP 4: Create index for dashboard queries
-- This index optimizes the "needs attention" queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quotations_dashboard
ON quotations (team_id, status, valid_until_date, follow_up_date, priority);

-- ============================================================================
-- STEP 5: Create trigger to auto-update status_changed_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_quotation_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS quotation_status_changed_trigger ON quotations;

CREATE TRIGGER quotation_status_changed_trigger
BEFORE UPDATE ON quotations
FOR EACH ROW
EXECUTE FUNCTION update_quotation_status_changed_at();

-- ============================================================================
-- STEP 6: Initialize status_changed_at for existing quotations
-- Set to created_at for quotations that don't have it set
-- ============================================================================
UPDATE quotations
SET status_changed_at = created_at
WHERE status_changed_at IS NULL;

-- ============================================================================
-- VERIFICATION: Show the new columns
-- ============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'quotations'
--   AND column_name IN ('follow_up_date', 'priority', 'status_changed_at');
