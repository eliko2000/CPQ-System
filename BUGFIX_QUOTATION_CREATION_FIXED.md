# Bug Fix Report: Quotation Creation from Project Page

## Date

2025-12-03

## Status

✅ **FIXED**

## Severity

**High** - Blocked critical user workflow

---

## Problem Summary

Creating quotations from the **Project Detail Page** failed with "No API key found in request" error, while creating from the **Quotations page** worked successfully.

### Error Message

```
POST /rest/v1/quotations 400 (Bad Request)
{"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
```

---

## Root Cause

**File:** `src/components/shared/AppRoutes.tsx` (lines 116-144)

The `handleCreateQuotation` function was **directly calling the Supabase client** instead of using the `useQuotations` hook:

```typescript
// BEFORE (WRONG)
const { data: newQuotation, error } = await supabase
  .from('quotations')
  .insert([{
    quotation_number: `Q-${Date.now()}`,
    customer_name: project.company_name,
    // ...
  }])
  .select(...)
  .single();
```

### Why This Failed

1. **No API Key**: Direct Supabase client call bypassed the authentication context, causing missing API key in request headers
2. **Missing team_id**: The direct call didn't include `team_id`, causing RLS policy violations
3. **Wrong Client Instance**: The import used a different Supabase client instance than the one initialized with auth context

### Why Quotations Page Worked

The Quotations page correctly used the `useQuotations` hook (`src/components/quotations/QuotationDataGrid.tsx:526`):

```typescript
// CORRECT APPROACH
const newQuotation = await addQuotation({
  quotation_number: quotationNumber,
  customer_name: project.company_name,
  // ...
});
```

The `addQuotation` function from `useQuotations` hook (`src/hooks/useQuotations.ts:51-96`):

- ✅ Uses properly initialized Supabase client
- ✅ Automatically adds `team_id` from TeamContext
- ✅ Includes API key in request headers
- ✅ Has proper error handling

---

## Solution

### Changes Made

**File:** `src/components/shared/AppRoutes.tsx`

#### 1. Import addQuotation from useQuotations hook

```typescript
// Line 88 - Added addQuotation to destructuring
const { getQuotation, addQuotation } = useQuotations();
```

#### 2. Replace direct Supabase call with hook

```typescript
// Lines 115-127 - AFTER (CORRECT)
// Use the hook's addQuotation function (includes team_id automatically)
const newQuotation = await addQuotation({
  quotation_number: `Q-${Date.now()}`,
  customer_name: project.company_name,
  project_name: project.project_name,
  project_id: projectId,
  currency: 'ILS',
  exchange_rate: defaultParams.usdToIlsRate,
  margin_percentage: defaultParams.markupPercent,
  status: 'draft',
  total_cost: 0,
  total_price: 0,
});
```

#### 3. Remove unused import

```typescript
// Removed line 8 - No longer need direct supabase import
import { supabase } from '../../supabaseClient';
```

### Benefits of Fix

1. ✅ **API Key Present**: Properly initialized client includes API key in headers
2. ✅ **team_id Included**: Hook automatically adds team_id from TeamContext
3. ✅ **Consistent Pattern**: Same approach as working Quotations page
4. ✅ **Better Error Handling**: Hook includes proper logging and error messages
5. ✅ **No Code Duplication**: Reuses existing, tested logic

---

## Testing

### Regression Test Created

**File:** `src/components/shared/__tests__/AppRoutes.quotation-creation.test.tsx`

Tests verify:

- ✅ useQuotations hook is used (not direct Supabase call)
- ✅ team_id is not passed in input (hook adds it automatically)
- ✅ All required quotation fields are present

**Test Results:** ✅ 2/2 tests passing

### TypeScript Compilation

```bash
npx tsc --noEmit
```

**Result:** ✅ No new errors (13 pre-existing errors unrelated to this fix)

### Full Test Suite

```bash
npm test --run
```

**Results:**

- ✅ 521 tests passing
- ❌ 63 tests failing (pre-existing failures, not related to this fix)
- ✅ No new test failures introduced

---

## Verification Steps

To verify the fix works:

1. **Login to the application**
2. **Navigate to Projects page**
3. **Click on a project** to view Project Detail Page
4. **Click "New Quotation" button**
5. **Expected Result:** ✅ Quotation is created successfully and editor opens
6. **Check Network tab:** ✅ POST request includes `apikey` header
7. **Check Database:** ✅ New quotation has `team_id` populated

