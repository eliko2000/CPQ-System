# Bug Fix Command - CPQ System

**Purpose**: Fix bugs in CPQ functionality with proper validation to ensure pricing accuracy and data integrity.

## Usage

Trigger this workflow when you need to fix a bug in the CPQ system.

## Bug Classification

### Critical Bugs (Immediate Fix Required)
- Pricing calculation errors
- Data corruption issues
- Security vulnerabilities
- Quote processing failures
- Database integrity problems

### High Priority Bugs
- BOM calculation errors
- Assembly cost roll-up issues
- UI blocking bugs
- Performance problems
- Data validation failures

### Medium Priority Bugs
- UI display issues
- Minor functionality problems
- User experience improvements
- Non-critical error handling

### Low Priority Bugs
- Cosmetic issues
- Minor text errors
- Documentation inconsistencies

## Workflow Steps

### 1. Bug Analysis
- Identify the root cause of the bug
- Determine impact on pricing accuracy and data integrity
- Assess affected components and data flows
- Check for related potential issues

### 2. Context Gathering
Read relevant files:
- Bug location and related components
- Test files for affected functionality
- CLAUDE.md for business logic context
- Database schema if data-related

### 3. Fix Implementation
Follow Implementer workflow standards:
- Write minimal, targeted fix
- Maintain data integrity rules
- Preserve pricing accuracy
- Add proper error handling

### 4. Validation Requirements

**Always Required:**
- Unit tests for the fix
- Regression tests for related functionality
- TypeScript type checking
- Manual verification of pricing calculations

**Bug-Specific Validation:**
- **Pricing Bugs**: Verify calculation accuracy with test data
- **Data Bugs**: Check database integrity and consistency
- **UI Bugs**: Test user interaction flows
- **Performance Bugs**: Measure improvement metrics

### 5. Quality Gates

**Do not deploy if:**
- Fix introduces new pricing errors
- Data integrity is compromised
- Tests fail for critical paths
- Performance is degraded
- Security is weakened

## CPQ-Specific Bug Categories

### Pricing Calculation Bugs
```typescript
// Example: Incorrect markup application
// Bug: Customer price calculated on expired component cost
// Fix: Always use active price from price history

const getCustomerPrice = (component: Component, markup: number): number => {
  // ❌ Wrong - uses current_cost without validation
  return applyMarkup(component.current_cost, markup);
  
  // ✅ Correct - validates price is active
  const activePrice = getActivePrice(component.priceHistory);
  return applyMarkup(activePrice?.cost || 0, markup);
};
```

### Assembly Cost Roll-up Bugs
```typescript
// Example: Missing nested assembly handling
// Bug: Assembly cost doesn't include sub-assemblies
// Fix: Recursive cost calculation

const calculateAssemblyCost = (assembly: Assembly, components: Component[]): number => {
  // ❌ Wrong - only direct components
  return assembly.components.reduce((total, comp) => {
    const component = components.find(c => c.id === comp.id);
    return total + (component?.current_cost || 0) * comp.quantity;
  }, 0);
  
  // ✅ Correct - handles nested assemblies
  return assembly.components.reduce((total, item) => {
    if (item.type === 'component') {
      const component = components.find(c => c.id === item.id);
      const activePrice = getActivePrice(component?.priceHistory || []);
      return total + (activePrice?.cost || 0) * item.quantity;
    } else if (item.type === 'assembly') {
      const subAssembly = assemblies.find(a => a.id === item.id);
      return total + calculateAssemblyCost(subAssembly, components) * item.quantity;
    }
    return total;
  }, 0);
};
```

### Quote Processing Bugs
```typescript
// Example: Missing validation
// Bug: OCR processing accepts invalid quantities
// Fix: Add proper validation

const processQuoteLineItem = (item: any): QuoteLineItem => {
  // ❌ Wrong - no validation
  return {
    name: item.name,
    quantity: item.quantity,
    unitCost: item.price
  };
  
  // ✅ Correct - validates data
  if (!item.name || !item.manufacturerPN) {
    throw new ValidationError('Item name and manufacturer P/N required');
  }
  
  const quantity = parseInt(item.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    throw new ValidationError('Quantity must be positive integer');
  }
  
  const unitCost = parseFloat(item.price);
  if (isNaN(unitCost) || unitCost <= 0) {
    throw new ValidationError('Unit cost must be positive number');
  }
  
  return {
    name: item.name,
    manufacturerPN: item.manufacturerPN,
    quantity,
    unitCost
  };
};
```

## Output Format

```
🐛 BUG FIX COMPLETE

Bug: [Brief description]
Classification: [Critical/High/Medium/Low]
Location: [File:Line]

Root Cause:
[Explanation of what caused the bug]

Fix Applied:
[Description of the fix implemented]

Validation:
- [x] Unit tests pass
- [x] Pricing calculations verified
- [x] Data integrity checked
- [x] Regression tests pass

Impact Assessment:
- Pricing accuracy: ✓ Maintained
- Data integrity: ✓ Preserved
- Performance: ✓ Improved/No impact
- Security: ✓ Maintained

Files Modified:
• src/utils/pricingUtils.ts:45 - Fixed markup calculation
• src/utils/__tests__/pricingUtils.test.ts:123 - Added regression test

Recommendations:
- Monitor for similar issues in related components
- Consider adding additional validation
- Update documentation if needed
```

## Testing Strategy

### Regression Testing
- Test all related pricing calculations
- Verify assembly cost roll-up accuracy
- Check quote processing end-to-end
- Validate database operations

### Edge Case Testing
- Test with zero/negative values
- Test with expired prices
- Test with circular assembly references
- Test with malformed input data

### Performance Testing
- Measure fix impact on large BOMs
- Check database query performance
- Verify memory usage improvements

## When to Escalate

**Immediate Escalation Required:**
- Bug affects financial calculations
- Data corruption detected
- Security vulnerability identified
- Production system impacted

**Consider Escalation:**
- Bug requires database schema changes
- Fix impacts multiple major features
- Root cause unclear after investigation
- Fix requires breaking changes

## Success Metrics

- Bug is completely resolved
- No regressions introduced
- Pricing accuracy maintained
- Data integrity preserved
- Performance not degraded
- Tests cover the fix and related scenarios

## Key Principle

Never compromise pricing accuracy or data integrity for a quick fix. Every bug fix must be thoroughly validated to ensure financial calculations remain correct and traceable.
