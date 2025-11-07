@echo off
REM Complete cache cleaning script for Vite issues (Windows)

echo 🧹 Starting complete cache cleanup...
echo.

echo ⚠️ Please make sure to stop the dev server (Ctrl+C) first!
timeout /t 2 >nul

echo 1️⃣ Cleaning Vite caches...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist .vite rmdir /s /q .vite
if exist dist rmdir /s /q dist

echo 2️⃣ Cleaning npm cache...
call npm cache clean --force 2>nul

echo.
echo 📱 IMPORTANT: You must also clear your browser cache!
echo    Press Ctrl + Shift + R for hard reload
echo.
echo    Or in DevTools (F12):
echo    - Right-click refresh button
echo    - Select 'Empty Cache and Hard Reload'
echo.

set /p REINSTALL="Do you want to reinstall node_modules? (y/N): "
if /i "%REINSTALL%"=="y" (
    echo 3️⃣ Reinstalling dependencies...
    if exist node_modules rmdir /s /q node_modules
    if exist package-lock.json del package-lock.json
    call npm install
) else (
    echo 3️⃣ Skipping node_modules reinstall
)

echo.
echo ✅ Cache cleanup complete!
echo.
echo 🚀 Now run: npm run dev
echo.
pause
