import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import type { Component, ExtractedItem } from '../types';
import { getComponentCategories } from '../constants/settings';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { loadSetting } from '@/services/settingsService';
import {
  isTavilyAvailable,
  identifyComponent,
  type ComponentSearchResult,
} from '@/services/tavilySearch';

// Initialize Anthropic client with dynamic API key loading
let anthropic: Anthropic | null = null;
let currentApiKey: string | null = null;

/**
 * Initialize or reinitialize Anthropic client
 * Can be called on app start or when API key changes
 */
async function initializeAnthropicClient(): Promise<void> {
  try {
    // Try to load from settings first
    const settingsResult = await loadSetting<{ apiKey: string }>(
      'anthropicApiKey'
    );

    if (settingsResult.success && settingsResult.data?.apiKey) {
      currentApiKey = settingsResult.data.apiKey;
      logger.info('Loaded Anthropic API key from settings');
    } else {
      // Fallback to environment variable
      currentApiKey = config.anthropic.apiKey;
      if (currentApiKey) {
        logger.info('Using Anthropic API key from environment');
      }
    }

    if (currentApiKey) {
      anthropic = new Anthropic({
        apiKey: currentApiKey,
        dangerouslyAllowBrowser: true, // Only for development - move to backend in production
      });
      logger.info(
        'Anthropic client initialized - AI Vision features available'
      );
    } else {
      anthropic = null;
      logger.warn(
        'Anthropic API key not configured - AI Vision features disabled'
      );
      logger.warn(
        'Configure in Settings or set VITE_ANTHROPIC_API_KEY in .env.local'
      );
    }
  } catch (error) {
    logger.error('Error initializing Anthropic client:', error);
    anthropic = null;
  }
}

// Initialize on module load
initializeAnthropicClient();

// Listen for API key updates from settings
if (typeof window !== 'undefined') {
  window.addEventListener('cpq-api-key-updated', () => {
    logger.info('API key updated, reinitializing Anthropic client');
    initializeAnthropicClient();
  });
}

/**
 * Get current Anthropic client instance
 * Returns null if not initialized
 */
export function getAnthropicClient(): Anthropic | null {
  return anthropic;
}

// Price column data from extraction
export interface PriceColumn {
  columnName: string; // Original column header name
  value: number | undefined; // Price value
  currency: 'NIS' | 'USD' | 'EUR'; // Currency detected
}

// Response type from Claude
export interface AIExtractedComponent extends ExtractedItem {
  category?: string;
  supplier?: string;
  unitPriceNIS?: number;
  unitPriceUSD?: number;
  unitPriceEUR?: number;
  currency?: 'NIS' | 'USD' | 'EUR';
  msrpPrice?: number; // MSRP list price (for distributed components)
  msrpCurrency?: 'NIS' | 'USD' | 'EUR'; // Currency of MSRP price
  partnerDiscountPercent?: number; // Partner discount % (for historical tracking)
  componentType?: 'hardware' | 'software' | 'labor';
  laborSubtype?:
    | 'engineering'
    | 'commissioning'
    | 'installation'
    | 'programming';
  quoteDate?: string;
  notes?: string;
  // Multi-column price extraction (for user column selection)
  allPriceColumns?: PriceColumn[]; // All price columns found in the row
  // RTL safeguard: flag for potential RTL text direction issues
  potentialRTLIssue?: boolean;
  rtlIssueReason?: string;
}

// Warning for extraction issues
export interface ExtractionWarning {
  type:
    | 'rtl_document'
    | 'potential_reversal'
    | 'low_confidence'
    | 'missing_data';
  message: string;
  componentIndex?: number; // Which component this warning applies to (undefined = all)
  severity: 'info' | 'warning' | 'error';
}

export interface AIExtractionResult {
  success: boolean;
  components: AIExtractedComponent[];
  metadata: {
    documentType: string;
    supplier?: string;
    quoteDate?: string;
    currency?: string;
    totalItems: number;
    // RTL document detection
    isRTLDocument?: boolean;
    // Excel-specific metadata
    sheetName?: string;
    rowCount?: number;
    columnHeaders?: string[];
    detectedColumns?: Record<string, number>;
    sheetsProcessed?: number;
    // PDF-specific metadata
    pageCount?: number;
    textLength?: number;
    extractionMethod?: 'text' | 'structured';
    hasTabularData?: boolean;
  };
  confidence: number;
  rawResponse?: string;
  error?: string;
  // RTL safeguard: warnings for user review
  warnings?: ExtractionWarning[];
}

/**
 * Convert file to base64 for Claude Vision API
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Determine media type from file
 */
function getMediaType(
  file: File
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' {
  const type = file.type;

  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/gif') return 'image/gif';
  if (type === 'image/webp') return 'image/webp';
  if (type === 'application/pdf') return 'application/pdf';

  // Default to png for unknown image types
  return 'image/png';
}

/**
 * Check if file is an Excel/CSV file
 */
function isExcelFile(file: File): boolean {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  return (
    fileType.includes('excel') ||
    fileType.includes('spreadsheet') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.csv') ||
    fileType === 'text/csv' ||
    fileType === 'application/csv'
  );
}

/**
 * Convert Excel file to text representation for Claude
 */
