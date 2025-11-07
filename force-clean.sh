#!/bin/bash
echo "🔥 Force cleaning ALL caches..."

# Kill any running processes on port 3001
echo "Stopping any running dev servers..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Remove ALL cache directories
echo "Removing all cache directories..."
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .vite
rm -rf dist
rm -rf build
rm -rf .parcel-cache

# Clean npm cache aggressively
echo "Cleaning npm cache..."
npm cache clean --force

# Remove and reinstall node_modules
echo "Removing node_modules..."
rm -rf node_modules package-lock.json

echo "Reinstalling dependencies..."
npm install

echo ""
echo "✅ Complete cleanup done!"
echo "🚀 Now start the server: npm run dev"
echo "📱 And clear browser cache: Ctrl+Shift+R"
