# Bugfix: Import File Upload RLS Policy Violation

## Issue

When importing data with supplier quote files, all file uploads fail with:

```
Failed to upload [filename]: new row violates row-level security policy
```

## Root Cause

The Supabase Storage bucket `supplier-quotes` has Row-Level Security (RLS) policies enabled that are blocking file uploads during import. The current policy likely only allows uploads to the user's own folder, but during import, files need to be uploaded to team folders.

## Solution

### Option 1: Update Storage RLS Policy (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage Policies**
   - Click "Storage" in left sidebar
   - Click "Policies" tab
   - Find the `supplier-quotes` bucket

3. **Add Team Upload Policy**

   Create a new policy for INSERT operations:

   ```sql
   -- Allow team members to upload files to their team's folder
   CREATE POLICY "Team members can upload to team folder"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'supplier-quotes'
     AND (storage.foldername(name))[1] IN (
       SELECT team_id::text
       FROM team_members
       WHERE user_id = auth.uid()
     )
   );
   ```

   **If you don't have a `team_members` table**, use this simpler version:

   ```sql
   -- Allow authenticated users to upload to any team folder
   -- (Less secure - only use for development)
   CREATE POLICY "Allow team uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'supplier-quotes');
   ```

4. **Test the import again**
   - Go to Settings → Database → Import/Export
   - Try importing your file
   - Files should now upload successfully

### Option 2: Temporarily Disable RLS (Development Only)

⚠️ **Warning**: This disables security. Only use for development/testing.

1. In Supabase Dashboard → Storage → supplier-quotes bucket
2. Click "Policies" tab
3. Toggle "Enable RLS" to OFF
4. Test import
5. **Remember to re-enable RLS** after testing

### Option 3: Use Service Role for Imports (Advanced)

This requires code changes to use the service role key (which bypasses RLS) only during import operations. Contact your developer if you need this option.

## Verification

After fixing the policy, you should see in the import completion screen:

- ✅ Components imported successfully
- ✅ Quotations imported successfully
- ✅ Supplier quote files uploaded successfully
- No "RLS policy blocked upload" warnings

## Related Issues

Also fixed in this bugfix:

- **Dialog closing immediately**: Completion screen now stays visible until you click "Close"
- **team_settings table missing**: Import now handles missing table gracefully with info message
- **Better error messages**: RLS policy violations are clearly identified

## Files Changed

- `src/services/importService.ts`: Added RLS error detection and team_settings handling
- `src/components/settings/dialogs/ImportWizard.tsx`: Fixed dialog closing behavior
