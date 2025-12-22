-- Update labor_subtype enum to include new values
-- Old values: engineering, commissioning, installation, programming
-- New values: engineering, integration, development, testing, commissioning, support_and_training

-- Step 1: Migrate existing data from old values to new values
UPDATE labor_types SET labor_subtype = 'development' WHERE labor_subtype = 'programming';
UPDATE labor_types SET labor_subtype = 'commissioning' WHERE labor_subtype = 'installation';

UPDATE quotation_items SET labor_subtype = 'development' WHERE labor_subtype = 'programming';
UPDATE quotation_items SET labor_subtype = 'commissioning' WHERE labor_subtype = 'installation';

UPDATE components SET labor_subtype = 'development' WHERE labor_subtype = 'programming';
UPDATE components SET labor_subtype = 'commissioning' WHERE labor_subtype = 'installation';

-- Step 2: Drop the existing check constraints
ALTER TABLE labor_types DROP CONSTRAINT IF EXISTS labor_types_labor_subtype_check;
ALTER TABLE quotation_items DROP CONSTRAINT IF EXISTS quotation_items_labor_subtype_check;
ALTER TABLE components DROP CONSTRAINT IF EXISTS components_labor_subtype_check;

-- Step 3: Add new check constraints with updated values
ALTER TABLE labor_types
ADD CONSTRAINT labor_types_labor_subtype_check
CHECK (labor_subtype IN ('engineering', 'integration', 'development', 'testing', 'commissioning', 'support_and_training'));

ALTER TABLE quotation_items
ADD CONSTRAINT quotation_items_labor_subtype_check
CHECK (labor_subtype IN ('engineering', 'integration', 'development', 'testing', 'commissioning', 'support_and_training'));

ALTER TABLE components
ADD CONSTRAINT components_labor_subtype_check
CHECK (labor_subtype IN ('engineering', 'integration', 'development', 'testing', 'commissioning', 'support_and_training'));

-- Notify success
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated labor_subtype constraints. Old values migrated: programming->development, installation->commissioning';
END $$;
