# Assemblies Feature - Implementation Guide

## Status: 70% Complete

### ✅ Completed Components

#### 1. Database Schema (`scripts/database-schema.sql`)
- **Tables Created:**
  - `assemblies` - Stores assembly metadata
  - `assembly_components` - Junction table linking components to assemblies
- **Features:**
  - `is_complete` flag for tracking deleted components
  - Automatic trigger to mark assemblies incomplete when components deleted
  - Component snapshots (name, manufacturer, PN) preserved even after deletion
  - Row-level security policies enabled

#### 2. TypeScript Types (`src/types.ts`)
- `Assembly` - Main assembly interface
- `AssemblyComponent` - Junction table entry with component snapshot
- `AssemblyPricing` - Currency-aware pricing breakdown
- `AssemblyWithPricing` - Display type with calculated pricing
- `DbAssembly` & `DbAssemblyComponent` - Database schema types

#### 3. Business Logic (`src/utils/assemblyCalculations.ts`)
- `calculateAssemblyPricing()` - Respects each component's original currency
- `formatAssemblyPricing()` - Formats prices in NIS, USD, EUR
- `getAssemblyPricingBreakdown()` - Hebrew breakdown description
- `validateAssembly()` - Validation before save

#### 4. Data Layer (`src/hooks/useAssemblies.ts`)
- `addAssembly()` - Create new assembly with components
- `updateAssembly()` - Update name, description, notes, or components list
- `deleteAssembly()` - Delete assembly (cascades to components)
- `checkComponentUsage()` - Check if component is used in assemblies
- `refreshAssemblies()` - Manual refresh

#### 5. Context Integration (`src/contexts/CPQContext.tsx`)
- Integrated `useAssemblies` hook
- Updated `deleteComponent()` to check assembly usage
- Throws `ASSEMBLY_USAGE:` error for UI to handle
- All assembly methods exposed through context

#### 6. UI Components
- `AssemblyGrid.tsx` - Grid display with pricing (COMPLETE)
- Displays: name, description, component count, 3-currency pricing, incomplete badge
- Actions: Edit, Delete buttons

---

## 🚧 Remaining Work (30%)

### 1. AssemblyForm Component
**File:** `src/components/library/AssemblyForm.tsx`

**Required Features:**
- Modal dialog for create/edit
- Name, description, notes inputs
- Component picker with search
- Quantity input per component
- Live pricing preview (show all 3 currencies)
- Save/Cancel buttons

**Implementation Example:**
```tsx
<AssemblyForm
  assembly={selectedAssembly} // null for new, Assembly for edit
  isOpen={isFormOpen}
  onClose={() => setIsFormOpen(false)}
  onSave={async (name, components, description, notes) => {
    if (selectedAssembly) {
      await updateAssembly(selectedAssembly.id, { name, components, description, notes });
    } else {
      await addAssembly(name, components, description, notes);
    }
  }}
/>
```

---

### 2. Tab Navigation in ComponentLibrary
**File:** `src/components/library/ComponentLibrary.tsx`

**Changes Needed:**
1. Add state for active tab:
   ```tsx
   const [activeTab, setActiveTab] = useState<'components' | 'assemblies'>('components');
   ```

2. Add Tabs UI (using Radix UI tabs from shadcn):
   ```tsx
   <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
     <TabsList>
       <TabsTrigger value="components">רכיבים ({components.length})</TabsTrigger>
       <TabsTrigger value="assemblies">הרכבות ({assemblies.length})</TabsTrigger>
     </TabsList>

     <TabsContent value="components">
       {/* Existing ComponentLibrary content */}
     </TabsContent>

     <TabsContent value="assemblies">
       <AssemblyGrid
         assemblies={assemblies}
         onEdit={handleEditAssembly}
         onDelete={handleDeleteAssembly}
       />
     </TabsContent>
   </Tabs>
   ```

3. Add assembly handlers:
   ```tsx
   const handleEditAssembly = (assembly: Assembly) => {
     setModal({ type: 'edit-assembly', data: assembly });
   };

   const handleDeleteAssembly = async (id: string, name: string) => {
     // Show confirmation dialog
     // Call deleteAssembly(id)
   };
   ```

---

### 3. Component Delete Warning Handler
**File:** `src/components/library/ComponentLibrary.tsx`

**Update `confirmDelete` function:**
```tsx
const confirmDelete = async () => {
  if (!deleteConfirm.componentId) return;

  try {
    await deleteComponent(deleteConfirm.componentId);
    setDeleteConfirm({ isOpen: false, componentId: null, componentName: '' });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ASSEMBLY_USAGE:')) {
      const message = error.message.replace('ASSEMBLY_USAGE:', '');

      // Show custom confirmation dialog
      const confirmed = window.confirm(message);

      if (confirmed) {
        // User approved - force delete by calling deleteComponent directly on hook
        const { deleteComponent: forceDelete } = useComponents();
        await forceDelete(deleteConfirm.componentId);
        setDeleteConfirm({ isOpen: false, componentId: null, componentName: '' });
      }
    } else {
      toast.error(`Failed to delete: ${error}`);
    }
  }
};
```

