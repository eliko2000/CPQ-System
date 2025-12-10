# Feature Request: Connect Appearance Settings to Application Features

**Date:** 2025-12-10
**Priority:** MEDIUM
**Status:** Ready for Implementation
**Estimated Time:** 4-6 hours

---

## Problem Statement

The Appearance Settings page (`src/components/settings/sections/AppearanceSettings.tsx`) was recently implemented to save/load settings to the database. However, **these settings are not connected to any actual application features**.

**Current Behavior:**

- ✅ User can change "Items per page" from 25 to 50
- ✅ Setting saves to database with success message
- ✅ Setting persists after page refresh
- ❌ **BUT: Grids still show default page sizes (no effect!)**
- ❌ **All other toggles (compact mode, tooltips, etc.) also do nothing**

**This is like:** A car dashboard where the gauges move when you adjust them, but they're not connected to the engine.

---

## Current State

### Settings That Save But Do Nothing:

1. **Items Per Page** (25/50/100) - Grids ignore this
2. **Compact Mode** - UI doesn't change
3. **Show Tooltips** - Tooltips always show
4. **Auto-Save** - Forms always auto-save
5. **Confirm Actions** - Confirmations always show

### Database Structure:

**Table:** `user_settings`
**Setting Key:** `appearancePreferences`
**Team-Scoped:** ✅ Yes

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

---

## Desired State

All appearance settings should actually control the application behavior:

1. **Items Per Page** → Grids use this value for pagination
2. **Compact Mode** → UI becomes more compact (smaller padding, text)
3. **Show Tooltips** → Tooltips conditionally render
4. **Auto-Save** → Forms control save timing
5. **Confirm Actions** → Confirmation dialogs conditionally show

---

## Implementation Plan

### Phase 1: Create Appearance Preferences Hook

**File:** `src/hooks/useAppearancePreferences.ts` (NEW)

Create a custom hook that:

- Loads preferences from database on mount
- Caches in React state
- Listens for `appearance-preferences-updated` event
- Reloads when team changes
- Provides easy access to all preference values

**Code Pattern:**

```typescript
import { useState, useEffect } from 'react';
import { loadSetting } from '@/services/settingsService';
import { useTeam } from '@/contexts/TeamContext';
import { logger } from '@/lib/logger';

interface AppearancePreferences {
  itemsPerPage: number;
  compactMode: boolean;
  showTooltips: boolean;
  autoSave: boolean;
  confirmActions: boolean;
}

const DEFAULT_PREFERENCES: AppearancePreferences = {
  itemsPerPage: 25,
  compactMode: false,
  showTooltips: true,
  autoSave: true,
  confirmActions: true,
};

export function useAppearancePreferences() {
  const { currentTeam } = useTeam();
  const [preferences, setPreferences] =
    useState<AppearancePreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Load preferences on mount and team change
  useEffect(() => {
    loadPreferences();
  }, [currentTeam?.id]);

  // Listen for settings updates
  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setPreferences(event.detail);
    };

    window.addEventListener(
      'appearance-preferences-updated',
      handleUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        'appearance-preferences-updated',
        handleUpdate as EventListener
      );
    };
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const result = await loadSetting<AppearancePreferences>(
        'appearancePreferences',
        currentTeam?.id
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
      setLoading(false);
    }
  };

  return { preferences, loading };
}
```

---

### Phase 2: Apply Items Per Page to Grids

**Files to Modify:**

1. **`src/components/library/EnhancedComponentGrid.tsx`**
   - Import `useAppearancePreferences`
   - Get `itemsPerPage` from hook
   - Pass to AG Grid config

2. **`src/components/quotations/QuotationDataGrid.tsx`**
   - Same pattern

3. **`src/components/projects/ProjectList.tsx`**
   - Same pattern (if it has pagination)

**Example Change for EnhancedComponentGrid:**

