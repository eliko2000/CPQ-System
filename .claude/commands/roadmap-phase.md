---
description: Execute a specific CPQ roadmap phase with test-driven refactoring
---

Execute CPQ roadmap phase: **${PROMPT}**

## Phase Execution Protocol

You are coordinating the execution of a roadmap phase. Follow this protocol:

### 1. Identify the Phase

Read `ROADMAP.md` and identify the requested phase or task:
- If user provides "Phase 0", "Phase 1", etc. → Show all tasks in that phase
- If user provides "0.1", "1.2", etc. → Execute specific task
- If user provides task name → Find and execute matching task
- If user provides "status" → Show current roadmap progress

### 2. Show Phase/Task Overview

Display to the user:
```
🛣️ ROADMAP PHASE: [Phase Name]

📋 Tasks in this phase:
1. [Task 1] - [Status: Not Started/In Progress/Complete]
2. [Task 2] - [Status]
...

Would you like to:
1. Execute all tasks in sequence
2. Execute a specific task
3. See detailed breakdown

Type your choice (1, 2, or 3)
```

### 3. For Specific Task Execution

Use the Task tool to spawn the **refactor** agent with this prompt:

```
Execute roadmap task from ROADMAP.md: [Full task description]

Follow the test-driven refactoring protocol:
1. Show "What to test BEFORE" section
2. Wait for user confirmation
3. Execute pre-change tests and document baseline
4. Wait for user confirmation
5. Make changes incrementally
6. Execute post-change tests
7. Validate success criteria
8. Report completion

Task: [Task ID and Name]
```

### 4. Monitor Progress

Track the refactor agent's progress and relay updates to user.

### 5. Task Completion

When refactor agent completes, verify:
- All "What to test AFTER" items pass
- All success criteria met
- Documentation updated
- User confirms completion

### 6. Move to Next Task

After successful completion:
- Mark task as complete
- Show progress on phase
- Ask if user wants to continue to next task

---

## Available Phases

### Phase 0: Security Crisis (CRITICAL - 1 day)
🔴 **MUST FIX IMMEDIATELY**
- 0.1: Secure API Keys (2h)
- 0.2: Remove Console.log (4h)
- 0.3: Fix Gitignore (1h)

### Phase 1: Testing Foundation (2 weeks)
- 1.1: Fix Failing Document Parser Tests (8h)
- 1.2: Currency Conversion Tests (4h)
- 1.3: Quotation Calculations Tests (8h)
- 1.4: Assembly Pricing Tests (6h)
- 1.5: Component Library Tests (8h)
- 1.6: Quotation Editor Tests (10h)
- 1.7: Database Hook Tests (6h)

### Phase 2: Code Quality (1 week)
- 2.1: ESLint Configuration (4h)
- 2.2: Remove TODO/FIXME (2h)
- 2.3: Type Safety Audit (8h)
- 2.4: Error Handling Patterns (6h)

### Phase 3: CI/CD & DevOps (1 week)
- 3.1: GitHub Actions CI (6h)
- 3.2: Pre-commit Hooks (4h)
- 3.3: Test Coverage Enforcement (2h)
- 3.4: Environment Management (4h)

### Phase 4: Performance & Scale (2 weeks)
- 4.1: Code Splitting (6h)
- 4.2: React Performance (8h)
- 4.3: Database Query Optimization (6h)
- 4.4: Asset Optimization (4h)

### Phase 5: Enterprise Features (3 weeks)
- 5.1: Error Tracking (Sentry) (6h)
- 5.2: Analytics Integration (4h)
- 5.3: Audit Logging (8h)
- 5.4: Role-Based Access Control (12h)
- 5.5: Data Backup Strategy (4h)

### Phase 6: Production Polish (1 week)
- 6.1: User Documentation (8h)
- 6.2: Developer Documentation (4h)
- 6.3: Accessibility Audit (6h)
- 6.4: Load Testing (4h)

---

## Special Commands

### Status Check
If user requests "status" or "progress":
- Read ROADMAP.md
- Check git history for completed tasks
- Show visual progress:
```
🛣️ CPQ ROADMAP PROGRESS

Phase 0: Security Crisis      [████████████████████] 100% ✅
Phase 1: Testing Foundation   [████████░░░░░░░░░░░░]  40% 🔄
  ✅ 1.1: Document Parser Tests
  ✅ 1.2: Currency Tests
  ✅ 1.3: Quotation Tests
  🔄 1.4: Assembly Tests (In Progress)
  ⏳ 1.5: Component Library Tests
  ⏳ 1.6: Quotation Editor Tests
  ⏳ 1.7: Database Hook Tests

Phase 2: Code Quality        [░░░░░░░░░░░░░░░░░░░░]   0% ⏳
...

Overall Progress: 25/88 tasks (28%)
Estimated Time Remaining: 95 hours

Current Score: 6.8/10 (↑0.3 from baseline)
Target Score: 8.5/10
```

### Skip Task
If user says "skip this task":
- Document reason for skip
- Add comment to ROADMAP.md
- Move to next task
- Warn about dependencies

### Pause Phase
If user says "pause":
- Save current state
- Create checkpoint in git
- Document what's complete
- Show how to resume

---

## Error Handling

If refactor agent encounters issues:
1. Show error to user
2. Offer rollback options
3. Document the blocker
4. Suggest alternatives or workarounds

---

## Example Usage

```
User: /roadmap-phase "Phase 0"

Agent: [Shows all Phase 0 tasks and asks which to execute]

User: "Execute all"

Agent: [Spawns refactor agent for task 0.1]
       [Monitors progress]
       [Task 0.1 completes]
       [Spawns refactor agent for task 0.2]
       ...

User: /roadmap-phase "1.3"

Agent: [Spawns refactor agent for task 1.3 specifically]

User: /roadmap-phase "status"

Agent: [Shows progress across all phases]
```

---

## Critical Rules

1. **ALWAYS use the refactor agent** for task execution
2. **NEVER skip the testing protocol** - it's mandatory
3. **ALWAYS wait for user confirmation** before proceeding
4. **NEVER execute HIGH RISK tasks without explicit approval**
5. **ALWAYS document completion** in git commits

---

**Remember: Quality over speed. Test everything.** ✅
