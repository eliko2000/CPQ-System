# Labor Separation Implementation Plan

## Executive Summary

This plan details the complete architectural change to separate Labor from the Component Library into a dedicated Labor Types catalog. This will:

- **Internal Labor** (your team) uses the global `dayWorkCost` setting - change once, affects all quotations
- **External Labor** (freelancers, specialists) has fixed custom rates
- Eliminate unnecessary fields (supplier, manufacturer, etc.) for labor entries
- Create a cleaner, more maintainable architecture

---

## Impact Analysis

### ✅ What STAYS the Same

- **Quotation Items**: Can still have `itemType: 'labor'` with `laborSubtype`
- **Calculations**: Labor subtotals, analytics, and reporting continue to work
- **Database**: `quotation_items` table core structure unchanged
- **Existing Quotations**: All existing quotations with labor items remain functional

### 🔄 What CHANGES

- **Component Library**: No longer contains labor items
- **Labor Pricing**:
  - Internal labor uses `dayWorkCost` (dynamic, changes globally)
  - External labor uses fixed rates per labor type
- **Add Item Flow**: New tab for "Labor Types" in AddItemDialog
- **Database**: New `labor_types` table + migration to move existing labor components

---

## Database Changes

### 1. New `labor_types` Table

```sql
CREATE TABLE labor_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  labor_subtype TEXT CHECK (labor_subtype IN ('engineering', 'commissioning', 'installation', 'programming')),

  -- ⭐ Internal vs External Labor Pricing
  is_internal_labor BOOLEAN DEFAULT true, -- Internal team uses dayWorkCost
  external_rate DECIMAL(10,2), -- Fixed rate for external contractors

  description TEXT,
  default_days DECIMAL(6,2) DEFAULT 1.0, -- Suggested quantity (e.g., 0.5, 1, 2)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: External labor must have a rate
  CHECK (is_internal_labor = true OR external_rate IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_labor_types_team ON labor_types(team_id);
CREATE INDEX idx_labor_types_active ON labor_types(is_active);
CREATE INDEX idx_labor_types_internal ON labor_types(is_internal_labor);

-- RLS Policies
ALTER TABLE labor_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view labor types in their team"
  ON labor_types FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert labor types in their team"
  ON labor_types FOR INSERT
  WITH CHECK (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update labor types in their team"
  ON labor_types FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete labor types in their team"
  ON labor_types FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));
```

### 2. Migration Script: Move Labor Components

```sql
-- Migrate existing labor components to labor_types table
-- Assume all existing labor is internal team labor (uses dayWorkCost)
INSERT INTO labor_types (
  team_id,
  name,
  category,
  labor_subtype,
  is_internal_labor,
  external_rate,
  description,
  is_active,
  created_at
)
SELECT
  team_id,
  name,
  category,
  labor_subtype,
  true, -- All existing labor treated as internal
  NULL, -- No external rate
  description,
  is_active,
  created_at
FROM components
WHERE component_type = 'labor';

-- Optional: Delete labor components from components table
-- (Recommended after verifying migration success)
-- DELETE FROM components WHERE component_type = 'labor';
```

### 3. Update `quotation_items` Table

**Add labor_type_id column** (for tracking which labor type was used):

```sql
ALTER TABLE quotation_items
ADD COLUMN labor_type_id UUID REFERENCES labor_types(id) ON DELETE SET NULL,
ADD COLUMN is_internal_labor BOOLEAN; -- Track if this item uses internal rate

-- Note: component_id can be NULL for labor items going forward
-- Old labor items still reference component_id (backward compatible)
```

### 4. **IMPORTANT**: Keep `components` Table Structure

**DO NOT remove** `component_type` or `labor_subtype` columns from `components` table:

- Needed for backward compatibility with existing quotations
- Existing quotations reference `component_id` that may point to old labor components
- After migration, new labor items won't be added to components table

---

## Type Definition Changes

### 1. New `LaborType` Interface

**File**: `src/types/labor.types.ts` (NEW FILE)

```typescript
import type { LaborSubtype } from './common.types';

// Labor Type (in catalog)
export interface LaborType {
  id: string;
  name: string;
  category?: string;
  laborSubtype: LaborSubtype;

  // ⭐ Internal vs External Labor
  isInternalLabor: boolean; // If true, uses quotation's dayWorkCost
  externalRate?: number; // Only for external labor (fixed rate per day)

  description?: string;
  defaultDays: number; // Suggested quantity
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Database schema
export interface DbLaborType {
  id: string;
  team_id: string;
  name: string;
  category?: string;
  labor_subtype:
    | 'engineering'
    | 'commissioning'
    | 'installation'
    | 'programming';

  // ⭐ Internal vs External Labor
  is_internal_labor: boolean;
  external_rate?: number;

  description?: string;
  default_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form data for creating/editing labor types
export interface LaborTypeFormData {
  name: string;
  category?: string;
  laborSubtype: LaborSubtype;
  isInternalLabor: boolean;
  externalRate?: number;
  description?: string;
  defaultDays: number;
}
```

