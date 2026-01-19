import { loadSetting } from '@/services/settingsService';
import { logger } from '@/lib/logger';
import { analyzeProductWithAI } from './productAnalyzer';

/**
 * Tavily Search Service
 * Provides web search capabilities to identify component types from part numbers
 */

// Tavily API response types
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

export interface ComponentSearchResult {
  success: boolean;
  partNumber: string;
  productType?: string; // e.g., "pneumatic cylinder", "power supply", "cable"
  productTypeHebrew?: string; // e.g., "צילינדר פנאומטי", "ספק כוח", "כבל"
  manufacturer?: string;
  description?: string;
  specifications?: string;
  error?: string;
}

// Cache for API key and team context
let tavilyApiKey: string | null = null;
let currentTeamId: string | undefined = undefined;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Set the current team ID for loading team-scoped settings
 * Must be called before using Tavily functions
 */
export function setTavilyTeamContext(teamId: string | undefined): void {
  if (currentTeamId !== teamId) {
    currentTeamId = teamId;
    // Reinitialize with new team context
    isInitialized = false;
    initPromise = initializeTavilyClient();
    logger.info('Tavily team context updated', { teamId });
  }
}

/**
 * Initialize or reinitialize Tavily client
 */
async function initializeTavilyClient(): Promise<void> {
  try {
    const result = await loadSetting<{ apiKey: string }>(
      'tavilyApiKey',
      currentTeamId
    );
    if (result.success && result.data?.apiKey) {
      tavilyApiKey = result.data.apiKey;
      logger.info('Tavily API key loaded from settings', {
        teamId: currentTeamId,
      });
    } else {
      tavilyApiKey = null;
      logger.warn('Tavily API key not configured - web search disabled', {
        teamId: currentTeamId,
      });
    }
  } catch (error) {
    logger.error('Error loading Tavily API key:', error);
    tavilyApiKey = null;
  } finally {
    isInitialized = true;
  }
}

// Don't initialize on module load - wait for team context
// initPromise = initializeTavilyClient();

// Listen for API key updates (includes team ID in event detail)
if (typeof window !== 'undefined') {
  window.addEventListener('cpq-tavily-api-key-updated', ((
    event: CustomEvent<{ teamId?: string }>
  ) => {
    const teamId = event.detail?.teamId;
    logger.info('Tavily API key updated, reinitializing', { teamId });
    currentTeamId = teamId;
    isInitialized = false;
    initPromise = initializeTavilyClient();
  }) as EventListener);
}

/**
 * Check if Tavily search is available (synchronous)
 * Note: Returns false if not yet initialized - use checkTavilyAvailable() for async check
 */
export function isTavilyAvailable(): boolean {
  return tavilyApiKey !== null;
}

/**
 * Check if Tavily is available (async version)
 * Waits for initialization to complete before returning
 */
export async function checkTavilyAvailable(): Promise<boolean> {
  if (!isInitialized && initPromise) {
    await initPromise;
  }
  return tavilyApiKey !== null;
}

/**
 * Force refresh Tavily availability check
 * Call this to re-check after settings change
 */
export async function refreshTavilyAvailability(): Promise<boolean> {
  isInitialized = false;
  initPromise = initializeTavilyClient();
  await initPromise;
  return tavilyApiKey !== null;
}

/**
 * Search for component information using Tavily
 * @param query - Search query (e.g., part number or product name)
 * @param manufacturer - Optional manufacturer name for better results
 */
export async function searchComponent(
  query: string,
  manufacturer?: string
): Promise<TavilySearchResponse | null> {
  if (!tavilyApiKey) {
    logger.warn('Tavily API key not configured');
    return null;
  }

  try {
    // Build search query
    const searchQuery = manufacturer
      ? `${manufacturer} ${query} product specifications datasheet`
      : `${query} product specifications datasheet`;

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: searchQuery,
        max_results: 5,
        include_answer: true,
        search_depth: 'basic',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      query: searchQuery,
      results: data.results || [],
      answer: data.answer,
    };
  } catch (error) {
    logger.error('Tavily search error:', error);
    return null;
  }
}

/**
 * Identify component type from part number using web search + AI analysis
 * This is the main function used during document extraction
 *
 * Flow:
 * 1. Search Tavily for the product
 * 2. Send search results to Claude AI for intelligent analysis
 * 3. Return a proper Hebrew product name based on AI understanding
 */
export async function identifyComponent(
  partNumber: string,
  manufacturer?: string,
  __existingDescription?: string
): Promise<ComponentSearchResult> {
  if (!tavilyApiKey) {
    return {
      success: false,
      partNumber,
      error: 'Tavily API key not configured',
    };
  }

  try {
    // Step 1: Search Tavily for the product
    const searchResult = await searchComponent(partNumber, manufacturer);

    if (!searchResult || searchResult.results.length === 0) {
      return {
        success: false,
        partNumber,
        error: 'No search results found',
      };
    }

    // Step 2: Use Claude AI to analyze search results and generate Hebrew name
    const aiResult = await analyzeProductWithAI(
      partNumber,
      searchResult.results.map(r => ({
        title: r.title,
        content: r.content,
        url: r.url,
      })),
      searchResult.answer
    );

    if (!aiResult.success) {
      // Fallback: return basic info without AI analysis
      logger.warn('AI analysis failed, returning basic search info', {
        error: aiResult.error,
      });
      return {
        success: false,
        partNumber,
        error: aiResult.error || 'AI analysis failed',
      };
    }

    // Step 3: Return the AI-generated result
    return {
      success: true,
      partNumber,
      productType: aiResult.productType,
      productTypeHebrew: aiResult.hebrewName,
      manufacturer: aiResult.manufacturer,
      description: aiResult.specifications,
    };
  } catch (error) {
    logger.error('Component identification error:', error);
    return {
      success: false,
      partNumber,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch search for multiple part numbers
 * Useful for processing entire documents
 */
export async function batchIdentifyComponents(
  items: Array<{
    partNumber: string;
    manufacturer?: string;
    existingDescription?: string;
  }>,
  maxConcurrent = 3
): Promise<ComponentSearchResult[]> {
  if (!tavilyApiKey) {
    return items.map(item => ({
      success: false,
      partNumber: item.partNumber,
      error: 'Tavily API key not configured',
    }));
  }

  const results: ComponentSearchResult[] = [];

  // Process in batches to avoid rate limiting
  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(item =>
        identifyComponent(
          item.partNumber,
          item.manufacturer,
          item.existingDescription
        )
      )
    );
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + maxConcurrent < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
