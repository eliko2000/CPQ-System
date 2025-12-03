-- Test quotation insert
-- This will help identify which column is causing the 400 error

-- First, check what columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'quotations'
ORDER BY ordinal_position;

-- Try a minimal insert (replace with your actual team_id)
-- INSERT INTO quotations (
--   quotation_number,
--   version,
--   customer_name,
--   project_name,
--   project_id,
--   currency,
--   exchange_rate,
--   margin_percentage,
--   status,
--   total_cost,
--   total_price,
--   team_id
-- ) VALUES (
--   'TEST-001',
--   1,
--   'Test Customer',
--   'Test Project',
--   '378ad51a-804e-44f4-86ea-1b7b140b37d2', -- Use actual project ID
--   'ILS',
--   3.7,
--   20.0,
--   'draft',
--   0,
--   0,
--   'your-team-id-here' -- Replace with your team ID
-- );