### 2. Update `common.types.ts`

**KEEP** `ComponentType` and `LaborSubtype` - still needed for quotation items:

```typescript
// NO CHANGES - keep as is for backward compatibility
export type ComponentType = 'hardware' | 'software' | 'labor';
export type LaborSubtype =
  | 'engineering'
  | 'commissioning'
  | 'installation'
  | 'programming';
```

### 3. Update `component.types.ts`

**KEEP** existing structure for backward compatibility:

```typescript
// Component interface - labor fields still present but won't be used for new entries
export interface Component {
  // ... existing fields ...
  componentType: ComponentType; // Still includes 'labor' for old data
  laborSubtype?: LaborSubtype; // Still present for old data
}
```

### 4. Update `quotation.types.ts`

**ADD** labor_type_id and is_internal_labor to QuotationItem:

```typescript
export interface QuotationItem {
  // ... existing fields ...
  componentId?: string; // Optional - null for labor items
  laborTypeId?: string; // NEW - reference to labor_types table
  isInternalLabor?: boolean; // NEW - if true, recalculate when dayWorkCost changes
  // ... rest of fields stay the same ...
}

export interface DbQuotationItem {
  // ... existing fields ...
  component_id?: string; // Optional
  labor_type_id?: string; // NEW
  is_internal_labor?: boolean; // NEW
  // ... rest stays the same ...
}
```

---

## UI Component Changes

### 1. NEW: LaborTypeForm Component

**File**: `src/components/labor/LaborTypeForm.tsx` (NEW)

Simplified form for labor types:

```tsx
<div className="space-y-4">
  {/* Name */}
  <div>
    <Label>שם סוג העבודה</Label>
    <Input value={name} onChange={...} placeholder="לדוגמה: הנדסה" />
  </div>

  {/* Labor Subtype */}
  <div>
    <Label>תת-קטגוריה</Label>
    <Select value={laborSubtype}>
      <option value="engineering">הנדסה</option>
      <option value="commissioning">הרצה</option>
      <option value="installation">התקנה</option>
      <option value="programming">תכנות</option>
    </Select>
  </div>

  {/* ⭐ Internal vs External Labor Type */}
  <div className="border rounded-lg p-4 space-y-3">
    <Label className="text-base font-semibold">סוג העבודה</Label>

    {/* Internal Labor Option */}
    <div className="flex items-center gap-2">
      <input
        type="radio"
        name="laborType"
        checked={isInternalLabor}
        onChange={() => setIsInternalLabor(true)}
      />
      <Label>עבודה פנימית (צוות החברה) 🏢</Label>
    </div>

    {isInternalLabor && (
      <p className="text-sm text-gray-600 mr-6">
        ישתמש במחיר יום עבודה פנימי: ₪{currentDayWorkCost}/יום
        <br/>
        <span className="text-xs text-blue-600">
          💡 שינוי המחיר הגלובלי ישפיע על כל הצעות המחיר
        </span>
      </p>
    )}

    {/* External Labor Option */}
    <div className="flex items-center gap-2">
      <input
        type="radio"
        name="laborType"
        checked={!isInternalLabor}
        onChange={() => setIsInternalLabor(false)}
      />
      <Label>עבודה חיצונית (פרילנסרים/יועצים) 👤</Label>
    </div>

    {!isInternalLabor && (
      <div className="mr-6">
        <Label className="text-sm">מחיר ליום (קבוע)</Label>
        <Input
          type="number"
          value={externalRate}
          onChange={(e) => setExternalRate(Number(e.target.value))}
          placeholder="3500"
        />
        <p className="text-xs text-gray-500 mt-1">
          מחיר קבוע שלא משתנה עם המחיר הגלובלי
        </p>
      </div>
    )}
  </div>

  {/* Default Days */}
  <div>
    <Label>כמות ימים ברירת מחדל</Label>
    <Input
      type="number"
      step="0.5"
      value={defaultDays}
      onChange={(e) => setDefaultDays(Number(e.target.value))}
      placeholder="1.0"
    />
  </div>

  {/* Description */}
  <div>
    <Label>תיאור (אופציונלי)</Label>
    <Textarea value={description} onChange={...} />
  </div>
</div>
```

