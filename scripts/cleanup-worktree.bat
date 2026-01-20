@echo off
REM Remove a git worktree after merging
REM Usage: cleanup-worktree.bat <worktree-name>
REM Example: cleanup-worktree.bat feature-pricing-rules

if "%~1"=="" (
    echo Usage: cleanup-worktree.bat ^<worktree-name^>
    echo.
    echo Available worktrees:
    git worktree list
    exit /b 1
)

set WORKTREE_NAME=%~1
set WORKTREE_PATH=..\.worktrees\%WORKTREE_NAME%

echo.
echo ====================================
echo Cleaning up worktree: %WORKTREE_NAME%
echo ====================================
echo.

REM Check if worktree exists
if not exist "%WORKTREE_PATH%" (
    echo ERROR: Worktree not found at %WORKTREE_PATH%
    echo.
    echo Available worktrees:
    git worktree list
    exit /b 1
)

REM Remove the worktree
git worktree remove "%WORKTREE_PATH%"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to remove worktree
    echo This might happen if there are uncommitted changes
    echo Use: git worktree remove --force "%WORKTREE_PATH%"
    exit /b 1
)

REM Prune stale worktree references
git worktree prune

echo.
echo ====================================
echo Worktree removed successfully!
echo ====================================
echo.
echo Branch kept for history: %WORKTREE_NAME%
echo.
echo Remember to:
echo 1. Close the VS Code window for this worktree
echo.
echo Optional - Delete branch if no longer needed:
echo    git branch -d %WORKTREE_NAME%
