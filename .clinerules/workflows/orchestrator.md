# Orchestrator Workflow - CPQ System

**Purpose**: Coordinate complex multi-step workflows by analyzing requests, gathering context, delegating to specialists, and ensuring quality outcomes.

## When to Use This Workflow

- Large tasks requiring multiple specialists
- Complex feature implementations spanning multiple files
- Project planning and roadmap execution
- Multi-agent coordination for CPQ system development

## Task Classification & Context Strategy

### SMALL TASK
**Examples**: Fix typo, add toast message, change button color, single function tweak
**Context**: Read only target file(s)
**Planning**: Execute directly, no approval needed
**Report**: 1-2 sentences

### MEDIUM TASK
**Examples**: Add BOM sorting, fix multi-file bug, new modal component, supplier quote parsing enhancement
**Context**: Read CLAUDE.md + target files + related tests
**Planning**: Present bullet list plan, get approval
**Report**: Plain English summary (what/why/next)

### LARGE TASK
**Examples**: Refactor CPQContext, implement quote processing flow, execute roadmap phase
**Context**: Read CLAUDE.md + all affected files + database schema
**Planning**: Detailed multi-step plan with estimates, get approval
**Report**: Full summary with metrics and technical details

## Workflow Pattern

```
1. CLASSIFY → Determine task size (small/medium/large)
2. CONTEXT → Gather minimal sufficient info (based on classification)
3. PLAN → Present to user if medium/large
4. DELEGATE → Assign to specialist workflows (parallel when safe)
5. VALIDATE → Run appropriate validation based on change type
6. REPORT → Match detail level to task complexity
```

## Specialist Delegation Guide

### When to Use Each Workflow

**Explorer Workflow**
- Understanding CPQ codebase structure
- Finding where functionality lives (quote processing, BOM calculations, pricing)
- Tracing dependencies
- Questions like "Where is quote parsing implemented?"

**Implementer Workflow**
- Writing/modifying CPQ code
- Bug fixes in pricing calculations
- Feature implementation (OCR processing, assembly builder)
- Must provide: Clear requirements, affected files, quality standards

**Tester Workflow**
- Writing tests for CPQ functionality
- Running test suites
- Analyzing test failures
- Must provide: Files to test, coverage goals (90% utils, 70% components, 80% contexts)

**Security Auditor Workflow**
- Changes to auth/login
- Supplier quote file handling
- API endpoint exposure
- Price data access controls
- Before production releases

**Documenter Workflow**
- Structural changes (new files, reorganization)
- Complex pricing function additions
- API changes for quote processing
- Database schema updates
- Must provide: What changed and why

**E2E Tester Workflow**
- Quote upload and processing flows
- BOM editing and project creation
- Critical UI features (drag-drop assemblies, pricing calculations)
- PDF quote generation
- Pre-release smoke tests

## Validation Decision Logic

### Always Run
- Unit tests (Tester workflow)
- TypeScript type-check

### Database Changes Detected
**Trigger if:** `cpqService.ts`, pricing tables, quote schemas modified
**Actions:**
1. Validate queries with available tools
2. Verify database state after implementation
3. Check price history cascades worked
4. Confirm no access policy blocks

### UI Changes Detected
**Trigger if:** Components in `src/components/`, new modals, BOM grid changes
**Decision:**
- **MANDATORY E2E:** Quote processing, critical pricing flows
- **OPTIONAL E2E:** New features, bug fixes (ask user)
- **SKIP E2E:** Pure styling, type changes

### Auth/Input Changes Detected
**Trigger if:** Authentication, quote file uploads, user input handling modified
**Actions:**
1. Security Auditor workflow review
2. E2E test for affected flow (if critical)

## Execution Rules

### Parallel Execution (when tasks are independent)
- Implementer + Tester (if specs are clear)
- Implementer + Documenter (after code complete)
- Multiple Explorers (different areas)

### Sequential Execution (when tasks depend on each other)
- Explorer → Implementer (need context first)
- Implementer → Tester → Security (validation chain)

## Error Recovery Strategy

**Tests Fail:**
1. Tester analyzes failures
2. Implementer attempts fix (iteration 1)
3. Rerun tests
4. Repeat max 3 times
5. If still failing: Report to user with full context

**Security Issues:**
- CRITICAL: STOP immediately, report to user
- HIGH/MEDIUM: Attempt auto-fix, then report
- LOW: Log for later, continue

**TypeScript Errors:**
1. Implementer adds proper types (no `any`)
2. If complex: Ask user for guidance
3. Never use `@ts-ignore` without user approval

## Reporting Format

**Plain English (default):**
- What was done (simple terms)
- Files affected (count, not full paths)
- Any issues
- Next recommended steps

**Technical Details (user requests):**
- File paths with line numbers
- Code snippets
- Full test output
- Performance metrics

## Context Engineering

**Always include:**
- CLAUDE.md (if medium/large task)
- Files being modified
- Related tests
- Direct dependencies

**Never include:**
- node_modules/
- Build artifacts
- Full dependency source code
- Irrelevant project files

## User Approval Points

**ALWAYS ask approval before:**
- Multi-file refactoring
- Breaking changes
- Installing new dependencies
- Modifying database schema
- Changing authentication logic
- Executing large roadmap phases

## CPQ-Specific Considerations

**Critical Paths:**
- Quote upload → OCR parsing → Validation → Database storage
- Project creation → BOM building → Pricing calculations → Quote generation
- Component library updates → Assembly cost recalculation

**Data Integrity:**
- Every price must be traceable to source document
- Historical prices never deleted
- Assembly costs always reflect current component prices

**Business Logic:**
- Markup calculations (percentage vs fixed)
- Price expiration handling
- Supplier cost vs customer pricing

## Success Criteria

You're effective when:
- Task classification is accurate (right context gathered)
- Plans are clear and approved confidently
- No surprises during execution
- Failures are caught and handled early
- Reports are actionable

## Example Orchestrations

### Small Task Example
```
User: "Add a success toast when quote is processed"

Classification: SMALL
Context: Read QuoteIngestion.tsx only
Delegate: Implementer workflow adds showToast() call
Validate: Type check only
Report: "Added success toast after quote processing. 1 file changed."
```

### Medium Task Example
```
User: "Add assembly cost roll-up calculations"

Classification: MEDIUM
Context: Read CLAUDE.md + AssemblyBuilder.tsx + pricing utils
Plan: "I'll add cost roll-up by:
  1. Creating recursive cost calculation function
  2. Adding cost display to assembly cards
  3. Updating BOM totals to include assembly costs
  Estimated time: 30 min. Proceed?"
[User approves]
Delegate: Implementer + Tester workflows in parallel
Validate: Run tests, type check
Report: "Assembly cost roll-up works. Modified 3 files, added 8 tests, all passing."
```

### Large Task Example
```
User: "Implement OCR quote processing"

Classification: LARGE
Context: Read CLAUDE.md + quote processing files + database schema
Plan: "OCR processing has 4 major tasks:
  1. PDF upload and file handling
  2. OCR text extraction service
  3. Quote line item parsing logic
  4. Validation interface for AI mistakes
  Estimated: 2-3 hours. Proceed?"
[User approves]
Delegate:
  - Implementer: Core OCR functionality
  - Tester: Quote processing tests
  - Documenter: Update CLAUDE.md
Validate: Run all tests, verify OCR accuracy
Report: Full metrics (OCR accuracy, tests added, processing time)
```

## Key Principle

Gather sufficient context for the task, not maximum context for any task. Be efficient, be effective.
