# Git Worktree Automation

**PURPOSE**: Automatically manage worktrees when creating branches for parallel development.

## Core Principles

1. **Every new branch gets its own worktree** (separate folder)
2. **Each worktree opens in a new VS Code window**
3. **Worktrees are automatically cleaned up after merging**
4. **User doesn't need to manually manage worktrees**

## How It Works

### When Creating a Branch

When Claude asks "Would you like me to create a new branch?" and you say YES:

1. ✅ Claude creates the branch
2. ✅ Claude creates a worktree in a separate folder
3. ✅ Claude runs `npm install` in the worktree
4. ✅ Claude opens VS Code in the new worktree folder
5. ✅ Your original VS Code window stays on the master branch

### Directory Structure

```
C:\Users\Eli\Desktop\Claude Code\
├── CPQ-System\                    # Main worktree (master branch)
│   ├── .git\                      # Shared git directory
│   └── (your files)
├── .worktrees\                    # All worktrees live here
│   ├── feature-pricing\           # Feature branch worktree
│   ├── bugfix-currency\           # Bugfix branch worktree
│   └── refactor-ui\               # Refactor branch worktree
```

### When Merging and Finishing

After you approve the merge:

1. ✅ Claude merges the branch to master
2. ✅ Claude deletes the worktree folder
3. ✅ Claude deletes the branch (if requested)
4. ✅ You close the VS Code window for that worktree

## VS Code Window Management

**Rule of Thumb**: One VS Code window per worktree (per branch)

- **Main window**: Always on master branch (`CPQ-System` folder)
- **Feature window**: Opens automatically for feature branches
- **Bugfix window**: Opens automatically for bugfix branches

**You can have multiple VS Code windows open simultaneously:**
- Window 1: Master branch (testing, reviewing)
- Window 2: Feature branch (Claude Code working)
- Window 3: Bugfix branch (Google Antigravity working)

