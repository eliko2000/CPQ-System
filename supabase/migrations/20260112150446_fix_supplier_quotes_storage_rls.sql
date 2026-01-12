-- Migration: Fix supplier-quotes storage bucket RLS policies
-- Created: 2026-01-12
-- Purpose: Allow team members to upload supplier quote files during import/export operations
--
-- This migration creates RLS policies for the supplier-quotes storage bucket to allow:
-- 1. Team members to upload files to their team's folder
-- 2. Team members to view/download files from their team's folder
-- 3. Team members to update/delete files in their team's folder

BEGIN;

-- Ensure the supplier-quotes bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'supplier-quotes',
  'supplier-quotes',
  true, -- Public bucket for file access
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Team members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Team members can update files" ON storage.objects;
DROP POLICY IF EXISTS "Team members can delete files" ON storage.objects;

-- Policy 1: Allow team members to upload files to their team folder
-- File path format: {teamId}/{componentId}/{filename}
-- Users can upload if the first folder matches a team they belong to
CREATE POLICY "Team members can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-quotes'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Allow team members to view/download files from their team folder
CREATE POLICY "Team members can view files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 3: Allow team members to update files in their team folder
CREATE POLICY "Team members can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'supplier-quotes'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 4: Allow team members to delete files from their team folder
CREATE POLICY "Team members can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

COMMIT;

-- Verification queries (for testing):
-- SELECT * FROM storage.buckets WHERE id = 'supplier-quotes';
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%Team members%';

-- Rollback plan (if needed):
-- BEGIN;
-- DROP POLICY IF EXISTS "Team members can upload files" ON storage.objects;
-- DROP POLICY IF EXISTS "Team members can view files" ON storage.objects;
-- DROP POLICY IF EXISTS "Team members can update files" ON storage.objects;
-- DROP POLICY IF EXISTS "Team members can delete files" ON storage.objects;
-- COMMIT;
