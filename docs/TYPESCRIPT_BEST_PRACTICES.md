# TypeScript Best Practices for CPQ System

This document outlines TypeScript best practices to maintain code quality and prevent build errors in the CPQ system.

## Table of Contents

1. [Null vs Undefined](#null-vs-undefined)
2. [Unused Variables](#unused-variables)
3. [Type Safety](#type-safety)
4. [Pre-Commit Checks](#pre-commit-checks)

## Null vs Undefined

### Rule: Use `undefined` for Optional Fields

TypeScript uses `undefined` for optional properties, not `null`.

**✅ CORRECT:**

```typescript
interface Component {
  name: string;
  description?: string; // Optional, will be undefined if not set
}

const component: Component = {
  name: 'PLC',
  description: undefined, // Correct for optional fields
};
```

**❌ INCORRECT:**

```typescript
const component: Component = {
  name: 'PLC',
  description: null, // ERROR: Type 'null' is not assignable to type 'string | undefined'
};
```

### When to Use `null`

Use `null` only for explicitly nullable fields that are always present but can be null:

```typescript
interface Component {
  name: string;
  deletedAt: Date | null; // Explicitly nullable - always present, but can be null
}
```

### In Tests

When writing mock data for tests, use `undefined` for optional fields:

```typescript
// ✅ CORRECT
const mockData = {
  requiredField: 'value',
  optionalField: undefined, // Not null!
};

// ❌ INCORRECT
const mockData = {
  requiredField: 'value',
  optionalField: null, // Will cause TS2322 error
};
```

## Unused Variables

### Rule: Prefix Unused Variables with Double Underscore

When a variable is intentionally unused (e.g., to maintain function signature or for future use), prefix it with `__`:

**✅ CORRECT:**

```typescript
// Unused function parameter
function handler(__event: Event) {
  // event not used yet
}

// Unused destructured value
const { data, __error } = await fetchData();

// Unused variable for assertion side effect
const __result = performAction(); // Called for side effect only
```

**❌ INCORRECT:**

```typescript
function handler(event: Event) {
  // TS6133: 'event' is declared but never read
  //...
}
```

### Removing Unused Imports

If an import is truly not needed, remove it entirely:

```typescript
// ❌ BEFORE
import { useState, useEffect, useMemo } from 'react';
// only using useState

// ✅ AFTER
import { useState } from 'react';
```

## Type Safety

### Handling Possibly Undefined Values

Always use optional chaining (`?.`) or null checks for values that might be undefined:

**✅ CORRECT:**

```typescript
// Optional chaining
const name = user?.profile?.name;

// Null check
if (quotation.quotation_systems) {
  const item = quotation.quotation_systems[0];
}

// With optional chaining in tests
expect(item?.original_currency).toBe('USD');
```

**❌ INCORRECT:**

```typescript
const item = quotation.quotation_systems[0]; // TS18048: possibly undefined
expect(item.original_currency).toBe('USD'); // Will error if item is undefined
```

### Type Assertions

Use type assertions sparingly and only when you're certain of the type:

```typescript
// Use when TypeScript can't infer correctly
const columnDefs = columns as ColDef[];

// Better: Fix the underlying type definition instead
```

### CellStyle in AG-Grid

When returning CellStyle objects, ensure all properties are defined (no `undefined` values):

**✅ CORRECT:**

```typescript
cellStyle: params => {
  if (params.data?.isAssembly) {
    return {
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      fontWeight: '500', // Always defined
    };
  }
  return {
    fontWeight: '500',
  };
};
```

**❌ INCORRECT:**

```typescript
cellStyle: params => {
  return params.data?.isAssembly
    ? { backgroundColor: '#e3f2fd', color: '#1976d2', fontWeight: undefined } // undefined causes TS2322
    : { fontWeight: '500' };
};
```

## Pre-Commit Checks

### Always Run TypeScript Check Before Committing

```bash
# Check for TypeScript errors
npx tsc --noEmit

# If errors exist, fix them before committing
# Target: 0 errors for production code
# Acceptable: <10 TS6133 (unused) errors in test files only
```

### Run Tests

```bash
# All tests must pass
npm test --run

# Target: 100% passing tests
```

###Commit Message Template

When fixing TypeScript errors:

```
fix: resolve TypeScript compilation errors

- Fixed TS2322 errors by using undefined instead of null
- Fixed TS6133 errors by prefixing unused variables with __
- Fixed TS18048 errors by adding optional chaining

Errors reduced from 87 to 16 (all remaining in test files)
```

## Common Error Codes

| Code    | Description               | Fix                                                    |
| ------- | ------------------------- | ------------------------------------------------------ |
| TS2322  | Type mismatch             | Use correct type (`undefined` not `null` for optional) |
| TS6133  | Unused variable           | Prefix with `__` or remove                             |
| TS18048 | Possibly undefined        | Add optional chaining `?.` or null check               |
| TS2532  | Object possibly undefined | Add optional chaining or type guard                    |
| TS2741  | Missing required property | Add all required interface properties                  |

## IDE Setup

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  }
}
```

### ESLint Configuration

Ensure TypeScript rules are enabled in `.eslintrc.json`:

```json
{
  "extends": ["plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^__",
        "varsIgnorePattern": "^__"
      }
    ]
  }
}
```

## Review Checklist

Before submitting a PR, ensure:

- [ ] `npx tsc --noEmit` shows 0 errors (or <10 minor TS6133 in tests)
- [ ] `npm test --run` shows all tests passing
- [ ] No `null` used for optional TypeScript fields
- [ ] All unused variables prefixed with `__`
- [ ] Optional chaining used for possibly undefined values
- [ ] All required interface properties included

## Future Improvements

1. **Strict Null Checks**: Consider enabling `strictNullChecks` in `tsconfig.json`
2. **No Implicit Any**: Enable `noImplicitAny` to catch type inference issues
3. **Strict Mode**: Gradually enable `strict: true` for maximum type safety
4. **Pre-commit Hook**: Add automated TypeScript check to pre-commit hooks

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [AG-Grid TypeScript](https://www.ag-grid.com/react-data-grid/typescript/)

---

**Last Updated**: 2025-11-27
**Maintained By**: Development Team
