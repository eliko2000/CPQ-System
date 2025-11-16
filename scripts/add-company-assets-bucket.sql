-- =============================================
-- Company Assets Storage Bucket
-- =============================================
-- Creates storage bucket for company logos and assets
-- Run this in Supabase SQL Editor

-- Create company-assets bucket (for logos and company files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,  -- Public bucket for logos
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for company-assets bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for company assets" ON storage.objects;

-- Allow all users to upload files
CREATE POLICY "Anyone can upload company assets"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'company-assets');

-- Allow all users to update files
CREATE POLICY "Anyone can update company assets"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'company-assets');

-- Allow all users to delete files
CREATE POLICY "Anyone can delete company assets"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'company-assets');

-- Allow public read access
CREATE POLICY "Public read access for company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');