### 2. NEW: LaborTypeGrid Component

**File**: `src/components/labor/LaborTypeGrid.tsx` (NEW)

AG-Grid showing labor types:

**Columns:**

- Name
- Subtype (הנדסה, הרצה, התקנה, תכנות)
- Type (🏢 פנימי / 👤 חיצוני)
- Rate (₪1,200/day 🏢 or ₪3,500/day 👤)
- Default Days
- Actions (Edit, Delete)

**Example Data:**
| Name | Subtype | Type | Rate | Default Days |
|------|---------|------|------|--------------|
| הנדסה | הנדסה | 🏢 פנימי | ₪1,200/day 🏢 | 1.0 |
| הרצה | הרצה | 🏢 פנימי | ₪1,200/day 🏢 | 0.5 |
| מומחה ראייה | הנדסה | 👤 חיצוני | ₪3,500/day | 2.0 |
| פרילנסר | הנדסה | 👤 חיצוני | ₪2,000/day | 1.0 |

### 3. NEW: LaborTypesPage Component

**File**: `src/pages/labor/LaborTypesPage.tsx` (NEW)

Main page for labor types management (similar to ComponentLibrary):

- List all labor types with LaborTypeGrid
- "Add Labor Type" button
- Edit/delete existing labor types
- Search and filter capabilities

### 4. UPDATE: AddItemDialog

**File**: `src/components/quotations/AddItemDialog.tsx`

**Changes**:

- Add new tab: `'components' | 'assemblies' | 'custom' | 'labor'`
- Display labor types in new "Labor" tab
- Show pricing preview based on internal vs external

```typescript
interface AddItemDialogProps {
  // ... existing props ...
  laborTypes: LaborType[]; // NEW
  filteredLaborTypes: LaborType[]; // NEW
  onAddLaborType: (laborType: LaborType) => void; // NEW
  currentDayWorkCost: number; // For displaying internal labor price
}
```

**Labor Tab UI:**

```tsx
<TabsContent value="labor">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {filteredLaborTypes.map(laborType => {
      const ratePerDay = laborType.isInternalLabor
        ? currentDayWorkCost
        : laborType.externalRate!;
      const totalCost = ratePerDay * laborType.defaultDays;

      return (
        <div
          key={laborType.id}
          className="border rounded-lg p-4 hover:border-blue-300 cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <h4 className="font-medium">{laborType.name}</h4>
            <span className="text-xs">
              {laborType.isInternalLabor ? '🏢 פנימי' : '👤 חיצוני'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-2">
            {laborType.defaultDays} ימים × ₪{ratePerDay}/יום = ₪{totalCost}
          </p>

          {laborType.isInternalLabor && (
            <p className="text-xs text-blue-600 mt-1">
              💡 משתמש במחיר פנימי (₪{currentDayWorkCost})
            </p>
          )}
        </div>
      );
    })}
  </div>
</TabsContent>
```

### 5. UPDATE: ComponentForm

**File**: `src/components/library/ComponentForm.tsx`

**Changes**:

- Remove "Labor" option from componentType dropdown
- Remove labor subtype field

```typescript
// Before:
<SelectItem value="hardware">חומרה</SelectItem>
<SelectItem value="software">תוכנה</SelectItem>
<SelectItem value="labor">עבודה</SelectItem> // ❌ REMOVE THIS

// After:
<SelectItem value="hardware">חומרה</SelectItem>
<SelectItem value="software">תוכנה</SelectItem>
// Labor removed - use Labor Types page instead
```

### 6. UPDATE: CustomItemForm

**File**: `src/components/quotations/CustomItemForm.tsx`

**KEEP** labor option for custom items:

- Custom items can still be labor type
- Uses manual price entry, not dayWorkCost or labor types
- For ad-hoc labor that doesn't belong in catalog

### 7. UPDATE: EnhancedComponentGrid

**File**: `src/components/library/EnhancedComponentGrid.tsx`

**Changes**:

- Filter out labor components from display
- Add filter: `components.filter(c => c.componentType !== 'labor')`

### 8. UPDATE: Sidebar Navigation

**File**: `src/components/shared/Sidebar.tsx`

**Changes**:

- Add new menu item: "סוגי עבודה" (Labor Types)
- Place between "Component Library" and "Assemblies"
- Icon suggestion: 🏢 or similar

### 9. UPDATE: QuotationParameters Panel

**File**: `src/components/quotations/QuotationParameters.tsx`

**Update label and help text:**

