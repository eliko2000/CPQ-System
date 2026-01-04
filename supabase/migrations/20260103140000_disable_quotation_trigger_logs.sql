-- Migration: Disable Automatic Quotation Update Logs
-- Purpose: Prevent duplicate/noise logs when quotation items/systems/parameters change
-- Created: 2026-01-03
--
-- Problem: Every quotation update triggers a log, even for nested changes (items, systems, parameters).
-- This creates noise in the activity feed because we log those changes explicitly via the app.
--
-- Solution: Disable the quotation trigger entirely. All quotation activity logging
-- is now handled explicitly by the application code via activityLogService functions.

-- ============================================================================
-- Disable quotation activity trigger
-- ============================================================================

-- Drop the trigger (keep the function for potential future use)
DROP TRIGGER IF EXISTS log_quotation_activity_trigger ON quotations;

-- Note: We're keeping the log_quotation_activity() function in case we need it later,
-- but it will no longer be automatically called on quotation updates.

-- All quotation activity logging is now explicit via:
-- - logQuotationItemsAdded()
-- - logQuotationItemsRemoved()
-- - logQuotationParametersChanged()
-- - logQuotationStatusChanged()
-- etc.