```typescript
// Add import
import { useAppearancePreferences } from '@/hooks/useAppearancePreferences';

// In component
export function EnhancedComponentGrid({ ... }) {
  const { preferences } = useAppearancePreferences();
  // ... existing code ...

  return (
    <AgGridReact
      ref={gridRef}
      // ... other props ...
      pagination={true}
      paginationPageSize={preferences.itemsPerPage}  // ← USE THE SETTING!
      paginationPageSizeSelector={[25, 50, 100]}
      // ... rest of props ...
    />
  );
}
```

---

### Phase 3: Apply Compact Mode

**Files to Modify:**

1. **`src/components/shared/MainLayout.tsx`** (or root layout)
   - Import `useAppearancePreferences`
   - Add `data-compact={compactMode}` to root element
   - Or add CSS class `compact-mode`

2. **`src/styles/globals.css`** (or Tailwind config)
   - Add CSS rules for compact mode

**Example:**

```typescript
// In MainLayout.tsx
export function MainLayout({ children }) {
  const { preferences } = useAppearancePreferences();

  return (
    <div
      className={cn(
        'main-layout',
        preferences.compactMode && 'compact-mode'
      )}
    >
      {children}
    </div>
  );
}
```

**CSS:**

```css
/* In globals.css */
.compact-mode {
  /* Reduce padding */
  --spacing-unit: 0.5rem;

  /* Smaller text */
  font-size: 0.875rem;

  /* Reduce card padding */
  .card {
    padding: 0.75rem;
  }

  /* Reduce button padding */
  .button {
    padding: 0.375rem 0.75rem;
  }

  /* Reduce grid row height */
  .ag-theme-alpine {
    --ag-row-height: 32px;
  }
}
```

---

### Phase 4: Control Tooltip Visibility

**Approach 1: Create TooltipWrapper Component**

**File:** `src/components/ui/ConditionalTooltip.tsx` (NEW)

```typescript
import { useAppearancePreferences } from '@/hooks/useAppearancePreferences';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface ConditionalTooltipProps {
  content: string;
  children: React.ReactNode;
}

export function ConditionalTooltip({ content, children }: ConditionalTooltipProps) {
  const { preferences } = useAppearancePreferences();

  // If tooltips disabled, just render children without tooltip
  if (!preferences.showTooltips) {
    return <>{children}</>;
  }

  // Otherwise, render full tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Then replace existing Tooltip usage:**

```typescript
// BEFORE:
<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Tooltip text</TooltipContent>
</Tooltip>

// AFTER:
<ConditionalTooltip content="Tooltip text">
  <button>Hover me</button>
</ConditionalTooltip>
```

**Approach 2: Context Provider (More Complex)**

- Create `TooltipContext` that provides `showTooltips` value
- All tooltip components check this context
- More invasive but more robust

**Recommendation:** Start with Approach 1 (wrapper component)

---

### Phase 5: Control Auto-Save (Optional - May Already Work)

**Check First:**

- Does the app already auto-save forms?
- Is there existing auto-save logic?

**If Needed:**

- Find form components that auto-save
- Wrap save logic with preference check
- Add manual "Save" button when auto-save is off

**Example:**

```typescript
const { preferences } = useAppearancePreferences();

const handleFieldChange = (value: string) => {
  setFieldValue(value);

  if (preferences.autoSave) {
    // Debounce and save
    debouncedSave(value);
  }
  // Otherwise, user must click "Save" button
};
```

---

### Phase 6: Control Confirm Actions (Optional)

**Check First:**

- Where are confirmation dialogs shown?
- Are they using a consistent pattern?

**If Needed:**

- Find dangerous actions (delete, bulk operations)
- Wrap with preference check

**Example:**

```typescript
const { preferences } = useAppearancePreferences();

