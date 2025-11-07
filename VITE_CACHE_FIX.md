# Fix Vite Cache Issue - PDF & Excel Import

## The Problem
Vite is showing an old cached version of documentConverters.ts even though the file was updated. The error shows:
```
Failed to resolve import "xlsx" from "src/services/documentConverters.ts"
```

But the actual file has been updated to use dynamic imports (no static imports). This is a **Vite cache issue**.

---

## 🚀 QUICK FIX - Use Cleanup Script

We've created automated cleanup scripts for you:

### Windows Users:
```bash
# In PowerShell or Command Prompt:
clean-cache.bat
```

### Mac/Linux Users:
```bash
# In Terminal:
./clean-cache.sh
```

The script will:
1. ✅ Clean all Vite caches
2. ✅ Clean npm cache
3. ✅ Optionally reinstall node_modules (if needed)
4. ✅ Remind you to clear browser cache

After running the script, **clear your browser cache** (Ctrl+Shift+R) and run `npm run dev`.

---

## 📝 Manual Solution (If Script Doesn't Work)

### Step 1: Stop the Dev Server
Press **Ctrl + C** in your terminal to stop the server

### Step 2: Clear ALL Caches
```bash
# Delete Vite caches
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist

# Clean npm cache
npm cache clean --force
```

### Step 3: Clear Browser Cache
**Option A - Hard Refresh (Recommended):**
- Windows/Linux: **Ctrl + Shift + R** or **Ctrl + F5**
- Mac: **Cmd + Shift + R**

**Option B - Clear Cache Manually:**
1. Open DevTools (F12)
2. Right-click the Refresh button
3. Select "Empty Cache and Hard Reload"

**Option C - Clear All Site Data:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Clear storage"
4. Click "Clear site data"

### Step 4: Start Dev Server
```bash
npm run dev
```

### Step 5: Test
1. Navigate to Component Library (ספריית רכיבים)
2. Click "ייבוא חכם" (Smart Import)
3. Try uploading a PDF or Excel file
4. It should work now!

---

## What Was Fixed

The code now uses **dynamic imports** for both libraries:
- `pdfjs-dist` - loaded only when PDF is uploaded
- `xlsx` - loaded only when Excel is uploaded

This avoids Vite build issues with these libraries.

---

## If Problem Persists

1. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check you're on the right branch:**
   ```bash
   git branch
   # Should show: claude/fix-file-format-support-011CUtcvJvU2VaspkcymDtYd
   ```

3. **Pull latest changes:**
   ```bash
   git pull origin claude/fix-file-format-support-011CUtcvJvU2VaspkcymDtYd
   ```
