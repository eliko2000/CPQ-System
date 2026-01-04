# Feature: Smart Activity Log Batching

**Date**: 2026-01-03
**Type**: Enhancement
**Status**: ✅ Implemented

---

## Problem Statement

Activity logs were creating too much noise:

1. **Parameter Changes**: Typing "3.75" in USD rate created 4 logs ("3", "3.", "3.7", "3.75")
2. **Item Additions**: Adding 5 components created 5 separate logs
3. **Cluttered Feed**: Made activity log unusable with hundreds of micro-changes

---

## Solution: Intelligent Batching System

### Core Principle

**"Hooks can fire as many times as needed, but only ONE activity log gets created"**

The system tracks changes in memory and consolidates them into a single log entry when the user exits the context (quotation, component dialog, project edit).

---

## Implementation

### 1. Item Addition Batching

**Behavior**: Consolidates rapid item additions within a 3-second window

**Example**:

```
User adds 5 items quickly (within 3 seconds)
→ ONE log: "נוספו 5 פריטים למערכת 1"

User adds 2 items, waits 4 seconds, adds 2 more
→ TWO logs: "נוספו 2 פריטים" + "נוספו 2 פריטים"
```

**Code**: `useItemAdditionBatching` hook

- 3-second consolidation window
- Auto-flushes after timer or on quotation close
- Tracks items in memory until batch completes

---

### 2. Parameter Change Batching ⭐ NEW

**Behavior**: Consolidates ALL parameter changes until user exits quotation

**Example**:

```
User types USD rate: "3" → "3." → "3.7" → "3.75"
User changes EUR rate: "4" → "4." → "4.0" → "4.05"
User closes quotation
→ ONE log: "שונו פרמטרים: שער דולר (3.7 ← 3.75), שער יורו (4.0 ← 4.05)"
```

**Key Features**:

- ✅ Tracks **original** vs **final** value per field
- ✅ No timer - only logs when quotation closes
- ✅ Uses Map to ensure only latest change per field
- ✅ If user types "3.7" → "4.0" → "3.7", shows no change (smart!)

**Code**: `useParameterChangeBatching` hook

- No auto-flush timer (prevents premature logging)
- Tracks changes in Map by field name
- Keeps first oldValue, updates to latest newValue
- Only logs if final value differs from original

---

## Technical Details

### File: `src/hooks/useActivityBatching.ts`

**Two Batching Hooks**:

#### `useItemAdditionBatching(logFunction)`

```typescript
const { addToBatch, flushBatch } = useItemAdditionBatching(
  logQuotationItemsAdded
);

// Add item to batch
addToBatch(teamId, quotationId, quotationName, item, systemName);

// Flush manually or wait for 3-second timer
flushBatch();
```

#### `useParameterChangeBatching(logFunction)`

```typescript
const { addToBatch, flushBatch } = useParameterChangeBatching(
  logQuotationParametersChanged
);

// Add parameter change to batch
addToBatch(teamId, quotationId, quotationName, {
  field: 'usdToIlsRate',
  label: 'שער דולר לשקל',
  oldValue: 3.7,
  newValue: 3.75,
});

// Flush when dialog closes
flushBatch();
```

---

### File: `src/hooks/quotation/useQuotationActions.ts`

**Integration**:

```typescript
// Create batching hooks
const { addToBatch: addItemToBatch, flushBatch: flushItems } =
  useItemAdditionBatching(logQuotationItemsAdded);

const { addToBatch: addParameterToBatch, flushBatch: flushParameters } =
  useParameterChangeBatching(logQuotationParametersChanged);

// Flush all batches when quotation closes
useEffect(() => {
  return () => {
    flushItems();
    flushParameters();
  };
}, [currentQuotation?.id, flushItems, flushParameters]);

// Add to batch instead of logging directly
paramChanges.forEach(change => {
  addParameterToBatch(teamId, quotationId, quotationName, change);
});
```

---

## How It Works

### Parameter Changes Flow

1. **User edits USD rate**: 3.7 → 3.75
   - `handleParametersChange` fires
   - Detects change: `{ field: 'usdToIlsRate', oldValue: 3.7, newValue: 3.75 }`
   - Calls `addParameterToBatch()`
   - Change stored in Map: `Map { 'usdToIlsRate' => {...} }`

2. **User edits USD rate again**: 3.75 → 3.77
   - `handleParametersChange` fires again
   - Detects change: `{ field: 'usdToIlsRate', oldValue: 3.75, newValue: 3.77 }`
   - Calls `addParameterToBatch()`
   - Map updates: keeps oldValue=3.7, newValue=3.77