async function excelToText(file: File): Promise<string> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No sheets found in the Excel file');
    }

    let textRepresentation = `Excel File: ${file.name}\n`;
    textRepresentation += `Total Sheets: ${workbook.SheetNames.length}\n\n`;

    // Process first sheet (or all sheets if needed)
    for (let i = 0; i < Math.min(3, workbook.SheetNames.length); i++) {
      const sheetName = workbook.SheetNames[i];
      const worksheet = workbook.Sheets[sheetName];

      textRepresentation += `=== Sheet ${i + 1}: ${sheetName} ===\n`;

      // Convert sheet to CSV format (preserves table structure)
      const csv = XLSX.utils.sheet_to_csv(worksheet, {
        forceQuotes: false,
        blankrows: false,
      });

      textRepresentation += csv + '\n\n';
    }

    return textRepresentation;
  } catch (error) {
    logger.error('Error converting Excel to text:', error);
    throw new Error(
      `Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Column header extraction options
 */
export interface ColumnExtractionOptions {
  partnerPriceColumn?: string; // Selected partner price column
  msrpColumn?: string; // Selected MSRP column
}

/**
 * Column header extraction result
 */
export interface ColumnHeadersResult {
  success: boolean;
  columnHeaders: string[];
  documentType?: 'quotation' | 'price_list' | 'invoice' | 'catalog' | 'unknown';
  metadata?: {
    supplier?: string;
    quoteDate?: string;
    currency?: string;
  };
  error?: string;
}

/**
 * Create a lightweight prompt for extracting just column headers
 */
function createHeaderExtractionPrompt(): string {
  return `You are analyzing a price list or quotation document. Extract ONLY the column headers.

Your task:
1. Identify ALL column headers from the table(s) in this document
2. **CRITICAL**: Extract ALL price column variations (e.g., "Unit Price Camera+SDK", "Unit Price Camera+Vision", "MSRP Camera+SDK", etc.)
3. Return the exact column header text as it appears in the document
4. Preserve the exact wording, including model variations, package names, and configuration options
5. Include metadata about the document

**Response format:**
Return a valid JSON object with this exact structure:

{
  "documentType": "quotation" | "price_list" | "invoice" | "catalog" | "unknown",
  "metadata": {
    "supplier": "supplier name if found",
    "quoteDate": "date if found (YYYY-MM-DD format)",
    "currency": "primary currency in document"
  },
  "columnHeaders": [
    "Product Name",
    "Part Number",
    "Unit Price (USD) Camera+SDK",
    "Unit Price (USD) Camera+Vision+Viz",
    "MSRP (USD) Camera+SDK",
    "MSRP (USD) Camera+Vision+Viz",
    "Quantity"
  ]
}

**Important:**
- Extract EVERY column header you find, especially all price column variations
- Use the exact text from the headers
- If headers are in Hebrew, keep them in Hebrew
- If headers are in English, keep them in English
- Include ALL price columns, even if there are 5+ columns

Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.`;
}

/**
 * Create the extraction prompt for Claude
 * @param columnOptions - Optional column selection options
 * @param teamId - Optional team ID for team-scoped categories
 */
function createExtractionPrompt(
  columnOptions?: ColumnExtractionOptions,
  teamId?: string
): string {
  const categories = getComponentCategories(teamId);
  const categoryList = categories.map(cat => `   - "${cat}"`).join('\n');

  // Build column-specific instructions if options are provided
  let columnInstructions = '';
  if (columnOptions?.partnerPriceColumn || columnOptions?.msrpColumn) {
    columnInstructions = `

**CRITICAL - Column Selection:**
The user has specified which price columns to extract:`;

    if (columnOptions.partnerPriceColumn) {
      columnInstructions += `
- **Partner Price Column:** Extract prices from the column named "${columnOptions.partnerPriceColumn}"
  - Use this column for unitPriceUSD/NIS/EUR fields
  - This is the partner/distributor cost price`;
    }

    if (columnOptions.msrpColumn) {
      columnInstructions += `
- **MSRP Column:** Extract prices from the column named "${columnOptions.msrpColumn}"
  - Use this column for msrpPrice field
  - This is the manufacturer's suggested retail price`;
    }

    columnInstructions += `

**DO NOT extract from other price columns** - only use the columns specified above.
`;
  }

  return `You are a data extraction specialist for supplier quotations and price lists.${columnInstructions}

<extraction_workflow>
  <step_1>COLUMN MAPPING - Identify all column headers and map them to fields</step_1>
  <step_2>SUPPLIER/MANUFACTURER - Determine who is the supplier vs manufacturer</step_2>
  <step_3>EXTRACT - Extract data row by row using the mapping</step_3>
  <step_4>VALIDATE - Check manufacturerPN vs name separation, Hebrew name quality</step_4>
</extraction_workflow>

<critical_constraints>
  <constraint_0>
    ⚠️ PART NUMBERS — COPY EXACTLY, CHARACTER BY CHARACTER:
    Part numbers (מק"ט) are LTR strings. Copy them EXACTLY as you visually read them
    in the cell — left to right, every character, in exact order.

    ABSOLUTE RULES — NO EXCEPTIONS:
    1. NEVER truncate: if you see "2240.KD.00" output "2240.KD.00" — NOT "KD2240"
    2. NEVER move letters before numbers: if digits come first, keep digits first
    3. NEVER strip dots: the dots in "2240.KD.00" are part of the value
    4. NEVER duplicate characters: "5822.32S" stays "5822.32S" — not "S5822.32S"

    WRONG → CORRECT examples:
    "KD2240"    → "2240.KD.00"  (truncated AND reordered — both errors)
    "KT2240"    → "2240.KT.10"  (same)
    "S5822.32S" → "5822.32S"    (duplicated leading character)

    COLUMN BOUNDARY — DO NOT BLEED FROM ADJACENT COLUMNS:
    - The PN cell contains ONLY the part number
    - If adjacent description/model text appears to touch the PN cell, take ONLY the PN value
    - Example: seeing "OPTYMA32-S5822.32S" where "OPTYMA32-S" is the product model →
      extract only "5822.32S"

    ROW ALIGNMENT — CRITICAL FOR RTL TABLES:
    - Match each cell to its SAME row — do not pick part numbers from adjacent rows

    DOCUMENT DIRECTION DETECTION:
    - Set isRTLDocument: true if document contains Hebrew (עברית) or Arabic (عربي)
    - Set isRTLDocument: false for English/European documents
  </constraint_0>

  <constraint_1>
    ⚠️ PART NUMBER vs PRODUCT NAME - COLUMN IDENTIFICATION

    PART NUMBER COLUMN HEADERS (priority order):
    1. מק"ט, מקט, קטלוגי, מספר קטלוגי, P/N, PN, Part#, Part Number, Cat No, Catalog#
    2. מקט ללקוח, Customer P/N (use ONLY if no other P/N column exists)

    PRODUCT NAME COLUMN HEADERS:
    שם פריט, תאור מוצר, פריט, תאור, Description, Product, Item, Model

    ⚠️ WHAT IS A VALID PART NUMBER:
    - Typically 5-15 characters
    - Can start with digits, letters, or dots — all are valid
    - Examples: "1404187", "DVP14SS211R", "750-362", "6ES7214-1AG40-0XB0", "2240.KD.00", "5822.32S"

    ⚠️ WHAT IS NOT A VALID PART NUMBER (use as name instead):
    - Cable specifications like "AI 0,75-8 BU" (wire type + gauge + conductors + color)
    - Generic descriptions like "כבל", "מחבר", "ספק כוח"
    - Specifications like "24V 5A", "M12 8-pin"
    - Color codes alone like "BU", "GN/YE", "RD"
    - Wire gauges like "0,75", "1,5", "2,5"

    EXTRACTION RULES:
    1. First, identify columns by their HEADERS - look for מק"ט, P/N, Part#, etc.
    2. If a clear P/N column exists → use its value for manufacturerPN
    3. If NO clear P/N column exists → leave manufacturerPN EMPTY (do not guess)
    4. manufacturerPN can be numeric ("1404187") OR alphanumeric ("DVP14SS211R")
    5. Cable specs like "AI 0,75-8 BU" go in NAME, not manufacturerPN
    6. If product name is a model code and you know what it is → create descriptive Hebrew name
    7. If product name is a model code and you DON'T know → use as-is (system will search later)

    EXAMPLE:
    | מק"ט        | שם פריט              | manufacturerPN  | name                    |
    |-------------|---------------------|-----------------|-------------------------|
    | 1404187     | SAC-8P-1,5-PUR/M8FS | 1404187         | כבל חיישן M8 (if known) |
    | DVP14SS211R | בקר PLC 14 נקודות    | DVP14SS211R     | בקר PLC 14 נקודות        |
    | 3003023     | UK 5 N              | 3003023         | UK 5 N (if unknown)     |

    EXAMPLE - NO P/N COLUMN (only product names):
    | שם פריט              | manufacturerPN  | name                    |
    |---------------------|-----------------|-------------------------|
    | AI 0,75-8 BU        | (empty)         | כבל AI 0,75-8 BU        |
    | ספק כוח 24V          | (empty)         | ספק כוח 24V              |
  </constraint_1>

  <constraint_2>
    ⚠️ SUPPLIER vs MANUFACTURER vs CUSTOMER:
    - SUPPLIER = company sending the quote (from header/logo, NOT "לכבוד:" field)
    - MANUFACTURER = product manufacturer (from "יצרן"/"Manuf" column in table)
    - CUSTOMER = recipient of quote (usually "רדיון חברה להנדסה" in "לכבוד:" field)
    - ❌ NEVER use "רדיון חברה להנדסה" as supplier - it's the customer!
  </constraint_2>

  <constraint_3>
    ⚠️ NAME FIELD RULES:
    - Must be descriptive Hebrew (2-5 words)
    - NO manufacturer part numbers in name
    - NO manufacturer names in name
    - Focus on WHAT the product is, not ALL the specs
    - Put detailed specs in notes field, NOT in name
    - Examples:
      * "ספק כוח 24V 20 אמפר" ✅
      * "דופן למהדק" ✅
      * "כבל M12 אורך 10 מטר" ✅
      * "בקר PLC עם תקשורת" ✅
      * "PS-EE-2G/1 ספק כוח" ❌ (contains part number)
      * "Phoenix Contact ספק כוח" ❌ (contains manufacturer)
      * "ספק כוח חד פאזי 20 אמפר יציאה 24 וולט DC עם הגנות" ❌ (too detailed - move to notes)
  </constraint_3>

  <constraint_4>
    ⚠️ PRICE DETECTION:
    - Use unit price BEFORE VAT/מע"מ
    - Look for: "מחיר ליחידה", "Unit Price", "מחיר יח", "Price", "מחיר"
    - Ignore: "סה"כ", "Total", "מחיר כולל מע"מ", "Total Line"
    - If document has מע"מ calculation, use the price BEFORE it
    - Recognize various formats: "$1,234.56", "1234.56 USD", "₪5,000", "5000 ש״ח", "5,000.00 €"
  </constraint_4>
</critical_constraints>

<hebrew_terminology>
  Common Hebrew terms you'll encounter:
  - מחיר / מחיר ליחידה / מחיר יח = price / unit price
  - יצרן = manufacturer
  - ספק = supplier
  - מק"ט / קטלוגי / מספר קטלוגי = catalog number / part number
  - שם פריט / תאור מוצר = item name / product description
  - תאור / תאור בעברית = description
  - כמות = quantity (ignore - not needed)
  - מע"מ = VAT
  - סה"כ = total
  - הנחה = discount
</hebrew_terminology>

<column_mapping_logic>
  <hebrew_documents>
    Common patterns:
    - מק"ט / מקט / קטלוגי / מספר קטלוגי / Cat No → manufacturerPN (PRIORITY 1)
    - מק"ט ללקוח / מקט לקוח → manufacturerPN (ONLY if no other P/N column exists)
    - שם פריט / תאור מוצר / פריט → base for name (create descriptive Hebrew or use as-is if unknown)
    - תאור / תאור בעברית / תיאור / תאור מלא → description
    - יצרן → manufacturer
    - ספק → usually supplier (but verify context)
    - מחיר ליחידה / מחיר יח / מחיר → unitPrice (pre-VAT)
    - מחיר כולל מע"מ → ignore (post-VAT)
  </hebrew_documents>

  <english_documents>
    Common patterns:
    - P/N / PN / Part# / Part Number / Catalog# / Cat No → manufacturerPN (PRIORITY 1)
    - Customer P/N → manufacturerPN (ONLY if no other P/N column exists)
    - Description / Product / Item → base for name
    - Manuf / Manufacturer → manufacturer
    - Unit Price / Price / Cost → unitPrice
    - MSRP / List Price / Retail / RRP → msrpPrice
  </english_documents>

  <mixed_documents>
    - Use table headers to understand column meanings
    - If P/N and שם פריט both exist, use P/N for manufacturerPN
    - If מק"ט and שם פריט both exist, use מק"ט for manufacturerPN
    - Handle merged cells and multi-line descriptions
    - Extract ALL items, even if some fields are missing
  </mixed_documents>
</column_mapping_logic>

<field_extraction_rules>
  <name>
    - Create concise Hebrew description (2-5 words)
    - If source is English: translate product type + keep key identifiers
    - DO NOT include manufacturer name
    - DO NOT include full part number
    - DO include: product type, key specs (voltage, size, length)
    - Put detailed specifications in notes, NOT here
    - Examples:
      * English "Dobot CRA20 Collaborative Robot" → "רובוט שיתופי CRA20"
      * Hebrew "ספק כוח חד פאזי 20 אמפר יציאה 24 וולט PS-EE-2G/1" → "ספק כוח 24V 20 אמפר"
      * English "WAGO Fieldbus Coupler Modbus TCP 750-362" → "בקר Modbus TCP"
      * Hebrew "צינור שרשורי פוליאמיד 17 ממ F-17PAREB" → "צינור שרשורי 17 ממ"
      * English "SMC Pneumatic Cylinder CDQ2B32-50DCZ" → "צילינדר פנאומטי"
  </name>

  <description>
    - 1-3 sentences, more detailed than name
    - Extract from description/תאור/תאור בעברית column if exists
    - Include key features and technical specifications
    - If no description column, create brief description from available data
    - Can be null if no meaningful description possible
  </description>

  <manufacturer>
    - Extract from "יצרן"/"Manuf"/"Manufacturer" column in table
    - Clean up: "פניקס קונטקט ישראל" → "Phoenix Contact"
    - If no column exists, check product description or notes
    - Can be null if not found
    - Examples: WAGO, Phoenix Contact, Festo, SMC, Siemens, METE, DELTA
  </manufacturer>

  <manufacturerPN>
    - ONLY extract from a dedicated P/N column (מק"ט, P/N, Part#, Catalog#, Cat No)
    - Hebrew docs with מק"ט + שם פריט columns: use מק"ט value
    - English docs: use P/N/Part Number column
    - Can be numeric ("1234308", "3003023") or alphanumeric ("750-362", "PS-EE-2G/1", "SAC-8P-1,5-PUR/M8FS")
    - ❌ If NO P/N column exists → leave EMPTY (do not use product name/description)
    - ❌ Never use cable specs as P/N: "AI 0,75-8 BU", "H07V-K 1,5"
    - ❌ Never use generic names as P/N: "כבל", "מחבר", "ספק כוח"
    - ❌ Never use שם פריט column value when there's no מק"ט column
    - ❌ Never use "מקט ללקוח"/"Customer P/N" unless it's the ONLY P/N column
  </manufacturerPN>

  <category>
    - MUST be one of these exact Hebrew values:
${categoryList}
    - Use "אחר" if none fit
    - Be intelligent about categorization based on product description
  </category>

  <componentType>
    - "hardware": physical components (PLCs, sensors, cables, robots, pneumatics, power supplies)
    - "software": licenses, applications, configuration tools
    - "labor": services (engineering, installation, commissioning, programming)
  </componentType>

  <laborSubtype>
    Only if componentType = "labor":
    - "engineering": engineering design, system design (הנדסה, תכנון)
    - "commissioning": system commissioning, testing, startup (הפעלה, בדיקות)
    - "installation": physical installation work (התקנה)
    - "programming": PLC programming, robot programming (תכנות)
  </laborSubtype>

  <supplier>
    - Extract from document header/logo (top of page)
    - NOT from "לכבוד:"/"To:" field (that's the customer!)
    - Look for company name, address, phone at document top
    - Common suppliers: קומטל, פניקס קונטקט ישראל, פסטו ישראל, אילן את גביש, אוטומציה ירוחם, טכנו-בורג, אלקם
    - ❌ "רדיון חברה להנדסה" is NEVER the supplier (it's the customer)
  </supplier>

  <unitPrice_currency>
    - Find unit price column: "מחיר ליחידה", "Unit Price", "Price", "מחיר"
    - Use price BEFORE VAT/מע"מ
    - If only post-VAT price exists, reverse calculate (divide by 1.18 for 18% VAT)
    - Recognize formats: "$1,234.56", "1234.56 USD", "₪5,000", "5000 ש״ח", "5,000.00 €"
    - Currency detection:
      * ₪ / NIS / ILS / ש"ח / שקלים → NIS
      * $ / USD → USD
      * € / EUR / Eur → EUR
    - Populate unitPriceNIS, unitPriceUSD, or unitPriceEUR based on currency
  </unitPrice_currency>

  <msrp_logic>
    - Only populate if document has TWO+ price columns (partner + MSRP)
    - MSRP indicators: "MSRP", "List Price", "Retail", "RRP", "מחיר מחירון", "מחיר קטלוגי"
    - Partner price indicators: "Partner", "Your Price", "Net", "Cost", "מחיר שותף"
    - Logic: Put LOWER price in unitPrice, HIGHER price in msrpPrice
    - If only ONE price column exists, leave msrpPrice null
  </msrp_logic>

  <allPriceColumns>
    - Extract EVERY price column found in the row
    - Format: [{ columnName: "column header", value: number, currency: "NIS"|"USD"|"EUR" }]
    - This allows user to select which price to use in UI
    - Include ALL price columns, even if 5+ exist
  </allPriceColumns>

  <notes>
    - Extract from notes/remarks/specifications columns
    - Include detailed technical specs that don't fit in name
    - Include any important information about lead time, MOQ, special conditions
    - Can be null if no additional information
  </notes>

  <confidence>
    - Self-assessment of extraction accuracy (0.0 to 1.0)
    - Lower confidence if: missing fields, unclear columns, ambiguous data
    - Higher confidence if: clear structure, all fields present, standard format
  </confidence>
</field_extraction_rules>

<output_format>
{
  "documentType": "quotation" | "price_list" | "catalog" | "unknown",
  "metadata": {
    "supplier": "supplier name from header",
    "quoteDate": "YYYY-MM-DD or null",
    "currency": "primary currency",
    "totalItems": number,
    "columnHeaders": ["array of ALL column names found in document"],
    "isRTLDocument": true | false
  },
  "components": [
    {
      "name": "Hebrew descriptive name (2-5 words, NO part numbers, NO manufacturer names)",
      "description": "Brief description or null",
      "manufacturer": "Manufacturer name or null",
      "manufacturerPN": "Part number or null",
      "category": "Exact Hebrew category from list or null",
      "componentType": "hardware" | "software" | "labor",
      "laborSubtype": "engineering" | "commissioning" | "installation" | "programming" | null,
      "supplier": "Supplier from document header or null",
      "unitPriceNIS": number or null,
      "unitPriceUSD": number or null,
      "unitPriceEUR": number or null,
      "currency": "NIS" | "USD" | "EUR" | null,
      "msrpPrice": number or null,
      "msrpCurrency": "NIS" | "USD" | "EUR" | null,
      "allPriceColumns": [
        { "columnName": "Unit Price", "value": 100.00, "currency": "NIS" }
      ],
      "quoteDate": "YYYY-MM-DD or null",
      "notes": "Technical specs, remarks or null",
      "confidence": 0.0 to 1.0
    }
  ]
}
</output_format>

<critical_reminders>
1. מק"ט ≠ שם פריט - they are DIFFERENT columns in Hebrew documents!
2. Supplier = document header/logo, NOT "לכבוד:" field
3. Name = descriptive Hebrew (2-5 words) WITHOUT part numbers or manufacturer names
4. רדיון חברה להנדסה = customer, NEVER supplier
5. Use prices BEFORE VAT/מע"מ
6. Category must be from predefined list only
7. Put detailed specs in notes field, NOT in name
8. Extract ALL items, even if some fields are missing
9. Handle merged cells, multi-line descriptions, and complex layouts
10. NO quantity field needed - focus on unit price only
11. ⚠️ PART NUMBERS: Extract EXACTLY as visually shown - do NOT reorder, reverse, or modify characters
</critical_reminders>

Respond ONLY with valid JSON. No markdown, no explanations.`;
}

