-- Create temp-files storage bucket for Excel previews
-- This bucket stores Excel files temporarily for Microsoft Office Online viewer

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('temp-files', 'temp-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to files in this bucket (required for Office Online viewer)
CREATE POLICY "Public Access for temp-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'temp-files');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to temp-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temp-files');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Authenticated users can delete from temp-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'temp-files');
