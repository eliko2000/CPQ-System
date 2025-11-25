# Integration Guide: Excel & PDF Parsers

This guide shows how to integrate the new Excel and PDF parsers into the existing CPQ system.

## Quick Start

The parsers are already implemented and ready to use. You just need to update the file upload handler to route files to the appropriate parser.

---

## Update IntelligentDocumentUpload Component

**File**: `src/components/library/IntelligentDocumentUpload.tsx`

### Current Implementation (AI only)

```typescript
const handleAnalyze = async () => {
  if (!file) return;

  try {
    setStatus('analyzing');
    setProgress(10);
    setError('');

    // Currently only uses AI extraction
    const result = await extractComponentsFromDocument(file);

    if (result.success) {
      setStatus('completed');
      setTimeout(() => {
        onExtractionComplete(result);
      }, 500);
    } else {
      setStatus('error');
      setError(result.error || 'Failed to extract data from document');
    }
  } catch (err) {
    setStatus('error');
    setError(
      err instanceof Error ? err.message : 'An unexpected error occurred'
    );
  }
};
```

### Updated Implementation (with routing)

```typescript
import {
  extractComponentsFromDocument,
  type AIExtractionResult,
} from '../../services/claudeAI';
import { parseExcelFile } from '../../services/excelParser';
import { parsePDFFile } from '../../services/pdfParser';

const handleAnalyze = async () => {
  if (!file) return;

  try {
    setStatus('analyzing');
    setProgress(10);
    setError('');

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    let result: AIExtractionResult;

    // Route to appropriate parser based on file type
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (
      fileType.includes('excel') ||
      fileType.includes('spreadsheet') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')
    ) {
      // Use Excel parser for spreadsheet files
      result = await parseExcelFile(file);
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Use PDF parser for PDF files
      result = await parsePDFFile(file);
    } else if (fileType.startsWith('image/')) {
      // Use AI extraction for images
      result = await extractComponentsFromDocument(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    clearInterval(progressInterval);
    setProgress(100);

    if (result.success) {
      setStatus('completed');
      setTimeout(() => {
        onExtractionComplete(result);
      }, 500);
    } else {
      setStatus('error');
      setError(result.error || 'Failed to extract data from document');
    }
  } catch (err) {
    setStatus('error');
    setError(
      err instanceof Error ? err.message : 'An unexpected error occurred'
    );
  }
};
```

### Benefits

- Excel and CSV files are parsed instantly (no AI cost)
- PDF files are extracted using pattern matching (faster, no AI cost)
- Image files still use AI for best accuracy
- Consistent error handling and user feedback
- Same AIExtractionResult format for all methods

---

## Update File Type Descriptions

Update the supported formats text to reflect the new capabilities:

```typescript
<p className="text-xs text-muted-foreground mt-4">
  פורמטים נתמכים: Excel (XLSX, XLS, CSV), PDF, תמונות (JPEG, PNG, GIF, WebP)
</p>
```

---

## Add Extraction Method Indicator

Optionally, show which method was used in the success message:

```typescript
{status === 'completed' && (
  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
    <div className="flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600" />
      <div>
        <h4 className="font-medium text-green-900">הניתוח הושלם!</h4>
        <p className="text-sm text-green-700">
          {extractionMethod === 'excel' && 'חולץ מקובץ Excel'}
          {extractionMethod === 'pdf' && 'חולץ מקובץ PDF'}
          {extractionMethod === 'ai' && 'חולץ באמצעות AI'}
        </p>
      </div>
    </div>
  </div>
)}
```

---

## Alternative: Create Unified Parser Service

For cleaner code, create a unified service that handles routing:

**File**: `src/services/documentParser.ts`

```typescript
import {
  extractComponentsFromDocument,
  type AIExtractionResult,
} from './claudeAI';
import { parseExcelFile } from './excelParser';
import { parsePDFFile } from './pdfParser';

/**
 * Unified document parser that routes to the appropriate extraction method
 */
export async function parseDocument(file: File): Promise<AIExtractionResult> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Excel files (fastest, most reliable)
  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv')
  ) {
    return await parseExcelFile(file);
  }

  // PDF files (text-based extraction)
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const result = await parsePDFFile(file);

    // If PDF extraction has low confidence, suggest using AI
    if (result.confidence < 0.3) {
      return {
        ...result,
        error:
          (result.error || '') +
          '\n\nלתוצאות טובות יותר, המר את ה-PDF לתמונה והשתמש בחילוץ AI.',
      };
    }

    return result;
  }

  // Image files (use AI for best results)
  if (fileType.startsWith('image/')) {
    return await extractComponentsFromDocument(file);
  }

  // Unsupported file type
  return {
    success: false,
    components: [],
    metadata: { documentType: 'unknown', totalItems: 0 },
    confidence: 0,
    error: `סוג קובץ לא נתמך: ${fileType}`,
  };
}

/**
 * Get extraction method from file type
 */
export function getExtractionMethod(
  file: File
): 'excel' | 'pdf' | 'ai' | 'unknown' {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv')
  ) {
    return 'excel';
  }

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'pdf';
  }

  if (fileType.startsWith('image/')) {
    return 'ai';
  }

  return 'unknown';
}
```

### Then simplify IntelligentDocumentUpload:

