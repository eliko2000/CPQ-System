import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { loadSetting } from '@/services/settingsService';

/**
 * Product Analyzer Service
 * Uses Claude AI to analyze web search results and generate descriptive Hebrew product names
 */

// Initialize Anthropic client
let anthropic: Anthropic | null = null;
let currentApiKey: string | null = null;

/**
 * Initialize or get Anthropic client
 */
async function getAnthropicClient(): Promise<Anthropic | null> {
  if (anthropic && currentApiKey) {
    return anthropic;
  }

  try {
    const settingsResult = await loadSetting<{ apiKey: string }>(
      'anthropicApiKey'
    );

    if (settingsResult.success && settingsResult.data?.apiKey) {
      currentApiKey = settingsResult.data.apiKey;
    } else {
      currentApiKey = config.anthropic.apiKey;
    }

    if (currentApiKey) {
      anthropic = new Anthropic({
        apiKey: currentApiKey,
        dangerouslyAllowBrowser: true,
      });
      return anthropic;
    }
  } catch (error) {
    logger.error('Failed to initialize Anthropic client:', error);
  }

  return null;
}

export interface ProductAnalysisResult {
  success: boolean;
  hebrewName?: string;
  productType?: string;
  manufacturer?: string;
  specifications?: string;
  error?: string;
}

/**
 * Analyze product search results using Claude AI to generate a proper Hebrew name
 * @param searchQuery - The original search query (part number or model code)
 * @param searchResults - Array of search result snippets from Tavily
 * @param tavilyAnswer - Optional Tavily's generated answer
 */
export async function analyzeProductWithAI(
  searchQuery: string,
  searchResults: Array<{ title: string; content: string; url: string }>,
  tavilyAnswer?: string
): Promise<ProductAnalysisResult> {
  const client = await getAnthropicClient();

  if (!client) {
    return {
      success: false,
      error: 'Claude API not configured',
    };
  }

  // Build context from search results
  const searchContext = searchResults
    .slice(0, 5) // Limit to top 5 results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join('\n\n');

  const prompt = `אתה מומחה לזיהוי רכיבי אוטומציה ותעשייה.

קיבלת תוצאות חיפוש עבור המוצר: "${searchQuery}"

${tavilyAnswer ? `סיכום מהחיפוש: ${tavilyAnswer}\n` : ''}

תוצאות חיפוש:
${searchContext}

בהתבסס על תוצאות החיפוש, ספק את המידע הבא בפורמט JSON:
{
  "hebrewName": "שם תיאורי בעברית (2-5 מילים, כולל מידות/מפרט חשוב)",
  "productType": "סוג המוצר באנגלית (לדוגמה: suction cup, gripping system, sensor)",
  "manufacturer": "שם היצרן (אם נמצא)",
  "specifications": "מפרט טכני קצר בעברית (אופציונלי)"
}

דוגמאות לשמות טובים:
- "פטמת יניקה 80 מ״מ מפוחית" (לא רק "פטמת יניקה")
- "מערכת אחיזה שטחית FXP" (לא רק "מערכת אחיזה")
- "חיישן קרבה אינדוקטיבי M12" (לא רק "חיישן")
- "צילינדר פנאומטי 32x50" (לא רק "צילינדר")

השם העברי חייב להיות ספציפי ותיאורי, לכלול מידות או מפרט חשוב כשזמין.

ענה רק עם ה-JSON, ללא טקסט נוסף.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        success: false,
        error: 'No text response from AI',
      };
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Could not parse AI response as JSON:', textContent.text);
      return {
        success: false,
        error: 'Could not parse AI response',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      hebrewName: parsed.hebrewName,
      productType: parsed.productType,
      manufacturer: parsed.manufacturer,
      specifications: parsed.specifications,
    };
  } catch (error) {
    logger.error('AI product analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
