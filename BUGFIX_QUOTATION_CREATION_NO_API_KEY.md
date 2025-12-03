# Bug: Quotation Creation Fails with "No API Key" Error

## Date

2025-12-02

## Severity

**High** - Blocks quotation creation from project page

## Problem Summary

Creating quotations from the **Project page** fails with "No API key found in request" error. However, creating quotations from the **Quotations page** works successfully.

## Symptoms

### From Project Page ❌

```
POST /rest/v1/quotations 400 (Bad Request)
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
```

### From Quotations Page ✅

Works successfully - quotation is created

## Current State

### What Works

- ✅ Project creation with project numbers (e.g., PRJ-0001)
- ✅ Project numbers visible in projects list
- ✅ Quotation creation from Quotations page
- ✅ RLS policies fixed (now permissive to work around JWT issue)
- ✅ user_table_configs constraint fixed

### What Doesn't Work

- ❌ Quotation creation from Project page (no API key in request)
- ❌ No console log showing "Adding quotation with team_id" (suggests code not executing)

## Technical Details

### Error Details

**URL**: `POST https://uxkvfghfcwnynshmzeck.supabase.co/rest/v1/quotations?columns=%22quotation_number%22%2C%22customer_name%22%2C%22project_name%22%2C%22project_id%22%2C%22currency%22%2C%22exchange_rate%22%2C%22margin_percentage%22%2C%22status%22%2C%22total_cost%22%2C%22total_price%22`

**Error Response**:

```json
{
  "message": "No API key found in request",
  "hint": "No `apikey` request header or url param was found."
}
```

**Expected Headers**:

```
apikey: <supabase-anon-key>
Authorization: Bearer <jwt-token>
```

**Actual**: Missing both headers

### Observed Behavior

1. User clicks "New Quotation" from Project page
2. No console log appears (expected: "Adding quotation with team_id: {...}")
3. Request sent without API key
4. 400 Bad Request error
5. Error handler logs "Unknown error occurred"

### Database State

- `quotations` table has 1 invisible quotation (from previous attempts)
- RLS policies are permissive (`TO authenticated USING (true)`)
- `team_id` constraint exists and is NOT NULL

## Related Issues

### Known JWT/Auth Issue

See: `.github/ISSUE_SUPABASE_JWT.md`

- Supabase client not attaching JWT to requests
- Session exists but token not sent
- Affects team creation, now also quotation creation
- Root cause: Unknown - possibly OAuth flow or client initialization

### Recent Changes

1. Added custom numbering system (migrations run successfully)
2. Updated RLS policies to be permissive
3. Fixed user_table_configs unique constraint
4. Added logging to useQuotations.ts

## Files Involved

### Hooks

- `src/hooks/useQuotations.ts` - Lines 50-95 (addQuotation function with logging)

### Components

- `src/components/quotations/QuotationDataGrid.tsx` - Line 526 (calls addQuotation - works)
- `src/components/projects/ProjectList.tsx` - (triggers quotation creation - fails)

### Config

- `src/supabaseClient.ts` - Supabase client initialization

### Migrations

- `BUGFIX_FINAL_RLS_FIX.sql` - RLS policies (already run)
- `migrations/add-numbering-sequences.sql` - Numbering system (already run)

## Code Context

### useQuotations.ts - addQuotation (with logging)

```typescript
const addQuotation = async (quotation: Omit<DbQuotation, 'id' | 'created_at' | 'updated_at' | 'team_id'>) => {
  if (!currentTeam) {
    logger.error('Cannot add quotation: No active team')
    throw new Error('No active team')
  }

  try {
    setError(null)

    const quotationWithTeam = {
      ...quotation,
      team_id: currentTeam.id
    }

    logger.debug('Adding quotation with team_id:', {
      team_id: currentTeam.id,
      quotation_number: quotation.quotation_number
    })

    const { data, error } = await supabase
      .from('quotations')
      .insert([quotationWithTeam])
      .select(/* ... */)
      .single()

    if (error) {
      logger.error('Quotation insert error:', error)
      throw error
    }
    // ...
  }
}
```

### Expected Console Output (NOT appearing)

```
Adding quotation with team_id: {team_id: 'xxx', quotation_number: 'PRJ-0001-QT-001'}
```

## Investigation Steps Taken

1. ✅ Verified RLS policies are permissive
2. ✅ Confirmed `team_id` constraint exists in database
3. ✅ Tested insert via Supabase MCP (works with team_id)
4. ✅ Added logging to useQuotations.ts
5. ✅ Checked Network tab - confirmed no API key in headers
6. ❌ No log output when creating from project page (code not executing?)

## Theories

### Theory 1: Different Supabase Client Instance

- Quotations page uses correct client with API key
- Project page uses different/broken client instance
- **Check**: Are there multiple supabase client instances?

### Theory 2: Component Mount Timing

- Supabase client not initialized when project page mounts
- Works on quotations page because client had time to initialize
- **Check**: Is there a race condition on project page?

### Theory 3: Context Not Loaded

- `currentTeam` is null on project page
- Code throws "No active team" but error isn't visible
- **Check**: Add console.log before the `if (!currentTeam)` check

### Theory 4: Different Code Path

- Project page might not be calling `addQuotation` from useQuotations
- Might be using a different API call
- **Check**: Search for alternative quotation creation code in ProjectList.tsx

## Next Steps to Debug

1. **Add logging before currentTeam check**:

   ```typescript
   console.log('addQuotation called, currentTeam:', currentTeam);
   if (!currentTeam) {
     logger.error('Cannot add quotation: No active team')
   ```

2. **Check if addQuotation is even being called**:
   - Add `console.log` at very start of addQuotation function
   - See if it appears when clicking from project page

3. **Find where project page creates quotations**:
   - Search ProjectList.tsx for quotation creation
   - Verify it uses the same useQuotations hook

4. **Check supabase client state**:
   - Add logging to supabaseClient.ts
   - Verify client is initialized with API key

5. **Compare network requests**:
   - Capture successful request from quotations page (with API key)
   - Compare headers to failed request from project page
   - Identify what's different

## Workaround

**Use Quotations page instead of Project page**:

1. Go to Quotations page
2. Click "New Quotation"
3. Select project from dropdown
4. Works successfully ✅

## Expected Behavior

1. User clicks "New Quotation" from project page
2. Console shows: "Adding quotation with team_id: {...}"
3. POST request includes apikey header
4. Quotation created successfully
5. User redirected to quotation editor

## Environment

- Supabase JS: v2.44.4
- React: 18.2.0
- Auth: Azure AD OAuth
- Browser: [User's browser]

## Related Documentation

- `.github/ISSUE_SUPABASE_JWT.md` - JWT attachment issue
- `BUGFIX_FINAL_RLS_FIX.sql` - RLS policy fixes (completed)
- `FEATURE_CUSTOM_NUMBERING.md` - Numbering system docs

## Labels

`bug`, `high-priority`, `authentication`, `supabase`, `quotations`
