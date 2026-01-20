# Worktree + Agent Integration

## The Key Principle: Separation of Concerns

**Main Claude Code Instance:**
- Manages worktree lifecycle (create, open VS Code, cleanup)
- Manages git operations (branch, merge, push)
- Spawns specialized agents

**Specialized Agents:**
- Work on the task (implement, test, refactor)
- Don't know about worktrees
- Just work in whatever directory they're spawned in

---

## Visual Flow

### Scenario: User uses /bugfix command

```
┌─────────────────────────────────────────────────────────────┐
│ MAIN CLAUDE CODE (You're talking to)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User: "/bugfix currency conversion"                    │
│                                                             │
│  2. Me: "Create worktree for this bugfix?"                 │
│     User: "Yes"                                             │
│                                                             │
│  3. Me: Run ./scripts/create-worktree.bat bugfix currency  │
│         ├── Creates: .worktrees/bugfix-currency/           │
│         ├── Creates branch: bugfix/currency                 │
│         ├── Runs: npm install                              │
│         └── Opens: New VS Code window                      │
│                                                             │
│  4. Me: Load /bugfix skill                                 │
│         ↓                                                   │
│    ┌────────────────────────────────────────────────────┐  │
│    │ BUGFIX ORCHESTRATOR AGENT                          │  │
│    │ Working directory: .worktrees/bugfix-currency/     │  │
│    ├────────────────────────────────────────────────────┤  │
│    │                                                     │  │
│    │  • Analyzes bug                                    │  │
│    │  • Plans fix                                       │  │
│    │  • Spawns implementer agent (in worktree)         │  │
│    │    ↓                                               │  │
│    │   ┌─────────────────────────────────────────────┐ │  │
│    │   │ IMPLEMENTER AGENT                           │ │  │
│    │   │ Working directory: .worktrees/bugfix-curr/  │ │  │
│    │   ├─────────────────────────────────────────────┤ │  │
│    │   │                                             │ │  │
│    │   │  • Reads files in worktree                 │ │  │
│    │   │  • Fixes bug                               │ │  │
│    │   │  • Writes files to worktree                │ │  │
│    │   │  • Returns: "Done!"                        │ │  │
│    │   │                                             │ │  │
│    │   └─────────────────────────────────────────────┘ │  │
│    │                                                     │  │
│    │  • Spawns tester agent (in worktree)              │  │
│    │  • Verifies fix                                    │  │
│    │  • Returns: "Bugfix complete!"                     │  │
│    │                                                     │  │
│    └────────────────────────────────────────────────────┘  │
│                                                             │
│  5. Me: "Ready to merge?"                                  │
│     User: "Yes"                                             │
│                                                             │
│  6. Me: Merge and cleanup                                  │
│         ├── cd CPQ-System/                                 │
│         ├── git merge bugfix/currency                      │
│         ├── git push origin master                         │
│         ├── ./scripts/cleanup-worktree.bat bugfix-currency│
│         └── Inform user: "Close VS Code window"            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Who Does What?

| Action                          | Responsible Party        | Location          |
| ------------------------------- | ------------------------ | ----------------- |
| Ask about worktree creation     | Main Claude              | Anywhere          |
| Create worktree folder          | Main Claude              | Via script        |
| Create git branch               | Main Claude              | Via script        |
| Open VS Code window             | Main Claude              | Via script        |
| Load /bugfix skill              | Main Claude              | In worktree       |
| Analyze bug                     | Bugfix orchestrator      | In worktree       |
| Implement fix                   | Implementer agent        | In worktree       |
| Write tests                     | Tester agent             | In worktree       |
| Commit changes                  | Any agent                | In worktree       |
| Merge to master                 | Main Claude              | Main repo         |
| Delete worktree                 | Main Claude              | Via script        |
| Close VS Code window            | User (you!)              | Manual            |

---

## Real-World Example: Bug + Feature Parallel Work

**You want:**
- Claude Code to fix a bug
- Google Antigravity to add a feature
- Work on both simultaneously

**How it happens:**

### Terminal 1 - Main Claude (Bugfix)
```
User: "/bugfix calculation error"
Main Claude: Creates .worktrees/bugfix-calculation
Main Claude: Opens VS Code window #2
Main Claude: Spawns bugfix orchestrator in worktree
Agents work in: .worktrees/bugfix-calculation/
```

### Terminal 2 - Google Antigravity (Feature)
```
User: "Add pricing rules feature"
Antigravity: Creates .worktrees/feature-pricing-rules
Antigravity: Opens VS Code window #3
Antigravity: Works in worktree
Works in: .worktrees/feature-pricing-rules/
```

### Your View
```
VS Code Window 1: Master branch (for testing)
VS Code Window 2: Bugfix branch (Claude working)
VS Code Window 3: Feature branch (Antigravity working)

All independent, no conflicts!
```

---

## The Answer to Your Question

**Q: "Won't this collide with the agents currently implemented?"**

**A: No, because:**

1. ✅ **Agents don't manage worktrees** - Main Claude does
2. ✅ **Agents just work in the directory they're given** - They don't care if it's a worktree
3. ✅ **Skills load AFTER worktree creation** - Main Claude creates worktree, THEN loads skill
4. ✅ **No code changes needed in agents** - They work exactly as before, just in a different folder
5. ✅ **Main Claude coordinates everything** - Worktree lifecycle is separate from agent tasks

---

## What Changes for Agents?

**Answer: NOTHING!**

Agents don't need to change because:
- They already work in whatever directory they're spawned in
- They already use relative paths (./src/file.ts)
- They already commit to the current branch
- They don't need to know about the worktree system

**The only difference:**
- Before: Agent works in `C:\Users\Eli\Desktop\Claude Code\CPQ-System\`
- After: Agent works in `C:\Users\Eli\Desktop\Claude Code\.worktrees\bugfix-xyz\`

Everything else is identical from the agent's perspective!

---

## Summary

**Worktrees = Folder Management**
- Main Claude creates folders for branches
- Opens VS Code windows for those folders

**Agents = Task Execution**
- Do the actual work (implement, test, fix)
- Work in whatever folder they're given
- Don't manage folders or VS Code windows

**No collision because they handle different concerns!**
