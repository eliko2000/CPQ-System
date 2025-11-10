# Parser System Developer Guide

## Technical Reference for Document Processing Services

This guide provides detailed technical documentation for developers working with or extending the document parser system in the Smart CPQ System.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Parser API Reference](#parser-api-reference)
3. [Type Definitions](#type-definitions)
4. [Implementation Details](#implementation-details)
5. [Testing Guide](#testing-guide)
6. [Extending the System](#extending-the-system)
7. [Known Limitations](#known-limitations)
8. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

### System Design

The parser system follows a **Strategy Pattern** with a unified router:

```
┌─────────────────────────────────────────────────────────┐
│                   Client Application                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  documentParser.ts    │  (Router/Facade)
         │  parseDocument()      │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │  getExtractionMethod()  │  (File Type Detection)
        └────────────┬────────────┘
                     │
        ┌────────────┴────────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────┐               ┌──────────────────┐
│ excelParser  │               │   pdfParser      │
│   .ts        │               │     .ts          │
└──────┬───────┘               └────────┬─────────┘
       │                                 │
       │                ┌────────────────┘
       │                │
       ▼                ▼
┌─────────────────────────────────────┐
│      AIExtractionResult             │
│  (Standardized Return Type)         │
└─────────────────────────────────────┘
```

### Design Principles

1. **Single Responsibility**: Each parser handles one file type
2. **Open/Closed**: Easy to add new parsers without modifying existing code
3. **Dependency Inversion**: All parsers return same interface
4. **Composition over Inheritance**: Router composes parsers

### File Organization

```
src/services/
├── documentParser.ts       # Main router and facade
├── excelParser.ts          # Excel/CSV parsing logic
├── pdfParser.ts            # PDF text extraction
├── claudeAI.ts             # AI Vision integration
└── __tests__/              # Test files
    ├── documentParser.test.ts
    ├── excelParser.test.ts
    └── pdfParser.test.ts
```

---

## Parser API Reference

### Main Entry Point

#### `parseDocument(file: File): Promise<AIExtractionResult>`

The primary function for parsing any supported document type.

**Parameters**:
- `file: File` - The file to parse

**Returns**: `Promise<AIExtractionResult>`

**Example**:
```typescript
import { parseDocument } from './services/documentParser';

const file = event.target.files[0];
const result = await parseDocument(file);

if (result.success) {
  console.log(`Extracted ${result.components.length} components`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
} else {
  console.error('Parsing failed:', result.error);
}
```

**Behavior**:
- Automatically detects file type
- Routes to appropriate parser
- Returns standardized result
- Never throws exceptions (errors in result)

---

### Utility Functions

#### `getExtractionMethod(file: File): ExtractionMethod`

Determines which parser will be used for a given file.

**Parameters**:
- `file: File` - The file to check

**Returns**: `'excel' | 'pdf' | 'ai' | 'unknown'`

**Example**:
```typescript
import { getExtractionMethod } from './services/documentParser';

const method = getExtractionMethod(file);
console.log(`Will use ${method} parser`);

// Use for conditional logic
if (method === 'ai') {
  showWarning('This will use API credits');
}
```

---

#### `getExtractionMethodName(method: ExtractionMethod, language?: 'en' | 'he'): string`

Gets user-friendly name for extraction method.

**Parameters**:
- `method: ExtractionMethod` - The extraction method
- `language?: 'en' | 'he'` - Language for name (default: 'he')

**Returns**: `string`

**Example**:
```typescript
const methodName = getExtractionMethodName('excel', 'en');
// Returns: "Excel Parser"

const methodNameHe = getExtractionMethodName('excel', 'he');
// Returns: "מנתח Excel"
```

---

#### `getEstimatedProcessingTime(file: File): number`

Estimates processing time in milliseconds.

**Parameters**:
- `file: File` - The file to estimate

**Returns**: `number` - Estimated time in milliseconds

**Example**:
```typescript
const estimatedMs = getEstimatedProcessingTime(file);
console.log(`Estimated time: ${estimatedMs / 1000}s`);

// Use for progress UI
const progressInterval = estimatedMs / 90; // Update every 1%
```

---

#### `isSupportedFileType(file: File): boolean`

Checks if file type is supported.

**Parameters**:
- `file: File` - The file to check

**Returns**: `boolean`

**Example**:
```typescript
if (!isSupportedFileType(file)) {
  alert('Unsupported file type');
  return;
}
```

---

#### `getSupportedExtensions(): string[]`

Returns array of supported file extensions.

**Returns**: `string[]`

**Example**:
```typescript
const extensions = getSupportedExtensions();
// Returns: ['.xlsx', '.xls', '.csv', '.pdf', '.jpg', ...]

// Use in file input
<input type="file" accept={extensions.join(',')} />
```

---

#### `getSupportedMimeTypes(): string[]`

Returns array of supported MIME types.

**Returns**: `string[]`

**Example**:
```typescript
const mimeTypes = getSupportedMimeTypes();
// Returns: ['application/vnd.openxmlformats-officedocument...', ...]
```

---

### Excel Parser

#### `parseExcelFile(file: File): Promise<AIExtractionResult>`

Parses Excel and CSV files with smart column detection.

**File**: `/src/services/excelParser.ts`

**Parameters**:
- `file: File` - Excel or CSV file

**Returns**: `Promise<AIExtractionResult>`

**Example**:
```typescript
import { parseExcelFile } from './services/excelParser';

const result = await parseExcelFile(excelFile);

if (result.success) {
  // Access Excel-specific metadata
  console.log('Sheet:', result.metadata.sheetName);
  console.log('Rows:', result.metadata.rowCount);
  console.log('Detected columns:', result.metadata.detectedColumns);
}
```

**Features**:
- Smart column header detection
- Multiple language support (English, Hebrew)
- Flexible header matching
- Currency detection and parsing
- Price format normalization
- Category auto-classification
- Confidence scoring

**Detected Columns**:
```typescript
{
  name: number;          // Column index for name
  manufacturer: number;  // Column index for manufacturer
  partNumber: number;    // Column index for part number
  price: number;         // Column index for price
  category: number;      // Column index for category
  quantity: number;      // Column index for quantity
  supplier: number;      // Column index for supplier
  currency: number;      // Column index for currency
}
```

---

### PDF Parser

#### `parsePDFFile(file: File): Promise<AIExtractionResult>`

Parses PDF files using text extraction and pattern matching.

**File**: `/src/services/pdfParser.ts`

**Parameters**:
- `file: File` - PDF file

**Returns**: `Promise<AIExtractionResult>`

**Example**:
```typescript
import { parsePDFFile } from './services/pdfParser';

const result = await parsePDFFile(pdfFile);

if (result.success) {
  // Access PDF-specific metadata
  console.log('Pages:', result.metadata.pageCount);
  console.log('Extraction method:', result.metadata.extractionMethod);
  console.log('Has tables:', result.metadata.hasTabularData);

  // Check if confidence is acceptable
  if (result.confidence < 0.5) {
    console.warn('Low confidence - consider using AI Vision');
  }
}
```

**Features**:
- Text extraction from PDF
- Tabular structure detection
- Pattern matching for data
- Multi-page support
- Currency and price detection
- Part number extraction

**Limitations**:
- Cannot process scanned/image PDFs
- Lower accuracy than Excel
- Complex layouts may fail
- Confidence typically 30-70%

**Extraction Methods**:
- `'structured'`: Detected table format, higher confidence
- `'text'`: Free-form text parsing, lower confidence

---

### AI Vision Parser

#### `extractComponentsFromDocument(file: File): Promise<AIExtractionResult>`

Parses images using Claude Vision API.

**File**: `/src/services/claudeAI.ts`

**Parameters**:
- `file: File` - Image file (JPEG, PNG, GIF, WebP)

**Returns**: `Promise<AIExtractionResult>`

**Example**:
```typescript
import { extractComponentsFromDocument } from './services/claudeAI';

const result = await extractComponentsFromDocument(imageFile);

if (result.success) {
  console.log('AI Vision extraction successful');
  console.log('Components:', result.components);
} else {
  console.error('AI extraction failed:', result.error);
}
```

**Features**:
- OCR for text extraction
- Complex layout handling
- Multi-language support
- Scanned document processing
- Highest accuracy for difficult documents

**Requirements**:
- Valid Anthropic API key
- Internet connection
- Image size < 5MB (auto-resized)

**Cost**: ~$0.01-0.05 per document

---

## Type Definitions

### AIExtractionResult

The standardized return type for all parsers.

```typescript
interface AIExtractionResult {
  success: boolean;
  components: AIExtractedComponent[];
  metadata: {
    documentType: 'excel' | 'pdf' | 'image' | 'unknown';
    totalItems: number;
    supplier?: string;
    quoteDate?: string;
    currency?: string;
    // Excel-specific
    sheetName?: string;
    rowCount?: number;
    columnHeaders?: string[];
    detectedColumns?: Record<string, number>;
    sheetsProcessed?: number;
    // PDF-specific
    pageCount?: number;
    textLength?: number;
    extractionMethod?: 'text' | 'structured';
    hasTabularData?: boolean;
  };
  confidence: number; // 0-1
  error?: string;
}
```

**Field Descriptions**:

- `success`: Whether extraction completed without fatal errors
- `components`: Array of extracted components
- `metadata`: Parser-specific information
- `confidence`: Overall extraction quality (0-1)
- `error`: Error message if extraction failed or has warnings

---

### AIExtractedComponent

Represents a single extracted component.

```typescript
interface AIExtractedComponent {
  name: string;
  description?: string;
  manufacturer?: string;
  manufacturerPN?: string;
  category?: string;
  supplier?: string;
  quantity?: number;
  unitPriceNIS?: number;
  unitPriceUSD?: number;
  unitPriceEUR?: number;
  currency?: 'NIS' | 'USD' | 'EUR';
  quoteDate?: string;
  notes?: string;
  confidence: number; // 0-1
}
```

**Field Descriptions**:

- `name`: Component name (required)
- `manufacturerPN`: Manufacturer part number
- `category`: Standardized category
- `unitPrice*`: Price in specific currency
- `currency`: Primary currency of the price
- `confidence`: Confidence score for this component (0-1)

---

### ExtractionMethod

Type for extraction method identifier.

```typescript
type ExtractionMethod = 'excel' | 'pdf' | 'ai' | 'unknown';
```

---

### ExcelParseMetadata

Excel-specific metadata.

```typescript
interface ExcelParseMetadata {
  sheetName: string;
  rowCount: number;
  columnHeaders: string[];
  detectedColumns: Record<string, number>;
  sheetsProcessed: number;
}
```

---

### PDFParseMetadata

PDF-specific metadata.

```typescript
interface PDFParseMetadata {
  pageCount: number;
  textLength: number;
  extractionMethod: 'text' | 'structured';
  hasTabularData: boolean;
}
```

---

## Implementation Details

### Excel Parser Implementation

#### Column Detection Algorithm

```typescript
function detectColumns(headers: string[]): Record<string, number> {
  const detected: Record<string, number> = {};

  // Normalize headers (lowercase, trim)
  const normalizedHeaders = headers.map(h =>
    String(h || '').toLowerCase().trim()
  );

  // Match each field to patterns
  for (const [fieldName, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const header = normalizedHeaders[i];

      // Check if any pattern matches
      if (patterns.some(pattern =>
        header.includes(pattern.toLowerCase()) ||
        pattern.toLowerCase().includes(header)
      )) {
        detected[fieldName] = i;
        break; // First match wins
      }
    }
  }

  return detected;
}
```

**Algorithm Details**:
1. Normalize all headers to lowercase
2. Iterate through known field patterns
3. Use substring matching (bidirectional)
4. First match wins (prevents duplicates)
5. Return mapping of field → column index

---

#### Price Parsing

```typescript
function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  // If already a number
  if (typeof value === 'number') {
    return value > 0 ? value : null;
  }

  // Convert to string and clean
  let str = String(value).trim();

  // Remove currency symbols and text
  str = str.replace(/[₪$€]/g, '');
  str = str.replace(/USD|EUR|NIS|ILS|שקל|ש"ח/gi, '');
  str = str.replace(/\s/g, '');

  // Handle comma/period ambiguity
  if (str.includes(',') && str.includes('.')) {
    // Both present: comma is thousands separator
    str = str.replace(/,/g, '');
  } else if (str.includes(',')) {
    // Only comma: check if it's decimal separator
    const commaMatch = str.match(/,(\d{2})$/);
    if (commaMatch) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(str);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
}
```

**Handles**:
- Integer and decimal numbers
- Currency symbols ($, €, ₪)
- Currency text (USD, EUR, NIS, ILS, Hebrew)
- Thousands separators (1,234 or 1.234)
- Decimal separators (. or ,)
- Mixed formats

---

#### Currency Detection

```typescript
function extractCurrency(value: string): 'NIS' | 'USD' | 'EUR' | null {
  if (!value) return null;

  const normalized = String(value).toUpperCase();

  if (normalized.includes('USD') || normalized.includes('$')) return 'USD';
  if (normalized.includes('EUR') || normalized.includes('€')) return 'EUR';
  if (normalized.includes('NIS') || normalized.includes('ILS') ||
      normalized.includes('₪') || normalized.includes('שקל') ||
      normalized.includes('ש"ח')) return 'NIS';

  return null;
}
```

**Detection Order**:
1. Check for USD indicators
2. Check for EUR indicators
3. Check for NIS indicators
4. Default to null (will use USD as fallback)

---

#### Category Normalization

```typescript
function normalizeCategory(category: string | null | undefined): string {
  if (!category) return 'אחר';

  const lower = category.toLowerCase();

  // Keyword matching
  if (lower.includes('plc') || lower.includes('controller')) return 'בקרים';
  if (lower.includes('sensor') || lower.includes('חיישן')) return 'חיישנים';
  if (lower.includes('actuator') || lower.includes('valve')) return 'אקטואטורים';
  // ... more mappings

  return 'אחר'; // Default
}
```

**Category Mappings**:
- Keywords are case-insensitive
- Supports English and Hebrew terms
- Multiple keywords per category
- Falls back to "אחר" (Other)

---

#### Confidence Scoring

```typescript
function calculateConfidence(component: Partial<AIExtractedComponent>): number {
  let score = 0;
  let maxScore = 0;

  // Required fields (30 points)
  if (component.name) score += 30;
  maxScore += 30;

  // Important fields (20 points)
  if (component.manufacturerPN) score += 20;
  maxScore += 20;

  // Manufacturer (15 points)
  if (component.manufacturer) score += 15;
  maxScore += 15;

  // Price (25 points) - Critical
  if (component.unitPriceNIS || component.unitPriceUSD || component.unitPriceEUR) {
    score += 25;
  }
  maxScore += 25;

  // Nice to have (10 points total)
  if (component.category) score += 5;
  maxScore += 5;

  if (component.quantity) score += 3;
  maxScore += 3;

  if (component.description) score += 2;
  maxScore += 2;

  return maxScore > 0 ? score / maxScore : 0;
}
```

**Scoring Weights**:
- Name: 30% (essential)
- Price: 25% (critical for quotations)
- Part Number: 20% (important for ordering)
- Manufacturer: 15% (helpful for sourcing)
- Category: 5% (nice to have)
- Quantity: 3% (optional)
- Description: 2% (optional)

---

### PDF Parser Implementation

#### Tabular Detection

```typescript
function hasTabularStructure(text: string): boolean {
  const lines = text.split('\n');
  let tabularLines = 0;

  for (const line of lines) {
    // Check for column separators
    const spaceSeparated = line.split(/\s{2,}/).length >= 3;
    const tabSeparated = line.split('\t').length >= 3;
    const pipeSeparated = line.split('|').length >= 3;

    if (spaceSeparated || tabSeparated || pipeSeparated) {
      tabularLines++;
    }
  }

  // If > 20% of lines look tabular, assume table structure
  return tabularLines > lines.length * 0.2;
}
```

**Detection Heuristics**:
- Multiple spaces (2+) indicate columns
- Tab characters indicate columns
- Pipe characters (|) indicate columns
- Threshold: 20% of lines must look tabular

---

#### Pattern Matching

**Part Number Patterns**:
```typescript
const PART_NUMBER_PATTERNS = [
  /P\/N[:\s]+([A-Z0-9-]+)/gi,        // P/N: ABC123
  /Part\s*(?:#|No\.?|Number)[:\s]+([A-Z0-9-]+)/gi,
  /PN[:\s]+([A-Z0-9-]+)/gi,
  /קטלוגי[:\s]+([A-Z0-9-]+)/gi,      // Hebrew
  /מק"ט[:\s]+([A-Z0-9-]+)/gi,        // Hebrew
  /Catalog\s*(?:#|No\.?)[:\s]+([A-Z0-9-]+)/gi,
];
```

**Price Patterns**:
```typescript
const PRICE_PATTERNS = [
  /\$\s*([0-9,]+\.?\d*)/g,           // $1,234.56
  /([0-9,]+\.?\d*)\s*USD/gi,         // 1234.56 USD
  /USD\s*([0-9,]+\.?\d*)/gi,         // USD 1234.56
  /€\s*([0-9,]+\.?\d*)/g,            // €1,234.56
  /([0-9,]+\.?\d*)\s*EUR/gi,         // 1234.56 EUR
  /₪\s*([0-9,]+\.?\d*)/g,            // ₪1,234.56
  /([0-9,]+\.?\d*)\s*(?:NIS|ILS)/gi, // 1234.56 NIS
];
```

---

### Document Router Implementation

#### File Type Detection

```typescript
function getExtractionMethod(file: File): ExtractionMethod {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Check for Excel/spreadsheet
  if (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv') ||
    fileType === 'text/csv'
  ) {
    return 'excel';
  }

  // Check for PDF
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'pdf';
  }

  // Check for images
  if (
    fileType.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext =>
      fileName.endsWith(ext)
    )
  ) {
    return 'ai';
  }

  return 'unknown';
}
```

**Detection Priority**:
1. Check MIME type first
2. Fall back to file extension
3. Multiple checks for robustness

---

#### Processing Time Estimation

```typescript
function getEstimatedProcessingTime(file: File): number {
  const method = getExtractionMethod(file);
  const fileSizeMB = file.size / (1024 * 1024);

  switch (method) {
    case 'excel':
      // Very fast: 100ms base + 50ms per MB
      return Math.min(500, 100 + fileSizeMB * 50);

    case 'pdf':
      // Fast: 300ms base + 100ms per MB
      return Math.min(2000, 300 + fileSizeMB * 100);

    case 'ai':
      // Slow: Fixed ~10 seconds
      return 10000;

    default:
      return 0;
  }
}
```

**Estimation Formula**:
- Excel: `min(500ms, 100ms + fileSize * 50ms/MB)`
- PDF: `min(2000ms, 300ms + fileSize * 100ms/MB)`
- AI: `10000ms` (fixed, network-dependent)

---

## Testing Guide

### Test Setup

**Install Dependencies**:
```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom
```

**Test Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // or 'happy-dom'
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
    },
  },
});
```

---

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific file
npm test excelParser.test.ts

# Run specific test
npm test -- -t "should parse Excel file"
```

---

### Writing Parser Tests

#### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseExcelFile } from '../excelParser';

describe('excelParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid Excel file', async () => {
    // Arrange
    const file = createMockExcelFile();

    // Act
    const result = await parseExcelFile(file);

    // Assert
    expect(result.success).toBe(true);
    expect(result.components).toHaveLength(2);
    expect(result.components[0].name).toBe('Test Component');
  });
});
```

---

#### Mock File Creation

```typescript
function createMockFile(
  name: string,
  type: string,
  content: ArrayBuffer = new ArrayBuffer(0)
): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // Mock arrayBuffer method
  if (!file.arrayBuffer) {
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => content,
      writable: false,
    });
  }

  return file;
}
```

---

#### Mocking XLSX Library

```typescript
import * as XLSX from 'xlsx';

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