// Color words that typically appear at the END of part numbers (for cables, wires, etc.)
const COLOR_SUFFIXES = [
  'BLACK',
  'BLUE',
  'RED',
  'WHITE',
  'YELLOW',
  'GREEN',
  'ORANGE',
  'BROWN',
  'GRAY',
  'GREY',
  'BK',
  'BL',
  'RD',
  'WH',
  'YE',
  'GN',
  'OR',
  'BR',
  'GY',
];

/**
 * RTL Safeguard: Detect potentially suspicious part number patterns using GENERAL heuristics
 * Returns null if no issues detected, or a reason string if suspicious
 * NOTE: This is for flagging only - auto-correction is handled by autoCorrectRTLPartNumber()
 */
function detectPotentialRTLIssue(
  partNumber: string | undefined
): string | null {
  if (!partNumber || partNumber.length < 3) return null;

  const pn = partNumber.trim().toUpperCase();
  const pnOriginal = partNumber.trim();

  // Pattern 1: Color word at START (should typically be at END)
  for (const color of COLOR_SUFFIXES) {
    if (pn.startsWith(color) && pn.length > color.length) {
      const afterColor = pn.slice(color.length);
      if (/^\d/.test(afterColor)) {
        return `Color "${color}" at start - usually appears at end`;
      }
    }
  }

  // Pattern 2: Two parts where SHORT part comes FIRST
  // e.g., "SI 25VSBM" - short "SI" before longer model code suggests reversal
  if (pnOriginal.includes(' ')) {
    const parts = pnOriginal.split(/\s+/);
    if (parts.length === 2) {
      const [first, second] = parts;
      if (first.length <= 3 && second.length > first.length) {
        // Check if second part has numbers before letters (also reversed internally)
        if (/^\d+[A-Z]+$/i.test(second)) {
          return `Short code "${first}" before model "${second}" - likely reversed`;
        }
      }
    }
  }

  // Pattern 3: Starts with fraction (fractions usually come after model number)
  if (/^[\d]\/[\d]/.test(pnOriginal)) {
    return `Starts with fraction - usually comes after model number`;
  }

  // Pattern 4: Fraction specs before model number
  const fractionThenNumberPattern = /^[\d/\s-]+\s+(\d{3,})$/;
  const fractionMatch = pnOriginal.match(fractionThenNumberPattern);
  if (fractionMatch) {
    return `Model "${fractionMatch[1]}" at end - should likely be at start`;
  }

  // Pattern 5: Pure NUMBERS+LETTERS (no space) - might be reversed
  // e.g., "25VSBM" should be "VSBM25"
  if (/^\d{2,4}[A-Z]{2,5}$/i.test(pnOriginal)) {
    return `Numbers before letters - might be reversed`;
  }

  // Pattern 6: Starts with short letter group (1-4 letters) followed only by digits and dots
  // e.g., "KD2240.00", "S5822.32", "P2240.12.37" — letters moved to front by RTL BiDi rendering
  // Does NOT match complex patterns like "CV12/0B-00A" (has slashes/letters in rest)
  const lettersStartMatch = pnOriginal.match(/^([A-Za-z]{1,4})(\d[\d.]+)$/);
  if (lettersStartMatch) {
    return `Starts with "${lettersStartMatch[1]}" — letter group may have moved from end due to RTL rendering`;
  }

  return null;
}

