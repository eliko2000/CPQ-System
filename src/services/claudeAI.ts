import Anthropic from '@anthropic-ai/sdk';
import type { Component, ExtractedItem } from '../types';

// Get API key from environment
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// Validate API key
const isValidApiKey = (key: string | undefined): boolean => {
  return !!key && key.startsWith('sk-ant-') && key !== 'your-anthropic-api-key-here';
};

// Initialize Anthropic client only if API key is valid
let anthropic: Anthropic | null = null;

if (isValidApiKey(ANTHROPIC_API_KEY)) {
  anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true, // Only for development - move to backend in production
  });
}

// Response type from Claude
export interface AIExtractedComponent extends ExtractedItem {
  category?: string;
  supplier?: string;
  unitPriceNIS?: number;
  unitPriceUSD?: number;
  unitPriceEUR?: number;
  currency?: 'NIS' | 'USD' | 'EUR';
  quoteDate?: string;
  notes?: string;
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
function getMediaType(file: File): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const type = file.type;

  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/gif') return 'image/gif';
  if (type === 'image/webp') return 'image/webp';

  // Default to png for unknown image types (PDF will be converted to image first)
  return 'image/png';
}

// Valid categories - must match exactly (exported for future use in Settings)
export const VALID_CATEGORIES = [
  'בקרים',
  'חיישנים',
  'אקטואטורים',
  'מנועים',
  'ספקי כוח',
  'תקשורת',
  'בטיחות',
  'מכני',
  'כבלים ומחברים',
  'אחר'
] as const;

/**
 * Create the extraction prompt for Claude
 */
