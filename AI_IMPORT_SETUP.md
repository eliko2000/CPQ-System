# AI-Powered Component Import Setup Guide

## Overview

This feature enables intelligent extraction of component data from supplier quotations, price lists, and catalogs using Claude AI's Vision API. Simply upload an image of any document, and the AI will automatically extract and structure the component information.

---

## Features

✨ **Intelligent Document Analysis**
- Understands context and column meanings automatically
- Handles mixed English/Hebrew documents
- Recognizes various price formats and currencies
- Extracts manufacturer names, part numbers, categories, prices

🎯 **Flexible Input Formats**
- Images: JPEG, PNG, GIF, WebP
- Screenshots of Excel/PDF documents
- Photos of printed price lists
- Scanned quotations

🔍 **Smart Validation**
- AI confidence scores for each extraction
- Interactive preview and editing before import
- Category suggestion based on component description
- Multi-currency support (NIS, USD, EUR)

---

## Setup Instructions

### Step 1: Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-...`)

### Step 2: Configure Environment Variables

1. Open your `.env.local` file in the project root
2. Add your Anthropic API key:

```bash
# Claude AI Configuration
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here
```

3. Save the file
4. Restart your development server:

```bash
npm run dev
```

### Step 3: Verify Installation

1. Navigate to the **Component Library** (ספריית רכיבים)
2. Click the **"ייבוא חכם"** (Smart Import) button
3. If configured correctly, you'll see the upload interface
4. If not configured, you'll see an error message about the API key

---

## Usage Guide

### Basic Workflow

1. **Navigate to Component Library**
   - Click "ספריית רכיבים" in the sidebar

2. **Start Import**
   - Click the **"ייבוא חכם"** button (with sparkles icon)

3. **Upload Document**
   - Drag and drop an image file, OR
   - Click "Choose File" to browse
   - Supported formats: JPEG, PNG, GIF, WebP

4. **AI Analysis**
   - Click **"Analyze with AI"** button
   - Wait 5-15 seconds while AI extracts data
   - Progress bar shows analysis status

5. **Review & Edit**
   - Review extracted components
   - Check AI confidence scores:
     - **Green (High)**: 80%+ confidence
     - **Yellow (Medium)**: 60-80% confidence
     - **Red (Low)**: <60% confidence
   - Click **Edit** icon to modify any field
   - Click **Delete** icon to remove unwanted items

6. **Import to Library**
   - Review final count: "X components will be imported"
   - Click **"Import to Library"** button
   - Components are added to your library!

---

## Tips for Best Results

### Document Preparation

✅ **Good Practices:**
- Use high-resolution images (1920x1080 or higher)
- Ensure text is clearly readable
- Take photos straight-on (not at an angle)
- Good lighting, minimal shadows
- Crop to just the table/list area

❌ **Avoid:**
- Blurry or low-resolution images
- Heavily skewed or rotated photos
- Poor lighting or heavy shadows
- Very small text (zoom in if needed)

### For Excel/PDF Documents

Since PDF direct upload is not yet supported:

1. **Option A: Screenshot Method**
   - Open your Excel/PDF file
   - Take a screenshot of the data table
   - Upload the screenshot

2. **Option B: Export as Image**
   - Excel: Save As → PNG/JPEG
   - PDF: Export pages as images

### Supported Data Fields

The AI can extract:

| Field | Examples | Notes |
|-------|----------|-------|
| **Name** | "Proximity Sensor", "חיישן קרבה" | Component/product name |
| **Manufacturer** | "Siemens", "Festo", "SMC" | Brand name |
| **Part Number** | "6ES7131-4BD01", "P/N: ABC-123" | Catalog number, P/N, מק"ט |
| **Category** | "Sensors", "PLCs", "חיישנים" | Auto-categorized |
| **Supplier** | "RS Components", "דיגיקי" | Vendor name |
| **Price (NIS)** | "₪1,500", "1500 ש״ח" | Israeli Shekels |
| **Price (USD)** | "$399.99", "399.99 USD" | US Dollars |
| **Price (EUR)** | "€350", "350 EUR" | Euros |
| **Notes** | "Lead time 6 weeks" | Any additional info |

---

## Cost Information

### Anthropic Claude API Pricing

- **Model**: Claude 3.7 Sonnet (Latest)
- **Cost per document**: ~$0.005-0.015 (half a cent to 1.5 cents)
- **Input tokens**: ~1,000-3,000 per image
- **Output tokens**: ~500-2,000 per extraction

### Example Usage Costs

| Monthly Usage | Estimated Cost |
|--------------|----------------|
| 10 documents | ~$0.10 |
| 100 documents | ~$1.00 |
| 500 documents | ~$5.00 |
| 1,000 documents | ~$10.00 |

