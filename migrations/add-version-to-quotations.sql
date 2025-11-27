-- Migration: Add version column to quotations table
-- Run this in your Supabase SQL Editor

-- Add version column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='quotations' AND column_name='version') THEN
        ALTER TABLE quotations ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Drop the old unique constraint on quotation_number if it exists
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_quotation_number_key;

-- Add new unique constraint on (quotation_number, version)
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_quotation_number_version_key;
ALTER TABLE quotations ADD CONSTRAINT quotations_quotation_number_version_key UNIQUE (quotation_number, version);

-- Update existing quotations to have version = 1
UPDATE quotations SET version = 1 WHERE version IS NULL;