// In test
const mockWorkbook = {
  SheetNames: ['Sheet1'],
  Sheets: { Sheet1: {} }
};

const mockData = [
  ['Name', 'Price'],
  ['Component 1', '100'],
  ['Component 2', '200'],
];

vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData);
```

---

#### Test Categories

**1. Happy Path Tests**:
```typescript
it('should parse valid Excel file with all columns', async () => {
  // Test successful parsing with complete data
});

it('should handle multiple sheets', async () => {
  // Test multi-sheet processing
});
```

**2. Edge Case Tests**:
```typescript
it('should handle empty Excel file', async () => {
  // Test with no data rows
});

it('should handle file with only headers', async () => {
  // Test with header row but no data
});

it('should skip empty rows', async () => {
  // Test with blank rows in data
});
```

**3. Format Variation Tests**:
```typescript
it('should parse prices with different formats', async () => {
  // Test: $1,234.56, 1234.56 USD, €100, etc.
});

it('should detect columns with Hebrew headers', async () => {
  // Test Hebrew column names
});

it('should handle mixed language headers', async () => {
  // Test English + Hebrew in same file
});
```

**4. Error Handling Tests**:
```typescript
it('should return error for unsupported file type', async () => {
  const result = await parseExcelFile(invalidFile);
  expect(result.success).toBe(false);
  expect(result.error).toContain('Unsupported file type');
});

