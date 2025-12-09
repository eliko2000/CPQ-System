-- ============================================
-- Create Avatars Storage Bucket
-- ============================================
-- This migration creates the 'avatars' storage bucket for user profile pictures
-- with appropriate size limits and RLS policies

-- Create the avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket so avatars are accessible without authentication
  2097152, -- 2MB file size limit (2 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- ============================================
-- RLS Policies for Avatars Bucket
-- ============================================

-- Policy 1: Allow authenticated users to upload their own avatars
-- File path format: {user_id}-{random}.{ext}
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = '' AND -- Files in root of bucket
  auth.uid()::text = (regexp_match(name, '^([a-f0-9-]+)-'))[1] -- Filename starts with user's UUID
);

-- Policy 2: Allow anyone to read avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
);

-- Policy 3: Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^([a-f0-9-]+)-'))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^([a-f0-9-]+)-'))[1]
);

-- Policy 4: Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (regexp_match(name, '^([a-f0-9-]+)-'))[1]
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';

-- Check policies were created
SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN roles::text LIKE '%authenticated%' THEN 'Authenticated users'
    WHEN roles::text LIKE '%public%' THEN 'Public (everyone)'
    ELSE roles::text
  END as who_can_access
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;