Each window has its own:
- Explorer panel (shows its worktree's files)
- Terminal (opens in its worktree's folder)
- Git status (shows its branch)

## Automation Scripts

### Script 1: Create Worktree (Claude runs this)

**Location**: `scripts/create-worktree.bat`

```batch
@echo off
REM Usage: create-worktree.bat feature pricing-rules

set BRANCH_TYPE=%1
set BRANCH_NAME=%2
set WORKTREE_NAME=%BRANCH_TYPE%-%BRANCH_NAME%
set WORKTREE_PATH=..\.worktrees\%WORKTREE_NAME%

echo Creating worktree for %BRANCH_TYPE%/%BRANCH_NAME%...

git worktree add "%WORKTREE_PATH%" -b "%BRANCH_TYPE%/%BRANCH_NAME%"
cd "%WORKTREE_PATH%"
npm install
code .

echo Worktree created at: %WORKTREE_PATH%
```

### Script 2: Cleanup Worktree (Claude runs after merge)

**Location**: `scripts/cleanup-worktree.bat`

```batch
@echo off
REM Usage: cleanup-worktree.bat feature-pricing-rules

set WORKTREE_NAME=%1
set WORKTREE_PATH=..\.worktrees\%WORKTREE_NAME%

echo Cleaning up worktree: %WORKTREE_NAME%...

git worktree remove "%WORKTREE_PATH%"
git worktree prune

echo Worktree removed. Close the VS Code window for this worktree.
```

### Script 3: List Worktrees

**Location**: `scripts/list-worktrees.bat`

```batch
@echo off
echo Active worktrees:
git worktree list
```

## Claude's Automated Workflow

### Integration with Specialized Agents

**IMPORTANT**: Worktrees are managed by **Main Claude Code instance**, NOT by agents.

**The Hierarchy:**
```
Main Claude Code (worktree manager)
├── Creates/destroys worktrees
├── Opens VS Code windows
└── Spawns agents to work IN the worktree
    ├── Bugfix orchestrator (works in worktree)
    ├── Implementer agent (works in worktree)
    └── Tester agent (works in worktree)
```

### When User Requests Feature/Bugfix (WITH Skills/Agents)

**Step 1: Ask User (Main Claude)**
> "Would you like me to create a new branch for this? This will automatically create a worktree and open VS Code."

**Step 2: Create Branch and Worktree (Main Claude)**
```bash
# Example for feature branch
./scripts/create-worktree.bat feature custom-pricing
# Creates: .worktrees/feature-custom-pricing
# Opens: New VS Code window
```

**Step 3: Spawn Agent in Worktree (Main Claude)**
```bash
# If user used /bugfix skill:
Task tool with:
  - subagent_type: orchestrator
  - Working directory: .worktrees/bugfix-custom-pricing
  - Agent works there, commits there
```

**Step 4: Agent Works in Worktree**
- Agent reads/writes files in worktree
- Agent commits to feature branch
- Agent doesn't know about worktrees (doesn't need to)
- Master branch is untouched

**Step 5: Main Claude Manages Merge**
- Agent returns "Done!"
- Main Claude merges from worktree to master
- Main Claude cleans up worktree

### When Merging Back

**Step 1: Verify Tests Pass**
```bash
npm test
npm run build
```

**Step 2: Switch to Main Worktree and Merge**
```bash
cd "C:\Users\Eli\Desktop\Claude Code\CPQ-System"
git merge feature/custom-pricing
git push origin master
```

**Step 3: Cleanup Worktree (DELETE FOLDER, KEEP BRANCH)**
```bash
git worktree remove "../.worktrees/feature-custom-pricing"
# DO NOT delete the branch - keep it for history
# git branch -d feature/custom-pricing  ← DO NOT RUN THIS
```

**Step 4: Inform User**
> "Merged and cleaned up worktree. Branch kept for history. You can close the VS Code window for the feature branch."

**USER PREFERENCE: Keep branches after merging (Option A)**

## User Actions Required

**When Starting Work:**
1. ✅ Approve branch creation (Claude asks)
2. ✅ Wait for new VS Code window to open
3. ✅ Both windows are ready (master + feature)

**During Development:**
- Work normally in each VS Code window
- Each window is isolated (different files, different branch)

**When Finishing:**
1. ✅ Approve merge (Claude asks)
2. ✅ Close the VS Code window for the feature branch
3. ✅ Continue working in master window

## Terminal Management

**Each VS Code window has its own integrated terminal:**

- Terminal in Window 1 (master): `C:\Users\Eli\Desktop\Claude Code\CPQ-System`
- Terminal in Window 2 (feature): `C:\Users\Eli\Desktop\Claude Code\.worktrees\feature-pricing`

**Important**: Terminals are automatically in the correct folder. You don't need to `cd` anywhere.

## Agent Integration Examples

### Example 1: Using /bugfix Skill

**Without Worktrees (Old Way):**
```
User: "/bugfix currency conversion"
→ Bugfix skill loads
→ Orchestrator asks: "Create branch?"
→ Orchestrator creates branch on master
→ Orchestrator spawns implementer
→ Work happens on master directory
```

**With Worktrees (New Way):**
```
User: "/bugfix currency conversion"
→ Main Claude: "Create worktree for this?"
→ User: "Yes"
→ Main Claude: Creates .worktrees/bugfix-currency, opens VS Code
→ Bugfix skill loads IN WORKTREE
→ Orchestrator spawns implementer IN WORKTREE
→ Work happens in worktree directory
→ Main Claude merges and cleans up
```

### Example 2: Direct Feature Request (No Skill)

**User:** "Add risk percentage calculation"

**Main Claude:**
1. "Would you like me to create a worktree for this?"
2. Creates `.worktrees/feature-risk-calculation`
3. Opens new VS Code window
4. Works directly in worktree (no agent spawning)
5. Commits and asks to merge
6. Merges and cleans up

### Example 3: Multiple Agents (Parallel Work)

**User:** "I want you to work on pricing AND I want Antigravity to work on UI"

**Main Claude (Me):**
```
1. Create worktree: .worktrees/feature-pricing
2. Open VS Code window #2
3. Spawn implementer agent in that worktree
4. Agent works on pricing
```

**Google Antigravity (Separate Tool):**
```
1. Create worktree: .worktrees/feature-ui
2. Open VS Code window #3
3. Work on UI redesign
```

**Result:** 3 VS Code windows, 2 branches, no conflicts!

## FAQ

**Q: Can I work on multiple branches at the same time?**
A: Yes! Each worktree is independent. You can have Claude working in one window and Google Antigravity in another.

**Q: Do agents need to know about worktrees?**
A: No! Agents just work in whatever directory they're spawned in. Main Claude handles all worktree management.

**Q: What if I use a skill like /bugfix?**
A: Main Claude creates the worktree FIRST, then loads the skill IN that worktree. The skill/agent works normally.

**Q: Can agents create their own worktrees?**
A: No - agents shouldn't manage worktrees. Main Claude Code instance does this. Agents just do their specialized work.

**Q: Do I need to run `npm install` in each worktree?**
A: No - the automation script does this automatically.

**Q: What if I close VS Code and want to open the worktree again?**
A: Run `code ..\.worktrees\feature-name` or use the list script to see all worktrees.

**Q: Can I manually switch branches in a worktree?**
A: No - each worktree is locked to one branch. If you need a different branch, create a new worktree.

**Q: What happens if I forget to clean up a worktree?**
A: It stays on disk. You can manually remove it: `git worktree remove ..\.worktrees\old-feature`

## Troubleshooting

**Problem: "branch is already checked out"**
- You can't check out the same branch in multiple worktrees
- Solution: Use different branch names or delete the old worktree first

**Problem: Port conflict (dev server)**
- Each worktree runs `npm run dev` on the same port
- Solution: Use different ports: `npm run dev -- --port 5174`

**Problem: Can't find worktree folder**
- Worktrees are in `..\.worktrees\` (one level up from CPQ-System)
- Solution: Run `./scripts/list-worktrees.bat` to see all worktrees

**Problem: VS Code window doesn't open**
- `code` command might not be in PATH
- Solution: Manually open VS Code and use File > Open Folder > select worktree path