it('should handle corrupted Excel file', async () => {
  // Test with malformed file
});
```

**5. Confidence Score Tests**:
```typescript
it('should calculate high confidence for complete data', async () => {
  const result = await parseExcelFile(completeFile);
  expect(result.confidence).toBeGreaterThan(0.8);
});

it('should calculate low confidence for incomplete data', async () => {
  const result = await parseExcelFile(incompleteFile);
  expect(result.confidence).toBeLessThan(0.6);
});
```

---

### PDF Parser Tests

**Known Issue**: PDF tests require browser-like environment for `pdf-parse` library.

**Workaround Options**:

1. **Use jsdom**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

2. **Mock pdf-parse**:
```typescript
vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    numpages: 1,
    text: 'Mock PDF content',
  }),
}));
```

3. **Skip in CI**:
```typescript
it.skipIf(process.env.CI)('should parse PDF file', async () => {
  // Test implementation
});
```

---

### Coverage Goals

**Target Coverage**:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

**Current Coverage**:
- Excel Parser: ~95%
- Document Parser: ~90%
- PDF Parser: ~60% (due to test environment issues)

---

## Extending the System

### Adding a New Parser

#### Step 1: Create Parser File

Create `/src/services/newFormatParser.ts`:

```typescript
import type { AIExtractionResult, AIExtractedComponent } from './claudeAI';