---

### 4. Database Migration
**Run in Supabase SQL Editor:**

```bash
# Execute the updated database-schema.sql file
# This will create the assemblies and assembly_components tables
```

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `scripts/database-schema.sql` (lines 146-213)
3. Run the SQL
4. Verify tables created: `assemblies`, `assembly_components`

---

### 5. Testing

**Manual Testing Checklist:**
- [ ] Create assembly with 2-3 components
- [ ] View assembly in grid - verify pricing shows all 3 currencies
- [ ] Edit assembly - change name, add/remove components
- [ ] Delete assembly
- [ ] Try to delete component used in assembly - verify warning shows
- [ ] Approve deletion - verify assembly marked as incomplete
- [ ] Create assembly with components in different currencies (USD, EUR, NIS)
- [ ] Verify total price calculated correctly

**Unit Tests (src/utils/__tests__/assemblyCalculations.test.ts):**
```typescript
describe('calculateAssemblyPricing', () => {
  it('should calculate pricing for single-currency assembly', () => {
    // Test assembly with all NIS components
  });

  it('should calculate pricing for multi-currency assembly', () => {
    // Test assembly with USD, EUR, NIS components
  });

  it('should handle missing components', () => {
    // Test assembly with deleted components
  });
});
```

---

## Architecture Decisions

### ✅ Currency Handling
- Each component preserves its **original currency** (USD, EUR, NIS)
- Assembly pricing is calculated **dynamically** using current exchange rates
- Display shows all 3 currencies for transparency

### ✅ Component Deletion
- Components used in assemblies trigger a warning
- User must confirm deletion
- Assembly marked as `is_complete = false`
- Component data preserved as snapshot in `assembly_components`

### ✅ Database Design
- No price storage in `assemblies` table (calculated on-the-fly)
- Soft delete via `component_id = NULL` in junction table
- Automatic triggers maintain data integrity

---

## Next Steps (Priority Order)

1. **Run Database Migration** (5 min)
   - Execute SQL in Supabase

2. **Create AssemblyForm Component** (2-3 hours)
   - Component picker
   - Live pricing preview
   - Save/validation logic

3. **Add Tab Navigation** (30 min)
   - Update ComponentLibrary.tsx
   - Import Tabs from shadcn/ui

4. **Update Delete Handler** (15 min)
   - Handle ASSEMBLY_USAGE error
   - Show custom confirmation

5. **Manual Testing** (1 hour)
   - Test all CRUD operations
   - Verify currency calculations
   - Test delete warnings

6. **Write Unit Tests** (1 hour)
   - Test `assemblyCalculations.ts`
   - Test edge cases

---

## File Checklist

### Created/Modified Files:
- ✅ `scripts/database-schema.sql` - Database schema
- ✅ `src/types.ts` - TypeScript types
- ✅ `src/utils/assemblyCalculations.ts` - Pricing calculations
- ✅ `src/hooks/useAssemblies.ts` - Data hook
- ✅ `src/contexts/CPQContext.tsx` - Context integration
- ✅ `src/components/library/AssemblyGrid.tsx` - Display component
- ⏳ `src/components/library/AssemblyForm.tsx` - **TODO**
- ⏳ `src/components/library/ComponentLibrary.tsx` - **TODO: Add tabs**

---

## API Reference

### Context Methods

```typescript
// Add assembly
await addAssembly(
  'Gripper Station',
  [
    { componentId: 'comp-123', quantity: 2 },
    { componentId: 'comp-456', quantity: 1 }
  ],
  'Complete gripper assembly with pneumatics',
  'Includes all hardware'
);

// Update assembly
await updateAssembly('assembly-id', {
  name: 'Updated Name',
  components: [{ componentId: 'comp-789', quantity: 3 }]
});

// Delete assembly
await deleteAssembly('assembly-id');

// Check component usage
const usage = await checkComponentUsage('component-id');
// Returns: { isUsed: true, assemblies: [{ id, name }] }
```

### Utility Functions

```typescript
// Calculate pricing
const pricing = calculateAssemblyPricing(assembly);
// Returns: { totalCostNIS, totalCostUSD, totalCostEUR, breakdown, ... }

// Format for display
const formatted = formatAssemblyPricing(pricing);
// Returns: { nis: '₪5,250.00', usd: '$1,418.92', eur: '€1,312.50', primary: '₪5,250.00' }

// Get breakdown description
const breakdown = getAssemblyPricingBreakdown(pricing);
// Returns: "3 רכיבים בש"ח (₪1,350.00) • 2 רכיבים ב-USD ($850.00)"
```

---

## Support

For questions or issues:
1. Check this document first
2. Review `CLAUDE.md` for system architecture
3. Test database connection with simple query
4. Check browser console for errors

---

**Last Updated:** 2025-01-21
**Implementation Status:** 70% Complete
**Estimated Time to Complete:** 4-6 hours