/**
 * RTL Auto-Correction: disabled.
 *
 * Heuristic auto-correction was causing incorrect modifications to already-correct part numbers
 * (e.g. "2240.KD.00" extracted correctly but then "corrected" to "KD2240.00").
 * The UI reverse button now handles user-controlled correction on a per-item basis.
 */
function autoCorrectRTLPartNumber(
  partNumber: string | undefined
): { corrected: string; change: string } | null {
  if (!partNumber || partNumber.length < 3) return null;

  // Disabled: let users apply the reverse button manually
  return null;
}

/**
 * RTL Safeguard: Process components, auto-correct where possible, and add warnings
 */
function addRTLWarnings(
  components: AIExtractedComponent[],
  isRTLDocument: boolean
): { components: AIExtractedComponent[]; warnings: ExtractionWarning[] } {
  const warnings: ExtractionWarning[] = [];

  // Add general RTL document warning
  if (isRTLDocument) {
    warnings.push({
      type: 'rtl_document',
      message:
        'RTL document detected. Review part numbers and use the Reverse button if they appear reversed.',
      severity: 'info',
    });
  }

  // Process each component: auto-correct if possible, otherwise flag
  const processedComponents = components.map((component, index) => {
    if (!isRTLDocument) return component;

    // Try auto-correction first
    const correction = autoCorrectRTLPartNumber(component.manufacturerPN);

    if (correction) {
      // Auto-correction succeeded
      logger.info(
        `RTL Auto-correct [${index + 1}]: "${component.manufacturerPN}" → "${correction.corrected}" (${correction.change})`
      );

      warnings.push({
        type: 'potential_reversal',
        message: `Component ${index + 1}: Auto-corrected "${component.manufacturerPN}" → "${correction.corrected}"`,
        componentIndex: index,
        severity: 'info', // Info because it was fixed
      });

      return {
        ...component,
        manufacturerPN: correction.corrected,
        potentialRTLIssue: false, // Corrected, no longer an issue
        rtlIssueReason: `Auto-corrected: ${correction.change}`,
      };
    }

    // No auto-correction, check if there's a potential issue to flag
    const issue = detectPotentialRTLIssue(component.manufacturerPN);

    if (issue) {
      // Flag as potential issue (couldn't auto-correct)
      warnings.push({
        type: 'potential_reversal',
        message: `Component ${index + 1} "${component.manufacturerPN}": ${issue}`,
        componentIndex: index,
        severity: 'warning',
      });

      return {
        ...component,
        potentialRTLIssue: true,
        rtlIssueReason: issue,
      };
    }

    return component;
  });

  return { components: processedComponents, warnings };
}

