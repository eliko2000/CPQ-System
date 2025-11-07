# Fix Vite Cache Issue - PDF & Excel Import

## The Problem
Vite is showing an old cached version of documentConverters.ts even though the file was updated.

## Solution - Complete Cache Clear

### Step 1: Stop the Dev Server
Press **Ctrl + C** in your terminal to stop the server

### Step 2: Clear Browser Cache
**Option A - Hard Refresh (Recommended):**
- Windows/Linux: **Ctrl + Shift + R** or **Ctrl + F5**
- Mac: **Cmd + Shift + R**

**Option B - Clear Cache Manually:**
1. Open DevTools (F12)
2. Right-click the Refresh button
3. Select "Empty Cache and Hard Reload"

**Option C - Disable Cache (While DevTools Open):**
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Keep DevTools open

### Step 3: Start Dev Server
```bash
npm run dev
```

### Step 4: Test
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
