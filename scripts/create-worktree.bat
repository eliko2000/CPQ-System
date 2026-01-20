@echo off
REM Create a new git worktree for a branch
REM Usage: create-worktree.bat <type> <name>
REM Example: create-worktree.bat feature pricing-rules

if "%~1"=="" (
    echo Usage: create-worktree.bat ^<type^> ^<name^>
    echo Types: feature, bugfix, refactor
    echo Example: create-worktree.bat feature pricing-rules
    exit /b 1
)

if "%~2"=="" (
    echo Usage: create-worktree.bat ^<type^> ^<name^>
    echo Missing branch name
    exit /b 1
)

set BRANCH_TYPE=%~1
set BRANCH_NAME=%~2
set WORKTREE_NAME=%BRANCH_TYPE%-%BRANCH_NAME%
set WORKTREE_PATH=..\.worktrees\%WORKTREE_NAME%

echo.
echo ====================================
echo Creating worktree for %BRANCH_TYPE%/%BRANCH_NAME%
echo ====================================
echo.

REM Create .worktrees directory if it doesn't exist
if not exist "..\.worktrees" mkdir "..\.worktrees"

REM Create the worktree
git worktree add "%WORKTREE_PATH%" -b "%BRANCH_TYPE%/%BRANCH_NAME%"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create worktree
    echo This might happen if the branch already exists
    exit /b 1
)

echo.
echo Installing dependencies...
cd "%WORKTREE_PATH%"
call npm install

echo.
echo Copying environment files...
if exist "..\..\CPQ-System\.env.local" (
    copy "..\..\CPQ-System\.env.local" ".env.local" >nul
    echo .env.local copied successfully
) else (
    echo WARNING: No .env.local found in main repo
)

echo.
echo ====================================
echo Worktree created successfully!
echo Location: %WORKTREE_PATH%
echo Branch: %BRANCH_TYPE%/%BRANCH_NAME%
echo ====================================
echo.
echo Opening VS Code...
code .

echo.
echo DONE! A new VS Code window will open.
echo Keep your current VS Code window for the master branch.