/**
 * Parse Claude's response and validate structure
 */
function parseClaudeResponse(responseText: string): AIExtractionResult {
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?$/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedResponse);

    // Validate structure
    if (!parsed.components || !Array.isArray(parsed.components)) {
      throw new Error('Invalid response structure: missing components array');
    }

    // Calculate overall confidence
    const avgConfidence =
      parsed.components.length > 0
        ? parsed.components.reduce(
            (sum: number, c: AIExtractedComponent) =>
              sum + (c.confidence || 0.5),
            0
          ) / parsed.components.length
        : 0.5;

    // Log RTL document detection and extracted part numbers for debugging
    const isRTL = parsed.metadata?.isRTLDocument ?? false;
    if (isRTL) {
      logger.info('RTL document detected. Extracted part numbers:');
      parsed.components.forEach((c: AIExtractedComponent, i: number) => {
        if (c.manufacturerPN) {
          logger.info(
            `  [${i + 1}] "${c.manufacturerPN}" - ${c.name || 'unnamed'}`
          );
        }
      });
    }

    // Apply RTL safeguards - check for potential reversal issues
    const { components: processedComponents, warnings } = addRTLWarnings(
      parsed.components,
      isRTL
    );

    // Log warnings if any
    if (warnings.length > 0) {
      logger.warn(`RTL Safeguard: ${warnings.length} warning(s) detected:`);
      warnings.forEach(w => logger.warn(`  - [${w.severity}] ${w.message}`));
    }

    // Adjust confidence if RTL document with warnings
    let adjustedConfidence = avgConfidence;
    const rtlWarnings = warnings.filter(w => w.type === 'potential_reversal');
    if (isRTL && rtlWarnings.length > 0) {
      // Reduce confidence by 10% for each potential reversal issue (max 30% reduction)
      const reduction = Math.min(0.3, rtlWarnings.length * 0.1);
      adjustedConfidence = Math.max(0.3, avgConfidence - reduction);
      logger.info(
        `Confidence adjusted from ${avgConfidence.toFixed(2)} to ${adjustedConfidence.toFixed(2)} due to ${rtlWarnings.length} potential RTL issue(s)`
      );
    }

    return {
      success: true,
      components: processedComponents,
      metadata: {
        documentType: parsed.documentType || 'unknown',
        supplier: parsed.metadata?.supplier,
        quoteDate: parsed.metadata?.quoteDate,
        currency: parsed.metadata?.currency,
        totalItems: processedComponents.length,
        columnHeaders: parsed.metadata?.columnHeaders || [],
        isRTLDocument: isRTL,
      },
      confidence: adjustedConfidence,
      rawResponse: responseText,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    logger.error('Failed to parse Claude response:', error);
    logger.error(
      'Raw response (first 500 chars):',
      responseText.substring(0, 500)
    );
    logger.error(
      'Raw response (last 500 chars):',
      responseText.substring(Math.max(0, responseText.length - 500))
    );

    return {
      success: false,
      components: [],
      metadata: {
        documentType: 'unknown',
        totalItems: 0,
      },
      confidence: 0,
      error: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThe response was too large or malformed. Try with a smaller PDF or convert to an image first.`,
      rawResponse: responseText,
    };
  }
}

/**
 * Extract column headers from document (Step 1 of multi-step extraction)
 * This is a lightweight call that returns just column headers for user selection
 */
export async function extractColumnHeaders(
  file: File
): Promise<ColumnHeadersResult> {
  try {
    // Check if API key is configured
    if (!anthropic) {
      return {
        success: false,
        columnHeaders: [],
        error:
          'Claude AI is not configured. Please add your API key in Settings.',
      };
    }

    let contentBlock: any;

    // Handle Excel files with text extraction
    if (isExcelFile(file)) {
      const excelText = await excelToText(file);
      contentBlock = [
        {
          type: 'text',
          text: `${createHeaderExtractionPrompt()}\n\n=== EXCEL DATA ===\n\n${excelText}`,
        },
      ];
    }
    // Handle images and PDFs with vision API
    else {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];

      if (!validTypes.includes(file.type)) {
        return {
          success: false,
          columnHeaders: [],
          error: `Unsupported file type: ${file.type}`,
        };
      }

      const base64Data = await fileToBase64(file);
      const mediaType = getMediaType(file);
      const isPDF = file.type === 'application/pdf';

      contentBlock = [
        isPDF
          ? {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            }
          : {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: base64Data,
              },
            },
        {
          type: 'text',
          text: createHeaderExtractionPrompt(),
        },
      ];
    }

    // Call Claude with lightweight header extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024, // Small limit - we only need column headers
      messages: [
        {
          role: 'user',
          content: contentBlock,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Parse response
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?$/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedResponse);

    return {
      success: true,
      columnHeaders: parsed.columnHeaders || [],
      documentType: parsed.documentType,
      metadata: parsed.metadata,
    };
  } catch (error) {
    logger.error('Column header extraction error:', error);
    return {
      success: false,
      columnHeaders: [],
      error:
        error instanceof Error
          ? `Failed to extract column headers: ${error.message}`
          : 'Unknown error during header extraction',
    };
  }
}

/**
 * Extract component data from Excel file using Claude AI text analysis
 * @param file - Excel file to extract from
 * @param columnOptions - Optional column selection options
 * @param teamId - Optional team ID for team-scoped categories
 */
async function extractFromExcelFile(
  file: File,
  columnOptions?: ColumnExtractionOptions,
  teamId?: string
): Promise<AIExtractionResult> {
  try {
    if (!anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // Convert Excel to text representation
    const excelText = await excelToText(file);

    // Call Claude AI with text content
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384, // Increased for large price lists with multiple columns
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${createExtractionPrompt(columnOptions, teamId)}\n\n=== EXCEL DATA ===\n\n${excelText}`,
            },
          ],
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Check if response was truncated
    if (message.stop_reason === 'max_tokens') {
      logger.warn('Claude response was truncated due to max_tokens limit');
      return {
        success: false,
        components: [],
        metadata: { documentType: 'excel', totalItems: 0 },
        confidence: 0,
        error:
          'Excel file has too many rows. The response was truncated.\n\nTry one of these options:\n1. Split the Excel file into smaller files\n2. Remove unnecessary rows/columns\n3. Process only specific sheets',
        rawResponse: responseText,
      };
    }

    // Parse and return result
    const result = parseClaudeResponse(responseText);

    // Ensure document type is set to excel
    if (result.metadata) {
      result.metadata.documentType = 'excel';
    }

    return result;
  } catch (error) {
    logger.error('Excel extraction error:', error);

    return {
      success: false,
      components: [],
      metadata: { documentType: 'excel', totalItems: 0 },
      confidence: 0,
      error:
        error instanceof Error
          ? `Failed to extract from Excel: ${error.message}`
          : 'Unknown error occurred during Excel extraction',
    };
  }
}