```tsx
<div className="space-y-2">
  <Label>מחיר יום עבודה פנימי</Label>
  <Input
    type="number"
    value={parameters.dayWorkCost}
    onChange={e =>
      updateParameters({
        ...parameters,
        dayWorkCost: Number(e.target.value),
      })
    }
  />
  <p className="text-sm text-gray-500">עלות יום עבודה לצוות הפנימי של החברה</p>
  <p className="text-xs text-blue-600">
    💡 שינוי זה ישפיע על כל פריטי העבודה הפנימית בהצעה
  </p>
</div>
```

---

## Hook Changes

### 1. NEW: useLaborTypes Hook

**File**: `src/hooks/useLaborTypes.ts` (NEW)

Similar to `useComponents` but for labor types:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  LaborType,
  DbLaborType,
  LaborTypeFormData,
} from '../types/labor.types';
import { useTeam } from '../contexts/TeamContext';

export function useLaborTypes() {
  const { currentTeam } = useTeam();
  const [laborTypes, setLaborTypes] = useState<LaborType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert DB labor type to frontend type
  const dbToLaborType = (db: DbLaborType): LaborType => ({
    id: db.id,
    name: db.name,
    category: db.category,
    laborSubtype: db.labor_subtype,
    isInternalLabor: db.is_internal_labor,
    externalRate: db.external_rate,
    description: db.description,
    defaultDays: db.default_days,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  });

  const loadLaborTypes = async () => {
    if (!currentTeam?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('labor_types')
        .select('*')
        .eq('team_id', currentTeam.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLaborTypes((data || []).map(dbToLaborType));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addLaborType = async (formData: LaborTypeFormData) => {
    if (!currentTeam?.id) throw new Error('No team selected');

    const { data, error } = await supabase
      .from('labor_types')
      .insert({
        team_id: currentTeam.id,
        name: formData.name,
        category: formData.category,
        labor_subtype: formData.laborSubtype,
        is_internal_labor: formData.isInternalLabor,
        external_rate: formData.externalRate,
        description: formData.description,
        default_days: formData.defaultDays,
      })
      .select()
      .single();

    if (error) throw error;

    await loadLaborTypes(); // Reload
    return dbToLaborType(data);
  };

  const updateLaborType = async (
    id: string,
    updates: Partial<LaborTypeFormData>
  ) => {
    const { error } = await supabase
      .from('labor_types')
      .update({
        name: updates.name,
        category: updates.category,
        labor_subtype: updates.laborSubtype,
        is_internal_labor: updates.isInternalLabor,
        external_rate: updates.externalRate,
        description: updates.description,
        default_days: updates.defaultDays,
      })
      .eq('id', id);

    if (error) throw error;
    await loadLaborTypes(); // Reload
  };

  const deleteLaborType = async (id: string) => {
    // Soft delete
    const { error } = await supabase
      .from('labor_types')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await loadLaborTypes(); // Reload
  };

  useEffect(() => {
    loadLaborTypes();
  }, [currentTeam?.id]);

  return {
    laborTypes,
    loading,
    error,
    addLaborType,
    updateLaborType,
    deleteLaborType,
    reload: loadLaborTypes,
  };
}
```

### 2. UPDATE: useComponents Hook

**File**: `src/hooks/useComponents.ts`

**Changes**:

- Filter out labor components from queries (optional - can keep for backward compatibility)

```typescript
// Option 1: Always filter labor (recommended)
const { data, error } = await supabase
  .from('components')
  .select('*')
  .eq('team_id', currentTeam.id)
  .neq('component_type', 'labor') // ⭐ Filter out labor
  .eq('is_active', true);

// Option 2: Make it optional (for backward compatibility)
const loadComponents = async (excludeLabor = true) => {
  let query = supabase
    .from('components')
    .select('*')
    .eq('team_id', currentTeam.id)
    .eq('is_active', true);

  if (excludeLabor) {
    query = query.neq('component_type', 'labor');
  }

  const { data } = await query;
  // ...
};
```

### 3. UPDATE: useQuotationActions Hook

**File**: `src/hooks/quotation/useQuotationActions.ts`

**ADD**: `addLaborTypeToSystem` function

```typescript
const addLaborTypeToSystem = useCallback(
  async (laborType: LaborType) => {
    if (!currentQuotation || !selectedSystemId) return;

    const system = currentQuotation.systems.find(
      s => s.id === selectedSystemId
    );
    if (!system) return;

    // ⭐ CRITICAL: Determine rate based on internal vs external
    const ratePerDay = laborType.isInternalLabor
      ? currentQuotation.parameters.dayWorkCost // Internal: use quotation's rate
      : laborType.externalRate!; // External: use fixed rate

    const quantity = laborType.defaultDays;
    const totalCostILS = ratePerDay * quantity;

    // Convert to USD/EUR using quotation exchange rates
    const totalCostUSD =
      totalCostILS / currentQuotation.parameters.usdToIlsRate;
    const totalCostEUR =
      totalCostILS / currentQuotation.parameters.eurToIlsRate;

    // Create quotation item
    const dbItem = await quotationsHook.addQuotationItem({
      quotation_system_id: selectedSystemId,
      component_id: undefined, // No component
      labor_type_id: laborType.id, // Link to labor type
      item_name: laborType.name,
      item_type: 'labor',
      labor_subtype: laborType.laborSubtype,
      is_internal_labor: laborType.isInternalLabor, // ⭐ Track type
      quantity: quantity,
      unit_cost: ratePerDay,
      total_cost: totalCostILS,
      unit_price: ratePerDay,
      total_price: totalCostILS,
      notes: laborType.description,
      sort_order: itemOrder,
    });

    if (!dbItem) throw new Error('Failed to create labor item');

    // Create local item
    const newItem: QuotationItem = {
      id: dbItem.id,
      systemId: selectedSystemId,
      systemOrder: system.order,
      itemOrder,
      displayNumber: `${system.order}.${itemOrder}`,
      laborTypeId: laborType.id,
      isInternalLabor: laborType.isInternalLabor, // ⭐ For recalculation
      componentName: laborType.name,
      componentCategory: laborType.category || 'עבודה',
      itemType: 'labor',
      laborSubtype: laborType.laborSubtype,
      quantity: quantity,
      unitPriceILS: ratePerDay,
      totalPriceILS: totalCostILS,
      unitPriceUSD: totalCostUSD,
      totalPriceUSD: totalCostILS / currentQuotation.parameters.usdToIlsRate,
      itemMarkupPercent: 0, // Labor sold at cost
      customerPriceILS: totalCostILS,
      notes: laborType.description,
      createdAt: dbItem.created_at,
      updatedAt: dbItem.updated_at,
    };

    // Renumber items
    const updatedItems = [...currentQuotation.items, newItem];
    const renumberedItems = renumberItems(updatedItems);

    const updatedQuotation = {
      ...currentQuotation,
      items: renumberedItems,
    };

    setCurrentQuotation(updatedQuotation);
    updateQuotation(currentQuotation.id, { items: renumberedItems });
    setShowComponentSelector(false);
  },
  [currentQuotation, selectedSystemId /* ... */]
);

return {
  // ... existing functions ...
  addLaborTypeToSystem, // NEW
};
```

### 4. UPDATE: useQuotationActions.updateParameters

**ADD**: Recalculate labor prices when dayWorkCost changes (ONLY for internal labor)

```typescript
const updateParameters = useCallback((parameters: any) => {
  if (!currentQuotation) return;

  // Check if exchange rates changed
  const ratesChanged =
    parameters.usdToIlsRate !== currentQuotation.parameters.usdToIlsRate ||
    parameters.eurToIlsRate !== currentQuotation.parameters.eurToIlsRate;

  // ⭐ Check if dayWorkCost changed
  const dayWorkCostChanged =
    parameters.dayWorkCost !== currentQuotation.parameters.dayWorkCost;

  let updatedItems = currentQuotation.items;

  // Recalculate exchange rate conversions
  if (ratesChanged) {
    updatedItems = /* ... existing exchange rate logic ... */;
  }

  // ⭐ Recalculate INTERNAL labor prices if dayWorkCost changed
  if (dayWorkCostChanged) {
    updatedItems = updatedItems.map(item => {
      // Only recalculate internal labor items
      if (item.itemType !== 'labor' || !item.isInternalLabor) {
        return item; // External labor and non-labor stay unchanged
      }

      // Recalculate with new internal day work cost
      const newUnitPrice = parameters.dayWorkCost;
      const newTotalPrice = newUnitPrice * item.quantity;

      return {
        ...item,
        unitPriceILS: newUnitPrice,
        totalPriceILS: newTotalPrice,
        unitPriceUSD: newUnitPrice / parameters.usdToIlsRate,
        totalPriceUSD: newTotalPrice / parameters.usdToIlsRate,
        customerPriceILS: newTotalPrice,
      };
    });
  }

  const updatedQuotation = {
    ...currentQuotation,
    parameters,
    items: updatedItems,
  };

  setCurrentQuotation(updatedQuotation);
  updateQuotation(currentQuotation.id, {
    parameters,
    items: updatedItems
  });
}, [currentQuotation, setCurrentQuotation, updateQuotation]);
```

### 5. UPDATE: useAnalytics Hook

**File**: `src/hooks/useAnalytics.ts`

**NO CHANGES** - Analytics still works because it uses `quotation.items` which still has `itemType: 'labor'`

---

## Calculation Changes

### 1. UPDATE: quotationCalculations.ts

**File**: `src/utils/quotationCalculations.ts`

**CRITICAL FIX**: Labor pricing calculation

```typescript
// Lines 54-59: Labor pricing (NO CHANGES NEEDED HERE)
customerPriceILS =
  item.itemType === 'labor'
    ? totalPriceILS // ✅ Labor sold at cost (cost already includes dayWorkCost)
    : totalPriceILS / profitCoefficient;

// The fix is in useQuotationActions where labor items are created
// with the correct pricing (dayWorkCost for internal, externalRate for external)
```

**ADD**: Helper function for recalculating labor prices (optional, can be inline)

```typescript
/**
 * Recalculate internal labor prices when dayWorkCost changes
 * External labor prices remain unchanged
 */
export function recalculateLaborPrices(
  items: QuotationItem[],
  newDayWorkCost: number,
  exchangeRates: { usdToIlsRate: number; eurToIlsRate: number }
): QuotationItem[] {
  return items.map(item => {
    // Only recalculate internal labor
    if (item.itemType !== 'labor' || !item.isInternalLabor) {
      return item;
    }

    // Recalculate with new day work cost
    const unitPriceILS = newDayWorkCost;
    const totalPriceILS = unitPriceILS * item.quantity;
    const totalPriceUSD = totalPriceILS / exchangeRates.usdToIlsRate;

    return {
      ...item,
      unitPriceILS,
      totalPriceILS,
      unitPriceUSD: unitPriceILS / exchangeRates.usdToIlsRate,
      totalPriceUSD,
      customerPriceILS: totalPriceILS, // Labor sold at cost
    };
  });
}
```

---

## Service Changes

### 1. UPDATE: laborClassifier.ts

**File**: `src/services/laborClassifier.ts`

**KEEP** - Still useful for classifying labor type names into subtypes

### 2. UPDATE: componentTypeClassifier.ts

**File**: `src/services/componentTypeClassifier.ts`

**Changes**:

- Remove or modify functions that return 'labor' as componentType

```typescript
export function classifyComponent(
  name: string,
  description?: string
): ComponentType {
  // ... existing hardware/software logic ...

  // Remove labor classification - labor items now go through Labor Types
  // return 'labor'; // ❌ REMOVE

  return 'hardware'; // Default
}
```

### 3. UPDATE: AI Extraction Services

**File**: `src/services/claudeAI.ts`, `src/services/excelParser.ts`, etc.

**Changes**:

- AI/Excel parsers should NOT create labor components
- If labor items detected, either skip them with a warning or flag for manual review

```typescript
// In AIExtractionPreview or parser results:
if (component.componentType === 'labor') {
  console.warn(
    'Labor items detected - should be added via Labor Types, not component import'
  );
  // Skip or flag for manual review
}
```

---

## Migration Strategy

### Phase 1: Database Setup (No User Impact)

1. **Run migration**: Create `labor_types` table
2. **Migrate data**: Copy labor components to `labor_types` (mark all as internal)
3. **Verify**: Check all labor items migrated correctly
4. **Add columns**: Add `labor_type_id` and `is_internal_labor` to `quotation_items` table

**Rollback**: Drop `labor_types` table, drop new columns

### Phase 2: Backend Code (No UI Changes Yet)

1. **Create types**: Add `labor.types.ts`
2. **Create hook**: Add `useLaborTypes.ts`
3. **Update calculations**: Add parameter change handler for dayWorkCost
4. **Add action**: Implement `addLaborTypeToSystem` in `useQuotationActions`
5. **Test**: Unit tests for labor pricing logic

**Rollback**: Revert code changes

### Phase 3: UI Components (User-Facing)

1. **Create components**: LaborTypeForm, LaborTypeGrid, LaborTypesPage
2. **Update navigation**: Add "Labor Types" menu item
3. **Update ComponentForm**: Remove labor option
4. **Update AddItemDialog**: Add labor tab
5. **Update EnhancedComponentGrid**: Filter out labor
6. **Update QuotationParameters**: Update label to "Internal Day Work Cost"
7. **Test**: E2E tests for adding labor to quotations

**Rollback**: Revert UI changes, old component flow still works

### Phase 4: Cleanup (Optional)

1. **Delete old data**: Remove labor components from `components` table
2. **Update docs**: Update CLAUDE.md with new labor workflow
3. **Remove legacy**: Clean up unused labor-related code in ComponentForm

**Rollback**: Restore deleted components from backup

### Backward Compatibility Plan

**Existing quotations with labor items**:

- ✅ Still work - they reference `component_id` in old components table
- ✅ Pricing calculations unchanged
- ✅ Analytics still work
- ✅ Can edit existing labor items
- ⚠️ Old labor items assumed to be internal labor (will recalculate with dayWorkCost changes)

**Future labor items**:

- ✅ Use `labor_type_id` instead of `component_id`
- ✅ Internal labor pricing from `dayWorkCost`
- ✅ External labor pricing from `external_rate`
- ✅ Clean separation from hardware catalog

---

## Testing Checklist

### Database Tests

- [ ] Create labor_types table successfully
- [ ] Migrate existing labor components (all as internal)
- [ ] RLS policies work correctly
- [ ] labor_type_id and is_internal_labor columns added to quotation_items
- [ ] Constraint: external labor must have external_rate

### Backend Tests

- [ ] useLaborTypes hook loads data
- [ ] addLaborType creates new entry (internal and external)
- [ ] updateLaborType modifies entry
- [ ] deleteLaborType soft-deletes entry
- [ ] addLaborTypeToSystem creates quotation item with correct pricing:
  - [ ] Internal labor uses dayWorkCost
  - [ ] External labor uses externalRate
- [ ] Changing dayWorkCost recalculates ONLY internal labor items
- [ ] External labor items remain unchanged when dayWorkCost changes

### UI Tests

- [ ] Labor Types page displays list
- [ ] Can create new internal labor type
- [ ] Can create new external labor type with custom rate
- [ ] Can edit existing labor type
- [ ] Can toggle between internal/external
- [ ] Can delete labor type
- [ ] AddItemDialog shows labor tab with correct pricing preview
- [ ] Adding internal labor to quotation uses dayWorkCost
- [ ] Adding external labor to quotation uses externalRate
- [ ] Changing dayWorkCost updates internal labor prices only
- [ ] Component Library doesn't show labor items
- [ ] Labor type grid shows correct icons (🏢 vs 👤)

### Integration Tests

- [ ] Old quotations with labor items still load correctly
- [ ] New quotations with labor items use new flow
- [ ] Mixed quotation (internal + external labor) calculates correctly
- [ ] Analytics still show labor metrics
- [ ] Labor Analytics component still works
- [ ] Export/PDF generation includes labor items

---

## File Checklist

### New Files to Create

- [ ] `src/types/labor.types.ts`
- [ ] `src/hooks/useLaborTypes.ts`
- [ ] `src/components/labor/LaborTypeForm.tsx`
- [ ] `src/components/labor/LaborTypeGrid.tsx`
- [ ] `src/pages/labor/LaborTypesPage.tsx`
- [ ] `migrations/create-labor-types-table.sql`
- [ ] `migrations/migrate-labor-components.sql`
- [ ] `migrations/add-labor-columns-to-quotation-items.sql`

### Files to Update

- [ ] `src/types/quotation.types.ts` - Add laborTypeId and isInternalLabor
- [ ] `src/components/quotations/AddItemDialog.tsx` - Add labor tab
- [ ] `src/components/quotations/QuotationParameters.tsx` - Update label
- [ ] `src/components/library/ComponentForm.tsx` - Remove labor option
- [ ] `src/components/library/EnhancedComponentGrid.tsx` - Filter labor
- [ ] `src/components/shared/Sidebar.tsx` - Add navigation
- [ ] `src/components/shared/AppRoutes.tsx` - Add route
- [ ] `src/hooks/useComponents.ts` - Filter labor (optional)
- [ ] `src/hooks/quotation/useQuotationActions.ts` - Add addLaborTypeToSystem + updateParameters
- [ ] `src/utils/quotationCalculations.ts` - Add recalculateLaborPrices helper (optional)
- [ ] `src/services/componentTypeClassifier.ts` - Remove labor classification

### Files to Review (May Not Need Changes)

- [ ] `src/utils/quotationCalculations.ts` - Verify labor pricing logic
- [ ] `src/hooks/useAnalytics.ts` - Verify still works
- [ ] `src/components/analytics/LaborAnalytics.tsx` - Verify still works
- [ ] `src/services/laborClassifier.ts` - Keep for subtype classification
- [ ] `src/lib/utils.ts` - convertDbQuotationToQuotationProject

---

## Risk Assessment

### High Risk (Requires Careful Testing)

- ⚠️ **Labor pricing calculation**: Must ensure dayWorkCost used for internal, externalRate for external
- ⚠️ **Parameter updates**: dayWorkCost changes must recalculate ONLY internal labor items
- ⚠️ **Backward compatibility**: Old quotations must still work

### Medium Risk

- ⚠️ **Database migration**: Ensure all labor components migrated correctly
- ⚠️ **RLS policies**: Ensure team isolation works for labor_types
- ⚠️ **UI flow**: Users must understand internal vs external labor concept

### Low Risk

- ✅ **Analytics**: Uses quotation items, not components
- ✅ **Export/PDF**: Already handles labor items correctly
- ✅ **Custom items**: Unaffected by this change

---

## Success Criteria

1. ✅ Labor catalog separate from component library
2. ✅ **Internal labor** pricing uses `dayWorkCost` setting (dynamic)
3. ✅ **External labor** pricing uses fixed rates
4. ✅ Changing `dayWorkCost` updates ONLY internal labor item prices
5. ✅ External labor prices remain fixed when dayWorkCost changes
6. ✅ No unnecessary fields (supplier, manufacturer) for labor
7. ✅ Clear UI distinction between internal (🏢) and external (👤) labor
8. ✅ All existing quotations still work correctly
9. ✅ All tests pass (unit + integration + E2E)
10. ✅ Analytics and reporting unchanged
11. ✅ Clean, maintainable code architecture

---

## Example Scenarios

### Scenario 1: All Internal Labor

**Setup:**

```
dayWorkCost: ₪1,200

Labor Types:
- הנדסה → Internal
- הרצה → Internal
```

**Quotation:**

```
Items:
- הנדסה × 3 days = ₪3,600 (using dayWorkCost)
- הרצה × 1 day = ₪1,200 (using dayWorkCost)
Total: ₪4,800
```

**Change dayWorkCost to ₪1,500:**

```
Items recalculate:
- הנדסה × 3 days = ₪4,500 ✅
- הרצה × 1 day = ₪1,500 ✅
Total: ₪6,000
```

### Scenario 2: Mixed Internal + External

**Setup:**

```
dayWorkCost: ₪1,200

Labor Types:
- הנדסה → Internal
- מומחה ראייה → External (₪3,500/day)
```

**Quotation:**

```
Items:
- הנדסה × 3 days = ₪3,600 (using dayWorkCost)
- מומחה ראייה × 2 days = ₪7,000 (using externalRate)
Total: ₪10,600
```

**Change dayWorkCost to ₪1,500:**

```
Items recalculate:
- הנדסה × 3 days = ₪4,500 ✅ (updated)
- מומחה ראייה × 2 days = ₪7,000 ✅ (unchanged)
Total: ₪11,500
```

### Scenario 3: Different Quotation Rates

**Quotation 1:**

```
dayWorkCost: ₪1,200
- הנדסה × 5 days = ₪6,000
```

**Quotation 2:**

```
dayWorkCost: ₪1,000 (special customer discount)
- הנדסה × 5 days = ₪5,000
```

Both use same labor type but different quotation rates!

---

## Estimated Effort

- **Database Setup**: 1 hour
- **Type Definitions**: 1 hour
- **Hooks (useLaborTypes)**: 2 hours
- **UI Components**: 5 hours (additional complexity for internal/external toggle)
- **Integration (AddItemDialog, useQuotationActions)**: 3 hours
- **Calculation Updates**: 2 hours
- **Testing**: 4 hours
- **Documentation**: 1 hour

**Total**: ~19 hours (2.5-3 days of development)

---

## Implementation Order (Recommended)

### Day 1: Foundation (6 hours)

1. Create database tables and migration scripts
2. Run migration to move labor components
3. Define TypeScript types (`labor.types.ts`)
4. Create `useLaborTypes` hook
5. Test database and hook

### Day 2: UI Components (6 hours)

6. Create LaborTypeForm component (with internal/external toggle)
7. Create LaborTypeGrid component (with icons)
8. Create LaborTypesPage
9. Add navigation and routing
10. Test labor catalog CRUD operations

### Day 3: Integration (7 hours)

11. Update AddItemDialog with labor tab
12. Implement `addLaborTypeToSystem` in useQuotationActions
13. Update `updateParameters` to handle dayWorkCost changes
14. Update QuotationParameters label
15. Update ComponentForm (remove labor option)
16. Filter labor from EnhancedComponentGrid
17. Full integration testing
18. E2E testing

---

## Next Steps

1. ✅ Review this plan and approve
2. Create GitHub issue/task tracking
3. Set up development branch
4. Begin Phase 1: Database Setup
