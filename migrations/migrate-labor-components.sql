-- Migrate existing labor components to labor_types table
-- Assumes all existing labor is internal team labor (uses dayWorkCost)

-- Count existing labor components
DO $$
DECLARE
  labor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO labor_count
  FROM components
  WHERE component_type = 'labor';

  RAISE NOTICE 'Found % labor components to migrate', labor_count;
END $$;

-- Migrate labor components to labor_types
INSERT INTO labor_types (
  team_id,
  name,
  category,
  labor_subtype,
  is_internal_labor,
  external_rate,
  description,
  default_days,
  is_active,
  created_at,
  updated_at
)
SELECT
  team_id,
  name,
  category,
  labor_subtype,
  true, -- ⭐ All existing labor treated as internal (uses dayWorkCost)
  NULL, -- ⭐ No external rate for migrated labor
  description,
  1.0, -- Default to 1 day
  is_active,
  created_at,
  updated_at
FROM components
WHERE component_type = 'labor';

-- Report migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM labor_types;
  RAISE NOTICE 'Successfully migrated % labor components to labor_types table', migrated_count;
END $$;

-- OPTIONAL: Delete labor components from components table
-- Uncomment after verifying migration success
-- WARNING: This is destructive - make sure you have a backup!
--
-- DELETE FROM components WHERE component_type = 'labor';
--
-- DO $$
-- DECLARE
--   remaining_labor INTEGER;
-- BEGIN
--   SELECT COUNT(*) INTO remaining_labor
--   FROM components
--   WHERE component_type = 'labor';
--
--   IF remaining_labor = 0 THEN
--     RAISE NOTICE 'All labor components successfully removed from components table';
--   ELSE
--     RAISE WARNING 'Still found % labor components in components table', remaining_labor;
--   END IF;
-- END $$;
