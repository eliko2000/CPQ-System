# TypeScript Best Practices

**CRITICAL**: Follow these rules to prevent TypeScript build errors and maintain code quality.

## Pre-Commit Checklist (MANDATORY)

Before committing ANY code:

```bash
# 1. Check TypeScript compilation
npx tsc --noEmit
# Target: 0 errors in production code, <10 warnings in tests

# 2. Run all tests
npm test --run
# Target: 100% passing tests

# 3. Verify no regressions
npm run build
```

## Rule 1: Null vs Undefined

**USE `undefined` FOR OPTIONAL FIELDS, NEVER `null`**

```typescript
// CORRECT
interface Component {
  name: string;
  description?: string; // Optional field
}

const component = {
  name: 'PLC',
  description: undefined, // Use undefined, not null!
};

// WRONG - Will cause TS2322 error
const component = {
  name: 'PLC',
  description: null, // ERROR: Type 'null' not assignable to 'string | undefined'
};
```

**Exception**: Only use `null` for explicitly nullable fields:

```typescript
interface Component {
  deletedAt: Date | null; // Explicitly nullable - always present but can be null
}
```

## Rule 2: Unused Variables

**PREFIX INTENTIONALLY UNUSED VARIABLES WITH DOUBLE UNDERSCORE `__`**

```typescript
// CORRECT
const { data, __error } = await fetchData(); // error unused but needed for destructuring

function handler(__event: Event) {
  // event unused but required by signature
}

// WRONG - Causes TS6133 error
const { data, error } = await fetchData(); // error unused
```

## Rule 3: Possibly Undefined Values

**ALWAYS USE OPTIONAL CHAINING FOR POSSIBLY UNDEFINED VALUES**

```typescript
// CORRECT
const item = quotation.quotation_systems?.[0].quotation_items?.[0];
expect(item?.original_currency).toBe('USD');

// WRONG - Causes TS18048/TS2532 errors
const item = quotation.quotation_systems[0]; // Possibly undefined!
expect(item.original_currency).toBe('USD');
```

## Rule 4: Required Interface Properties

**INCLUDE ALL REQUIRED PROPERTIES WHEN CREATING OBJECTS**

```typescript
// CORRECT
const mockItem: DbQuotationItem = {
  id: 'item-1',
  item_name: 'PLC',
  item_type: 'hardware', // Required!
  quantity: 1,
  // ... all other required fields
};

// WRONG - Causes TS2741 error
const mockItem = {
  id: 'item-1',
  item_name: 'PLC',
  // Missing item_type!
};
```

## Common Error Codes Quick Reference

| Code        | Error                             | Fix                                 |
| ----------- | --------------------------------- | ----------------------------------- |
| **TS2322**  | Type mismatch (null vs undefined) | Use `undefined` for optional fields |
| **TS6133**  | Unused variable                   | Prefix with `__` or remove          |
| **TS18048** | Possibly undefined                | Add `?.` optional chaining          |
| **TS2532**  | Object possibly undefined         | Add null check or `?.`              |
| **TS2741**  | Missing required property         | Add all required interface fields   |

## Why These Rules Matter

1. **Prevents Build Failures**: TypeScript errors block production builds
2. **Maintains Type Safety**: Catches bugs at compile time, not runtime
3. **Improves Code Quality**: Consistent patterns across the codebase
4. **Saves Time**: Prevents "fix TypeScript errors" sessions

For comprehensive guidelines, see: **docs/TYPESCRIPT_BEST_PRACTICES.md**