const handleDelete = async () => {
  if (preferences.confirmActions) {
    // Show confirmation dialog
    const confirmed = await confirmDialog({
      title: 'Delete Item?',
      message: 'This action cannot be undone.',
    });
    if (!confirmed) return;
  }

  // Proceed with delete
  await deleteItem();
};
```

---

## Priority Order

### High Priority (Must Have):

1. ✅ **Items Per Page** - Most useful, easy to implement
2. ✅ **Create useAppearancePreferences hook** - Foundation for everything else

### Medium Priority (Nice to Have):

3. ⚠️ **Compact Mode** - Requires CSS work, affects UX significantly
4. ⚠️ **Show Tooltips** - Requires finding all tooltips and wrapping them

### Low Priority (Can Skip):

5. ⏸️ **Auto-Save** - May already be implemented, check first
6. ⏸️ **Confirm Actions** - May already be implemented, check first

**Recommendation:** Implement #1 and #2 first, then reassess if #3-6 are needed based on user feedback.

---

## Files to Create

1. `src/hooks/useAppearancePreferences.ts` - New hook

## Files to Modify

### Essential (Items Per Page):

1. `src/components/library/EnhancedComponentGrid.tsx`
2. `src/components/quotations/QuotationDataGrid.tsx`
3. `src/components/projects/ProjectList.tsx` (if has pagination)

### Optional (Compact Mode):

4. `src/components/shared/MainLayout.tsx`
5. `src/styles/globals.css` or `src/index.css`

### Optional (Tooltips):

6. `src/components/ui/ConditionalTooltip.tsx` (new)
7. Various components using tooltips (find with grep)

---

## Acceptance Criteria

### Minimum (Items Per Page):

- [ ] Create `useAppearancePreferences` hook
- [ ] Component Library grid respects items per page setting
- [ ] Quotation grid respects items per page setting
- [ ] Project grid respects items per page setting (if exists)
- [ ] Changing setting from 25 to 50 immediately affects grids (after page reload is OK)
- [ ] Each team has independent items per page setting

### Optional (Compact Mode):

- [ ] Compact mode toggle reduces padding/spacing
- [ ] Compact mode reduces font sizes
- [ ] Compact mode reduces grid row heights
- [ ] Change is immediately visible (no reload needed)

### Optional (Tooltips):

- [ ] Create ConditionalTooltip wrapper
- [ ] Replace key tooltips with wrapper
- [ ] Disabling tooltips actually hides them
- [ ] At least 5-10 main tooltips respect setting

---

## Testing Instructions

### Test 1: Items Per Page - Basic

1. **Team Alpha:**
   - Settings → Appearance
   - Set "Items per page" to 50
   - Go to Component Library
   - **Expected:** Pagination shows "50" in page size selector
   - **Expected:** Grid shows 50 items per page

2. **Add More Items:**
   - Add 60 components to library
   - **Expected:** Pagination shows "Page 1 of 2"
   - Change page size to 100
   - **Expected:** All 60 items on one page

### Test 2: Items Per Page - Team Isolation

1. **Team Alpha:** Set to 50 items per page
2. **Team Beta:** Set to 100 items per page
3. **Switch between teams:**
   - **Expected:** Each team's grids use their own setting
   - **Expected:** Settings don't leak between teams

### Test 3: Items Per Page - Persistence

1. Set items per page to 50
2. Refresh browser (F5)
3. Go to Component Library
4. **Expected:** Still shows 50 items per page

### Test 4: Compact Mode (If Implemented)

1. **Normal mode:**
   - Note current spacing, font sizes
   - Take screenshot

2. **Enable compact mode:**
   - Settings → Appearance → Toggle "Compact Mode"
   - **Expected:** UI becomes more compact immediately
   - **Expected:** Less whitespace
   - **Expected:** Smaller text
   - **Expected:** Grids have smaller row height

3. **Disable compact mode:**
   - Toggle off
   - **Expected:** Returns to normal spacing

### Test 5: Tooltips (If Implemented)

1. **Tooltips enabled:**
   - Hover over buttons/icons
   - **Expected:** Tooltips appear

2. **Disable tooltips:**
   - Settings → Appearance → Toggle off "Show Tooltips"
   - Hover over same buttons/icons
   - **Expected:** Tooltips do NOT appear

---

## Known Limitations

### Items Per Page:

- May require page reload for grids to pick up new value (unless using React state subscription)
- AG Grid may have limits on pagination sizes

### Compact Mode:

- May require CSS adjustments per component
- Some components may look broken with reduced spacing
- Need to test thoroughly on all pages

### Tooltips:

- Not all tooltips may be covered (external libraries)
- Some tooltips may be critical for UX (don't hide those)

---

## Technical Notes

### Performance Considerations:

- `useAppearancePreferences` hook is called in every component that needs it
- Loads from database once on mount, then caches
- Event listener ensures all instances stay in sync
- Minimal performance impact

### State Management:

- Using React hooks (not Redux/Zustand)
- Event-driven updates via `window.dispatchEvent`
- Same pattern as categories and other settings
- Consistent with existing codebase

### Backward Compatibility:

- New hook returns default values if no settings found
- Existing behavior is preserved (defaults match current hardcoded values)
- No breaking changes

---

## Example Usage After Implementation

```typescript
// In any component
import { useAppearancePreferences } from '@/hooks/useAppearancePreferences';

