# Development Workflow

**REQUIRED**: Follow these workflow rules for all features and bugfixes.

## Branch Management

**ALWAYS ASK before starting features or bugfixes:**
> "Would you like me to create a new branch for this?"

Wait for user response before proceeding.

**Branch Naming Convention:**
- Features: `feature/<short-description>` (e.g., `feature/custom-pricing-rules`)
- Bugfixes: `bugfix/<short-description>` (e.g., `bugfix/currency-conversion-error`)
- Refactors: `refactor/<short-description>` (e.g., `refactor/quotation-editor`)

## Bugfix Regression Testing (MANDATORY)

After confirming a bugfix works:

1. **WRITE REGRESSION TESTS** - This is not optional
2. Create test cases that would have caught this bug
3. Ensure tests fail without the fix, pass with it
4. Add tests to appropriate test file (`src/path/__tests__/file.test.ts`)
5. Goal: Prevent this bug from recurring in future changes

**Example workflow:**
```
1. User reports bug -> Reproduce issue
2. Implement fix -> Verify fix works
3. Write regression test -> Test fails without fix
4. Commit fix + test together
```

## Documentation Naming Convention

All documentation files should use **UPPERCASE** naming with standardized prefixes:

- **User Guides**: `GUIDE_` (e.g., `GUIDE_FILE_IMPORT.md`)
- **Developer Docs**: `DEV_`, `SETUP_`, `IMPL_` (e.g., `DEV_PARSERS_GUIDE.md`)
- **Planning**: `PRD_`, `PLAN_` (e.g., `PRD_CORE_SYSTEM.md`)
- **Reports**: `REPORT_`, `BUGFIX_`, `BACKLOG_` (e.g., `BUGFIX_AUTH_ERROR.md`)
