-- Storage Policies for supplier-quotes Bucket
-- Run these in Supabase SQL Editor after creating the bucket

-- ============================================
-- POLICY 1: Allow Authenticated Users to Upload Files
-- ============================================
CREATE POLICY "Authenticated users can upload supplier quotes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-quotes'
);

-- ============================================
-- POLICY 2: Allow Authenticated Users to Read Files
-- ============================================
CREATE POLICY "Authenticated users can read supplier quotes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
);

-- ============================================
-- POLICY 3: Allow Authenticated Users to Update Files
-- ============================================
CREATE POLICY "Authenticated users can update supplier quotes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
)
WITH CHECK (
  bucket_id = 'supplier-quotes'
);

-- ============================================
-- POLICY 4: Allow Authenticated Users to Delete Files
-- ============================================
CREATE POLICY "Authenticated users can delete supplier quotes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
);

-- ============================================
-- VERIFICATION: Check Policies Were Created
-- ============================================
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN roles::text LIKE '%authenticated%' THEN '✅ Authenticated users'
    ELSE roles::text
  END as who_can_access
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%supplier%'
ORDER BY policyname;

-- ============================================
-- ALTERNATIVE: Single "Full Access" Policy
-- (Use this instead of the 4 policies above if you prefer simpler setup)
-- ============================================

-- First, drop the individual policies if you created them:
-- DROP POLICY IF EXISTS "Authenticated users can upload supplier quotes" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can read supplier quotes" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can update supplier quotes" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can delete supplier quotes" ON storage.objects;

-- Then create a single policy for all operations:
-- CREATE POLICY "Authenticated users have full access to supplier quotes"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'supplier-quotes')
-- WITH CHECK (bucket_id = 'supplier-quotes');
