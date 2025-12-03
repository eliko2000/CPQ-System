-- Add version column to quotations if it doesn't exist
-- This should have been added by database-schema.sql but might be missing

ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add unique constraint on quotation_number + version if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quotations_quotation_number_version_key'
    ) THEN
        ALTER TABLE quotations
        ADD CONSTRAINT quotations_quotation_number_version_key
        UNIQUE (quotation_number, version);
    END IF;
END $$;
