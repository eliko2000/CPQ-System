-- Check quotations table schema
-- Run this to see what columns actually exist

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quotations'
ORDER BY ordinal_position;
