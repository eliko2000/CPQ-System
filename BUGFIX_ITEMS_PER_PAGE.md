# Bug Fix: Items Per Page Setting Not Saving

**Date:** 2025-12-10 09:55
**Priority:** MEDIUM
**Status:** ✅ FIXED

---

## Problem

User reported: "The 'items per page' setting does not save. When I return to settings it still shows 25 items."

---

## Root Cause

**The AppearanceSettings component was just a dummy UI!**

**File:** `src/components/settings/sections/AppearanceSettings.tsx`

### Before (Lines 1-81):

```typescript
export function AppearanceSettings() {
  return (
    <div className="space-y-6">
      {/* ... */}
      <select className="w-full p-2 border rounded-md">
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
      {/* ... */}
    </div>
  );
}
```

**Problems:**

1. ❌ No state management
2. ❌ No event handlers
3. ❌ No database integration
4. ❌ No team awareness
5. ❌ Just static HTML - clicking did nothing!

---

## The Fix

### What Was Added:

1. **State Management** ✅
   - Added `useState` for preferences
   - Stores all appearance settings in one object

2. **Database Integration** ✅
   - `loadSetting()` on mount and team change
   - `saveSetting()` on every change
   - Loads from Supabase, saves to Supabase

3. **Team-Scoped** ✅
   - Passes `currentTeam?.id` to load/save
   - Each team has independent appearance preferences
   - Settings reload when switching teams

4. **Event Handlers** ✅
   - `onChange` handler for items per page dropdown
   - `onChange` handlers for all checkboxes
   - Immediate save on every change

5. **User Feedback** ✅
   - Shows "נשמר בהצלחה" (Saved successfully) message
   - Green checkmark icon
   - Auto-dismisses after 2 seconds

6. **Loading State** ✅
   - Shows spinner while loading
   - Prevents interaction until ready

---

## Settings Stored

**Setting Key:** `appearancePreferences`

**Data Structure:**

```typescript
interface AppearancePreferences {
  itemsPerPage: number; // 25, 50, or 100
  compactMode: boolean; // Compact UI mode
  showTooltips: boolean; // Show tooltips
  autoSave: boolean; // Auto-save enabled
  confirmActions: boolean; // Confirm dangerous actions
}
```

**Default Values:**

```typescript
{
  itemsPerPage: 25,
  compactMode: false,
  showTooltips: true,
  autoSave: true,
  confirmActions: true
}
```

---

## Implementation Details

### Lines 41-56: Load Preferences

```typescript
const loadPreferences = async () => {
  setIsLoading(true);
  try {
    const result = await loadSetting<AppearancePreferences>(
      'appearancePreferences',
      currentTeam?.id // ← Team-scoped!
    );
    if (result.success && result.data) {
      setPreferences(result.data);
    } else {
      setPreferences(DEFAULT_PREFERENCES);
    }
  } catch (error) {
    logger.error('Error loading appearance preferences:', error);
    setPreferences(DEFAULT_PREFERENCES);
  } finally {
    setIsLoading(false);
  }
};
```

### Lines 58-77: Save Preferences

```typescript
const savePreferences = async (updatedPreferences: AppearancePreferences) => {
  try {
    const result = await saveSetting(
      'appearancePreferences',
      updatedPreferences,
      currentTeam?.id // ← Team-scoped!
    );
    if (result.success) {
      setSaveStatus({ type: 'success', message: 'נשמר בהצלחה' });
      // Dispatch event to notify other components
      window.dispatchEvent(
        new CustomEvent('appearance-preferences-updated', {
          detail: updatedPreferences,
        })
      );
    } else {
      setSaveStatus({ type: 'error', message: 'שגיאה בשמירה' });
    }
  } catch (error) {
    logger.error('Error saving appearance preferences:', error);
    setSaveStatus({ type: 'error', message: 'שגיאה בשמירה' });
  }

  setTimeout(() => setSaveStatus(null), 2000);
};
```

### Lines 79-83: Items Per Page Handler

```typescript
const handleItemsPerPageChange = (value: string) => {
  const updatedPreferences = {
    ...preferences,
    itemsPerPage: parseInt(value),
  };
  setPreferences(updatedPreferences); // Update UI immediately
  savePreferences(updatedPreferences); // Save to database
};
```

### Lines 188-196: Connected Dropdown

