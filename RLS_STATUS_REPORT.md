# Row-Level Security (RLS) Status Report

**Date:** 2025-12-03
**Status:** 🟡 **PARTIALLY SECURED** - Functional but not fully isolated

---

## Executive Summary

The CPQ system is **functional** with authentication required, but **multi-tenant data isolation is not enforced** due to permissive RLS policies and disabled RLS on some tables. This is acceptable for development and single-tenant deployments but **NOT suitable for multi-tenant production**.

### Current Security Posture

| Aspect               | Status          | Notes                                |
| -------------------- | --------------- | ------------------------------------ |
| Authentication       | ✅ Working      | OAuth via Azure AD                   |
| API Key Required     | ✅ Working      | All requests include API key         |
| Team ID Tracking     | ✅ Working      | All records include team_id          |
| Team-Based Isolation | ❌ Not Enforced | RLS policies allow cross-team access |
| Data Access Control  | ⚠️ Partial      | App-level filtering only             |

---

## Detailed Status by Table

### 1. Quotations Tables

**Tables:** `quotations`, `quotation_systems`, `quotation_items`

**RLS Status:** 🟡 Enabled with Permissive Policies

**Current Policies:**

```sql
-- Allows ANY authenticated user to access ANY quotation
CREATE POLICY "Allow all authenticated users to view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (true);  -- ⚠️ No team_id check!
```

**What This Means:**

- ✅ Anonymous users cannot access data
- ✅ API key is required
- ✅ Records include team_id for future filtering
- ⚠️ User A can see User B's quotations
- ⚠️ No team-based isolation

**Security Level:** 🟡 Basic Authentication Only

**File:** `BUGFIX_FINAL_RLS_FIX.sql`

---

### 2. Teams Table

**Table:** `teams`

**RLS Status:** ❌ **COMPLETELY DISABLED**

**Current State:**

```sql
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
```

**What This Means:**

- ✅ Anonymous users still cannot access (requires auth)
- ❌ All authenticated users can see ALL teams
- ❌ No access control whatsoever

**Security Level:** 🔴 Minimal Protection

**Files:**

- `migrations/temp-disable-rls.sql`
- `migrations/temp-disable-teams-rls.sql`

---

### 3. Components Table

**Table:** `components`

**RLS Status:** ⚠️ Status Unknown (Likely permissive or disabled)

**Action Needed:** Verify RLS status for components table

---

### 4. Projects Table

**Table:** `projects`

**RLS Status:** ⚠️ Status Unknown (Likely has team_id-based policies)

**Action Needed:** Verify RLS status and confirm team isolation works

---

## Root Cause: JWT Attachment Issue

**Problem:** Supabase client doesn't consistently attach JWT tokens to API requests

**Documented In:** `.github/ISSUE_SUPABASE_JWT.md`

### Why JWT Matters for RLS

RLS policies use JWT claims to determine access:

```sql
-- Proper team-based policy (NOT CURRENTLY ACTIVE)
CREATE POLICY "Team members only"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()  -- ⚠️ Requires JWT!
    )
  );
```

Without reliable JWT attachment:

- `auth.uid()` returns null
- Team membership checks fail
- RLS denies all access (even legitimate requests)

### Current Workaround

Made policies permissive (allow all authenticated users) until JWT issue is resolved.

---

## Recent Fix: Quotation Creation (2025-12-03)

### Problem

Quotation creation from Project Detail Page failed with "No API key found in request"

### Solution

Changed `AppRoutes.tsx` to use `useQuotations` hook instead of direct Supabase calls

### Impact

✅ Quotation creation now works from all locations
✅ API key properly included in requests
✅ team_id automatically added to new quotations
⚠️ Still uses permissive RLS policies (no team isolation)

### Files

- `src/components/shared/AppRoutes.tsx` - Fixed
- `BUGFIX_QUOTATION_CREATION_FIXED.md` - Full documentation

---

## Security Risk Assessment

### Current Risks

#### 🟡 Medium Risk - Development/Testing

- ✅ Authentication is enforced
- ✅ App-level filtering prevents cross-team UI display
- ⚠️ Direct database access bypasses app filtering
- ⚠️ API calls could access other teams' data

#### 🔴 High Risk - Multi-Tenant Production

- ❌ Any user can access any team's data via API
- ❌ No database-level isolation
- ❌ Compliance issues (GDPR, SOC2, etc.)
- ❌ Security breach if account compromised

### Mitigating Factors

1. Application logic correctly filters by team_id in UI
2. Users don't have direct database access
3. API endpoints respect team context (via hooks)
4. All records include team_id for future filtering

### Risk Scenarios

**Scenario 1: Malicious User**

- Attacker creates account
- Uses browser DevTools to modify API calls
- Can read/modify data from other teams
- **Likelihood:** Medium | **Impact:** High

**Scenario 2: Compromised Account**

- User account gets hacked
- Attacker has access to ALL teams' data, not just victim's team
- **Likelihood:** Low | **Impact:** Critical

**Scenario 3: Developer Error**

- Developer forgets to filter by team_id in new feature
- Accidentally exposes cross-team data
- **Likelihood:** Medium | **Impact:** High

---

## Path to Full Security

### Phase 1: Fix JWT Attachment (Required First)

**Investigate:**

1. Check Authorization header in browser Network tab
2. Verify Supabase client initialization timing
3. Review OAuth callback flow (Azure AD)
4. Check session storage/persistence
5. Review Supabase server logs

**Goal:** Reliable JWT in all API requests

---

### Phase 2: Enable Team-Based RLS Policies

