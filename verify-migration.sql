-- Verify migration was applied successfully

-- Check unique constraint exists
SELECT
  'Constraint Check' as test,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_settings'
  AND constraint_name = 'unique_team_user_setting';

-- Check index exists
SELECT
  'Index Check' as test,
  indexname,
  tablename
FROM pg_indexes
WHERE tablename = 'user_settings'
  AND indexname = 'idx_user_settings_team_key';

-- Check RLS policy exists
SELECT
  'Policy Check' as test,
  policyname,
  tablename,
  cmd
FROM pg_policies
WHERE tablename = 'user_settings';

-- Check table structure
SELECT
  'Column Check' as test,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;
