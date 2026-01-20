# Development Workflow

**REQUIRED**: Follow these workflow rules for all features and bugfixes.

## Branch Management with Worktrees

**ALWAYS ASK before starting features or bugfixes:**
> "Would you like me to create a new branch for this? This will create a worktree and open a new VS Code window."

Wait for user response before proceeding.

**Branch Naming Convention:**
- Features: `feature/<short-description>` (e.g., `feature/custom-pricing-rules`)
- Bugfixes: `bugfix/<short-description>` (e.g., `bugfix/currency-conversion-error`)
- Refactors: `refactor/<short-description>` (e.g., `refactor/quotation-editor`)

### Automatic Worktree Creation

When user approves branch creation, Claude automatically:
1. Creates a new worktree in `..\.worktrees\<branch-type>-<name>\`
2. Runs `npm install` in the worktree
3. Opens VS Code in the new worktree folder
4. Informs user to keep both VS Code windows open

**Implementation:**
```bash
# Claude runs this command
.\scripts\create-worktree.bat <type> <name>

# Example: .\scripts\create-worktree.bat feature pricing-rules
```

### Automatic Worktree Cleanup

After merging, Claude automatically:
1. Merges branch to master
2. Removes the worktree folder
3. **KEEPS the branch for history** (user preference)
4. Reminds user to close the VS Code window

**Implementation:**
```bash
# Merge in main repository
cd "C:\Users\Eli\Desktop\Claude Code\CPQ-System"
git merge <branch-name>
git push origin master

# Cleanup worktree (folder only, keep branch)
git worktree remove "../.worktrees/<worktree-name>"
# Branch is kept for history - DO NOT delete
```

**USER PREFERENCE: Branches are kept after merging (Option A)**

**See**: `.claude/rules/worktree-automation.md` for full details

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
