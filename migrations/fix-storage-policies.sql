-- Fix Storage Policies - Allow Public Access (Development)
-- This allows uploads without authentication for development/testing
-- For production, switch back to authenticated-only policies

-- ============================================
-- STEP 1: Drop existing policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can upload supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Public can read supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete supplier quotes" ON storage.objects;

-- ============================================
-- STEP 2: Create PUBLIC policies (for development)
-- ============================================

-- Allow public uploads
CREATE POLICY "Public can upload supplier quotes"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'supplier-quotes'
);

-- Allow public reads
CREATE POLICY "Public can read supplier quotes"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'supplier-quotes'
);

-- Allow public deletes
CREATE POLICY "Public can delete supplier quotes"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'supplier-quotes'
);

-- ============================================
-- VERIFICATION: Check policies were created
-- ============================================
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN roles::text LIKE '%public%' THEN '✅ Public access (dev mode)'
    WHEN roles::text LIKE '%authenticated%' THEN '✅ Authenticated users'
    ELSE roles::text
  END as who_can_access
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%supplier quotes%'
ORDER BY policyname;

-- ============================================
-- PRODUCTION VERSION (uncomment when ready)
-- ============================================
/*
-- For production, use these instead:

DROP POLICY IF EXISTS "Public can upload supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Public can read supplier quotes" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete supplier quotes" ON storage.objects;

CREATE POLICY "Authenticated users have full access to supplier quotes"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'supplier-quotes')
WITH CHECK (bucket_id = 'supplier-quotes');
*/
