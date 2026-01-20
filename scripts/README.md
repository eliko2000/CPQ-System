# Git Worktree Automation Scripts

These scripts automate worktree management for parallel branch development.

## Scripts

### create-worktree.bat

Creates a new worktree for a branch and opens VS Code.

**Usage:**

```bash
.\scripts\create-worktree.bat <type> <name>
```

**Examples:**

```bash
.\scripts\create-worktree.bat feature pricing-rules
.\scripts\create-worktree.bat bugfix currency-error
.\scripts\create-worktree.bat refactor quotation-ui
```

**What it does:**

1. Creates `.worktrees/<type>-<name>` folder
2. Creates branch `<type>/<name>`
3. Runs `npm install`
4. Opens VS Code in new worktree

---

### cleanup-worktree.bat

Removes a worktree after merging.

**Usage:**

```bash
.\scripts\cleanup-worktree.bat <worktree-name>
```

**Examples:**

```bash
.\scripts\cleanup-worktree.bat feature-pricing-rules
.\scripts\cleanup-worktree.bat bugfix-currency-error
```

**What it does:**

1. Removes worktree folder
2. Cleans up git references
3. Reminds you to close VS Code window

---

### list-worktrees.bat

Shows all active worktrees.

**Usage:**

```bash
.\scripts\list-worktrees.bat
```

**Output:**

```
Active Worktrees
================
C:\Users\Eli\Desktop\Claude Code\CPQ-System                [master]
C:\Users\Eli\Desktop\Claude Code\.worktrees\feature-pricing [feature/pricing-rules]
```

---

## Automated Workflow

**You don't need to run these scripts manually!**

Claude automatically runs these scripts when:

- Creating branches (uses `create-worktree.bat`)
- Merging branches (uses `cleanup-worktree.bat`)

Just approve when Claude asks: "Would you like me to create a new branch?"

---

## Manual Usage

If you need to manually manage worktrees:

```bash
# Create a worktree
.\scripts\create-worktree.bat feature my-feature

# List worktrees
.\scripts\list-worktrees.bat

# Remove a worktree (after merging)
.\scripts\cleanup-worktree.bat feature-my-feature
```

---

## Directory Structure

```
C:\Users\Eli\Desktop\Claude Code\
├── CPQ-System\              # Main repository (master branch)
│   ├── .git\                # Shared git database
│   ├── scripts\             # These automation scripts
│   └── ...
└── .worktrees\              # All worktrees live here
    ├── feature-pricing\     # Feature branch worktree
    ├── bugfix-currency\     # Bugfix branch worktree
    └── ...
```

Each worktree gets its own VS Code window and terminal.