/**
 * Parse NEW_FORMAT files and extract component data
 *
 * @param file - The NEW_FORMAT file to parse
 * @returns Promise<AIExtractionResult> - Standardized extraction result
 */
export async function parseNewFormatFile(file: File): Promise<AIExtractionResult> {
  try {
    // 1. Validate file type
    if (!file.name.endsWith('.newformat')) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: 'Unsupported file type',
      };
    }

    // 2. Read file content
    const content = await file.text();

    // 3. Parse content
    const components = parseContent(content);

    // 4. Calculate confidence
    const avgConfidence = calculateAverageConfidence(components);

    // 5. Return standardized result
    return {
      success: true,
      components,
      metadata: {
        documentType: 'newformat',
        totalItems: components.length,
        // Add format-specific metadata here
      },
      confidence: avgConfidence,
    };

  } catch (error) {
    return {
      success: false,
      components: [],
      metadata: { documentType: 'newformat', totalItems: 0 },
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function parseContent(content: string): AIExtractedComponent[] {
  // Implement your parsing logic here
  return [];
}

function calculateAverageConfidence(components: AIExtractedComponent[]): number {
  if (components.length === 0) return 0;
  return components.reduce((sum, c) => sum + c.confidence, 0) / components.length;
}
```

---

#### Step 2: Update Document Router

Add to `/src/services/documentParser.ts`:

```typescript
import { parseNewFormatFile } from './newFormatParser';

export type ExtractionMethod = 'excel' | 'pdf' | 'ai' | 'newformat' | 'unknown';

export function getExtractionMethod(file: File): ExtractionMethod {
  const fileName = file.name.toLowerCase();

  // Add your format detection
  if (fileName.endsWith('.newformat')) {
    return 'newformat';
  }

  // ... existing detection logic
}

export async function parseDocument(file: File): Promise<AIExtractionResult> {
  const method = getExtractionMethod(file);

  try {
    switch (method) {
      case 'newformat': {
        return await parseNewFormatFile(file);
      }

      // ... existing cases
    }
  } catch (error) {
    // ... error handling
  }
}
```

---

#### Step 3: Add Tests

Create `/src/services/__tests__/newFormatParser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseNewFormatFile } from '../newFormatParser';

describe('newFormatParser', () => {
  it('should parse valid NEW_FORMAT file', async () => {
    const file = new File(['test content'], 'test.newformat', {
      type: 'application/newformat',
    });

    const result = await parseNewFormatFile(file);

    expect(result.success).toBe(true);
    expect(result.components).toBeDefined();
  });

  it('should reject invalid file type', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });

    const result = await parseNewFormatFile(file);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported');
  });
});
```

---

#### Step 4: Update Types

Add to `/src/types.ts` if needed:

```typescript
export interface NewFormatMetadata {
  formatVersion: string;
  encoding: string;
  // Add format-specific fields
}
```

---

#### Step 5: Update UI

If the format has special handling needs, update:
- `/src/components/library/IntelligentDocumentUpload.tsx`
- Add icon/badge for new format
- Add processing message

---

#### Step 6: Document

Update documentation:
- Add to CLAUDE.md
- Add to USER_GUIDE_FILE_IMPORT.md
- Add examples

---

### Best Practices for New Parsers

1. **Always return AIExtractionResult**: Never throw exceptions
2. **Calculate confidence scores**: Help users understand quality
3. **Add format-specific metadata**: Useful for debugging
4. **Handle errors gracefully**: Return error in result
5. **Write comprehensive tests**: Cover happy path and edge cases
6. **Document thoroughly**: Explain format and limitations
7. **Follow existing patterns**: Consistency is key

---

## Known Limitations

### Excel Parser

**Limitations**:
1. Processes only first sheet by default
2. Assumes first row is headers
3. Cannot handle merged cells well
4. No formula evaluation (uses values)
5. Max file size: ~10MB recommended

**Workarounds**:
- Multi-sheet: Modify parser to process all sheets
- No headers: Add detection for data-only files
- Merged cells: Unmerge before import
- Formulas: Export as values

---

### PDF Parser

**Limitations**:
1. Cannot process scanned/image PDFs
2. Lower accuracy (50-70% typical)
3. Complex layouts may fail
4. No table structure understanding
5. Depends on text extractability

**Workarounds**:
- Scanned PDFs: Convert to image, use AI Vision
- Low accuracy: Manual review and editing
- Complex layouts: Use AI Vision instead
- No tables: Provide structured data

**Technical Issue**:
- Test environment requires browser-like DOM
- `pdf-parse` needs Node.js Buffer support
- Tests may fail in some CI environments

---

### AI Vision Parser

**Limitations**:
1. Requires API key and credits
2. Slower (10-15 seconds)
3. API rate limits apply
4. Network dependent
5. Image size limit: 5MB

**Workarounds**:
- Cost: Use only for complex documents
- Speed: Set user expectations
- Rate limits: Implement queue system
- Image size: Auto-resize before upload

---

### General Limitations

**Character Encoding**:
- May have issues with some non-Latin scripts
- UTF-8 recommended for best results

**File Size**:
- Large files (>10MB) may cause browser memory issues
- Consider chunking for very large datasets

**Browser Compatibility**:
- File API required (modern browsers only)
- ArrayBuffer support needed

---

## Performance Optimization

### Excel Parser Optimization

**Current Performance**:
- Small files (< 1MB): < 500ms
- Medium files (1-5MB): 500ms - 2s
- Large files (5-10MB): 2s - 5s

**Optimization Strategies**:

1. **Process Only Necessary Sheets**:
```typescript
// Currently processes first sheet only
// To process all sheets:
for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const result = processWorksheet(worksheet, sheetName);
  allComponents.push(...result.components);
}
```

2. **Lazy Row Processing**:
```typescript
// Process rows in batches
const BATCH_SIZE = 100;
for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
  const batch = jsonData.slice(i, i + BATCH_SIZE);
  const batchComponents = processBatch(batch);
  components.push(...batchComponents);

  // Allow UI to update
  await new Promise(resolve => setTimeout(resolve, 0));
}
```

3. **Column Detection Caching**:
```typescript
// Cache detected columns for reuse
const columnCache = new Map<string, Record<string, number>>();