function createExtractionPrompt(): string {
  return `You are an expert at extracting structured component data from supplier quotations, price lists, and technical documents.

Analyze this document and extract ALL component/product information. The document may be in English, Hebrew (עברית), or mixed languages.

Extract the following information for each component:
1. **name** - Component/product name or description
2. **manufacturer** - Manufacturer name (e.g., Siemens, Festo, SMC)
3. **manufacturerPN** - Manufacturer part number (may appear as: P/N, PN, Part#, קטלוגי, מק"ט, Catalog#)
4. **category** - Component category - MUST be one of these EXACT Hebrew values:
   - "בקרים" (PLCs/Controllers)
   - "חיישנים" (Sensors)
   - "אקטואטורים" (Actuators)
   - "מנועים" (Motors)
   - "ספקי כוח" (Power Supplies)
   - "תקשורת" (Communication)
   - "בטיחות" (Safety)
   - "מכני" (Mechanical)
   - "כבלים ומחברים" (Cables & Connectors)
   - "אחר" (Other - use this if none of the above fit)
5. **supplier** - Supplier/vendor name (if mentioned)
6. **quantity** - Quantity (if specified)
7. **unitPriceNIS** - Unit price in Israeli Shekels (₪, NIS, ILS, שקלים)
8. **unitPriceUSD** - Unit price in US Dollars ($, USD)
9. **unitPriceEUR** - Unit price in Euros (€, EUR)
10. **currency** - Primary currency (NIS, USD, or EUR)
11. **quoteDate** - Date of quotation (if visible)
12. **notes** - Any important notes, specifications, or remarks
13. **confidence** - Your confidence level (0.0 to 1.0) in the extraction accuracy for this item

**Important guidelines:**
- Handle merged cells, multi-line descriptions, and complex table layouts
- Recognize prices in various formats: "$1,234.56", "1234.56 USD", "₪5,000", "5000 ש״ח"
- Understand Hebrew terms: מחיר (price), יצרן (manufacturer), ספק (supplier), כמות (quantity)
- **CRITICAL: category MUST be one of the 10 exact Hebrew values listed above - do NOT invent new categories!**
- If unsure about category, use "אחר" (Other)
- If a field is not found, set it as null
- Be intelligent about categorization based on product description
- Extract ALL items, even if some fields are missing
- For tables with headers, use them to understand column meanings

**Response format:**
Return a valid JSON object with this exact structure:

{
  "documentType": "quotation" | "price_list" | "invoice" | "catalog" | "unknown",
  "metadata": {
    "supplier": "supplier name if found",
    "quoteDate": "date if found (YYYY-MM-DD format)",
    "currency": "primary currency in document",
    "totalItems": number
  },
  "components": [
    {
      "name": "Component name",
      "manufacturer": "Manufacturer name or null",
      "manufacturerPN": "Part number or null",
      "category": "Category or null",
      "supplier": "Supplier name or null",
      "quantity": number or null,
      "unitPriceNIS": number or null,
      "unitPriceUSD": number or null,
      "unitPriceEUR": number or null,
      "currency": "NIS" | "USD" | "EUR" | null,
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
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedResponse);

    // Validate structure
    if (!parsed.components || !Array.isArray(parsed.components)) {
      throw new Error('Invalid response structure: missing components array');
    }

    // Calculate overall confidence
    const avgConfidence = parsed.components.length > 0
      ? parsed.components.reduce((sum: number, c: AIExtractedComponent) => sum + (c.confidence || 0.5), 0) / parsed.components.length
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
      },
      confidence: avgConfidence,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    return {
      success: false,
      components: [],
      metadata: {
        documentType: 'unknown',
        totalItems: 0,
      },
      confidence: 0,
      error: error instanceof Error ? error.message : 'Failed to parse AI response',
      rawResponse: responseText,
    };
  }
}

/**
 * Extract component data from a document using Claude Vision API
 */
export async function extractComponentsFromDocument(file: File): Promise<AIExtractionResult> {
  try {
    // Check if API key is configured
    if (!anthropic) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: 'Claude AI is not configured. Please follow these steps:\n\n1. Get your API key from https://console.anthropic.com/\n2. Add it to .env.local: VITE_ANTHROPIC_API_KEY=sk-ant-your-key\n3. Restart the dev server: npm run dev\n\nSee QUICK_START_AI_IMPORT.md for detailed instructions.',
      };
    }

    // Validate file - PDF support depends on conversion
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    // For PDFs, show a helpful error message
    if (file.type === 'application/pdf') {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: 'PDF support requires conversion to images first. Please convert your PDF pages to images (PNG/JPEG) or use a screenshot.',
      };
    }

    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: `Unsupported file type: ${file.type}. Supported types: JPEG, PNG, GIF, WebP`,
      };
    }

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    const mediaType = getMediaType(file);

    // Call Claude Vision API
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-latest', // Using Claude 3.7 Sonnet (current stable vision model)
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: createExtractionPrompt(),
            },
          ],
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Parse and return result
    return parseClaudeResponse(responseText);
  } catch (error) {
    console.error('Claude AI extraction error:', error);

    // Check for authentication errors
    if (error instanceof Error && (
      error.message.includes('authentication_error') ||
      error.message.includes('invalid x-api-key') ||
      error.message.includes('api_key')
    )) {
      return {
        success: false,
        components: [],
        metadata: { documentType: 'unknown', totalItems: 0 },
        confidence: 0,
        error: '❌ Authentication Failed\n\nYour Claude API key is invalid or not configured correctly.\n\n📋 Steps to fix:\n1. Visit https://console.anthropic.com/\n2. Generate a new API key\n3. Update .env.local:\n   VITE_ANTHROPIC_API_KEY=sk-ant-your-actual-key\n4. Restart: npm run dev\n\n💡 Tip: Make sure to copy the full key starting with "sk-ant-"',
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
      error: error instanceof Error ? error.message : 'Unknown error during extraction',
    };
  }
}

/**
 * Default exchange rates (fallback if not in settings)
 * TODO: Move to settings/configuration
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
    unitCostNIS = aiComponent.unitPriceNIS || (aiComponent.unitPriceUSD * exchangeRates.USD_TO_ILS);
    unitCostEUR = aiComponent.unitPriceEUR || (aiComponent.unitPriceUSD * exchangeRates.EUR_TO_USD);
  }
  // Case 2: Price in EUR
  else if (aiComponent.unitPriceEUR) {
    currency = 'EUR';
    originalCost = aiComponent.unitPriceEUR;
    unitCostEUR = aiComponent.unitPriceEUR;

    // Calculate other currencies
    unitCostNIS = aiComponent.unitPriceNIS || (aiComponent.unitPriceEUR * exchangeRates.EUR_TO_ILS);
    unitCostUSD = aiComponent.unitPriceUSD || (aiComponent.unitPriceEUR / exchangeRates.EUR_TO_USD);
  }
  // Case 3: Price in NIS (Israeli suppliers)
  else if (aiComponent.unitPriceNIS) {
    currency = 'NIS';
    originalCost = aiComponent.unitPriceNIS;
    unitCostNIS = aiComponent.unitPriceNIS;

    // Calculate other currencies
    unitCostUSD = aiComponent.unitPriceUSD || (aiComponent.unitPriceNIS / exchangeRates.USD_TO_ILS);
    unitCostEUR = aiComponent.unitPriceEUR || (aiComponent.unitPriceNIS / exchangeRates.EUR_TO_ILS);
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
    manufacturer: aiComponent.manufacturer || '',
    manufacturerPN: aiComponent.manufacturerPN || '',
    supplier: aiComponent.supplier || defaultSupplier || '',
    unitCostNIS,
    unitCostUSD,
    unitCostEUR,
    currency, // This indicates which currency is the ORIGINAL (will be green)
    originalCost,
    quoteDate: aiComponent.quoteDate || defaultQuoteDate || new Date().toISOString().split('T')[0],
    quoteFileUrl: '', // Will be set when file is uploaded
    notes: aiComponent.notes,
  };
}