3. **User edits EUR rate**: 4.0 → 4.05
   - `handleParametersChange` fires
   - Detects change: `{ field: 'eurToIlsRate', oldValue: 4.0, newValue: 4.05 }`
   - Calls `addParameterToBatch()`
   - Map now has 2 entries

4. **User closes quotation**
   - `useEffect` cleanup runs
   - Calls `flushParameters()`
   - Creates ONE log with 2 changes:
     - "שער דולר לשקל: 3.7 ← 3.77"
     - "שער יורו לשקל: 4.0 ← 4.05"

---

### Item Addition Flow

1. **User adds Item 1** at time 0:00
   - Calls `addItemToBatch()`
   - Batch: `[Item1]`
   - Timer: starts (3 seconds)

2. **User adds Item 2** at time 0:01
   - Calls `addItemToBatch()`
   - Batch: `[Item1, Item2]`
   - Timer: resets (3 seconds from now)

3. **User adds Item 3** at time 0:02
   - Calls `addItemToBatch()`
   - Batch: `[Item1, Item2, Item3]`
   - Timer: resets (3 seconds from now)

4. **Timer fires** at time 0:05 (3 seconds after last item)
   - Calls `flushItems()`
   - Creates ONE log: "נוספו 3 פריטים"

**OR**

4. **User closes quotation** at time 0:03
   - `useEffect` cleanup runs
   - Calls `flushItems()`
   - Creates ONE log: "נוספו 3 פריטים" (immediately)

---

## Benefits

### Before Smart Batching:

- Edit USD rate from 3.7 to 3.75 (typing 4 characters) → **4 logs**
- Add 5 items → **5 logs**
- Total: **9 logs** for simple workflow

### After Smart Batching:

- Edit USD rate from 3.7 to 3.75 → **1 log** (on close)
- Add 5 items → **1 log** (after 3 seconds or on close)
- Total: **2 logs** for same workflow

**78% reduction in log noise!**

---

## Edge Cases Handled

### 1. No Net Change

```typescript
User: USD rate 3.7 → 3.8 → 3.7 (back to original)
Result: NO log created (smart detection via Map comparison)
```

### 2. Multiple Fields

```typescript
User: Changes USD, EUR, markup, risk %
Result: ONE log with all 4 changes listed
```

### 3. Browser Refresh

```typescript
User: Edits parameters, refreshes browser
Result: Batch lost (acceptable - changes still saved to DB)
```

### 4. Quick Close

```typescript
User: Adds 2 items, immediately closes quotation
Result: Cleanup effect flushes batch → ONE log created
```

---

## Configuration

**Batch Window**: 3 seconds (configurable via `BATCH_WINDOW_MS` constant)

**To adjust timing**:

```typescript
// In useActivityBatching.ts
const BATCH_WINDOW_MS = 5000; // Change to 5 seconds
```

---

## Future Enhancements

1. **Visual Indicator**: Show "Changes will be logged when you close" tooltip
2. **Configurable Per-User**: Let users set batch window (3s, 5s, 10s)
3. **Smart Thresholds**: Auto-log if >10 changes to prevent data loss
4. **Undo Support**: Allow reverting batched changes before flush
5. **Batch Preview**: Show pending batched changes in UI

---

## Testing

### Test 1: Parameter Batching

```
1. Open quotation
2. Edit USD rate: 3.7 → 3.75 (type each digit)
3. Edit EUR rate: 4.0 → 4.05 (type each digit)
4. Close quotation
5. Check Activity Log
Expected: ONE log "שונו פרמטרים: שער דולר (3.7 ← 3.75), שער יורו (4.0 ← 4.05)"
```

### Test 2: Item Batching (Timer)

```
1. Open quotation
2. Add 3 items quickly (within 3 seconds)
3. Wait 3 seconds (don't close quotation)
4. Check Activity Log
Expected: ONE log "נוספו 3 פריטים"
```

### Test 3: Item Batching (Manual Flush)

```
1. Open quotation
2. Add 2 items
3. Immediately close quotation (before 3 seconds)
4. Check Activity Log
Expected: ONE log "נוספו 2 פריטים"
```

### Test 4: No Net Change

```
1. Open quotation
2. Edit USD rate: 3.7 → 4.0 → 3.7 (back to original)
3. Close quotation
4. Check Activity Log
Expected: NO log (no net change)
```

---

## Files Modified

- ✅ `src/hooks/useActivityBatching.ts` - Added `useParameterChangeBatching`
- ✅ `src/hooks/quotation/useQuotationActions.ts` - Integrated parameter batching
- ✅ `src/components/quotations/QuotationParameters.tsx` - Removed debouncing (back to immediate updates)

---

**Status**: ✅ Ready for Production
**TypeScript**: ✅ Compiles with no errors
**Impact**: 78% reduction in activity log noise
