# Supabase Client Not Attaching JWT to API Requests

## Status

🟡 **PARTIALLY RESOLVED** - Workarounds in place, root cause remains

**Last Updated:** 2025-12-03

## Problem

JWT tokens are not consistently attached to Supabase API requests, causing RLS policy violations despite valid authenticated sessions.

### Original Symptoms

```
POST /rest/v1/teams 403 (Forbidden)
Error: new row violates row-level security policy for table "teams"

POST /rest/v1/quotations 400 (Bad Request)
Error: No API key found in request
```

## Investigation Results

### What Works ✅

1. **SQL Editor with simulated auth**: Team creation succeeds when running in Supabase SQL Editor with:

   ```sql
   SET request.jwt.claims = '{"sub": "user-id", "role": "authenticated"}';
   INSERT INTO teams (name, slug, created_by) VALUES (...);
   ```

2. **RLS Disabled**: Team creation succeeds when RLS is temporarily disabled:

   ```sql
   ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
   ```

3. **Session exists**: `supabase.auth.getSession()` returns valid session with access_token

4. **Using hooks instead of direct Supabase calls**: Operations work when using React hooks (useQuotations, useProjects) that have proper context access

### What Doesn't Work ❌

1. **Direct Supabase client calls in components**: API requests fail when bypassing hooks/contexts
2. **JWT not consistently attached**: Authorization header sometimes missing from requests
3. **Team-based RLS policies**: Cannot use proper team isolation due to JWT issues

## Current RLS Policy

```sql
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Should allow ANY authenticated user
```

## Attempted Fixes

1. ✅ Verified `supabaseClient` initialization with proper config
2. ✅ Added `autoRefreshToken`, `persistSession`, `detectSessionInUrl` options
3. ❌ Tried explicitly calling `supabase.auth.setSession()` (caused infinite loop)
4. ✅ Confirmed session exists before API call

## Environment

- **Supabase JS**: v2.44.4
- **React**: 18.2.0
- **Auth Method**: Azure AD (OAuth)
- **Session Storage**: localStorage (default)

## Code References

- Supabase Client: `src/supabaseClient.ts`
- Auth Context: `src/contexts/AuthContext.tsx`
- Team Creation: `src/contexts/TeamContext.tsx`

## Current Workarounds

### 1. Use React Hooks Instead of Direct Supabase Calls ✅

**Fixed Issue:** Quotation creation from Project page
**Date:** 2025-12-03
**Solution:** Changed `AppRoutes.tsx` to use `useQuotations` hook instead of direct `supabase.from()` calls

**Files Changed:**

- `src/components/shared/AppRoutes.tsx` - Now uses `addQuotation` from hook
- See: `BUGFIX_QUOTATION_CREATION_FIXED.md`

**Why This Works:**

- Hooks have access to proper AuthContext and TeamContext
- Supabase client is correctly initialized with auth state
- API key and JWT are properly attached to requests

**Pattern to Follow:**

```typescript
// ❌ WRONG - Direct Supabase call
const { data } = await supabase.from('quotations').insert([...]);

// ✅ CORRECT - Use hook
const { addQuotation } = useQuotations();
const data = await addQuotation({...});
```

### 2. Permissive RLS Policies ⚠️

**Status:** Temporary workaround, NOT production-ready

**Applied to:**

- `quotations` table
- `quotation_systems` table
- `quotation_items` table

**Current policies:**

```sql
CREATE POLICY "Allow all authenticated users to view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (true);  -- ⚠️ No team_id check!
```

**Security Impact:**

- ✅ Still requires authentication (not public)
- ⚠️ Any authenticated user can access data from other teams
- ⚠️ Multi-tenant isolation is broken

**File:** `BUGFIX_FINAL_RLS_FIX.sql`

### 3. Disabled RLS on Teams Table ⚠️

**Status:** Temporary workaround

```sql
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
```

**Files:**

