# Quick Start: AI Import Feature

## 🚀 Get Started in 3 Minutes

### Step 1: Get Your API Key
1. Visit https://console.anthropic.com/
2. Sign up/login
3. Go to **API Keys** → **Create Key**
4. Copy your **full API key** (starts with `sk-ant-...`)
   - ⚠️ Make sure to copy the entire key
   - Example format: `sk-ant-api03-xxxxxxxxxxxx...`

### Step 2: Add API Key
Open `.env.local` and **replace the placeholder**:

**Before:**
```bash
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**After:**
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

⚠️ **Important:** Don't leave it as `your-anthropic-api-key-here`!

### Step 3: Restart Server
**You MUST restart for changes to take effect:**

```bash
npm run dev
```

## ✨ How to Use

1. Go to **ספריית רכיבים** (Component Library)
2. Click **"ייבוא חכם"** (Smart Import) button with sparkles ✨
3. Upload an image of your price list/quotation
4. Click **"Analyze with AI"**
5. Review extracted data
6. Click **"Import to Library"**

Done! 🎉

## 📸 Supported Files

- ✅ JPEG, PNG, GIF, WebP images
- ✅ Screenshots of Excel/PDF
- ✅ Photos of printed documents
- ❌ PDF files (use screenshots instead)

## 💰 Cost

~$0.01 per document (1 cent!)

Very affordable for typical usage.

## 📚 Full Documentation

See `AI_IMPORT_SETUP.md` for complete guide.

---

**Need Help?**

### Common Error: "Authentication Failed" or "invalid x-api-key"

**This means your API key is not configured correctly.**

✅ **Solutions:**
1. **Check you copied the FULL key** from Anthropic console
2. **Replace the placeholder** in `.env.local` (don't leave it as `your-anthropic-api-key-here`)
3. **Restart your dev server** after making changes
4. Verify key format: Must start with `sk-ant-`

### Other Issues:
- Check browser console (F12) for detailed errors
- Ensure image is clear and high-quality
- Try a different image format (PNG usually works best)
