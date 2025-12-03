# Bug Fix: Numbering Settings Issues

## Date

2025-12-02

## Severity

**Medium** - Settings page functionality broken but no data loss or pricing impact

## Issues Fixed

### Issue #1: Preview Not Updating in Real-Time

**Symptom**: Preview didn't update when changing configuration fields
**Root Cause**: Preview calculation used `config` from hook (database state) instead of `localConfig` (user input)

**Fix**: Changed preview calculation to use `useMemo` with `localConfig` directly

- File: `src/components/settings/sections/NumberingSettings.tsx`
- Import `previewNumbers` function and calculate preview from local state
- Preview now updates immediately as user types

### Issue #2: RLS Policy Violation (403 Forbidden)

**Symptom**:

```
POST .../user_settings 403 (Forbidden)
Error: new row violates row-level security policy for table "user_settings"
Code: 42501
```

**Root Cause**:

- Numbering service was using `teamId` as `user_id` in user_settings table
- RLS policy requires `user_id = auth.uid()::text` (authenticated user's ID)
- Also requires `team_id` to match user's teams

**Fix**: Updated service to use correct user/team structure

- Changed `saveNumberingConfig` to use both `userId` and `teamId`
- Updated `getNumberingConfig` to load team-wide settings (any team member)
- Hook now passes authenticated user's ID when saving

---

## Code Changes

### Files Modified

1. **src/components/settings/sections/NumberingSettings.tsx**
   - Added `useMemo` import
   - Imported `previewNumbers` from service
   - Removed `getPreview` from hook destructuring
   - Changed preview calculation to use `localConfig` directly

2. **src/services/numberingService.ts**
   - `getNumberingConfig`: Changed to load team-wide (any member's config)
   - `saveNumberingConfig`: Added userId parameter, includes both user_id and team_id in upsert

3. **src/hooks/useNumbering.ts**
   - Added `useAuth` import
   - Updated to get `user` from auth context
   - Pass `user.id` and `team.id` to `saveNumberingConfig`

---

## RLS Policy Explanation

The `user_settings` table has the following RLS policies (from `multi-tenant-auth-003-rls-policies.sql`):

```sql
CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL -- Global setting
      OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );
```

**Requirements**:

1. `user_id` must match authenticated user's ID (`auth.uid()`)
2. `team_id` must either be NULL or belong to user's teams

**Our Fix**:

- `user_id`: Set to authenticated user's ID from `useAuth()`
- `team_id`: Set to current team's ID
- This satisfies both RLS policy conditions

---

## Testing

### Manual Testing Steps

1. **Test Preview Updates**:
   - [x] Navigate to Settings → Numbering Settings
   - [x] Change "Project Prefix" → verify preview updates immediately
   - [x] Change "Padding" → verify preview updates immediately
   - [x] Change "Separator" → verify preview updates immediately

2. **Test Save Functionality**:
   - [x] Change configuration settings
   - [x] Click "Save" button
   - [x] Verify success message appears
   - [x] Refresh page → verify settings persisted
   - [x] No console errors (403 should be gone)

3. **Test RLS Isolation**:
   - [ ] User A saves numbering config for Team 1
   - [ ] User B (different user, same team) loads settings
   - [ ] Verify User B sees Team 1's config
   - [ ] Verify User B can also save (overwrites with their user_id)

### TypeScript Validation

```bash
npx tsc --noEmit
```

Result: ✅ No new TypeScript errors in changed files

### Unit Tests

Existing tests still pass:

```bash
npm test -- src/services/__tests__/numberingService.test.ts
```

Result: ✅ 15/15 tests passing

---

## Database Schema

### user_settings Table Structure

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,           -- auth.uid()::text
  team_id UUID REFERENCES teams(id), -- Optional team context
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, setting_key)
);
```

### Numbering Config Storage

```json
{
  "user_id": "abc-123-user-id",
  "team_id": "xyz-789-team-id",
  "setting_key": "numbering_config",
  "setting_value": {
    "projectPrefix": "PRJ",
    "quotationPrefix": "QT",
    "padding": 4,
    "separator": "-"
  }
}
```

---

## Migration Notes

**No database migration required** - this was purely a code bug fix.

The RLS policies were already correctly configured. The issue was in how our code was calling the database.

---

## Regression Prevention

### Code Review Checklist

When working with `user_settings` table:

- [ ] Use authenticated user's ID (`auth.uid()`) for `user_id`
- [ ] Include `team_id` for team-specific settings
- [ ] Test RLS policies don't block legitimate access
- [ ] Verify settings persist across sessions

### Common Pitfalls

❌ **Wrong**: Using teamId as user_id

```typescript
user_id: teamId; // This violates RLS policy!
```

✅ **Correct**: Using authenticated user's ID

```typescript
user_id: user.id,
team_id: teamId
```

---

## Related Issues

This fix also applies to any other features using `user_settings` table:

- Component categories settings
- Pricing defaults
- Table column preferences
- Any team-wide configuration

**Recommendation**: Audit all uses of `user_settings` to ensure they follow the same pattern.

---

## Performance Impact

**None** - These changes don't affect performance:

- Preview calculation moved from effect to memo (same performance)
- Database queries unchanged (still single SELECT/UPSERT)
- RLS policy enforcement happens at database level

---

## Security Impact

**Improved** - Fix ensures proper RLS enforcement:

- Users can only save settings under their own user_id
- Team isolation prevents cross-team data access
- Settings properly scoped to authenticated users

---

## Summary

Both issues fixed successfully:

1. ✅ Preview updates in real-time
2. ✅ Save functionality works without RLS errors
3. ✅ No TypeScript errors
4. ✅ All unit tests passing
5. ✅ No database migration needed

Users can now configure numbering settings without errors, and the preview provides immediate feedback.
