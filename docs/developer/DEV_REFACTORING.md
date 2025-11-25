# CPQ Refactoring Guide - Quick Reference

**Goal**: Take codebase from 6.5/10 → 8.5/10 in 2-3 months

---

## How to Use This System

### 1. Check Current Status

```
/roadmap-phase status
```

Shows progress across all phases, completed tasks, and current score.

---

### 2. Execute a Phase

#### Start a Full Phase

```
/roadmap-phase "Phase 0"
```

This will:

1. Show all tasks in Phase 0
2. Ask if you want to execute all or specific task
3. Execute each task with test-driven approach

#### Execute a Specific Task

```
/roadmap-phase "0.1"
```

Executes task 0.1 (Secure API Keys) with full testing protocol.

---

### 3. Testing Protocol (MANDATORY)

Every task follows this flow:

```
┌─────────────────────────────────┐
│ 1. Show "What to Test BEFORE"  │
│    Agent shows you checklist    │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 2. You Confirm "proceed"        │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 3. Agent Runs BEFORE Tests      │
│    Documents current state      │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 4. Agent Shows Baseline Report  │
│    Waits for confirmation       │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 5. You Confirm "proceed"        │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 6. Agent Makes Changes          │
│    Shows progress incrementally │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 7. Agent Runs AFTER Tests       │
│    Compares to baseline         │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 8. Agent Shows Results          │
│    Verifies success criteria    │
└──────────┬──────────────────────┘
           │
           v
┌─────────────────────────────────┐
│ 9. Task Complete! ✅            │
│    Move to next task            │
└─────────────────────────────────┘
```

---

## Key Commands

| Command                            | What It Does                    |
| ---------------------------------- | ------------------------------- |
| `/roadmap-phase status`            | Show progress across all phases |
| `/roadmap-phase "Phase 0"`         | Execute all tasks in Phase 0    |
| `/roadmap-phase "0.1"`             | Execute specific task 0.1       |
| `/roadmap-phase "Secure API Keys"` | Find and execute task by name   |

---

## What to Expect

### When You Run a Task

**Agent will show you:**

```
🛣️ ROADMAP PHASE EXECUTION

Phase: 0.1: Secure API Keys
Risk Level: 🔴 HIGH

📋 WHAT TO TEST BEFORE:
[ ] Verify app starts with npm run dev
[ ] Test file upload works
[ ] Test database operations
[ ] Test quotation creation

🔧 PLANNED CHANGES:
• .gitignore - Add .env.local
• .env.example - Create template
• README.md - Add environment setup
• API keys - Rotate in dashboards

📋 WHAT TO TEST AFTER:
[ ] App still starts
[ ] File upload still works
[ ] Database operations work
[ ] No keys in client bundle

✅ SUCCESS CRITERIA:
[ ] .env.local in .gitignore
[ ] Service role key removed
[ ] All keys rotated
[ ] App still works

⏸️ WAITING FOR YOUR CONFIRMATION
Type 'proceed' to continue
```

**You type:** `proceed`

**Agent will:**

1. Run all BEFORE tests
2. Show results
3. Wait for confirmation again
4. Make changes
5. Run AFTER tests
6. Show comparison
7. Mark task complete

---

## Risk Levels

### 🟢 LOW RISK

- Documentation updates
- Adding tests
- Removing console.log
- Code formatting

**What this means**: Agent can proceed with normal testing.

### 🟡 MEDIUM RISK

- Refactoring business logic
- Component restructuring
- New features
- Configuration changes

**What this means**: Extra validation, more thorough testing.

### 🔴 HIGH RISK

- Database schema changes
- Authentication changes
- Pricing calculation changes
- Currency conversion changes
- RLS policy changes

**What this means**: **REQUIRES YOUR EXPLICIT APPROVAL** before changes. Agent will STOP and wait.

---

## Your Responsibilities

### Before Each Task

- [ ] Read the "What to test BEFORE" section
- [ ] Understand what will change
- [ ] Have a backup (git commit or Supabase backup for DB changes)
- [ ] Type `proceed` when ready

### During Testing

- [ ] Verify BEFORE tests match your current experience
- [ ] Report any discrepancies to agent
- [ ] Type `proceed` to allow changes

### After Testing

- [ ] Run AFTER tests yourself
- [ ] Verify no regressions
- [ ] Confirm success criteria met
- [ ] Type `done` or `complete` to finalize

### If Something Goes Wrong

- [ ] Type `stop` or `pause`
- [ ] Agent will STOP immediately
- [ ] Agent will offer rollback options
- [ ] You decide: fix, rollback, or skip

---

## Special Situations

### Skip a Task

```
Agent: Ready to execute task 2.3?
You: skip this task

Agent: ⚠️ Skipping task 2.3
       Reason: User requested skip

       Note: This may affect:
       - Task 2.4 (depends on 2.3)
       - Task 3.1 (requires type safety)

       Do you want to:
       1. Skip anyway
       2. Reconsider
```

### Pause Mid-Phase

```
You: pause

Agent: ⏸️ Pausing Phase 1
       Completed: Tasks 1.1, 1.2, 1.3
       In Progress: Task 1.4
       Remaining: Tasks 1.5, 1.6, 1.7

       Creating checkpoint...
       ✅ Checkpoint created: roadmap-phase1-checkpoint

       To resume: /roadmap-phase "1.4"
```

### When Tests Fail

```
Agent: ❌ POST-CHANGE TEST FAILED
       Test: npm test
       Error: 3 tests failing in quotationCalculations.test.ts

       Current state:
       - Changes applied to 3 files
       - Tests were passing BEFORE
       - Tests failing AFTER

       Options:
       1. Debug and fix (recommended)
       2. Rollback changes
       3. Skip failing tests (NOT recommended)

       What would you like to do?
```

