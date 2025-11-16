# Supabase Storage Setup for Supplier Quotes

This guide walks through setting up file storage for supplier quote documents.

## 🎯 What We're Storing

- Excel files (.xlsx, .xls)
- PDF files (.pdf)
- CSV files (.csv)
- Images (.jpg, .png, .gif, .webp)

## 📋 Setup Steps

### Step 1: Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Configure:
   - **Name**: `supplier-quotes`
   - **Public**: ❌ **No** (Keep private for security)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: Leave empty or add:
     ```
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     application/vnd.ms-excel
     application/pdf
     text/csv
     image/jpeg
     image/png
     image/gif
     image/webp
     ```
4. Click **"Create bucket"**

### Step 2: Set Storage Policies

After creating the bucket, set up access policies:

#### Policy 1: Allow Authenticated Users to Upload

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-quotes'
);
```

#### Policy 2: Allow Authenticated Users to Read

```sql
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
);
```

#### Policy 3: Allow Authenticated Users to Delete

```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-quotes'
);
```

**Or use the UI:**
1. Go to **Storage** → **supplier-quotes** → **Policies**
2. Click **"New Policy"**
3. Use template: **"Allow authenticated users full access"**

### Step 3: Verify Setup

Run this in SQL Editor:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'supplier-quotes';

-- Check policies
SELECT * FROM storage.policies WHERE bucket_id = 'supplier-quotes';
```

## 🔧 File Naming Convention

Files will be stored with this structure:

```
supplier-quotes/
  ├── 2024/
  │   ├── 01/
  │   │   ├── {uuid}_quote_ABC.xlsx
  │   │   ├── {uuid}_quote_XYZ.pdf
  │   └── 02/
  │       └── {uuid}_quote_DEF.xlsx
  └── 2025/
      └── 01/
          └── {uuid}_quote_GHI.csv
```

**Pattern**: `{year}/{month}/{uuid}_{sanitized_filename}`

**Example**: `2024/01/a1b2c3d4-e5f6-7890-abcd-ef1234567890_supplier_quote_jan_2024.xlsx`

## 📝 Usage in Code

### Upload File

```typescript
import { supabase } from './supabaseClient';

async function uploadQuoteFile(file: File): Promise<string | null> {
  try {
    // Generate unique file path
    const timestamp = new Date();
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const filePath = `${year}/${month}/${uuid}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('supplier-quotes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL (if bucket is public) or signed URL
    const { data: urlData } = supabase.storage
      .from('supplier-quotes')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}
```

### Download File

```typescript
async function downloadQuoteFile(filePath: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from('supplier-quotes')
      .download(filePath);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}
```

### Delete File

```typescript
async function deleteQuoteFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('supplier-quotes')
      .remove([filePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
```

### Get Signed URL (for private buckets)

```typescript
async function getSignedUrl(filePath: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('supplier-quotes')
      .createSignedUrl(filePath, 3600); // Valid for 1 hour

    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
}
```

## 🔒 Security Best Practices

1. **Keep bucket private** - Only authenticated users should access
2. **Use signed URLs** - For temporary access to files
3. **Validate file types** - Check MIME types before upload
4. **Limit file sizes** - Prevent abuse (10MB max recommended)
5. **Scan for malware** - Consider adding virus scanning for production
6. **Clean up old files** - Implement retention policy if needed

## ✅ Verification Checklist

- [ ] Bucket `supplier-quotes` created
- [ ] Bucket is **private** (not public)
- [ ] File size limit set to 10MB
- [ ] Upload policy created
- [ ] Read policy created
- [ ] Delete policy created
- [ ] Test upload works from app
- [ ] Test download works from app

## 📊 Monitoring

Check storage usage:

```sql
-- Get total storage used
SELECT
  SUM(metadata->>'size')::bigint / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'supplier-quotes';

-- Get file count
SELECT COUNT(*) as file_count
FROM storage.objects
WHERE bucket_id = 'supplier-quotes';

-- Get files by type
SELECT
  metadata->>'mimetype' as mime_type,
  COUNT(*) as count,
  SUM((metadata->>'size')::bigint) / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'supplier-quotes'
GROUP BY metadata->>'mimetype';
```

## 🚨 Troubleshooting

### Issue: "bucket not found"
- Verify bucket name is exactly `supplier-quotes`
- Check bucket exists in Storage dashboard

### Issue: "permission denied"
- Check RLS policies are created
- Verify user is authenticated
- Check policy conditions match your use case

### Issue: "file too large"
- Check bucket file size limit
- Compress file before upload
- Split large files if needed

### Issue: "invalid mime type"
- Check file type is in allowed list
- Verify file is not corrupted
- Try uploading with correct extension

## 🎓 Next Steps

After setup, the app will:
1. ✅ Upload quote files to Supabase Storage
2. ✅ Store file URLs in `supplier_quotes` table
3. ✅ Download files when viewing quote details
4. ✅ Delete files when quotes are deleted

---

**Setup complete?** Test by uploading a sample quote file through the app!