Once JWT is reliable, switch to proper team-based policies:

#### Quotations

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

CREATE POLICY "Team members can insert quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Repeat for UPDATE and DELETE
```

#### Teams

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

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
```

#### Components, Projects, etc.

Apply similar team-based policies to all multi-tenant tables

---

### Phase 3: Testing & Validation

1. **Create Test Teams:**
   - Team A: user-a@example.com
   - Team B: user-b@example.com

2. **Test Isolation:**
   - User A creates quotation
   - User B attempts to access via API
   - Expected: Access denied ✅

3. **Test API Requests:**
   - Check all requests include JWT with correct claims
   - Verify auth.uid() returns correct user ID
   - Confirm team_id checks work in policies

4. **Penetration Testing:**
   - Attempt to bypass team isolation
   - Try direct API calls to other teams
   - Test with modified request headers

---

### Phase 4: Code Audit

**Find and Fix Direct Supabase Calls:**

```bash
# Search for direct Supabase calls in components
grep -r "supabase.from(" src/components/
```

**Pattern to Follow:**

```typescript
// ❌ WRONG - Bypasses auth context
import { supabase } from '@/supabaseClient';
const { data } = await supabase.from('quotations').select();

// ✅ CORRECT - Uses proper context
const { quotations, loading } = useQuotations();
```

**Create ESLint Rule:**

```javascript
// Prevent direct supabase imports in components
rules: {
  'no-restricted-imports': ['error', {
    patterns: ['**/supabaseClient'],
    paths: [{
      name: '@/supabaseClient',
      message: 'Import hooks from @/hooks instead of direct supabase client'
    }]
  }]
}
```

---

## Acceptable Use Cases

### ✅ Currently Safe For:

1. **Development/Testing**
   - Local development
   - Staging environments
   - Testing/QA

2. **Single-Tenant Deployments**
   - One organization only
   - Internal tools
   - Private instances

3. **Proof of Concept**
   - Demos
   - Prototypes
   - MVP testing

### ❌ NOT Safe For:

1. **Multi-Tenant Production**
   - Multiple organizations/teams
   - Public SaaS application
   - Customer-facing product

2. **Regulated Industries**
   - Healthcare (HIPAA)
   - Finance (PCI-DSS)
   - Any compliance requirements

3. **Enterprise Sales**
   - SOC2 certification required
   - Security questionnaires
   - Data isolation guarantees

---

## Recommended Timeline

### Immediate (Week 1)

- ✅ **DONE:** Fix quotation creation bug
- 🔲 Document all direct Supabase calls in codebase
- 🔲 Review auth flow and session initialization

### Short-Term (Weeks 2-3)

- 🔲 Investigate JWT attachment issue
- 🔲 Fix root cause of JWT not being sent
- 🔲 Test JWT attachment is reliable

### Medium-Term (Week 4)

- 🔲 Switch to team-based RLS policies
- 🔲 Re-enable RLS on teams table
- 🔲 Test multi-tenant isolation

### Long-Term (Ongoing)

- 🔲 Add ESLint rules to prevent direct Supabase calls
- 🔲 Audit all data access patterns
- 🔲 Implement automated security testing

---

## Best Practices Going Forward

### 1. Always Use Hooks for Data Operations

```typescript
// Use these hooks instead of direct Supabase calls
useQuotations(); // For quotations
useProjects(); // For projects
useComponents(); // For components
useTeams(); // For teams
```

### 2. Test Team Isolation

Every new feature should include:

- Unit tests for data access
- Integration tests for team isolation
- Security tests to prevent cross-team access

### 3. Code Review Checklist

- [ ] No direct `supabase.from()` calls in components
- [ ] All queries include team_id filter (or use hooks)
- [ ] RLS policies tested for new tables
- [ ] JWT claims verified in policies

### 4. Monitoring

- Monitor for 403 errors (RLS violations)
- Log JWT attachment failures
- Alert on cross-team access attempts

---

## Related Documentation

### Bug Reports

- `BUGFIX_QUOTATION_CREATION_FIXED.md` - Quotation creation fix (2025-12-03)
- `BUGFIX_QUOTATION_CREATION_NO_API_KEY.md` - Original bug report

### Issues

- `.github/ISSUE_SUPABASE_JWT.md` - JWT attachment issue (root cause)

### Migrations

- `BUGFIX_FINAL_RLS_FIX.sql` - Current permissive policies
- `migrations/temp-disable-rls.sql` - RLS disabled on teams
- `migrations/comprehensive-team-creation-fix.sql` - Team RLS policy templates

### Tests

- `src/components/shared/__tests__/AppRoutes.quotation-creation.test.tsx` - Regression test

---

## Questions?

**Q: Can I deploy to production with current RLS state?**
A: Only if single-tenant. NOT for multi-tenant SaaS.

**Q: How urgent is fixing the JWT issue?**
A: Critical for multi-tenant. Low priority for single-tenant/development.

**Q: What happens if I add a new table?**
A: Use permissive policies (USING true) until JWT is fixed, then switch to team-based.

**Q: How do I test if team isolation works?**
A: Create two teams, try accessing other team's data via API - should fail.

**Q: Can users currently see other teams' data?**
A: Not in the UI (app filters by team_id), but API would allow it if called directly.

---

## Contact

For questions about RLS or security, consult:

- `.github/ISSUE_SUPABASE_JWT.md` - Technical details
- `BUGFIX_QUOTATION_CREATION_FIXED.md` - Recent fix pattern
- Supabase RLS documentation - https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated:** 2025-12-03
**Next Review:** After JWT attachment issue is resolved
