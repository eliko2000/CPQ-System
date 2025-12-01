-- Multi-Tenant Authentication System - Part 5: Seed Feature Flags
-- This migration seeds the initial feature flags for the system
-- Run this AFTER multi-tenant-auth-004-functions-triggers.sql

-- ============================================================================
-- SEED INITIAL FEATURE FLAGS
-- ============================================================================

-- Insert feature flags (use ON CONFLICT to make this migration idempotent)
INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled)
VALUES
  (
    'ai_import',
    'AI Document Import',
    'Enable AI-powered document parsing and import functionality for quotations',
    true  -- Enabled by default
  ),
  (
    'analytics',
    'Analytics Dashboard',
    'Enable analytics and reporting features including charts, metrics, and insights',
    false
  ),
  (
    'advanced_pricing',
    'Advanced Pricing',
    'Enable advanced pricing rules, tiered pricing, and custom calculation formulas',
    false
  ),
  (
    'api_access',
    'API Access',
    'Enable REST API access for third-party integrations and custom applications',
    false
  ),
  (
    'custom_branding',
    'Custom Branding',
    'Allow teams to customize branding, themes, logos, and color schemes',
    false
  ),
  (
    'export_pdf',
    'PDF Export',
    'Enable exporting quotations and reports as PDF documents',
    true  -- Enabled by default
  ),
  (
    'multi_currency',
    'Multi-Currency Support',
    'Enable support for multiple currencies with automatic conversion',
    true  -- Enabled by default
  ),
  (
    'team_collaboration',
    'Team Collaboration',
    'Enable real-time collaboration features like comments and notifications',
    false
  )
ON CONFLICT (flag_key) DO UPDATE
SET
  flag_name = EXCLUDED.flag_name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify feature flags were seeded:
-- SELECT flag_key, flag_name, is_enabled, created_at
-- FROM feature_flags 
-- ORDER BY flag_key;

-- Expected output: 8 rows with the feature flags listed above