💡 **Very affordable** for typical CPQ system usage!

---

## Troubleshooting

### Issue: "Claude API key not configured"

**Solution:**
1. Check `.env.local` file exists in project root
2. Verify `VITE_ANTHROPIC_API_KEY` is set correctly
3. Ensure API key starts with `sk-ant-`
4. Restart dev server: `npm run dev`

### Issue: "Failed to extract data from document"

**Possible causes:**
- Poor image quality → Try higher resolution
- API key invalid → Check Anthropic console
- Rate limit exceeded → Wait a few minutes
- Network issues → Check internet connection

**Solutions:**
1. Try a clearer image
2. Verify API key is active in Anthropic console
3. Check browser console for detailed error messages

### Issue: Low confidence scores or incorrect extraction

**Solutions:**
- Use higher resolution images
- Ensure text is clearly readable
- Try cropping to just the relevant table
- Manually edit extracted data in preview screen

### Issue: Categories not matching

**Solution:**
- Categories are auto-suggested by AI
- You can manually edit in the preview screen
- Categories available:
  - בקרים (PLCs)
  - חיישנים (Sensors)
  - אקטואטורים (Actuators)
  - מנועים (Motors)
  - ספקי כוח (Power Supplies)
  - תקשורת (Communication)
  - בטיחות (Safety)
  - מכני (Mechanical)
  - כבלים ומחברים (Cables & Connectors)
  - אחר (Other)

---

## Technical Architecture

### Components

```
ComponentLibrary (Main UI)
    └── ComponentAIImport (Modal orchestrator)
        ├── IntelligentDocumentUpload (File upload UI)
        ├── AIExtractionPreview (Review & edit UI)
        └── claudeAI.ts (API service)
```

### Data Flow

```
1. User uploads image file
2. File converted to base64
3. Sent to Claude Vision API with extraction prompt
4. API returns structured JSON with component data
5. User reviews/edits in preview screen
6. Approved components imported to Supabase
7. Success toast notification shown
```

### Files Created

| File | Purpose |
|------|---------|
| `src/services/claudeAI.ts` | Claude API integration & prompts |
| `src/components/library/IntelligentDocumentUpload.tsx` | File upload component |
| `src/components/library/AIExtractionPreview.tsx` | Preview & validation UI |
| `src/components/library/ComponentAIImport.tsx` | Modal orchestrator |
| `src/components/ui/dialog.tsx` | Dialog component (Radix UI) |
| `src/components/ui/select.tsx` | Select component (Radix UI) |

---

## Security Notes

### Browser API Key Usage

⚠️ **Current Implementation:**
```typescript
dangerouslyAllowBrowser: true
```

This is **only for development**. The API key is exposed in browser.

### Production Recommendation

For production, implement a backend proxy:

```
User → Your Backend → Claude API → Your Backend → User
```

**Benefits:**
- API key stays secret on server
- Rate limiting control
- Usage monitoring
- Cost control

**Implementation Steps:**
1. Create Node.js/Express backend endpoint
2. Move Claude API call to backend
3. Frontend calls your backend
4. Backend proxies to Claude API

---

## Future Enhancements

Potential improvements:

- [ ] PDF direct upload support (requires pdf-parse library)
- [ ] Batch processing (upload multiple files)
- [ ] Excel file direct parsing (no screenshot needed)
- [ ] CSV import integration
- [ ] Duplicate detection before import
- [ ] Price history tracking
- [ ] Auto-currency conversion using live rates
- [ ] Supplier detection and auto-linking
- [ ] Backend proxy for API key security

---

## Support

For issues or questions:

1. **Check this documentation** first
2. **Browser Console**: Check for error messages (F12)
3. **Anthropic Status**: [status.anthropic.com](https://status.anthropic.com)
4. **Project Issues**: File an issue in your repository

---

## Example Prompt (For Reference)

The AI uses this prompt to understand documents:

> "You are an expert at extracting structured component data from supplier quotations, price lists, and technical documents. Analyze this document and extract ALL component/product information. The document may be in English, Hebrew, or mixed languages..."

**Extraction fields:**
- name, manufacturer, manufacturerPN, category
- supplier, quantity, prices (NIS/USD/EUR)
- quoteDate, notes, confidence score

**Output format:** Structured JSON

---

## Summary

The AI-powered import feature saves hours of manual data entry by intelligently extracting component information from any supplier document. With Claude's vision capabilities, it understands context, handles multiple languages, and provides high-accuracy results.

**Time saved:** ~5-10 minutes per document → ~5-10 seconds! 🚀

---

*Last updated: 2025-11-07*
*Feature version: 1.0.0*
