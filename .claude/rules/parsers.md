# File Import & Parser System

## Supported Formats

| Format | Extensions              | Parser          | Speed         | Accuracy  | Cost     |
| ------ | ----------------------- | --------------- | ------------- | --------- | -------- |
| Excel  | .xlsx, .xls             | Native          | Very Fast     | High      | Free     |
| CSV    | .csv                    | Native          | Very Fast     | High      | Free     |
| PDF    | .pdf                    | Text Extraction | Fast          | Medium    | Free     |
| Images | .jpg, .png, .gif, .webp | AI Vision       | Slow (10-15s) | Very High | API Cost |

## Key Files

- `/src/services/documentParser.ts` - Unified parser router (entry point)
- `/src/services/excelParser.ts` - Excel/CSV parsing
- `/src/services/pdfParser.ts` - PDF text extraction
- `/src/services/claudeAI.ts` - AI Vision integration

## Document Parser API

```typescript
import { parseDocument } from './services/documentParser';

const result = await parseDocument(file);

if (result.success) {
  console.log(`Extracted ${result.components.length} components`);
  console.log(`Confidence: ${result.confidence * 100}%`);
}
```

**Key Functions**:
- `parseDocument(file: File)`: Main parsing function
- `getExtractionMethod(file: File)`: Detects which parser to use
- `getEstimatedProcessingTime(file: File)`: Returns estimated time in ms
- `isSupportedFileType(file: File)`: Validates file type

## AIExtractionResult Type

All parsers return this standardized structure:

```typescript
interface AIExtractionResult {
  success: boolean;
  components: AIExtractedComponent[];
  metadata: {
    documentType: 'excel' | 'pdf' | 'image' | 'unknown';
    totalItems: number;
    supplier?: string;
    currency?: string;
    // Excel-specific: sheetName, rowCount, columnHeaders
    // PDF-specific: pageCount, textLength, extractionMethod
  };
  confidence: number; // 0-1 score
  error?: string;
}
```

## Confidence Scoring

| Score Range | Label  | Action                 |
| ----------- | ------ | ---------------------- |
| 0.8 - 1.0   | High   | Auto-approve           |
| 0.6 - 0.79  | Medium | Review recommended     |
| 0.0 - 0.59  | Low    | Manual review required |

**Calculation Factors**: Name (+30), P/N (+20), Manufacturer (+15), Price (+25), Category (+5)

## Adding New Parser

1. Create parser file in `/src/services/`
2. Implement function returning `AIExtractionResult`
3. Add to `documentParser.ts` routing logic
4. Write comprehensive tests
