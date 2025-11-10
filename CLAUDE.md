# Smart CPQ System - Technical Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [File Import System](#file-import-system)
4. [Parser Services](#parser-services)
5. [Component Library](#component-library)
6. [Quotation Management](#quotation-management)
7. [Database Schema](#database-schema)
8. [Business Logic](#business-logic)
9. [Testing](#testing)

---

## System Overview

The Smart CPQ System is a Configure, Price, Quote application designed for robotics integration companies. It enables efficient management of component libraries, intelligent document processing, and automated quotation generation.

### Key Features

- **Intelligent Document Import**: Multi-format file parsing (Excel, CSV, PDF, Images)
- **Component Library**: Centralized catalog with price history
- **Quotation Builder**: System-based quotation creation with real-time calculations
- **AI-Powered Extraction**: Claude Vision API for document processing
- **Multi-Currency Support**: NIS, USD, EUR with automatic conversion
- **Database Integration**: Supabase backend for data persistence

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + Radix UI
- **State Management**: React Hooks
- **Database**: Supabase (PostgreSQL)
- **File Processing**: xlsx, exceljs, pdf-parse, pdfjs-dist
- **AI Integration**: Anthropic Claude API
- **Testing**: Vitest + Testing Library

---

## Architecture

### Project Structure

```
CPQ-System/
├── src/
│   ├── services/          # Business logic and parsers
│   │   ├── excelParser.ts      # Excel/CSV parsing
│   │   ├── pdfParser.ts        # PDF text extraction
│   │   ├── documentParser.ts   # Unified parser router
│   │   ├── claudeAI.ts         # AI Vision integration
│   │   └── __tests__/          # Parser tests
│   ├── components/        # React components
│   │   ├── library/            # Component library UI
│   │   ├── quotations/         # Quotation builder UI
│   │   └── shared/             # Reusable components
│   ├── types.ts          # TypeScript type definitions
│   └── lib/              # Utilities and helpers
├── docs/                 # Documentation
└── tests/                # Test files
```

### Data Flow

```
User Upload → Document Parser → Extraction Service → Preview → Component Library
                    ↓
            [Excel/PDF/AI Router]
                    ↓
         Standardized AIExtractionResult
                    ↓
            AIExtractionPreview UI
                    ↓
         User Review & Approval
                    ↓
            Supabase Database
```

---

## File Import System

### Overview

The file import system provides intelligent multi-format document processing with automatic routing to the appropriate parser based on file type.

### Supported Formats

| Format | Extensions | Parser | Speed | Accuracy | Cost |
|--------|-----------|---------|-------|----------|------|
| Excel  | .xlsx, .xls | Native | Very Fast | High | Free |
| CSV    | .csv | Native | Very Fast | High | Free |
| PDF    | .pdf | Text Extraction | Fast | Medium | Free |
| Images | .jpg, .png, .gif, .webp | AI Vision | Slow (10-15s) | Very High | API Cost |

### Architecture

#### 1. Document Parser (Unified Entry Point)

**File**: `/src/services/documentParser.ts`

The document parser is the main entry point for all file processing. It automatically detects file type and routes to the appropriate parser.

```typescript
import { parseDocument } from './services/documentParser';

// Automatically detects file type and uses correct parser
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
- `getSupportedExtensions()`: Lists all supported extensions

#### 2. Excel Parser

**File**: `/src/services/excelParser.ts`

High-performance parser for Excel and CSV files with smart column detection.

**Features**:
- Automatic column header detection (English + Hebrew)
- Support for multiple naming conventions
- Currency detection and parsing
- Price format normalization
- Category auto-classification
- Confidence scoring per component

**Column Detection Patterns**:

The parser recognizes common column headers in both English and Hebrew:

| Field | Recognized Headers |
|-------|-------------------|
| Name | name, שם, product, item, description, תיאור, פריט, מוצר |
| Manufacturer | manufacturer, יצרן, brand, supplier, ספק |
| Part Number | part number, קטלוגי, p/n, pn, מק"ט, catalog |
| Price | price, מחיר, unit price, cost, מחיר יחידה |
| Category | category, קטגוריה, type, סוג |
| Quantity | quantity, כמות, qty, כמ |

**Example**:

```typescript
import { parseExcelFile } from './services/excelParser';

const result = await parseExcelFile(excelFile);

// Result structure
{
  success: true,
  components: [
    {
      name: "Siemens PLC",
      manufacturer: "Siemens",
      manufacturerPN: "6ES7512-1DK01-0AB0",
      unitPriceUSD: 2500.00,
      currency: "USD",
      category: "בקרים",
      confidence: 0.95
    }
  ],
  metadata: {
    documentType: "excel",
    sheetName: "Quote",
    rowCount: 150,
    columnHeaders: ["Product Name", "Brand", "P/N", "Price"],
    detectedColumns: { name: 0, manufacturer: 1, partNumber: 2, price: 3 },
    sheetsProcessed: 1
  },
  confidence: 0.92
}
```

**Price Parsing**:

The Excel parser handles various price formats:
- Currency symbols: $, €, ₪
- Thousands separators: 1,234.56 or 1.234,56
- Currency text: USD, EUR, NIS, ILS, שקל
- Multiple currencies in same file

#### 3. PDF Parser

**File**: `/src/services/pdfParser.ts`

Text-based PDF parser with pattern matching for structured data extraction.

**Features**:
- Text extraction from PDF documents
- Tabular structure detection
- Pattern matching for part numbers and prices
- Multi-page support
- Currency detection
- Structured vs free-text extraction modes

**Extraction Methods**:

1. **Structured (Tabular)**:
   - Detects tables with multiple columns
   - Extracts rows as separate components
   - Higher confidence scores

2. **Free Text**:
   - Parses unstructured text
   - Uses regex patterns for data extraction
   - Lower confidence scores

**Limitations**:
- Cannot process scanned PDFs (image-based)
- Lower accuracy for complex layouts
- Confidence typically 30-70%
- For better results, convert PDF to image and use AI Vision

**Example**:

```typescript
import { parsePDFFile } from './services/pdfParser';

const result = await parsePDFFile(pdfFile);

// Result structure
{
  success: true,
  components: [
    {
      name: "Safety Relay",
      manufacturerPN: "PSR-SCP-24DC",
      unitPriceUSD: 285.00,
      currency: "USD",
      category: "בטיחות",
      confidence: 0.65
    }
  ],
  metadata: {
    documentType: "pdf",
    pageCount: 3,
    textLength: 4500,
    extractionMethod: "structured",
    hasTabularData: true
  },
  confidence: 0.58
}
```

#### 4. AI Vision Parser

**File**: `/src/services/claudeAI.ts`

Claude Vision API integration for image-based document processing.

**Features**:
- Processes images and screenshots
- Handles complex layouts and tables
- OCR for scanned documents
- Multi-language support
- Highest accuracy for complex documents

**Use Cases**:
- Scanned quotations
- PDF screenshots
- Photos of price lists
- Complex multi-column layouts
- Handwritten notes (limited)

**Cost Consideration**:
- Uses Anthropic API credits
- ~$0.01-0.05 per document depending on size
- Best accuracy for complex documents

---

## Parser Services

### AIExtractionResult Type

All parsers return the same standardized result structure:

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
  confidence: number; // 0-1 score
  error?: string;
}
```

### AIExtractedComponent Type

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
  confidence: number; // 0-1 score per component
}
```

### Confidence Scoring

Confidence scores indicate extraction quality:

| Score Range | Label | Meaning | Action |
|-------------|-------|---------|--------|
| 0.8 - 1.0 | High | All required fields present | Auto-approve |
| 0.6 - 0.79 | Medium | Most fields present | Review recommended |
| 0.0 - 0.59 | Low | Missing critical data | Manual review required |

**Calculation Factors**:
- Name present: +30 points
- Manufacturer P/N: +20 points
- Manufacturer: +15 points
- Price: +25 points
- Category: +5 points
- Quantity: +3 points
- Description: +2 points

**Parser-Specific Adjustments**:
- Excel: Full confidence (0-1.0)
- PDF: Capped at 0.9 due to text extraction uncertainty
- AI Vision: Full confidence based on Claude's response

---

## Component Library

### Component Data Structure

```typescript
interface Component {
  id: string;
  name: string;
  description?: string;
  category: string;
  productType?: string;
  manufacturer: string;
  manufacturerPN: string;
  supplier: string;
  unitCostNIS: number;
  unitCostUSD?: number;
  unitCostEUR?: number;
  currency: 'NIS' | 'USD' | 'EUR';
  originalCost: number;
  quoteDate: string;
  quoteFileUrl: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Categories

Standard component categories (Hebrew):

1. **בקרים** (Controllers) - PLCs, controllers, I/O modules
2. **חיישנים** (Sensors) - Proximity, photoelectric, encoders
3. **אקטואטורים** (Actuators) - Cylinders, valves, grippers
4. **מנועים** (Motors) - Servo, stepper, DC motors
5. **ספקי כוח** (Power Supplies) - PSUs, UPS, batteries
6. **תקשורת** (Communication) - Network modules, cables
7. **בטיחות** (Safety) - Safety relays, light curtains, e-stops
8. **מכני** (Mechanical) - Brackets, frames, hardware
9. **כבלים ומחברים** (Cables & Connectors)
10. **אחר** (Other) - Default category

### Import Workflow

```
1. User uploads file
   ↓
2. IntelligentDocumentUpload component
   - Shows file preview
   - Displays extraction method
   - Shows estimated time
   ↓
3. Parse document
   - Routes to correct parser
   - Extracts components
   - Calculates confidence
   ↓
4. AIExtractionPreview component
   - Shows extraction summary
   - Displays metadata
   - Lists all components
   - Allows editing/approval
   ↓
5. User reviews and approves
   - Edit component fields
   - Approve/modify/reject each item
   - See confidence scores
   ↓
6. Import to library
   - Save to Supabase
   - Add to component catalog
   - Ready for quotations
```

---

## Quotation Management

### Quotation Structure

```typescript
interface QuotationProject {
  id: string;
  name: string;
  customerName: string;
  description?: string;
  status: 'draft' | 'sent' | 'won' | 'lost';
  systems: QuotationSystem[];
  parameters: QuotationParameters;
  items: QuotationItem[];
  calculations: QuotationCalculations;
  createdAt: string;
  updatedAt: string;
}
```

### Pricing Parameters

```typescript
interface QuotationParameters {
  usdToIlsRate: number;      // Exchange rate
  eurToIlsRate: number;      // Exchange rate
  markupPercent: number;     // Default markup
  dayWorkCost: number;       // Labor cost per day
  profitPercent: number;     // Target profit
  riskPercent: number;       // Risk buffer
  paymentTerms?: string;
  deliveryTime?: string;
  includeVAT: boolean;
  vatRate: number;
}
```

---

## Database Schema

### Tables

#### components
```sql
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255),
  manufacturer_part_number VARCHAR(255),
  category VARCHAR(100),
  description TEXT,
  unit_cost_usd DECIMAL(10,2),
  unit_cost_ils DECIMAL(10,2),
  unit_cost_eur DECIMAL(10,2),
  supplier VARCHAR(255),
  supplier_part_number VARCHAR(255),
  lead_time_days INTEGER,
  min_order_quantity INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### quotations
```sql
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  project_name VARCHAR(255),
  project_description TEXT,
  currency VARCHAR(3) DEFAULT 'ILS',
  exchange_rate DECIMAL(10,4) DEFAULT 3.7000,
  margin_percentage DECIMAL(5,2) DEFAULT 25.00,
  status VARCHAR(20) DEFAULT 'draft',
  valid_until_date DATE,
  terms TEXT,
  notes TEXT,
  total_cost DECIMAL(12,2),
  total_price DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Business Logic

### Price Calculations

#### Unit Price Conversion

```typescript
// USD to ILS
const priceILS = priceUSD * exchangeRate;

// EUR to ILS
const priceILS = priceEUR * eurToIlsRate;

// ILS to USD
const priceUSD = priceILS / exchangeRate;
```

#### Markup Application

```typescript
// Percentage markup
const customerPrice = unitCost * (1 + markupPercent / 100);

// Fixed markup
const customerPrice = unitCost + fixedMarkup;
```

#### Total Quotation Calculation

```typescript
1. Calculate hardware total
   hardwareTotal = Σ(item.quantity × item.unitPrice) for all hardware items

2. Calculate labor total
   laborTotal = Σ(item.quantity × dayWorkCost) for all labor items

3. Calculate subtotal
   subtotal = hardwareTotal + laborTotal

4. Apply markup
   customerPrice = subtotal × (1 + markupPercent / 100)

5. Add risk buffer
   withRisk = customerPrice × (1 + riskPercent / 100)

6. Add VAT (if applicable)
   finalTotal = withRisk × (1 + vatRate / 100)
```

### Currency Normalization

All prices are normalized to ILS for internal calculations:

```typescript
function normalizePriceToILS(
  price: number,
  currency: 'NIS' | 'USD' | 'EUR',
  usdRate: number,
  eurRate: number
): number {
  switch (currency) {
    case 'USD':
      return price * usdRate;
    case 'EUR':
      return price * eurRate;
    case 'NIS':
    default:
      return price;
  }
}
```

---

## Testing

### Test Coverage

The parser system has comprehensive test coverage:

- **Excel Parser**: 76+ tests
  - Column detection (English, Hebrew, mixed)
  - Price parsing (various formats)
  - Currency detection
  - Category normalization
  - Error handling
  - Edge cases (empty files, malformed data)

- **Document Parser**: 20+ tests
  - File type detection
  - Routing logic
  - Error handling
  - Method selection

- **PDF Parser**: 15+ tests (with known limitations)
  - Text extraction
  - Tabular detection
  - Pattern matching
  - Note: PDF tests require browser environment for pdf-parse

### Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test excelParser.test.ts
```

### Known Test Issues

**PDF Parser Tests**:
- PDF parsing tests may fail in some test environments
- Issue: `pdf-parse` requires browser-like environment
- Workaround: Tests are written but may need jsdom or puppeteer
- Real-world usage works correctly in browser

**Test Environment**:
```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom', // or 'happy-dom'
    setupFiles: ['./tests/setup.ts'],
  },
});
```

---

## Development Guidelines

### Adding New Parser

1. Create parser file in `/src/services/`
2. Implement function returning `AIExtractionResult`
3. Add to `documentParser.ts` routing logic
4. Write comprehensive tests
5. Update documentation

### Parser Function Signature

```typescript
export async function parseNewFormat(
  file: File
): Promise<AIExtractionResult> {
  try {
    // 1. Validate file type
    // 2. Read file content
    // 3. Extract data
    // 4. Transform to AIExtractedComponent[]
    // 5. Calculate confidence
    // 6. Return standardized result

    return {
      success: true,
      components: extractedComponents,
      metadata: {
        documentType: 'newformat',
        totalItems: extractedComponents.length,
      },
      confidence: averageConfidence,
    };
  } catch (error) {
    return {
      success: false,
      components: [],
      metadata: { documentType: 'newformat', totalItems: 0 },
      confidence: 0,
      error: error.message,
    };
  }
}
```

### Best Practices

1. **Always return standardized result**: Use `AIExtractionResult` type
2. **Calculate confidence scores**: Help users understand quality
3. **Provide detailed metadata**: Include extraction details
4. **Handle errors gracefully**: Return error in result, don't throw
5. **Test thoroughly**: Write tests for happy path and edge cases
6. **Document patterns**: Explain how your parser works

---

## API Integration

### Anthropic Claude API

**Setup**:

```bash
# .env.local
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Usage**:

```typescript
import { extractComponentsFromDocument } from './services/claudeAI';

const result = await extractComponentsFromDocument(imageFile);
```

**Rate Limits**:
- Tier 1: 50 requests/minute
- Tier 2: 1000 requests/minute
- Image size limit: 5MB (will be automatically resized)

**Cost Estimation**:
- Images (small): ~$0.01 per document
- Images (large): ~$0.05 per document
- Text only: ~$0.001 per document

---

## Troubleshooting

### Common Issues

**1. Excel Parser Returns Empty Results**
- Check if file has header row
- Verify column headers match patterns
- Test with sample data first

**2. PDF Parser Low Confidence**
- PDF may be image-based (scanned)
- Convert to image and use AI Vision
- Check if PDF has selectable text

**3. AI Vision API Errors**
- Verify API key is set correctly
- Check API key has sufficient credits
- Ensure image size < 5MB
- Check network connectivity

**4. Component Import Fails**
- Verify Supabase connection
- Check database schema matches types
- Ensure user has write permissions

### Debug Mode

Enable debug logging:

```typescript
// In any parser file
const DEBUG = true;

if (DEBUG) {
  console.log('Detected columns:', detectedColumns);
  console.log('Extracted components:', components);
}
```

---

## Performance Optimization

### File Processing Times

| File Type | Size | Typical Time | Max Recommended Size |
|-----------|------|--------------|---------------------|
| Excel     | 1MB  | 100-500ms   | 10MB |
| CSV       | 1MB  | 50-200ms    | 50MB |
| PDF       | 1MB  | 300-2000ms  | 5MB |
| Image     | 1MB  | 8-15s       | 5MB |

### Optimization Tips

1. **Excel**: Process first sheet only by default
2. **PDF**: Skip pages with no tabular data
3. **Images**: Resize before sending to API
4. **Batch**: Process multiple small files together

---

## Appendix

### File Type Detection

```typescript
// MIME types
const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const CSV_TYPES = [
  'text/csv',
  'application/csv',
];

const PDF_TYPES = [
  'application/pdf',
];

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
```

### Regex Patterns

**Price Patterns**:
```typescript
const PRICE_PATTERNS = [
  /\$\s*([0-9,]+\.?\d*)/g,           // $1,234.56
  /([0-9,]+\.?\d*)\s*USD/gi,         // 1234.56 USD
  /€\s*([0-9,]+\.?\d*)/g,            // €1,234.56
  /₪\s*([0-9,]+\.?\d*)/g,            // ₪1,234.56
];
```

**Part Number Patterns**:
```typescript
const PART_NUMBER_PATTERNS = [
  /P\/N[:\s]+([A-Z0-9-]+)/gi,        // P/N: ABC123
  /Part\s*#[:\s]+([A-Z0-9-]+)/gi,    // Part#: ABC123
  /מק"ט[:\s]+([A-Z0-9-]+)/gi,        // מק"ט: ABC123
];
```

---

## Version History

- **v1.0.0** (2024-01): Initial system implementation
- **v1.1.0** (2024-02): Added Excel parser with smart column detection
- **v1.2.0** (2024-02): Added PDF text extraction parser
- **v1.3.0** (2024-02): Unified document parser with automatic routing
- **v1.4.0** (2024-02): Comprehensive test coverage (76+ tests)

---

## Contributing

When adding new features to the parser system:

1. Follow existing patterns in `documentParser.ts`
2. Return `AIExtractionResult` structure
3. Write comprehensive tests
4. Update this documentation
5. Add examples to developer guide

## License

Proprietary - Internal Use Only