function MyComponent() {
  const { preferences, loading } = useAppearancePreferences();

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className={preferences.compactMode ? 'compact' : ''}>
      <DataGrid paginationPageSize={preferences.itemsPerPage} />

      {preferences.showTooltips && (
        <Tooltip>Helpful tip</Tooltip>
      )}
    </div>
  );
}
```

---

## Success Metrics

After implementation:

- ✅ Setting "Items per page" to 50 shows 50 items in grids
- ✅ Each team has independent pagination settings
- ✅ Settings persist after page refresh
- ✅ Settings survive team switching
- ✅ No console errors
- ✅ TypeScript compiles cleanly
- ✅ All existing tests still pass

---

## Estimated Effort Breakdown

**Phase 1: Hook** - 30 minutes
**Phase 2: Items Per Page** - 1-2 hours (3-4 grids)
**Phase 3: Compact Mode** - 2-3 hours (CSS + testing)
**Phase 4: Tooltips** - 1-2 hours (wrapper + replacements)
**Phase 5: Auto-Save** - 30 minutes (if needed)
**Phase 6: Confirm Actions** - 30 minutes (if needed)

**Total for Minimum (Hook + Items Per Page):** 1.5-2.5 hours
**Total for All Features:** 4-6 hours

---

## Implementation Prompt for Agent

Use this prompt with the `implementer` agent:

```
Implement the Appearance Preferences feature to connect the Appearance Settings UI to actual application behavior.

MINIMUM REQUIREMENTS (Must implement):

1. Create useAppearancePreferences hook (src/hooks/useAppearancePreferences.ts)
   - Loads preferences from database on mount
   - Listens for 'appearance-preferences-updated' event
   - Reloads when team changes
   - Returns preferences object and loading state

2. Apply "Items per page" setting to all data grids:
   - EnhancedComponentGrid.tsx
   - QuotationDataGrid.tsx
   - ProjectList.tsx (if has pagination)
   - Each should read itemsPerPage from hook
   - Pass to AG Grid paginationPageSize prop

OPTIONAL (Implement if time permits):

3. Compact Mode - Apply CSS class to root layout based on preference
4. Show Tooltips - Create ConditionalTooltip wrapper component

FILES:
- Read: src/components/settings/sections/AppearanceSettings.tsx (reference)
- Read: FEATURE_REQUEST_CONNECT_APPEARANCE_SETTINGS.md (full spec)
- Create: src/hooks/useAppearancePreferences.ts
- Modify: src/components/library/EnhancedComponentGrid.tsx
- Modify: src/components/quotations/QuotationDataGrid.tsx
- Modify: src/components/projects/ProjectList.tsx (if exists)

ACCEPTANCE CRITERIA:
- Setting items per page to 50 makes grids show 50 items
- Each team has independent setting
- Settings persist after refresh
- TypeScript compiles cleanly
- No console errors

Start with creating the hook, then apply to grids one by one.
```

---

**Status: Ready for Implementation** 🚀

This feature request is fully specified and ready to be implemented by a developer or an AI agent.
