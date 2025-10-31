# Global Rules for Smart CPQ System

## Automatic Triggers

### After Code Changes
- Run TypeScript type check
- Run tests if they exist for modified files
- Suggest running related tests
- Suggest security audit if pricing/quote/input/API changes
- Verify pricing calculations if cost logic modified

### After Database Changes (cpqService.ts, schema, RLS)
- **REQUIRE:** Validate queries with Supabase MCP (`mcp__supabase__postgrestRequest`)
- Verify data structure matches TypeScript types
- Check RLS policies don't block operations (no 403 errors)
- Test price history integrity if pricing tables modified
- Inspect actual DB state to confirm changes
- Verify supplier cost data remains confidential

### Before Commits
- REQUIRE: All tests pass
- REQUIRE: No TypeScript errors
- REQUIRE: No exposed secrets
- REQUIRE: Backend validation passed (if DB changes)
- REQUIRE: Pricing calculations verified (if cost logic changed)
- SUGGEST: E2E smoke test for critical flows (quote processing, BOM editing)
- SUGGEST: Update docs if structural changes

### E2E Testing Policy (Playwright)

**MANDATORY E2E tests for:**
- Quote processing workflow (upload → OCR → validation → storage)
- BOM editing and pricing calculations
- Project creation and quote generation
- PDF generation functionality
- Before production releases

**OPTIONAL E2E tests for:**
- Component library management
- Search and analytics features
- UI improvements and bug fixes
- Pre-deployment validation

**SKIP E2E tests for:**
- Backend-only utility functions
- Type/interface changes
- Documentation updates
- Pure pricing calculations (unit tests preferred)

E2E tests are slow (10-30s per flow) and token-intensive. Use strategically for critical CPQ workflows.

### After File Creation
- REQUIRE: Tests for new pricing utilities (90% coverage goal)
- REQUIRE: Tests for BOM manipulation functions (90% coverage goal)
- REQUIRE: Tests for AG Grid components (80% coverage goal)
- REQUIRE: JSDoc for exported functions with 3+ params
- REQUIRE: Documentation of business logic for pricing calculations
- SUGGEST: Add to CLAUDE.md if architectural change

---

## Error Recovery

### Tests Fail
1. Analyze failure (especially pricing calculation failures)
2. Attempt auto-fix (max 3 attempts)
3. If unresolved: Report to user with full context
4. Never commit broken pricing logic

### Security Issues
- CRITICAL: STOP immediately, report to user (pricing data exposure)
- HIGH/MEDIUM: Attempt fix, then report (access control issues)
- LOW: Log for later (best practice improvements)

### Pricing Calculation Errors
1. STOP immediately - financial impact
2. Verify with manual calculations
3. Check edge cases (zero quantities, negative prices)
4. Test with real-world data before proceeding
5. Never use `@ts-ignore` to bypass type errors in pricing logic

---

## Reporting Format

### Default (Plain English)
- What changed (simple terms)
- Files affected (count, not full paths unless requested)
- Pricing accuracy verification
- Issues encountered
- Next recommended steps

### Technical Details (User types `/details`)
- File paths with line numbers
- Code snippets
- Full test output
- Pricing calculation verification
- Performance metrics
- Token usage

---

## Agent Coordination

### Parallel Execution (When Safe)
- Implementation + Testing (if specs are clear)
- Implementation + Documentation (after code complete)
- Multiple explorations (different CPQ modules)

### Sequential Execution (Required)
- Context gathering → Planning → Implementation
- Implementation → Testing → Security validation → Pricing verification

---

## Token Management

Multi-agent workflows use 15x more tokens.

- **50k tokens:** Warn user
- **75k tokens:** Suggest simplifying task
- **100k tokens:** Pause, request user review
- **150k tokens:** Recommend breaking into smaller tasks

---

## Context Strategy

### Small Tasks (single file, <10 lines)
- Read only target file
- No CLAUDE.md needed
- Execute directly

### Medium Tasks (2-3 files, single feature)
- Read CLAUDE.md + target files
- Present quick plan
- Get approval