- `migrations/temp-disable-rls.sql`
- `migrations/temp-disable-teams-rls.sql`

**⚠️ SECURITY WARNING**: Teams table has NO protection! Only for local development/single-tenant use!

## Next Steps to Fully Resolve

### Phase 1: Investigation ⏳

1. **Check JWT in requests**: Use browser DevTools Network tab to verify Authorization header
2. **Verify storage adapter**: Confirm Supabase client is using correct localStorage adapter
3. **Race condition analysis**: Check if API calls happen before session is fully loaded
4. **Review OAuth flow**: Ensure Azure AD callback properly initializes Supabase session
5. **Server-side logs**: Check Supabase logs for what role/claims are being received

### Phase 2: Fix Root Cause 🎯

Once JWT attachment is reliable:

1. **Re-enable proper team-based RLS policies:**

   ```sql
   DROP POLICY "Allow all authenticated users to view quotations" ON quotations;

   CREATE POLICY "Team members can view quotations"
     ON quotations FOR SELECT
     TO authenticated
     USING (
       team_id IN (
         SELECT team_id FROM team_members WHERE user_id = auth.uid()
       )
     );
   ```

2. **Re-enable RLS on teams table:**

   ```sql
   ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view their teams"
     ON teams FOR SELECT
     TO authenticated
     USING (
       id IN (
         SELECT team_id FROM team_members WHERE user_id = auth.uid()
       )
     );
   ```

3. **Test multi-tenant isolation:**
   - Create two test teams
   - Verify User A cannot see User B's data
   - Verify all API requests include proper JWT

### Phase 3: Audit 🔍

- Search codebase for direct `supabase.from()` calls in components
- Replace with appropriate hooks
- Add ESLint rule to prevent direct Supabase calls
- Update documentation with patterns

## Acceptable Use Cases

### ✅ Safe to Use With Current Workarounds:

- Development/testing environments
- Single-tenant deployments
- Internal tools (single organization)
- Proof of concept / demos

### ❌ NOT Safe for:

- Multi-tenant production environments
- Public SaaS applications
- Any scenario requiring team/organization data isolation

## Recent Progress

### 2025-12-03: Quotation Creation Fix ✅

- **Issue:** Quotation creation from Project page failed with "No API key found"
- **Root Cause:** Direct Supabase call in `AppRoutes.tsx` bypassed auth context
- **Solution:** Changed to use `useQuotations` hook
- **Files:**
  - `src/components/shared/AppRoutes.tsx` (fixed)
  - `src/components/shared/__tests__/AppRoutes.quotation-creation.test.tsx` (regression test)
  - `BUGFIX_QUOTATION_CREATION_FIXED.md` (documentation)
- **Status:** ✅ Fixed and tested
- **Impact:** Quotation creation now works from all locations

## Related Files

### Bug Fixes

- `BUGFIX_QUOTATION_CREATION_FIXED.md` - Quotation creation fix (2025-12-03)
- `BUGFIX_QUOTATION_CREATION_NO_API_KEY.md` - Original bug report

### Migrations

- `BUGFIX_FINAL_RLS_FIX.sql` - Permissive RLS policies (temporary)
- `migrations/comprehensive-team-creation-fix.sql` - RLS policy definitions
- `migrations/test-as-authenticated.sql` - SQL test that works
- `migrations/temp-disable-teams-rls.sql` - Temporary workaround
- `migrations/temp-disable-rls.sql` - Temporary workaround

### Source Code

- `src/supabaseClient.ts` - Supabase client initialization
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/contexts/TeamContext.tsx` - Team state management
- `src/hooks/useQuotations.ts` - Quotation operations (working pattern)
- `src/components/shared/AppRoutes.tsx` - Now uses hooks correctly

### Tests

- `src/components/shared/__tests__/AppRoutes.quotation-creation.test.tsx` - Regression test

## Labels

`bug`, `authentication`, `RLS`, `supabase`, `high-priority`, `partially-resolved`, `security`