```typescript
import { parseDocument } from '../../services/documentParser';

const handleAnalyze = async () => {
  if (!file) return;

  try {
    setStatus('analyzing');
    setProgress(10);
    setError('');

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    // Single call handles all file types
    const result = await parseDocument(file);

    clearInterval(progressInterval);
    setProgress(100);

    if (result.success) {
      setStatus('completed');
      setTimeout(() => {
        onExtractionComplete(result);
      }, 500);
    } else {
      setStatus('error');
      setError(result.error || 'Failed to extract data from document');
    }
  } catch (err) {
    setStatus('error');
    setError(
      err instanceof Error ? err.message : 'An unexpected error occurred'
    );
  }
};
```

---

## Testing Integration

### Test Excel Upload

1. Prepare a test Excel file with columns: Name, Part Number, Price, Manufacturer
2. Upload to IntelligentDocumentUpload
3. Verify components are extracted with high confidence
4. Check that prices and currencies are correct

### Test PDF Upload

1. Prepare a PDF with a price list (text-based, not scanned)
2. Upload to IntelligentDocumentUpload
3. Verify components are extracted
4. Check confidence scores (should be lower than Excel)
5. If confidence is low, verify the error message suggests using AI

### Test Image Upload (Existing)

1. Upload a screenshot of a price list
2. Verify AI extraction still works
3. Confirm it uses Claude Vision API

### Test Error Cases

1. Upload unsupported file type → Should show clear error
2. Upload empty Excel file → Should handle gracefully
3. Upload scanned PDF (no text) → Should suggest using AI
4. Upload corrupted file → Should show error message

---

## Performance Considerations

### Excel Files

- **Instant** for files < 1000 rows
- ~100-200ms for typical price lists
- Consider showing "Processing Excel file..." instead of AI progress

### PDF Files

- ~200-500ms depending on page count
- Consider showing "Extracting text from PDF..."
- For large PDFs (100+ pages), show warning or processing time estimate

### AI Extraction (Images)

- 5-15 seconds depending on document complexity
- Current progress bar is appropriate
- No changes needed

### Optimization Suggestion

Show different loading messages based on file type:

```typescript
const getLoadingMessage = () => {
  if (!file) return '';

  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType.includes('excel') || fileType.includes('spreadsheet') ||
      fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    return 'מעבד קובץ Excel...';
  }

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'מחלץ טקסט מ-PDF...';
  }

  return 'AI מנתח את המסמך שלך...';
};

// Then use in the UI:
<span>{getLoadingMessage()}</span>
```

---

## Confidence-Based Workflows

### Auto-Import High Confidence Components

```typescript
const handleExtractionComplete = (result: AIExtractionResult) => {
  if (!result.success) return;

  // Separate by confidence
  const highConfidence = result.components.filter(c => c.confidence >= 0.7);
  const needsReview = result.components.filter(c => c.confidence < 0.7);

  // Auto-import high confidence
  for (const component of highConfidence) {
    const cpqComponent = aiComponentToComponent(component);
    addComponent(cpqComponent);
  }

  // Show review dialog for lower confidence
  if (needsReview.length > 0) {
    setComponentsForReview(needsReview);
    setShowReviewDialog(true);
  }

  showToast(
    `${highConfidence.length} רכיבים יובאו אוטומטית, ${needsReview.length} דורשים בדיקה`,
    'success'
  );
};
```

### Confidence Indicator in Preview

```typescript
const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const getColor = () => {
    if (confidence >= 0.7) return 'bg-green-100 text-green-800';
    if (confidence >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${getColor()}`}>
      {(confidence * 100).toFixed(0)}% confidence
    </span>
  );
};
```

---

## Update AIExtractionPreview Component

**File**: `src/components/library/AIExtractionPreview.tsx`

Add extraction method indicator:

```typescript
// At the top of the preview
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold">רכיבים שחולצו</h3>
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    {result.metadata.documentType === 'excel' && (
      <>
        <FileSpreadsheet className="w-4 h-4" />
        <span>חולץ מ-Excel</span>
      </>
    )}
    {result.metadata.documentType === 'pdf' && (
      <>
        <FileText className="w-4 h-4" />
        <span>חולץ מ-PDF</span>
      </>
    )}
    {result.metadata.documentType === 'image' && (
      <>
        <Sparkles className="w-4 h-4" />
        <span>חולץ עם AI</span>
      </>
    )}
  </div>
</div>
```

---

## Troubleshooting Integration Issues

### Issue: Excel files still use AI extraction

**Solution**: Check import statements and file type detection logic

### Issue: PDF extraction returns no components

**Solution**: PDF may be scanned. Suggest converting to image or taking screenshots

### Issue: Components have wrong currency

**Solution**: Check currency detection in excelParser.ts `extractCurrency()` function

### Issue: Hebrew headers not detected

**Solution**: Verify headers match patterns in `COLUMN_PATTERNS` constant

### Issue: Part numbers not extracted from PDF

**Solution**: Check if format matches `PART_NUMBER_PATTERNS` regex patterns

---

## Summary

Integration is straightforward:

1. Import the new parser functions
2. Update `handleAnalyze()` to route based on file type
3. Optionally create unified `parseDocument()` service
4. Update UI text to reflect new capabilities
5. Test all file types and error cases

The parsers are production-ready and follow the same patterns as the existing AI extraction service.