---

## Related Issues

### Known JWT/Auth Issue

**See:** `.github/ISSUE_SUPABASE_JWT.md`

While this bug is fixed, there's a broader auth issue:

- Supabase client not consistently attaching JWT to requests
- Session exists but token not always sent
- Affects team creation and possibly other operations
- Root cause: Unknown - possibly OAuth flow or client initialization timing

**Impact on This Fix:** This fix sidesteps the auth issue by using the hook which has access to the proper auth context.

---

## Files Modified

### Production Code

- ✅ `src/components/shared/AppRoutes.tsx` - Use useQuotations hook instead of direct Supabase call

### Tests

- ✅ `src/components/shared/__tests__/AppRoutes.quotation-creation.test.tsx` - Regression test created

### Documentation

- ✅ `BUGFIX_QUOTATION_CREATION_FIXED.md` - This report

---

## Code Diff

### AppRoutes.tsx

```diff
function AuthenticatedApp() {
  const {
    uiState,
    currentProject,
    currentQuotation,
    setCurrentQuotation,
    viewingProjectId,
    setViewingProjectId,
  } = useCPQ();
- const { getQuotation } = useQuotations();
+ const { getQuotation, addQuotation } = useQuotations();
  const { getProject } = useProjects();
  const { handleError } = useErrorHandler();

  // Handle quotation creation
  const handleCreateQuotation = async (projectId: string) => {
    try {
      const project = await getProject(projectId);

      if (!project) {
        toast.error('לא ניתן למצוא את הפרויקט');
        return;
      }

      const defaultParams = await loadDefaultQuotationParameters();

-     // Create new quotation with project data
-     const { data: newQuotation, error } = await supabase
-       .from('quotations')
-       .insert([
-         {
-           quotation_number: `Q-${Date.now()}`,
-           customer_name: project.company_name,
-           project_name: project.project_name,
-           project_id: projectId,
-           currency: 'ILS',
-           exchange_rate: defaultParams.usdToIlsRate,
-           margin_percentage: defaultParams.markupPercent,
-           status: 'draft',
-           total_cost: 0,
-           total_price: 0,
-         },
-       ])
-       .select(`
-         *,
-         quotation_systems (
-           *,
-           quotation_items (
-             *,
-             component:components (*)
-           )
-         )
-       `)
-       .single();
-
-     if (error) throw error;

+     // Use the hook's addQuotation function (includes team_id automatically)
+     const newQuotation = await addQuotation({
+       quotation_number: `Q-${Date.now()}`,
+       customer_name: project.company_name,
+       project_name: project.project_name,
+       project_id: projectId,
+       currency: 'ILS',
+       exchange_rate: defaultParams.usdToIlsRate,
+       margin_percentage: defaultParams.markupPercent,
+       status: 'draft',
+       total_cost: 0,
+       total_price: 0,
+     });

      if (newQuotation) {
        const quotationProject = convertDbQuotationToQuotationProject(newQuotation);
        setCurrentQuotation(quotationProject);
        setViewingProjectId(null);
      }
    } catch (error) {
      handleError(error, {
        toastMessage: 'שגיאה ביצירת הצעת מחיר',
        context: { projectId },
      });
    }
  };
}
```

---

## Lessons Learned

1. **Always use hooks for data operations**: Direct Supabase calls bypass important context (auth, team)
2. **Test both code paths**: The bug existed only in one code path (project page) but not another (quotations page)
3. **Consistency matters**: Using the same pattern everywhere prevents bugs
4. **Context is critical**: Authentication and team context must be available for Supabase operations

---

## Prevention

To prevent similar bugs in the future:

1. **Code Review Checklist**: Always check for direct Supabase calls in components
2. **ESLint Rule**: Consider adding a rule to warn about direct `supabase.from()` calls in components
3. **Documentation**: Update CLAUDE.md to emphasize using hooks instead of direct Supabase calls
4. **Architecture**: Consider making the Supabase client private, accessible only through hooks

---

## Related Documentation

- Original Bug Report: `BUGFIX_QUOTATION_CREATION_NO_API_KEY.md`
- JWT/Auth Issue: `.github/ISSUE_SUPABASE_JWT.md`
- Test File: `src/components/shared/__tests__/AppRoutes.quotation-creation.test.tsx`

---

## Labels

`bugfix`, `high-priority`, `authentication`, `supabase`, `quotations`, `completed`
