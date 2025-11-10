# File Import User Guide

## Smart Document Import for Component Library

This guide will help you import components from various file formats into your component library using the Smart CPQ System's intelligent document processing feature.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Supported File Formats](#supported-file-formats)
3. [Import Workflow](#import-workflow)
4. [File Format Guidelines](#file-format-guidelines)
5. [Tips for Best Results](#tips-for-best-results)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Import Process

1. Navigate to the **Component Library** section
2. Click the **"Import from Document"** or **"Upload File"** button
3. Drag and drop your file or click to browse
4. Wait for automatic processing
5. Review extracted components
6. Approve and import to library

**That's it!** The system automatically detects your file type and uses the best extraction method.

---

## Supported File Formats

### Excel Files (.xlsx, .xls)

**Best for**: Structured price lists, supplier quotations in spreadsheet format

**Advantages**:
- Fastest processing (< 1 second)
- Highest accuracy (90-95%)
- No API cost
- Handles large files well

**What to expect**:
- ⚡ Lightning-fast processing
- 🎯 Automatic column detection
- 💰 Smart price parsing
- 🌍 Multi-language support (English, Hebrew)

### CSV Files (.csv)

**Best for**: Exported data from other systems, simple lists

**Advantages**:
- Very fast processing
- Works with any CSV delimiter
- Good for bulk imports
- Universal compatibility

**What to expect**:
- ⚡ Very fast processing
- 📊 Handles large datasets
- 🔄 Standard format compatibility

### PDF Files (.pdf)

**Best for**: Text-based quotations and price lists

**Advantages**:
- No conversion needed
- Processes text directly
- Free (no API cost)

**Limitations**:
- Cannot process scanned/image PDFs
- Lower accuracy (50-70%)
- Complex layouts may not parse well

**What to expect**:
- 📄 Text extraction
- 🔍 Pattern matching
- ⚠️ May require more manual review

**Tip**: If PDF results are not satisfactory, convert to image (screenshot) and use AI Vision for better results.

### Image Files (.jpg, .png, .gif, .webp)

**Best for**: Screenshots, photos of documents, scanned quotes

**Advantages**:
- Highest accuracy (85-95%)
- Handles complex layouts
- Works with scanned documents
- Processes handwritten notes (limited)

**Limitations**:
- Slower (10-15 seconds)
- Uses API credits ($0.01-0.05 per document)
- Requires valid API key

**What to expect**:
- 🤖 AI-powered OCR
- 🎯 Excellent accuracy
- ⏱️ Takes 10-15 seconds
- 💳 Small API cost

---

## Import Workflow

### Step 1: Access Import Feature

**Screenshot description**: Main component library screen with "Import from Document" button in top-right corner.

1. Open the **Component Library** from the main navigation
2. Click the **"Import from Document"** button (or Upload icon)
3. The **Intelligent Document Upload** dialog opens

### Step 2: Upload Your File

**Screenshot description**: Drag-and-drop upload area with file type icons (Excel, PDF, Image)

**Option A: Drag and Drop**
- Drag your file from your computer
- Drop it onto the upload area
- File is automatically validated

**Option B: Browse**
- Click **"Select File"** button
- Browse to your file location
- Select the file to upload

### Step 3: Confirm File and Processing Method

**Screenshot description**: File preview showing file name, size, and detected extraction method badge

After uploading, you'll see:
- File name and size
- Extraction method badge (Excel Parser, PDF Parser, or AI Vision)
- Estimated processing time
- Information about the extraction method

**Extraction Method Indicators**:

| Badge | Method | What it means |
|-------|--------|---------------|
| ⚡ Excel Parser | Excel | Fast, accurate, free |
| 📄 PDF Parser | PDF | Text extraction, may need review |
| 🤖 AI Vision | Image | High accuracy, uses API |

**Information Box Colors**:
- 🔵 Blue: Excel - Fast and accurate
- 🟡 Yellow: PDF - Text extraction mode
- 🟣 Purple: AI Vision - Using Claude API

### Step 4: Start Processing

**Screenshot description**: "Analyze Document" button with extraction method icon

1. Click **"Analyze Document"** button
2. Watch the progress bar
3. Processing time varies by file type:
   - Excel: < 1 second
   - PDF: 1-3 seconds
   - Images: 10-15 seconds

**Progress Messages**:
- Excel: "Analyzing Excel file... (Fast)"
- PDF: "Extracting text from PDF..."
- Image: "Analyzing image with AI... (may take 10-15 seconds)"

### Step 5: Review Extracted Components

**Screenshot description**: Component preview screen showing summary cards, document metadata, and list of extracted components

After processing, you'll see:

**A. Summary Cards** (top row):
- 📦 Total Found: Number of components extracted
- ✅ Approved: Components ready to import
- ✏️ Modified: Components you've edited
- 📈 Confidence Level: Overall extraction quality

**B. Document Metadata** (gray box):
- Extraction method used
- File information (sheet name for Excel, pages for PDF)
- Detected columns (for Excel)
- Processing details

**C. Components List**:
Each component shows:
- Component name (editable)
- Confidence badge (High/Medium/Low)
- Manufacturer information
- Part number (P/N)
- Category
- Price in different currencies
- Notes (if any)

**Confidence Levels**:
- 🟢 **High (80-100%)**: All key fields present, high confidence
- 🟡 **Medium (60-79%)**: Most fields present, review recommended
- 🔴 **Low (0-59%)**: Missing data, manual review required

### Step 6: Review and Edit Components

**Screenshot description**: Component card in edit mode showing inline editing fields

For each component, you can:

**1. Approve** (✅ button):
- Click to approve component as-is
- Component highlighted in green
- Ready for import

**2. Edit** (✏️ button):
- Click to enter edit mode
- Inline editors appear for all fields:
  - Manufacturer
  - Part Number
  - Category (dropdown)
  - Price
- Changes automatically mark as "Modified"

**3. Delete** (🗑️ button):
- Click to remove component from import
- Cannot be undone (but original file is safe)

**Editing Tips**:
- Edit name by clicking on it when in edit mode
- Use category dropdown for standardized categories
- Fix any pricing issues before importing
- Add notes for future reference

### Step 7: Import to Library

**Screenshot description**: Bottom bar showing count of components to import and "Import to Library" button

1. Review the import count: "X components will be imported"
2. Click **"Import to Library"** button
3. Components are saved to your database
4. Success message confirms import
5. Components appear in your Component Library

**Post-Import**:
- All approved and modified components are saved
- Rejected components are not imported
- Original file data is preserved
- Components immediately available for quotations

---

## File Format Guidelines

### Excel/CSV Best Practices

#### Required Column Headers

At minimum, your Excel/CSV should have these columns:

**Essential**:
- **Name/Product**: Component name
- **Price/Cost**: Unit price

**Highly Recommended**:
- **Manufacturer/Brand**: Manufacturer name
- **Part Number/P/N**: Manufacturer part number
- **Category/Type**: Component category

**Optional but Helpful**:
- **Supplier**: Supplier name
- **Description**: Additional details
- **Quantity**: Order quantity
- **Currency**: USD, EUR, NIS

#### Sample Excel Format

| Product Name | Manufacturer | Part Number | Unit Price | Category | Supplier | Quantity |
|--------------|--------------|-------------|------------|----------|----------|----------|
| Siemens PLC S7-1200 | Siemens | 6ES7512-1DK01-0AB0 | $2,500.00 | PLC | Acme Supply | 1 |
| Banner Safety Sensor | Banner | Q45BB6AF300 | $150.00 | Sensor | Banner Direct | 4 |
| SMC Pneumatic Valve | SMC | SY5120-5LZD-01 | €85.50 | Actuator | SMC Israel | 2 |

#### Column Header Flexibility

The system recognizes many header variations:

**Name/Product**:
- "Product Name", "Item", "Component", "שם מוצר", "פריט"

**Manufacturer**:
- "Manufacturer", "Brand", "יצרן", "Vendor"

**Part Number**:
- "P/N", "Part #", "Part Number", "מק\"ט", "קטלוגי"

**Price**:
- "Price", "Unit Price", "Cost", "מחיר", "מחיר יחידה"

**Mixed languages are OK!** You can have English and Hebrew headers in the same file.

#### Price Formats Supported

The parser understands various price formats:

✅ **Supported**:
- $1,234.56 (US format)
- 1.234,56 EUR (European format)
- ₪1,234.56 (Israeli Shekel)
- 1234.56 USD (text with currency)
- $1234 (no decimals)

✅ **Currency Symbols**:
- $ (USD)
- € (EUR)
- ₪ (NIS/ILS)

✅ **Currency Text**:
- USD, US Dollar
- EUR, Euro
- NIS, ILS, שקל, ש"ח (Israeli Shekel)

### PDF Guidelines

#### Best PDF Format for Parsing

**Good PDFs** (Text-based):
- Generated from software (Excel, Word)
- Has selectable text
- Clear table structure
- Standard fonts

**Poor PDFs** (Image-based):
- Scanned documents
- Photos of paper
- No selectable text
- Complex multi-column layouts

**Testing PDF Quality**:
1. Open PDF in a viewer
2. Try to select and copy text
3. If you can't select text → Convert to image and use AI Vision
4. If you can select text → PDF parser should work

#### Converting PDF to Image

If PDF parsing results are poor:

**Option 1**: Screenshot the PDF
- Open PDF in full screen
- Take screenshot (Windows: Win+Shift+S, Mac: Cmd+Shift+4)
- Save as PNG or JPG
- Upload screenshot using AI Vision

**Option 2**: Export from PDF reader
- Use PDF reader's "Export as Image" feature
- Save as high-quality JPG or PNG
- Upload image file

### Image Guidelines

#### Best Image Quality

**Resolution**:
- Minimum: 1024x768 pixels
- Recommended: 1920x1080 or higher
- Maximum file size: 5MB (auto-resized if larger)

**Clarity**:
- ✅ Sharp, clear text
- ✅ Good lighting
- ✅ Straight orientation (not rotated)
- ✅ High contrast

**Avoid**:
- ❌ Blurry photos
- ❌ Low resolution
- ❌ Rotated or skewed
- ❌ Poor lighting
- ❌ Handwritten notes (limited support)

#### Taking Good Photos

**Smartphone Tips**:
1. Use good lighting
2. Hold phone steady
3. Fill frame with document
4. Keep camera parallel to paper
5. Avoid shadows and glare
6. Use highest resolution

**Screenshot Tips**:
1. Maximize document on screen
2. Hide unnecessary UI elements
3. Use highest resolution monitor
4. Take full-screen screenshot
5. Save as PNG for best quality

---

## Tips for Best Results

### General Tips

1. **Start with Excel if possible** - Fastest and most accurate
2. **Use consistent column headers** - Helps automatic detection
3. **One product per row** - Don't merge cells
4. **Include header row** - First row should be column names
5. **Keep it simple** - Clean, structured data works best

### Excel-Specific Tips

1. **Put headers in first row** - System assumes row 1 is headers
2. **Don't merge cells** - Causes parsing issues
3. **Use consistent price format** - Same currency throughout
4. **Avoid formulas in key fields** - May not export correctly
5. **Remove empty rows** - System skips them but cleaner is better
6. **Single sheet preferred** - Currently processes first sheet only

### PDF-Specific Tips

1. **Test text selection first** - If you can't select text, use AI Vision
2. **Prefer simple layouts** - Single-column tables work best
3. **Check extraction quality** - Low confidence? Try image method
4. **Use high-quality PDFs** - Generated PDFs better than scanned
5. **Consider converting to Excel** - Often gives better results

### Image-Specific Tips

1. **Higher resolution is better** - But < 5MB file size
2. **Good lighting essential** - Avoid shadows
3. **Straight orientation** - Rotate before uploading if needed
4. **Fill the frame** - Crop to document area
5. **Remove backgrounds** - Focus on the document

### After Import

1. **Review extracted data** - Even high-confidence items
2. **Check prices carefully** - Verify currency conversion
3. **Verify part numbers** - Critical for ordering
4. **Add notes** - Document any special terms or conditions
5. **Update regularly** - Keep price data current

---

## Troubleshooting

### Excel Import Issues

**Problem**: No components extracted from Excel file

**Solutions**:
- ✅ Check if first row contains headers
- ✅ Verify file is actually Excel (.xlsx, .xls) not CSV
- ✅ Ensure at least "Name" and "Price" columns exist
- ✅ Check if data rows have values (not all empty)

**Problem**: Wrong data in wrong fields

**Solutions**:
- ✅ Check column headers match expected patterns
- ✅ Rename columns to standard names (e.g., "Part Number" instead of "PN Code")
- ✅ Review extracted data and edit before importing

**Problem**: Prices not detected

**Solutions**:
- ✅ Check price column header includes word "price" or "cost"
- ✅ Remove currency text from cells (unless it's a symbol)
- ✅ Use numeric format in Excel
- ✅ Check for hidden characters or spaces

### PDF Import Issues

**Problem**: No text extracted from PDF

**Solutions**:
- ✅ PDF is likely scanned/image-based
- ✅ Try selecting text in PDF viewer - if you can't, it's an image
- ✅ Convert PDF to image and use AI Vision
- ✅ Or export PDF as Excel from source application

**Problem**: Low confidence extraction

**Solutions**:
- ✅ Review each component carefully
- ✅ Edit incorrect fields before importing
- ✅ Consider converting to image for better results
- ✅ Or manually enter components if only a few

**Problem**: Complex table not parsed correctly

**Solutions**:
- ✅ PDF parser works best with simple tables
- ✅ Take screenshot of table
- ✅ Upload screenshot as image
- ✅ AI Vision handles complex layouts better

### Image Import Issues

**Problem**: "API key not configured" error

**Solutions**:
- ✅ Contact system administrator
- ✅ API key needs to be set in system configuration
- ✅ See QUICK_START_AI_IMPORT.md for setup

**Problem**: Image processing takes too long

**Solutions**:
- ✅ Normal processing time is 10-15 seconds
- ✅ Check internet connection
- ✅ Try reducing image size
- ✅ If > 30 seconds, refresh and try again

**Problem**: Poor extraction from image

**Solutions**:
- ✅ Retake photo with better lighting
- ✅ Ensure text is clear and sharp
- ✅ Rotate image if skewed
- ✅ Remove backgrounds/distractions
- ✅ Try higher resolution

### General Issues

**Problem**: File upload fails

**Solutions**:
- ✅ Check file size (< 10MB for Excel, < 5MB for images)
- ✅ Verify file format is supported
- ✅ Check internet connection
- ✅ Try different browser
- ✅ Disable browser extensions

**Problem**: Import to library fails

**Solutions**:
- ✅ Check internet connection (saving to database)
- ✅ Verify you have write permissions
- ✅ Contact system administrator
- ✅ Try importing smaller batch

**Problem**: Duplicate components

**Solutions**:
- ✅ System doesn't auto-detect duplicates yet
- ✅ Review component library before importing
- ✅ Delete duplicates manually after import
- ✅ Check manufacturer part numbers to identify duplicates

---

## FAQ

### Q: Which file format should I use?

**A**: Excel (.xlsx) is best for accuracy and speed. Use images for scanned documents or when Excel isn't available.

### Q: Can I import multiple files at once?

**A**: Currently, one file at a time. Import each file separately.

### Q: What happens to my original file?

**A**: Your original file is not modified. Only extracted data is saved to the library.

### Q: Can I undo an import?

**A**: No automatic undo. You'll need to manually delete imported components if needed.

### Q: How do I know which components were imported?

**A**: Imported components appear immediately in your Component Library. Sort by "Created Date" to see newest.

### Q: Does it support other languages?

**A**: Yes! The system recognizes both English and Hebrew column headers. Other languages may work if using standard terms.

### Q: What if extraction is wrong?

**A**: Always review extracted data before importing. Edit any incorrect fields in the preview screen.

### Q: How much does AI Vision cost?

**A**: Approximately $0.01-0.05 per document, depending on size and complexity.

### Q: Can I use this offline?

**A**: No, requires internet connection for:
- Database access
- AI Vision (images only)
- File processing

### Q: What's the maximum file size?

**A**:
- Excel: 10MB recommended
- CSV: 50MB recommended
- PDF: 5MB recommended
- Images: 5MB (auto-resized if larger)

---

## Getting Help

### Contact Support

If you encounter issues not covered in this guide:

1. Take a screenshot of the error
2. Note the file type and size
3. Describe what you were trying to do
4. Contact your system administrator

### Training Resources

- **Video Tutorial**: [Link to video tutorial when available]
- **Sample Files**: Check `/samples` folder for example files
- **Quick Reference**: One-page cheat sheet for common tasks

---

## Appendix: Category Reference

### Standard Component Categories

When importing, components are automatically categorized. You can change these during review:

| Hebrew | English | Examples |
|--------|---------|----------|
| בקרים | Controllers | PLCs, I/O modules, controllers |
| חיישנים | Sensors | Proximity, photoelectric, encoders |
| אקטואטורים | Actuators | Cylinders, valves, grippers |
| מנועים | Motors | Servo, stepper, DC motors |
| ספקי כוח | Power Supplies | PSUs, batteries, UPS |
| תקשורת | Communication | Network modules, cables |
| בטיחות | Safety | Safety relays, e-stops, light curtains |
| מכני | Mechanical | Brackets, frames, mounting hardware |
| כבלים ומחברים | Cables & Connectors | Cables, plugs, terminal blocks |
| אחר | Other | Miscellaneous items |

### Category Auto-Detection

The system tries to automatically categorize based on keywords in the component name:

**Keywords**:
- "PLC", "Controller" → Controllers (בקרים)
- "Sensor", "חיישן" → Sensors (חיישנים)
- "Valve", "Cylinder" → Actuators (אקטואטורים)
- "Motor", "מנוע" → Motors (מנועים)
- "Power Supply" → Power Supplies (ספקי כוח)
- "Cable", "כבל" → Cables & Connectors

---

**Version**: 1.0
**Last Updated**: February 2024
**For**: Smart CPQ System v1.4.0
