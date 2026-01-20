@echo off
REM List all git worktrees
REM Usage: list-worktrees.bat

echo.
echo ====================================
echo Active Worktrees
echo ====================================
echo.

git worktree list

echo.
echo ====================================
echo.
echo To open a worktree in VS Code:
echo   code ..\.worktrees\^<worktree-name^>
echo.
echo To remove a worktree:
echo   .\scripts\cleanup-worktree.bat ^<worktree-name^>
