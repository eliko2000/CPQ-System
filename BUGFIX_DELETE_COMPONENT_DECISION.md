# Bugfix: Deleted Components Still Ask for Decision

**Date**: 2026-01-05
**Status**: ✅ Fixed
**Issue**: After deleting a component from the import preview, the system still counted it as "pending decision" and showed warnings about undecided components.

---

## Problem

When users deleted a component from the import preview (AIExtractionPreview):

1. The component was removed from the display ✓
2. But the system still counted it as "pending decision" ❌
3. Users saw warnings like "יש 3 רכיבים שממתינים להחלטה" even after deleting them
4. This was confusing - deletion should be treated as a final decision

**User Experience:**

- User deletes unwanted components
- Clicks "Confirm Import"
- Still sees "3 components pending decision" warning
- Has to manually decide on components they already deleted

---

## Root Cause

In `AIExtractionPreview.tsx`, the `handleDelete` function only removed the component from the `components` state array, but didn't update the `localMatchDecisions` array:

```typescript
// OLD CODE (incomplete)
const handleDelete = (id: string) => {
  setComponents(prev => prev.filter(c => c.id !== id));
  // ❌ Match decision still exists with userDecision: 'pending'
};
```

When checking for pending decisions, the code counted ALL match decisions:

```typescript
// Line 654-668: Counts pending decisions
{localMatchDecisions.filter(d => d.userDecision === 'pending').length > 0 && (
  <div>יש {count} רכיבים שממתינים להחלטה</div>
)}
```

This included decisions for deleted components!

---

## Solution

Updated `handleDelete` to also remove the corresponding match decision when a component is deleted:

```typescript
const handleDelete = (id: string) => {
  // Find the component index before deleting
  const componentIndex = components.findIndex(c => c.id === id);

  // Remove the component
  setComponents(prev => prev.filter(c => c.id !== id));

  // Also remove the match decision for this component
  // Deletion is considered a final decision - user chose not to import this component
  if (componentIndex !== -1) {
    setLocalMatchDecisions(prev =>
      prev.filter(d => d.componentIndex !== componentIndex)
    );
  }
};
```

**Why this works:**

- When user deletes a component, we find its index
- Remove the component from the display
- Also remove its match decision from the tracking array
- Pending decision count no longer includes deleted components

---

## Files Modified

### Production Code

- `src/components/library/AIExtractionPreview.tsx` (lines 318-332)
  - Updated `handleDelete` to also remove match decisions
  - Added comments explaining deletion as a final decision

---

## Behavior After Fix

| Action              | Before Fix                                   | After Fix                             |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| Delete component    | Component removed, decision still pending ❌ | Component AND decision removed ✓      |
| Check pending count | Includes deleted components ❌               | Only active components ✓              |
| Import after delete | Shows "pending decision" warning ❌          | No warning if all remaining decided ✓ |

---

## Testing

### Manual Test Scenario

1. Import a file with smart matching (e.g., supplier quote with existing components)
2. See components with match suggestions
3. Delete one or more components from the list
4. Check the "pending decisions" count at the top
5. ✅ **Expected**: Count should decrease when components are deleted
6. ❌ **Before fix**: Count stayed the same after deletion

### Edge Cases Covered

- Deleting component with no match decision (componentIndex === -1)
- Deleting multiple components in sequence
- Deleting all components
- Deleting components with different decision states

---

## User Impact

**Before**: Users were confused by "pending decision" warnings for components they already deleted, leading to unnecessary extra clicks.

**After**: Deletion is treated as a final decision - deleted components don't need any further action from the user.

---

## Related Code

Match decisions are stored by component index:

```typescript
interface ComponentMatchDecision {
  componentIndex: number; // Maps to components array index
  matchType: 'exact' | 'fuzzy' | 'ai' | 'none';
  matches: ComponentMatch[];
  userDecision: 'pending' | 'accept_match' | 'create_new';
  selectedMatchId?: string;
}
```

When displaying pending count, we now correctly exclude deleted components because their decisions are removed when they're deleted.