### Large Tasks (4+ files, refactoring, roadmap phases)
- Read CLAUDE.md + all affected files
- Read pricing logic documentation
- Present detailed plan with estimates
- Get approval

---

## Self-Critique Requirements

All implementation agents MUST iterate 3 times:
1. Type safety & edge cases (pricing validation)
2. Performance & patterns (BOM calculation efficiency)
3. Error handling & readability (business logic clarity)

Submit only after quality threshold met.

---

## User Approval Required

ALWAYS ask before:
- Multi-file refactoring
- Breaking changes to pricing logic
- Installing new dependencies
- Modifying database schema
- Changing quote processing workflows
- Modifying markup calculations
- Executing large roadmap phases

---

## File Naming & Organization

- Tests: `src/path/__tests__/file.test.ts`
- Hooks: `src/hooks/useName.ts`
- Utils: `src/utils/nameUtils.ts`
- Components: `src/components/feature/ComponentName.tsx`
- Services: `src/services/nameService.ts`

Follow existing structure in CLAUDE.md.

---

## CPQ Code Quality Standards

- No `any` types (use proper TypeScript)
- Error handling for async operations
- Immutable state updates (use utils from bomUtils.ts)
- Follow existing patterns (see CLAUDE.md)
- Path alias: `@/` for imports
- JSDoc for complex/public functions
- **Pricing calculations must be traceable to source data**

---

## Database Patterns

All database operations go through `cpqService.ts`:
1. Optimistic UI update first
2. Sync to Supabase
3. Handle errors with toast
4. Validate pricing integrity

Never query Supabase directly from components.

---

## CPQ Testing Standards

- Pricing utilities: 90% coverage (critical)
- BOM utilities: 90% coverage (critical)
- AG Grid components: 80% coverage (critical for BOM functionality)
- Services: 85% coverage
- Contexts: 80% coverage
- Components: 70% coverage

Use Vitest + React Testing Library. Mock Supabase, contexts, and AG Grid.

### AG Grid Testing Requirements
- Mock AG Grid modules in test setup
- Test cell editing and value changes
- Test calculated fields (total cost, margin)
- Test drag-drop functionality if implemented
- Test currency formatting and display
- Test validation and error handling
- Use custom AG Grid test utilities from `@/src/test/ag-grid-utils.ts`

---

## CPQ Security Requirements

- **Never expose supplier costs to customers**
- No hardcoded credentials (use .env.local)
- RLS policies on all Supabase tables
- Input validation on quote uploads and BOM data
- File upload security for quote processing
- `rel="noopener noreferrer"` on external links
- No `dangerouslySetInnerHTML` without sanitization
- Run `npm audit` before releases
- Validate all pricing inputs (no negative costs, reasonable quantities)

---

## Documentation Standards

Update CLAUDE.md when:
- Directory structure changes
- New pricing patterns introduced
- Quote processing workflows modified
- Business logic rules changed

Add JSDoc when:
- Function has 3+ parameters
- Complex pricing logic not obvious from code
- Public API used across codebase
- Business rules implementation

Keep inline comments minimal - code should be self-explanatory.

---

## CPQ Business Logic Rules

### Pricing Integrity
- Every price must be traceable to source document
- Historical prices never deleted
- Assembly costs always reflect current component prices
- Customer prices calculated as cost + markup (never stored directly)

### Quote Processing
- Supplier identification must be validated
- Extracted line items require user validation
- Duplicate components within quotes flagged
- Price history automatically updated from quotes

### BOM Calculations
- Quantity validation (positive integers only)
- Assembly cost roll-up includes all nested components
- Markup applications follow business rules hierarchy
- Total calculations verified to 2 decimal places

---

## Personality Considerations (INTJ User)

- Provide logical explanations for decisions
- Show systematic progression
- Explain "why" not just "what" (especially for pricing logic)
- Give control at key decision points
- Present data to support recommendations
- Be efficient - no fluff
- Prioritize accuracy and data integrity

---

**Key Principle:** Pricing accuracy and data integrity are non-negotiable. Every change must maintain the reliability of financial calculations.