function detectColumnsWithCache(headers: string[]): Record<string, number> {
  const key = headers.join('|');
  if (columnCache.has(key)) {
    return columnCache.get(key)!;
  }
  const detected = detectColumns(headers);
  columnCache.set(key, detected);
  return detected;
}
```

---

### PDF Parser Optimization

**Current Performance**:
- Small PDFs (< 1MB, 1-5 pages): 300ms - 1s
- Medium PDFs (1-3MB, 5-20 pages): 1s - 3s
- Large PDFs (3-5MB, 20+ pages): 3s - 5s

**Optimization Strategies**:

1. **Skip Non-Tabular Pages**:
```typescript
function shouldProcessPage(pageText: string): boolean {
  // Skip pages with no prices or part numbers
  const hasPrices = PRICE_PATTERNS.some(p => p.test(pageText));
  const hasPartNumbers = PART_NUMBER_PATTERNS.some(p => p.test(pageText));
  return hasPrices || hasPartNumbers;
}
```

2. **Parallel Page Processing**:
```typescript
const pagePromises = pdfData.pages.map(page =>
  processPageAsync(page.text)
);
const results = await Promise.all(pagePromises);
```

---

### AI Vision Optimization

**Current Performance**:
- Typical: 8-15 seconds
- Depends on: Image size, API latency, network speed

**Optimization Strategies**:

1. **Image Resizing**:
```typescript
async function resizeImage(file: File, maxSize: number = 2048): Promise<File> {
  if (file.size < 1024 * 1024) return file; // < 1MB, no resize

  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  let width = img.width;
  let height = img.height;

  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = (height / width) * maxSize;
      width = maxSize;
    } else {
      width = (width / height) * maxSize;
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}
```

2. **Request Batching**:
```typescript
// Process multiple small images in one request
async function batchExtract(files: File[]): Promise<AIExtractionResult[]> {
  // Combine small images into single request
  // Use Claude's multi-image support
}
```

---

### Memory Management

**Avoiding Memory Leaks**:

1. **Clear File References**:
```typescript
// After processing
file = null;
arrayBuffer = null;
```

2. **Dispose Large Objects**:
```typescript
// After parsing
workbook = null;
pdfData = null;
```

3. **Stream Large Files**:
```typescript
// For very large files
const reader = file.stream().getReader();
// Process in chunks
```

---

## Troubleshooting

### Common Development Issues

**Issue**: TypeScript errors with XLSX types

**Solution**:
```bash
npm install --save-dev @types/node
```

**Issue**: pdf-parse not working in tests

**Solution**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});

// tests/setup.ts
global.Buffer = Buffer;
```