/**
 * Extract component data from a document using Claude AI
 *
 * Supports:
 * - Excel files (.xlsx, .xls, .csv) - Text-based extraction
 * - PDF files (.pdf) - Vision API
 * - Image files (JPEG, PNG, GIF, WebP) - Vision API
 *
 * @param file - File to extract from
 * @param columnOptions - Optional column selection (partner price column, MSRP column)
 * @param teamId - Optional team ID for team-scoped categories
 */
export async function extractComponentsFromDocument(
  file: File,
  columnOptions?: ColumnExtractionOptions,
  teamId?: string
): Promise<AIExtractionResult> {
  try {
    // Check if API key is configured
    if (!anthropic) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error:
          'Claude AI is not configured. Please follow these steps:\n\n1. Get your API key from https://console.anthropic.com/\n2. Add it to .env.local: VITE_ANTHROPIC_API_KEY=sk-ant-your-key\n3. Restart the dev server: npm run dev\n\nSee QUICK_START_AI_IMPORT.md for detailed instructions.',
      };
    }

    // Check if it's an Excel file - handle with text-based extraction
    if (isExcelFile(file)) {
      return await extractFromExcelFile(file, columnOptions, teamId);
    }

    // Validate file - for vision-based extraction (images and PDFs)
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: `Unsupported file type: ${file.type}. Supported types: Excel (.xlsx, .xls, .csv), PDF, JPEG, PNG, GIF, WebP`,
      };
    }

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    const mediaType = getMediaType(file);
    const isPDF = file.type === 'application/pdf';

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Using Claude Sonnet 4 (latest stable model)
      max_tokens: 16384, // Increased for large price lists with multiple columns
      messages: [
        {
          role: 'user',
          content: [
            // PDFs use 'document' type, images use 'image' type
            isPDF
              ? {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Data,
                  },
                }
              : {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType as
                      | 'image/jpeg'
                      | 'image/png'
                      | 'image/gif'
                      | 'image/webp',
                    data: base64Data,
                  },
                },
            {
              type: 'text',
              text: createExtractionPrompt(columnOptions, teamId),
            },
          ],
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Check if response was truncated
    if (message.stop_reason === 'max_tokens') {
      logger.warn('Claude response was truncated due to max_tokens limit');
      return {
        success: false,
        components: [],
        metadata: { documentType: 'pdf', totalItems: 0 },
        confidence: 0,
        error:
          'PDF has too many components. The response was truncated.\n\nTry one of these options:\n1. Split the PDF into smaller files\n2. Convert specific pages to images\n3. Use Excel/CSV format instead',
        rawResponse: responseText,
      };
    }

    // Parse and return result
    return parseClaudeResponse(responseText);
  } catch (error) {
    logger.error('Claude AI extraction error:', error);

    // Check for authentication errors
    if (
      error instanceof Error &&
      (error.message.includes('authentication_error') ||
        error.message.includes('invalid x-api-key') ||
        error.message.includes('api_key'))
    ) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error:
          '❌ Authentication Failed\n\nYour Claude API key is invalid or not configured correctly.\n\n📋 Steps to fix:\n1. Visit https://console.anthropic.com/\n2. Generate a new API key\n3. Update .env.local:\n   VITE_ANTHROPIC_API_KEY=sk-ant-your-actual-key\n4. Restart: npm run dev\n\n💡 Tip: Make sure to copy the full key starting with "sk-ant-"',
      };
    }

    // Check for rate limiting
    if (error instanceof Error && error.message.includes('rate_limit')) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: 'Rate limit exceeded. Please wait a few minutes and try again.',
      };
    }

    return {
      success: false,
      components: [],
      metadata: { documentType: 'unknown', totalItems: 0 },
      confidence: 0,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during extraction',
    };
  }
}

