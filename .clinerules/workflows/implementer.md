# Implementer Workflow - CPQ System

**Purpose**: Write production-grade TypeScript/React code following CPQ project patterns with quality assurance through self-critique loops.

## When to Use This Workflow

- Implementing new features (OCR processing, BOM editing, pricing calculations)
- Fixing bugs in existing CPQ functionality
- Refactoring code while maintaining data integrity
- Adding new components or services

## Pre-Implementation Checklist

Before starting, ensure you have:

- [ ] Read relevant sections of CLAUDE.md for the feature area
- [ ] Analyzed existing code patterns in the target files
- [ ] Identified all dependencies and data flows
- [ ] Understood the pricing/business logic requirements

## Implementation Process

### Step 1: Code Writing Standards

**Must Follow:**
- No `any` types - use proper TypeScript interfaces
- Follow existing CPQ project patterns
- Add comprehensive error handling for edge cases
- Use path alias `@/` for imports
- Maintain data integrity (prices traceable to sources)
- Preserve existing indentation and code style

**Critical CPQ Patterns:**
```typescript
// State Updates (Immutable)
setBOMItems(prev => updateBOMItem(prev, itemId, updates));

// Database Sync Pattern
setComponents(prev => addComponentToLibrary(prev, newComponent));
if (session) {
  cpqService.createComponent(session.user.id, newComponent)
    .catch(e => showToast(`Error: ${e.message}`, 'error'));
}

// Price Calculations
import { getActivePrice, applyMarkup } from '@/src/utils/pricingUtils';
const componentPrice = getActivePrice(component.priceHistory);
const customerPrice = applyMarkup(componentPrice, markupRate);
```

### Step 2: Self-Critique Loops (Required)

After writing initial code, perform **3 critique iterations**:

**Iteration 1: Type Safety & Edge Cases**
- Any `any` types? Replace with proper types
- Null/undefined checks in place?
- Array/object access safely handled?
- Edge cases covered? (empty BOMs, null prices, invalid quantities)
- Price calculations handle zero/negative values?

**Iteration 2: Performance & Patterns**
- Follows existing CPQ patterns?
- Unnecessary re-renders? (memo/useCallback for large BOMs)
- Efficient data structures for pricing calculations?
- Assembly cost roll-up optimized?
- Matches coding style?

**Iteration 3: Error Handling & Readability**
- Try/catch for async operations?
- User-friendly error messages for pricing errors?
- Code readable without comments?
- Complex pricing logic explained?
- Data integrity maintained?

### Step 3: Database Validation (if applicable)

**Required for:** `cpqService.ts` changes, new pricing queries, schema modifications

Use available tools to validate:
- Test database queries before implementation
- Verify data structure matches expectations
- Check RLS policies don't block operations
- Validate price history integrity

## Output Format

```
📝 IMPLEMENTATION COMPLETE

Files Modified:
• src/components/BOMEditor.tsx:45 - Added inline quantity editing
• src/utils/pricingUtils.ts:123 - Enhanced assembly cost calculation

Changes Made:
- Added real-time BOM editing with validation
- Implemented recursive assembly cost roll-up
- Added error handling for invalid quantities

Self-Critique: ✓ 3 iterations completed
- Iteration 1: Fixed type safety issues with BOM item interfaces
- Iteration 2: Optimized performance for large assemblies with memoization
- Iteration 3: Added comprehensive error handling and user feedback

Testing Recommendations:
• Test BOM editing with various quantity values
• Verify assembly cost calculations update correctly
• Test error handling for invalid inputs

Pricing Validation:
• Verify calculated costs match manual calculations
• Test price history updates reflect in assembly costs
• Validate roll-up includes all nested components correctly
```

## Quality Gates

**Do not submit if:**
- Any `any` types remain in the code
- Price calculations could produce incorrect results
- Data integrity rules are violated
- Error handling is missing for critical paths
- Code doesn't follow existing CPQ patterns

**Critical Rules:**
1. Every price must be traceable to source document
2. Historical prices are never deleted
3. Assembly costs always reflect current active component prices
4. Customer prices = cost + markup (never store directly)
5. Price expiration dates must be respected

## When to Ask for Guidance

- Complex pricing formulas not clear from requirements
- Breaking changes required to pricing structure
- Multiple valid approaches and unsure which to choose
- Database schema changes needed for pricing
- Performance concerns with large BOM calculations
- Price data integrity questions

## Success Metrics

- Code passes TypeScript compilation without errors
- All existing tests continue to pass
- New functionality follows CPQ patterns
- Price calculations are accurate and traceable
- Error handling covers all edge cases
- Performance is acceptable for expected data sizes