**Issue**: File.arrayBuffer() not available in tests

**Solution**:
```typescript
// Mock in test
Object.defineProperty(file, 'arrayBuffer', {
  value: async () => new ArrayBuffer(0),
});
```

---

### Debugging Tips

**Enable Debug Logging**:
```typescript
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Parser input:', file.name, file.size);
  console.log('Detected columns:', detectedColumns);
  console.log('Extracted components:', components);
}
```

**Test with Sample Files**:
```typescript
// Create test files
const testFiles = {
  excel: new File([excelBuffer], 'test.xlsx'),
  pdf: new File([pdfBuffer], 'test.pdf'),
  csv: new File(['name,price\nItem,100'], 'test.csv'),
};

// Run parser
const result = await parseDocument(testFiles.excel);
```

**Inspect Metadata**:
```typescript
console.log('Metadata:', result.metadata);
console.log('Confidence:', result.confidence);
console.log('Error:', result.error);
```

---

## API Reference Summary

### Document Parser

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `parseDocument` | `file: File` | `Promise<AIExtractionResult>` | Main parsing function |
| `getExtractionMethod` | `file: File` | `ExtractionMethod` | Detect parser type |
| `getEstimatedProcessingTime` | `file: File` | `number` | Estimate time (ms) |
| `isSupportedFileType` | `file: File` | `boolean` | Check if supported |
| `getSupportedExtensions` | none | `string[]` | List extensions |
| `getSupportedMimeTypes` | none | `string[]` | List MIME types |

### Excel Parser

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `parseExcelFile` | `file: File` | `Promise<AIExtractionResult>` | Parse Excel/CSV |

### PDF Parser

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `parsePDFFile` | `file: File` | `Promise<AIExtractionResult>` | Parse PDF |

### AI Vision Parser

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `extractComponentsFromDocument` | `file: File` | `Promise<AIExtractionResult>` | AI Vision parsing |

---

## Version History

- **v1.0.0**: Initial parser system
- **v1.1.0**: Excel parser with column detection
- **v1.2.0**: PDF text extraction
- **v1.3.0**: Unified document router
- **v1.4.0**: Comprehensive test coverage

---

## Contributing Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Use meaningful variable names
- Keep functions focused and small

### Pull Request Process

1. Create feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation
5. Submit PR with description

### Review Checklist

- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] Type definitions updated
- [ ] No console.log in production code
- [ ] Error handling implemented
- [ ] Performance considered

---

**Document Version**: 1.0
**Last Updated**: February 2024
**For**: Smart CPQ System v1.4.0
