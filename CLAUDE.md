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
9. [Multi-Currency System](#multi-currency-system)
10. [Testing](#testing)
11. [Documentation Guidelines](#documentation-guidelines)

---

## Documentation Guidelines

### Naming Convention

All documentation files should use **UPPERCASE** naming with standardized prefixes to ensure cohesiveness and easy scanning:

- **User Guides**: `GUIDE_` (e.g., `GUIDE_FILE_IMPORT.md`)
- **Developer Docs**: `DEV_`, `SETUP_`, `IMPL_` (e.g., `DEV_PARSERS_GUIDE.md`, `SETUP_TABLE_CONFIG.md`, `IMPL_ANALYTICS.md`)
- **Planning**: `PRD_`, `PLAN_` (e.g., `PRD_CORE_SYSTEM.md`, `PLAN_ASSEMBLIES.md`)
- **Reports**: `REPORT_`, `BUGFIX_`, `BACKLOG_` (e.g., `REPORT_TEST_SUMMARY.md`, `BUGFIX_AUTH_ERROR.md`)

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

| Format | Extensions              | Parser          | Speed         | Accuracy  | Cost     |
| ------ | ----------------------- | --------------- | ------------- | --------- | -------- |
| Excel  | .xlsx, .xls             | Native          | Very Fast     | High      | Free     |
| CSV    | .csv                    | Native          | Very Fast     | High      | Free     |
| PDF    | .pdf                    | Text Extraction | Fast          | Medium    | Free     |
| Images | .jpg, .png, .gif, .webp | AI Vision       | Slow (10-15s) | Very High | API Cost |

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

| Field        | Recognized Headers                                      |
| ------------ | ------------------------------------------------------- |
| Name         | name, שם, product, item, description, תיאור, פריט, מוצר |
| Manufacturer | manufacturer, יצרן, brand, supplier, ספק                |
| Part Number  | part number, קטלוגי, p/n, pn, מק"ט, catalog             |
| Price        | price, מחיר, unit price, cost, מחיר יחידה               |
| Category     | category, קטגוריה, type, סוג                            |
| Quantity     | quantity, כמות, qty, כמ                                 |

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

| Score Range | Label  | Meaning                     | Action                 |
| ----------- | ------ | --------------------------- | ---------------------- |
| 0.8 - 1.0   | High   | All required fields present | Auto-approve           |
| 0.6 - 0.79  | Medium | Most fields present         | Review recommended     |
| 0.0 - 0.59  | Low    | Missing critical data       | Manual review required |

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
  usdToIlsRate: number; // Exchange rate
  eurToIlsRate: number; // Exchange rate
  markupPercent: number; // Default markup
  dayWorkCost: number; // Labor cost per day
  profitPercent: number; // Target profit
  riskPercent: number; // Risk buffer
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

## Multi-Currency System

### Overview

The CPQ system supports multi-currency pricing (NIS/ILS, USD, EUR) with intelligent original currency tracking and dynamic exchange rate recalculation.

### Core Principles

1. **Original Currency Preservation**: Each component has an original currency that NEVER changes
2. **Dynamic Conversion**: Other currencies are calculated from the original using exchange rates
3. **Exchange Rate Flexibility**: Changing rates recalculates conversions while preserving originals
4. **Database Persistence**: Original currency and cost are stored in the database

### Currency Tracking Fields

#### Components Table

```sql
ALTER TABLE components
ADD COLUMN currency TEXT CHECK (currency IN ('NIS', 'USD', 'EUR')) DEFAULT 'NIS',
ADD COLUMN original_cost DECIMAL(12,2);
```

#### Quotation Items Table

```sql
ALTER TABLE quotation_items
ADD COLUMN original_currency TEXT CHECK (original_currency IN ('NIS', 'USD', 'EUR')),
ADD COLUMN original_cost DECIMAL(12,2);
```

### How Currency Tracking Works

#### 1. Component Level (Global Catalog)

**File**: `src/hooks/useComponents.ts`

Each component in the library stores:

- `currency`: The original currency (NIS, USD, or EUR)
- `originalCost`: The price in the original currency
- `unitCostNIS`, `unitCostUSD`, `unitCostEUR`: Converted prices

**Example**:

```typescript
// Component stored with USD as original currency
{
  name: "Siemens PLC S7-1500",
  currency: "USD",           // Original currency
  originalCost: 2500.00,     // Original price: $2,500
  unitCostUSD: 2500.00,      // Same as original
  unitCostNIS: 9250.00,      // Converted at rate 3.7
  unitCostEUR: 2200.00       // Converted via cross-rate
}
```

#### 2. Quotation Item Level (Local to Quotation)

**File**: `src/lib/utils.ts` (convertDbQuotationToQuotationProject)

When components are added to a quotation, they preserve original currency:

- `originalCurrency`: Copied from component's currency
- `originalCost`: Copied from component's originalCost
- Prices are stored in all three currencies

**Example**:

```typescript
// Quotation item maintains original currency
{
  componentName: "Siemens PLC S7-1500",
  originalCurrency: "USD",   // Preserved from component
  originalCost: 2500.00,     // Preserved from component
  unitPriceUSD: 2500.00,     // Original stays fixed
  unitPriceILS: 9250.00,     // Calculated with quotation's exchange rate
  quantity: 2
}
```

#### 3. Exchange Rate Changes

**File**: `src/components/quotations/QuotationEditor.tsx` (updateParameters)

When exchange rates change in a quotation:

1. System reads each item's `originalCurrency` and `originalCost`
2. Keeps the original currency value fixed
3. Recalculates other currencies using new rates

**Example**:

```typescript
// Initial state (USD/ILS = 3.7)
Item: $2,500 USD = ₪9,250 ILS

// User changes USD/ILS rate to 4.0
// After recalculation:
Item: $2,500 USD = ₪10,000 ILS  // USD stays fixed, ILS recalculated
```

### Currency Detection

**File**: `src/hooks/useComponents.ts` (dbToComponent function)

When loading components from the database, the system detects original currency:

```typescript
// 1. If DB has explicit currency tracking, use it
if (dbComp.currency && dbComp.original_cost) {
  currency = dbComp.currency;
  originalCost = dbComp.original_cost;
}

// 2. Otherwise, detect from price ratios
if (usd > 0 && ils > 0) {
  const ratio = ils / usd;
  if (ratio >= 3 && ratio <= 5) {
    // ILS looks like conversion from USD
    currency = 'USD';
    originalCost = usd;
  }
}
```

### Currency Conversion Functions

**File**: `src/utils/currencyConversion.ts`

#### convertToAllCurrencies

Converts a price from its original currency to all three currencies:

```typescript
convertToAllCurrencies(
  amount: number,           // Original price
  originalCurrency: Currency,  // 'NIS' | 'USD' | 'EUR'
  rates: ExchangeRates     // { usdToIlsRate, eurToIlsRate }
): CurrencyPrices
```

**Logic**:

```typescript
switch (originalCurrency) {
  case 'USD':
    unitCostUSD = amount; // Keep original
    unitCostNIS = amount * usdToIlsRate; // Convert to ILS
    unitCostEUR = amount * usdToEurRate; // Convert to EUR
    break;

  case 'EUR':
    unitCostEUR = amount; // Keep original
    unitCostNIS = amount * eurToIlsRate; // Convert to ILS
    unitCostUSD = amount / usdToEurRate; // Convert to USD
    break;

  case 'NIS':
    unitCostNIS = amount; // Keep original
    unitCostUSD = amount / usdToIlsRate; // Convert to USD
    unitCostEUR = amount / eurToIlsRate; // Convert to EUR
    break;
}
```

### Critical Implementation Details

#### Database Loading (src/lib/utils.ts lines 67-113)

When loading quotations from the database:

```typescript
// CRITICAL: Use original_currency and original_cost fields
const originalCurrency = dbItem.original_currency || 'NIS';
const originalCost = dbItem.original_cost || dbItem.unit_cost || 0;

// Convert from original currency to all currencies
if (originalCurrency === 'USD') {
  unitPriceUSD = originalCost; // Keep USD original
  unitPriceILS = originalCost * usdRate; // Convert to ILS
} else if (originalCurrency === 'EUR') {
  unitPriceEUR = originalCost; // Keep EUR original
  unitPriceILS = originalCost * eurRate; // Convert to ILS
} else {
  unitPriceILS = originalCost; // Keep ILS original
  unitPriceUSD = originalCost / usdRate; // Convert to USD
}

// CRITICAL: Preserve original currency and cost in QuotationItem
items.push({
  // ... other fields ...
  unitPriceUSD,
  unitPriceILS,
  originalCurrency: originalCurrency, // Must be included!
  originalCost: originalCost, // Must be included!
  // ... rest of fields ...
});
```

**Why This Matters**:

- Without `originalCurrency` and `originalCost` in the QuotationItem object, exchange rate recalculation won't know which currency to preserve
- This was a critical bug that caused all USD prices to change when USD/ILS rate changed

#### Exchange Rate Recalculation (QuotationEditor.tsx lines 575-607)

When user changes exchange rates:

```typescript
const updateParameters = useCallback(
  parameters => {
    // Check if exchange rates changed
    const ratesChanged =
      parameters.usdToIlsRate !== currentQuotation.parameters.usdToIlsRate ||
      parameters.eurToIlsRate !== currentQuotation.parameters.eurToIlsRate;

    if (ratesChanged) {
      // Recalculate each item's prices with new exchange rates
      updatedItems = currentQuotation.items.map(item => {
        // Use stored original currency (CRITICAL!)
        const originalCurrency = item.originalCurrency || 'NIS';
        const originalAmount = item.originalCost || 0;

        // Convert from ORIGINAL currency with new rates
        const convertedPrices = convertToAllCurrencies(
          originalAmount,
          originalCurrency,
          newRates
        );

        return {
          ...item,
          unitPriceILS: convertedPrices.unitCostNIS,
          unitPriceUSD: convertedPrices.unitCostUSD,
          unitPriceEUR: convertedPrices.unitCostEUR,
          // Totals also recalculated
          totalPriceILS: convertedPrices.unitCostNIS * item.quantity,
          totalPriceUSD: convertedPrices.unitCostUSD * item.quantity,
        };
      });
    }
  },
  [currentQuotation, setCurrentQuotation, updateQuotation]
);
```

### Common Bugs and Fixes

#### Bug #1: Currency Data Lost on Reload

**Symptom**: Quotation loads with wrong currencies after page refresh

**Root Cause**: `convertDbQuotationToQuotationProject` wasn't using `original_currency` and `original_cost` from database

**Fix**: Modified `src/lib/utils.ts` lines 67-87 to read and use these fields

**Files Changed**:

- `src/lib/utils.ts`: Read `original_currency` and `original_cost` from DB
- Database: Added currency tracking columns to `components` and `quotation_items` tables

#### Bug #2: Exchange Rate Changes Affect Original Prices

**Symptom**: Changing USD/ILS rate from 4.6 to 5.0 changes USD prices (they should stay fixed)

**Root Cause**: `convertDbQuotationToQuotationProject` didn't set `originalCurrency` and `originalCost` fields in the returned QuotationItem objects

**Fix**: Modified `src/lib/utils.ts` lines 108-110 to include these fields

**Before Fix**:

```typescript
items.push({
  unitPriceUSD,
  unitPriceILS,
  // originalCurrency and originalCost missing!
});
```

**After Fix**:

```typescript
items.push({
  unitPriceUSD,
  unitPriceILS,
  originalCurrency: originalCurrency, // Added
  originalCost: originalCost, // Added
});
```

### Testing Currency Conversion

**Test File**: `src/utils/__tests__/currencyConversion.test.ts`

```typescript
describe('convertToAllCurrencies', () => {
  it('preserves USD when converting from USD', () => {
    const result = convertToAllCurrencies(100, 'USD', {
      usdToIlsRate: 3.7,
      eurToIlsRate: 4.0,
    });

    expect(result.unitCostUSD).toBe(100); // Original preserved
    expect(result.unitCostNIS).toBe(370); // Converted
  });
});
```

### Migration Scripts

#### Add Currency Tracking to Components

```sql
-- scripts/add-component-currency-tracking.sql
ALTER TABLE components
ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('NIS', 'USD', 'EUR')) DEFAULT 'NIS';

ALTER TABLE components
ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2);

-- Detect currency from existing price ratios
UPDATE components
SET currency = CASE
  WHEN unit_cost_usd > 0 AND unit_cost_ils > 0
   AND (unit_cost_ils / unit_cost_usd) BETWEEN 3 AND 5
  THEN 'USD'
  WHEN unit_cost_eur > 0 AND unit_cost_ils > 0
   AND (unit_cost_ils / unit_cost_eur) BETWEEN 3.5 AND 5
  THEN 'EUR'
  ELSE 'NIS'
END;
```

#### Add Currency Tracking to Quotation Items

```sql
-- scripts/add-currency-tracking.sql
ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS original_currency TEXT CHECK (original_currency IN ('NIS', 'USD', 'EUR'));

ALTER TABLE quotation_items
ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2);
```

### Best Practices

1. **Always Set Original Currency**: When creating components or quotation items, always set `currency` and `originalCost`

2. **Never Modify Original Values**: Original currency and cost should only change when user explicitly edits the component

3. **Use Conversion Functions**: Always use `convertToAllCurrencies` for conversions, never calculate manually

4. **Preserve on Database Save**: When saving to database, include `original_currency` and `original_cost`

5. **Test Exchange Rate Changes**: After any currency-related changes, test that changing exchange rates preserves original prices

### Architecture Summary

```
Component Library (Global)
├── Component 1: USD original ($2,500)
│   ├── unitCostUSD: $2,500 (original)
│   ├── unitCostNIS: ₪9,250 (converted)
│   └── unitCostEUR: €2,200 (converted)
│
Quotation (Local)
├── Parameters
│   ├── usdToIlsRate: 3.7
│   └── eurToIlsRate: 4.0
│
├── Item 1 (from Component 1)
│   ├── originalCurrency: "USD"
│   ├── originalCost: 2500
│   ├── unitPriceUSD: $2,500 (stays fixed)
│   ├── unitPriceILS: ₪9,250 (recalculated on rate change)
│   └── quantity: 2
│
└── [User changes usdToIlsRate to 4.0]
    └── Item 1 recalculated:
        ├── originalCurrency: "USD" (unchanged)
        ├── originalCost: 2500 (unchanged)
        ├── unitPriceUSD: $2,500 (STAYS FIXED ✓)
        └── unitPriceILS: ₪10,000 (RECALCULATED ✓)
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
export async function parseNewFormat(file: File): Promise<AIExtractionResult> {
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
| --------- | ---- | ------------ | -------------------- |
| Excel     | 1MB  | 100-500ms    | 10MB                 |
| CSV       | 1MB  | 50-200ms     | 50MB                 |
| PDF       | 1MB  | 300-2000ms   | 5MB                  |
| Image     | 1MB  | 8-15s        | 5MB                  |

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

const CSV_TYPES = ['text/csv', 'application/csv'];

const PDF_TYPES = ['application/pdf'];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
```

### Regex Patterns

**Price Patterns**:

```typescript
const PRICE_PATTERNS = [
  /\$\s*([0-9,]+\.?\d*)/g, // $1,234.56
  /([0-9,]+\.?\d*)\s*USD/gi, // 1234.56 USD
  /€\s*([0-9,]+\.?\d*)/g, // €1,234.56
  /₪\s*([0-9,]+\.?\d*)/g, // ₪1,234.56
];
```

**Part Number Patterns**:

```typescript
const PART_NUMBER_PATTERNS = [
  /P\/N[:\s]+([A-Z0-9-]+)/gi, // P/N: ABC123
  /Part\s*#[:\s]+([A-Z0-9-]+)/gi, // Part#: ABC123
  /מק"ט[:\s]+([A-Z0-9-]+)/gi, // מק"ט: ABC123
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
