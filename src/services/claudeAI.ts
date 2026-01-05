import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import type { Component, ExtractedItem } from '../types';
import { getComponentCategories } from '../constants/settings';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { loadSetting } from '@/services/settingsService';

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

  return `You are an expert at extracting structured component data from supplier quotations, price lists, and technical documents.${columnInstructions}

Analyze this document and extract ALL component/product information. The document may be in English, Hebrew (עברית), or mixed languages.

Extract the following information for each component:
1. **name** - **CRITICAL**: Create a concise, descriptive Hebrew name (2-5 words max)
   - If source is English: Translate key product type to Hebrew + keep model number
   - Examples:
     * "Dobot CRA20 Collaborative Robot" → "רובוט CRA20"
     * "Heavy Duty Belt Conveyor 500mm" → "מסוע רצועה"
     * "Siemens PLC S7-1200" → "בקר PLC S7-1200"
     * "SMC Pneumatic Cylinder CDQ2B32-50DCZ" → "צילינדר פנאומטי CDQ2B32"
   - Keep manufacturer in the manufacturer field, NOT in name
   - Focus on WHAT it is, not ALL the specs
2. **description** - A brief, informative description of the component (1-3 sentences)
   - Extract from any description, product details, or specifications column in the document
   - Include key features, capabilities, or technical specifications
   - More detailed than name, but more concise than notes
   - Example: 'רובוט שיתופי עם טווח זרוע 900 מ"מ, מטען עד 20 ק"ג, 6 צירים, מתאים לעבודה בסביבה משותפת עם בני אדם'
   - If no description column exists, create a brief description from available data
   - Leave empty (null) if no meaningful description can be created
3. **manufacturer** - Manufacturer name (e.g., Siemens, Festo, SMC, Dobot)
4. **manufacturerPN** - Manufacturer part number
   - **CRITICAL FOR HEBREW DOCUMENTS**: If you see BOTH **"מק"ט"** column AND **"שם פריט"** column:
     * **מק"ט** column → Use for manufacturerPN (this contains the actual catalog/part number, often numeric like "1234308", "3003023")
     * **שם פריט** column → Use for name (this contains the item name/description like "PS-EE-2G/1", "UK-D 20 4/10-NS 35")
     * **DO NOT confuse these two columns!** They serve different purposes.
     * Example from table:
       - Row with מק"ט="1234308" and שם פריט="PS-EE-2G/1 AC/24DC/48" should extract:
         * manufacturerPN: "1234308" (from מק"ט column)
         * name: Create short Hebrew name from שם פריט + description
   - Look for column labels: P/N, PN, Part#, Part Number, קטלוגי, מק"ט, מקט, Catalog#, מספר קטלוגי, Cat No
   - **IGNORE "מקט ללקוח" (customer part number) - this is NOT the manufacturerPN**
   - Part numbers can be numeric (e.g., "1234308") or alphanumeric (e.g., "PS-EE-2G/1")
   - If only one column exists, use that value appropriately
   - **Never use the item name/description as the manufacturerPN if a separate מק"ט column exists**
5. **category** - Component category - MUST be one of these EXACT Hebrew values:
${categoryList}
   Use the most appropriate category, or use "${categories[categories.length - 1]}" if none fit
6. **componentType** - MUST be one of: "hardware", "software", or "labor"
   - "hardware": Physical components (PLCs, sensors, motors, robots, etc.)
   - "software": Software licenses, applications, configuration tools
   - "labor": Services like engineering, installation, commissioning, programming
7. **laborSubtype** - (ONLY if componentType is "labor") MUST be one of:
   - "engineering": Engineering design, system design (הנדסה, תכנון)
   - "commissioning": System commissioning, testing, startup (הפעלה, בדיקות)
   - "installation": Physical installation work (התקנה)
   - "programming": PLC programming, robot programming (תכנות)
8. **supplier** - Supplier/vendor name (if mentioned)
9. **quantity** - Quantity (if specified)
10. **unitPriceNIS** - Unit price in Israeli Shekels (₪, NIS, ILS, שקלים) - PARTNER/YOUR COST (auto-select first price column if available)
11. **unitPriceUSD** - Unit price in US Dollars ($, USD) - PARTNER/YOUR COST (auto-select first price column if available)
12. **unitPriceEUR** - Unit price in Euros (€, EUR) - PARTNER/YOUR COST (auto-select first price column if available)
13. **currency** - Primary currency (NIS, USD, or EUR)
14. **msrpPrice** - MSRP/List price if there's a SEPARATE column for it (auto-select second price column if available)
   - Look for column headers like: "MSRP", "List Price", "Retail", "מחיר מחירון", "מחיר קטלוגי"
   - Only populate if there are TWO+ price columns (partner price + MSRP)
   - If only ONE price column exists, leave this null
15. **msrpCurrency** - Currency of MSRP price (NIS, USD, or EUR) - only if msrpPrice is present
16. **allPriceColumns** - **CRITICAL**: Extract ALL price columns found in this row (for user column selection UI)
   - Array of objects with: { columnName: string, value: number, currency: 'NIS'|'USD'|'EUR' }
   - Example: [
       { columnName: "Unit Price (USD) Camera+SDK", value: 4400, currency: "USD" },
       { columnName: "Unit Price (USD) Camera+Vision+Viz", value: 5200, currency: "USD" },
       { columnName: "MSRP (USD) Camera+SDK", value: 6670, currency: "USD" },
       { columnName: "MSRP (USD) Camera+Vision+Viz", value: 7890, currency: "USD" }
     ]
   - Extract EVERY price column, even if there are 5+ columns
   - This allows user to select which columns to use for partner price and MSRP
17. **quoteDate** - Date of quotation (if visible)
18. **notes** - Any important notes, specifications, or remarks (keep technical specs here, NOT in name)
19. **confidence** - Your confidence level (0.0 to 1.0) in the extraction accuracy for this item

**Important guidelines:**
- **HEBREW TABLE COLUMN MAPPING** (Critical for Hebrew quotations/price lists):
  * **מק"ט** = Manufacturer part number (manufacturerPN) - often numeric codes like "1234308"
  * **שם פריט** = Item name (name) - descriptive names like "PS-EE-2G/1" or "דופן מהדק"
  * **מקט ללקוח** = Customer part number - IGNORE this, do not use for manufacturerPN
  * **תאור בעברית** = Hebrew description (description) - full product description
  * **מחיר ליחידה** = Unit price (unitPriceNIS/USD/EUR)
  * **כמות** = Quantity (quantity)
  * **יצרן** = Manufacturer (manufacturer)
  * When BOTH מק"ט and שם פריט exist, they are DIFFERENT fields - do not confuse them!
- **NAME MUST BE SHORT & DESCRIPTIVE IN HEBREW**: Translate product type + model number only
- Handle merged cells, multi-line descriptions, and complex table layouts
- Recognize prices in various formats: "$1,234.56", "1234.56 USD", "₪5,000", "5000 ש״ח"
- Understand Hebrew terms: מחיר (price), יצרן (manufacturer), ספק (supplier), כמות (quantity)
- **DUAL PRICING**: If document has TWO price columns (e.g., "Partner Price" + "MSRP" or "Your Price" + "List Price"):
  * Put the LOWER price (partner/distributor price) in unitPriceUSD/NIS/EUR
  * Put the HIGHER price (MSRP/list price) in msrpPrice + msrpCurrency
  * Common MSRP column headers: "MSRP", "List Price", "Retail", "RRP", "מחיר מחירון"
  * Common partner price headers: "Partner", "Your Price", "Net", "Cost", "מחיר שותף"
- **CRITICAL: category MUST be one of the 10 exact Hebrew values listed above - do NOT invent new categories!**
- If unsure about category, use "אחר" (Other)
- If a field is not found, set it as null
- Be intelligent about categorization based on product description
- Extract ALL items, even if some fields are missing
- For tables with headers, use them to understand column meanings
- Put detailed specifications in the notes field, NOT in the name

**Response format:**
Return a valid JSON object with this exact structure:

{
  "documentType": "quotation" | "price_list" | "invoice" | "catalog" | "unknown",
  "metadata": {
    "supplier": "supplier name if found",
    "quoteDate": "date if found (YYYY-MM-DD format)",
    "currency": "primary currency in document",
    "totalItems": number,
    "columnHeaders": ["array of ALL column header names found in the document, especially ALL price column names"]
  },
  "components": [
    {
      "name": "Component name",
      "description": "Brief description of the component or null",
      "manufacturer": "Manufacturer name or null",
      "manufacturerPN": "Part number or null",
      "category": "Category or null",
      "componentType": "hardware" | "software" | "labor",
      "laborSubtype": "engineering" | "commissioning" | "installation" | "programming" | null,
      "supplier": "Supplier name or null",
      "quantity": number or null,
      "unitPriceNIS": number or null,
      "unitPriceUSD": number or null,
      "unitPriceEUR": number or null,
      "currency": "NIS" | "USD" | "EUR" | null,
      "msrpPrice": number or null,
      "msrpCurrency": "NIS" | "USD" | "EUR" | null,
      "allPriceColumns": [
        {
          "columnName": "Unit Price (USD) Camera+SDK",
          "value": 4400,
          "currency": "USD"
        },
        {
          "columnName": "MSRP (USD) Camera+SDK",
          "value": 6670,
          "currency": "USD"
        }
      ],
      "quoteDate": "YYYY-MM-DD or null",
      "notes": "any notes or null",
      "confidence": 0.0 to 1.0
    }
  ]
}

Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.`;
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

    return {
      success: true,
      components: parsed.components,
      metadata: {
        documentType: parsed.documentType || 'unknown',
        supplier: parsed.metadata?.supplier,
        quoteDate: parsed.metadata?.quoteDate,
        currency: parsed.metadata?.currency,
        totalItems: parsed.components.length,
        columnHeaders: parsed.metadata?.columnHeaders || [],
      },
      confidence: avgConfidence,
      rawResponse: responseText,
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
