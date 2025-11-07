#!/bin/bash

# Complete cache cleaning script for Vite issues
echo "🧹 Starting complete cache cleanup..."

# Stop any running dev servers (optional - user should do this manually)
echo "⚠️  Please make sure to stop the dev server (Ctrl+C) before running this script!"
sleep 2

# Clean Vite caches
echo "1️⃣ Cleaning Vite caches..."
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist

# Clean npm cache (optional but helpful)
echo "2️⃣ Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Clean browser cache reminder
echo ""
echo "📱 IMPORTANT: You must also clear your browser cache!"
echo "   Windows/Linux: Press Ctrl + Shift + R"
echo "   Mac: Press Cmd + Shift + R"
echo ""
echo "   Or in DevTools (F12):"
echo "   - Right-click refresh button"
echo "   - Select 'Empty Cache and Hard Reload'"
echo ""

# Reinstall dependencies (optional - only if needed)
read -p "Do you want to reinstall node_modules? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "3️⃣ Reinstalling dependencies..."
    rm -rf node_modules package-lock.json
    npm install
else
    echo "3️⃣ Skipping node_modules reinstall"
fi

echo ""
echo "✅ Cache cleanup complete!"
echo ""
echo "🚀 Now run: npm run dev"
echo ""