/**
 * Check if a component name needs enrichment (is unclear/cryptic)
 * Returns true if the name appears to be a model code rather than a descriptive name
 */
export function needsEnrichment(component: AIExtractedComponent): boolean {
  const name = component.name || '';

  // If name is empty or very short, needs enrichment
  if (name.length < 3) return true;

  // If manufacturer is missing, might benefit from enrichment
  if (!component.manufacturer) return true;

  // Model code patterns that indicate unclear names:
  // - "UK 5 N", "PATG 1/15", "SAC-8P-1,5-PUR/M8FS", "DVP14SS211R"
  // These typically have: uppercase letters, numbers, dashes, slashes, dots

  // Pattern 1: Looks like a model code (alphanumeric with special chars, no Hebrew)
  const modelCodePattern = /^[A-Z0-9_./, -]+$/i;
  if (modelCodePattern.test(name) && !/[\u0590-\u05FF]/.test(name)) {
    return true;
  }

  // Pattern 2: Very short with numbers (like "UK 5 N")
  if (name.length < 15 && /\d/.test(name) && !/[\u0590-\u05FF]/.test(name)) {
    return true;
  }

  // Pattern 3: Contains slash or dash with numbers (like "PATG 1/15", "SAC-8P-1,5-PUR")
  if (/[A-Z]+[-/][0-9]/.test(name) || /[0-9][-/][A-Z0-9]/.test(name)) {
    return true;
  }

  // If confidence is low, might need enrichment
  if (component.confidence !== undefined && component.confidence < 0.5) {
    return true;
  }

  return false;
}

/**
 * Enrich components with web search data for unclear items
 * Uses Tavily API to identify component types from part numbers
 */
