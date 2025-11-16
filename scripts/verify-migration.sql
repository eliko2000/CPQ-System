-- Verification Script for Supplier Quotes Migration
-- Run this to verify all tables, indexes, and functions were created successfully

-- ============================================
-- 1. CHECK TABLES EXIST
-- ============================================
SELECT
  'Tables' as check_type,
  table_name,
  CASE
    WHEN table_name IN ('supplier_quotes', 'component_quote_history') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('supplier_quotes', 'component_quote_history', 'components')
ORDER BY table_name;

-- ============================================
-- 2. CHECK COLUMNS IN supplier_quotes
-- ============================================
SELECT
  'supplier_quotes Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'supplier_quotes'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK COLUMNS IN component_quote_history
-- ============================================
SELECT
  'component_quote_history Columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'component_quote_history'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK NEW COLUMNS IN components TABLE
-- ============================================
SELECT
  'components New Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'components'
  AND column_name IN ('current_quote_id', 'currency', 'original_cost')
ORDER BY column_name;

-- ============================================
-- 5. CHECK INDEXES
-- ============================================
SELECT
  'Indexes' as check_type,
  indexname as index_name,
  tablename as table_name
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_supplier_quotes%'
    OR indexname LIKE 'idx_component_quote_history%'
    OR indexname LIKE 'idx_components_current_quote%'
  )
ORDER BY tablename, indexname;

-- ============================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT
  'Foreign Keys' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('component_quote_history', 'components')
  AND (
    kcu.column_name IN ('quote_id', 'component_id', 'current_quote_id')
    OR ccu.table_name = 'supplier_quotes'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 7. CHECK VIEWS
-- ============================================
SELECT
  'Views' as check_type,
  table_name as view_name,
  CASE
    WHEN table_name IN (
      'components_with_quote_source',
      'component_price_history_summary',
      'supplier_quotes_summary'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE '%quote%'
ORDER BY table_name;

-- ============================================
-- 8. CHECK FUNCTIONS
-- ============================================
SELECT
  'Functions' as check_type,
  routine_name as function_name,
  routine_type as type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_component_price_history',
    'find_similar_components',
    'update_updated_at_column'
  )
ORDER BY routine_name;

-- ============================================
-- 9. CHECK RLS POLICIES
-- ============================================
SELECT
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('supplier_quotes', 'component_quote_history')
ORDER BY tablename, policyname;

-- ============================================
-- 10. CHECK EXTENSIONS
-- ============================================
SELECT
  'Extensions' as check_type,
  extname as extension_name,
  extversion as version,
  CASE
    WHEN extname = 'pg_trgm' THEN '✅ INSTALLED (needed for fuzzy matching)'
    ELSE '✅ INSTALLED'
  END as status
FROM pg_extension
WHERE extname IN ('pg_trgm', 'uuid-ossp')
ORDER BY extname;

-- ============================================
-- 11. TEST QUERY - SAMPLE DATA COUNT
-- ============================================
SELECT
  'Data Count' as check_type,
  'supplier_quotes' as table_name,
  COUNT(*) as row_count
FROM supplier_quotes
UNION ALL
SELECT
  'Data Count' as check_type,
  'component_quote_history' as table_name,
  COUNT(*) as row_count
FROM component_quote_history
UNION ALL
SELECT
  'Data Count' as check_type,
  'components' as table_name,
  COUNT(*) as row_count
FROM components;

-- ============================================
-- 12. VERIFICATION SUMMARY
-- ============================================
SELECT
  '========== VERIFICATION SUMMARY ==========' as message
UNION ALL
SELECT
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('supplier_quotes', 'component_quote_history')
    ) = 2 THEN '✅ All tables created'
    ELSE '❌ Some tables missing'
  END
UNION ALL
SELECT
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name IN (
        'components_with_quote_source',
        'component_price_history_summary',
        'supplier_quotes_summary'
      )
    ) = 3 THEN '✅ All views created'
    ELSE '⚠️  Some views missing (non-critical)'
  END
UNION ALL
SELECT
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_extension
      WHERE extname = 'pg_trgm'
    ) = 1 THEN '✅ pg_trgm extension installed'
    ELSE '❌ pg_trgm extension missing (needed for fuzzy matching)'
  END
UNION ALL
SELECT
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_policies
      WHERE tablename IN ('supplier_quotes', 'component_quote_history')
    ) >= 2 THEN '✅ RLS policies created'
    ELSE '❌ RLS policies missing'
  END
UNION ALL
SELECT '========================================';