---

## Progress Tracking

### Completed Tasks

The agent tracks completion in:

- Git commits (with specific message format)
- ROADMAP.md annotations
- Progress reports

### View Progress Anytime

```
/roadmap-phase status
```

Shows:

- ✅ Completed tasks
- 🔄 In-progress tasks
- ⏳ Not started tasks
- Progress percentage
- Current score vs target

---

## Expected Timeline

### Phase 0: Security Crisis

**Duration**: 1 day (7 hours)
**Urgency**: 🔴 CRITICAL - DO THIS FIRST

### Phase 1: Testing Foundation

**Duration**: 2 weeks (52 hours)
**Importance**: Required for all other phases

### Phase 2: Code Quality

**Duration**: 1 week (20 hours)
**Dependencies**: Phase 1 complete

### Phase 3: CI/CD & DevOps

**Duration**: 1 week (16 hours)
**Dependencies**: Phases 1-2 complete

### Phase 4: Performance

**Duration**: 2 weeks (24 hours)
**Dependencies**: Phases 1-3 complete

### Phase 5: Enterprise

**Duration**: 3 weeks (34 hours)
**Dependencies**: Phases 1-4 complete

### Phase 6: Polish

**Duration**: 1 week (22 hours)
**Dependencies**: All previous phases complete

**TOTAL**: 11 weeks (~175 hours)

---

## Daily Workflow Suggestion

### Day 1: Security Crisis (CRITICAL)

```bash
/roadmap-phase "Phase 0"
# Execute all tasks: 0.1, 0.2, 0.3
# Duration: 7 hours
# Score: 6.5 → 6.8
```

### Week 1-2: Testing Foundation

```bash
# Day 2
/roadmap-phase "1.1"  # Fix failing tests (8h)

# Day 3
/roadmap-phase "1.2"  # Currency tests (4h)
/roadmap-phase "1.3"  # Quotation tests (4h)

# Day 4
/roadmap-phase "1.3"  # Continue quotation tests (4h)
/roadmap-phase "1.4"  # Assembly tests (4h)

# Day 5
/roadmap-phase "1.4"  # Finish assembly tests (2h)
/roadmap-phase "1.5"  # Component tests (6h)

# Week 2, Day 1
/roadmap-phase "1.5"  # Finish component tests (2h)
/roadmap-phase "1.6"  # Quotation editor tests (6h)

# Week 2, Day 2
/roadmap-phase "1.6"  # Continue editor tests (4h)
/roadmap-phase "1.7"  # Database hook tests (4h)

# Week 2, Day 3
/roadmap-phase "1.7"  # Finish hook tests (2h)
/roadmap-phase status  # Check progress
# Score: 6.8 → 7.3
```

---

## FAQs

### Q: Can I skip the testing protocol?

**A:** For 🟢 LOW RISK tasks, yes (but not recommended). For 🟡 MEDIUM or 🔴 HIGH RISK tasks, absolutely not. The agent will refuse.

### Q: What if I disagree with a change?

**A:** Say `stop` or `no`. The agent will STOP and wait for your guidance.

### Q: Can I do multiple tasks in one session?

**A:** Yes! Use `/roadmap-phase "Phase 0"` and choose "Execute all tasks in sequence".

### Q: What if a task takes longer than estimated?

**A:** That's normal. Estimates are approximate. The agent will show progress and you can pause anytime.

### Q: Do I need to test manually if there are automated tests?

**A:** For critical functionality (pricing, currency, database), YES. Automated tests are great but manual verification of business logic is essential.

### Q: Can I customize the roadmap?

**A:** Yes! Edit `ROADMAP.md` to add/remove/modify tasks. The agent reads from this file.

### Q: What if the refactor agent makes a mistake?

**A:** Say `rollback` or `undo`. Git history is preserved at each step for easy rollback.

---

## Getting Started

### Right Now (1 hour)

1. Read this guide ✅
2. Read `ROADMAP.md` overview
3. Run `/roadmap-phase status` to see baseline
4. **START HERE** → `/roadmap-phase "0.1"`

### This Week (7 hours)

- [ ] Complete Phase 0 (Security Crisis)
- [ ] Rotate all API keys
- [ ] Clean up console.log statements
- [ ] Fix .gitignore

### Next 2 Weeks (52 hours)

- [ ] Complete Phase 1 (Testing Foundation)
- [ ] Achieve 75%+ test coverage
- [ ] Fix all failing tests
- [ ] Document test patterns

---

## Success Indicators

You'll know you're on track when:

- [ ] `/roadmap-phase status` shows steady progress
- [ ] Tests are passing consistently
- [ ] Each phase builds on the previous
- [ ] No regressions in functionality
- [ ] Codebase feels more solid
- [ ] New features easier to add
- [ ] Bugs caught before production

---

## Need Help?

**During execution:**

- Ask the refactor agent: "What does this test check?"
- Ask the refactor agent: "Why is this change needed?"
- Ask the refactor agent: "What are the risks?"

**General questions:**

- Read `ROADMAP.md` for detailed phase descriptions
- Read `.claude/agents/refactor.md` for agent protocol
- Ask me: "Explain task X.Y in more detail"

---

## Final Tips

1. **Start with Phase 0** - It's critical security fixes
2. **Don't skip testing** - It catches regressions
3. **One phase at a time** - Don't jump ahead
4. **Commit after each task** - Easy rollback
5. **Take breaks** - This is a marathon, not a sprint
6. **Trust the process** - Test-driven refactoring works

---

**Ready to get started?**

Run: `/roadmap-phase "Phase 0"`

**Let's get to 8.5/10! 🚀**