export async function enrichComponentsWithWebSearch(
  components: AIExtractedComponent[],
  maxSearches = 10
): Promise<{
  enrichedComponents: AIExtractedComponent[];
  searchesPerformed: number;
  enrichedCount: number;
}> {
  if (!isTavilyAvailable()) {
    logger.info('Tavily not available, skipping component enrichment');
    return {
      enrichedComponents: components,
      searchesPerformed: 0,
      enrichedCount: 0,
    };
  }

  // Find components that need enrichment
  const needsEnrichmentList = components
    .map((comp, index) => ({ comp, index, needs: needsEnrichment(comp) }))
    .filter(item => item.needs)
    .slice(0, maxSearches); // Limit to maxSearches to avoid rate limits

  if (needsEnrichmentList.length === 0) {
    logger.info('No components need enrichment');
    return {
      enrichedComponents: components,
      searchesPerformed: 0,
      enrichedCount: 0,
    };
  }

  logger.info(
    `Enriching ${needsEnrichmentList.length} components with web search`
  );

  // Create a copy of components to enrich
  const enrichedComponents = [...components];
  let enrichedCount = 0;

  // Process each component that needs enrichment
  for (const item of needsEnrichmentList) {
    const { comp, index } = item;
    const searchQuery = comp.manufacturerPN || comp.name || '';

    if (!searchQuery) continue;

    try {
      const result: ComponentSearchResult = await identifyComponent(
        searchQuery,
        comp.manufacturer,
        comp.description
      );

      if (result.success && result.productTypeHebrew) {
        // Enrich the component with search results
        const enriched = { ...enrichedComponents[index] };

        // Update name if we found a product type
        if (result.productTypeHebrew) {
          // Create a better name: Hebrew product type + key identifier
          const identifier = comp.manufacturerPN
            ? comp.manufacturerPN.split('-')[0]
            : '';
          enriched.name = identifier
            ? `${result.productTypeHebrew} ${identifier}`
            : result.productTypeHebrew;
        }

        // Update manufacturer if found and not already set
        if (result.manufacturer && !enriched.manufacturer) {
          enriched.manufacturer = result.manufacturer;
        }

        // Update description if found and not already set
        if (result.description && !enriched.description) {
          enriched.description = result.description;
        }

        // Mark as enriched with higher confidence
        enriched.confidence = Math.max(enriched.confidence || 0.5, 0.7);

        // Add note about enrichment
        enriched.notes = enriched.notes
          ? `${enriched.notes} | זוהה אוטומטית: ${result.productType}`
          : `זוהה אוטומטית: ${result.productType}`;

        enrichedComponents[index] = enriched;
        enrichedCount++;

        logger.info(
          `Enriched component: ${searchQuery} -> ${enriched.name} (${result.productType})`
        );
      }
    } catch (error) {
      logger.error(`Failed to enrich component ${searchQuery}:`, error);
    }

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return {
    enrichedComponents,
    searchesPerformed: needsEnrichmentList.length,
    enrichedCount,
  };
}

/**
 * Extract components with optional web search enrichment
 * This is the main function to use when you want automatic enrichment
 */
export async function extractComponentsWithEnrichment(
  file: File,
  columnOptions?: ColumnExtractionOptions,
  teamId?: string,
  enableEnrichment = true
): Promise<
  AIExtractionResult & {
    enrichmentStats?: { searchesPerformed: number; enrichedCount: number };
  }
> {
  // First, extract components normally
  const result = await extractComponentsFromDocument(
    file,
    columnOptions,
    teamId
  );

  // If extraction failed or no components, return as-is
  if (!result.success || result.components.length === 0) {
    return result;
  }

  // If enrichment is disabled or Tavily not available, return as-is
  if (!enableEnrichment || !isTavilyAvailable()) {
    return result;
  }

  // Enrich components with web search
  try {
    const { enrichedComponents, searchesPerformed, enrichedCount } =
      await enrichComponentsWithWebSearch(result.components);

    return {
      ...result,
      components: enrichedComponents,
      enrichmentStats: {
        searchesPerformed,
        enrichedCount,
      },
    };
  } catch (error) {
    logger.error('Component enrichment failed:', error);
    // Return original result if enrichment fails
    return result;
  }
}

/**
 * Default exchange rates (fallback if not in settings)
 * Note: Primary exchange rates are managed in SettingsPage component
 */
const DEFAULT_EXCHANGE_RATES = {
  USD_TO_ILS: 3.6,
  EUR_TO_ILS: 4.0,
  EUR_TO_USD: 1.1,
};

/**
 * Convert AI extracted component to Component type for database with currency conversion
 */
export function aiComponentToComponent(
  aiComponent: AIExtractedComponent,
  defaultSupplier?: string,
  defaultQuoteDate?: string,
  exchangeRates = DEFAULT_EXCHANGE_RATES
): Partial<Component> {
  // Determine which currency we have and what the original price is
  let unitCostNIS: number | undefined;
  let unitCostUSD: number | undefined;
  let unitCostEUR: number | undefined;
  let currency: 'NIS' | 'USD' | 'EUR';
  let originalCost: number;

  // Case 1: Price in USD (most common for international suppliers)
  if (aiComponent.unitPriceUSD) {
    currency = 'USD';
    originalCost = aiComponent.unitPriceUSD;
    unitCostUSD = aiComponent.unitPriceUSD;

    // Calculate other currencies
    unitCostNIS =
      aiComponent.unitPriceNIS ||
      aiComponent.unitPriceUSD * exchangeRates.USD_TO_ILS;
    unitCostEUR =
      aiComponent.unitPriceEUR ||
      aiComponent.unitPriceUSD * exchangeRates.EUR_TO_USD;
  }
  // Case 2: Price in EUR
  else if (aiComponent.unitPriceEUR) {
    currency = 'EUR';
    originalCost = aiComponent.unitPriceEUR;
    unitCostEUR = aiComponent.unitPriceEUR;

    // Calculate other currencies
    unitCostNIS =
      aiComponent.unitPriceNIS ||
      aiComponent.unitPriceEUR * exchangeRates.EUR_TO_ILS;
    unitCostUSD =
      aiComponent.unitPriceUSD ||
      aiComponent.unitPriceEUR / exchangeRates.EUR_TO_USD;
  }
  // Case 3: Price in NIS (Israeli suppliers)
  else if (aiComponent.unitPriceNIS) {
    currency = 'NIS';
    originalCost = aiComponent.unitPriceNIS;
    unitCostNIS = aiComponent.unitPriceNIS;

    // Calculate other currencies
    unitCostUSD =
      aiComponent.unitPriceUSD ||
      aiComponent.unitPriceNIS / exchangeRates.USD_TO_ILS;
    unitCostEUR =
      aiComponent.unitPriceEUR ||
      aiComponent.unitPriceNIS / exchangeRates.EUR_TO_ILS;
  }
  // Case 4: No price found
  else {
    currency = aiComponent.currency || 'NIS';
    originalCost = 0;
    unitCostNIS = 0;
    unitCostUSD = undefined;
    unitCostEUR = undefined;
  }

  return {
    name: aiComponent.name,
    description: aiComponent.description,
    category: aiComponent.category || 'אחר',
    componentType: aiComponent.componentType || 'hardware',
    laborSubtype: aiComponent.laborSubtype,
    manufacturer: aiComponent.manufacturer || '',
    manufacturerPN: aiComponent.manufacturerPN || '',
    supplier: aiComponent.supplier || defaultSupplier || '',
    unitCostNIS,
    unitCostUSD,
    unitCostEUR,
    currency, // This indicates which currency is the ORIGINAL (will be green)
    originalCost,
    quoteDate:
      aiComponent.quoteDate ||
      defaultQuoteDate ||
      new Date().toISOString().split('T')[0],
    quoteFileUrl: '', // Will be set when file is uploaded
    notes: aiComponent.notes,
  };
}