```typescript
<select
  className="w-full p-2 border rounded-md"
  value={preferences.itemsPerPage.toString()}  // ← Bound to state
  onChange={(e) => handleItemsPerPageChange(e.target.value)}  // ← Connected!
>
  <option value="25">25</option>
  <option value="50">50</option>
  <option value="100">100</option>
</select>
```

---

## Testing Instructions

### Test 1: Basic Save/Load

1. **Go to Settings → Appearance**
2. **Change "פריטים בעמוד" from 25 to 50**
3. **Expected:** ✅ See "נשמר בהצלחה" message with green checkmark
4. **Refresh page (F5)**
5. **Go back to Settings → Appearance**
6. **Expected:** ✅ Dropdown shows "50" (not 25)

### Test 2: Team Isolation

1. **Team Alpha:**
   - Settings → Appearance
   - Set items per page to 50
   - Verify "נשמר בהצלחה" appears

2. **Switch to Team Beta**
   - Settings → Appearance
   - **Expected:** ✅ Shows 25 (default, not Team Alpha's 50)
   - Set items per page to 100
   - Verify "נשמר בהצלחה" appears

3. **Switch back to Team Alpha**
   - Settings → Appearance
   - **Expected:** ✅ Shows 50 (Team Alpha's setting preserved)

### Test 3: All Checkboxes Work

1. **Settings → Appearance**
2. **Toggle each checkbox:**
   - מצב קומפקטי (Compact Mode)
   - הצג טיפים (Show Tooltips)
   - שמירה אוטומטית (Auto-save)
   - אישור פעולות מסוכנות (Confirm Actions)
3. **Expected:** Each toggle saves immediately with success message
4. **Refresh page**
5. **Expected:** All checkboxes remember their state

---

## Known Limitation

**The grids don't use this setting yet!**

The setting now **saves correctly**, but the Component Library grid, Quotation grid, etc. are NOT reading this value yet. They still use their hardcoded page sizes.

### To Fully Implement:

Would need to:

1. Create a hook `useAppearancePreferences()` to read this setting
2. Update each grid component to use that hook
3. Pass `itemsPerPage` to AG Grid's pagination config

**Example:**

```typescript
// In EnhancedComponentGrid.tsx
const { itemsPerPage } = useAppearancePreferences();

<AgGridReact
  {...props}
  paginationPageSize={itemsPerPage}  // ← Use the setting
/>
```

**This is a future enhancement.** For now, the setting saves/loads correctly per team.

---

## What Works Now

✅ Setting saves to database
✅ Setting loads from database
✅ Team-isolated (each team has own setting)
✅ Shows success/error feedback
✅ Persists after page refresh
✅ All checkboxes functional

## What Doesn't Work Yet

⚠️ Grids don't actually use this value yet (they use hardcoded 25/50/100)

---

## Database Verification

Check that it's actually saving:

```sql
SELECT
  team_id,
  user_id,
  setting_key,
  setting_value->'itemsPerPage' as items_per_page,
  updated_at
FROM user_settings
WHERE setting_key = 'appearancePreferences'
ORDER BY updated_at DESC;
```

**Expected Results:**

- Different `items_per_page` values per team
- Updates when you change the setting

---

## Files Modified

**1 File Changed:**

- `src/components/settings/sections/AppearanceSettings.tsx`
  - Added imports (useState, useEffect, loadSetting, saveSetting, useTeam, etc.)
  - Added state management
  - Added load/save functions
  - Connected all form controls
  - Added loading state
  - Added success/error feedback
  - Made team-aware

**Lines Changed:** ~210 lines (complete rewrite from dummy UI to functional component)

---

## Architecture Notes

### Why Team-Scoped?

**Appearance preferences are team-scoped** (not user-global) because:

- Different teams might have different data volumes
- Team A (small): 25 items per page is fine
- Team B (large): needs 100 items per page
- Each user in a team sees the team's default

**Alternative Design:**
Could be user-global (personal preference across all teams), but current design makes it team-scoped for consistency.

---

## Success Criteria

✅ Items per page setting saves to database
✅ Setting loads on mount
✅ Setting reloads on team switch
✅ Success message shows after save
✅ Setting persists after page refresh
✅ Each team has independent setting
✅ All checkboxes also save
✅ TypeScript compiles cleanly
✅ No console errors

---

**Status: Setting Now Saves Correctly!** ✅

The UI was completely non-functional (dummy HTML). Now it's a fully working, team-scoped setting that saves to the database.

Next step (future enhancement): Make the actual grids use this value.
