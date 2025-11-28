# Git Bisect Helper for Finding Broken Grid

## Quick Commands

### View Recent Commits

```powershell
git log --oneline -30
```

### Test a Specific Commit (Detached HEAD - Safe)

```powershell
# Checkout the commit
git checkout abc1234

# Test in browser (dev server auto-reloads)
# When done, return to your branch:
git checkout master
```

### Automated Binary Search (Recommended)

```powershell
# Start bisect
git bisect start

# Mark current as bad
git bisect bad

# Mark a known good commit (e.g., from 2 weeks ago)
git bisect good abc1234

# Git will checkout a commit in the middle
# Test it in browser, then mark it:
git bisect good   # if grid works
# OR
git bisect bad    # if grid is broken

# Repeat until git finds the exact commit that broke it
# When done:
git bisect reset
```

## What to Test

1. Open quotation in browser
2. Check if grid shows systems and items
3. Check if action buttons work
4. Check if delete works

## After Finding the Bad Commit

```powershell
# View what changed in that commit:
git show <commit-hash>

# View specific file changes:
git show <commit-hash>:src/components/quotations/QuotationEditor.tsx
```
