/**
 * Component Matcher Service
 *
 * Implements 3-tier smart matching system to detect duplicate components:
 * 1. Exact Match (Fast, Free)
 * 2. Fuzzy Logic Match (Fast, Free)
 * 3. AI Semantic Match (Slower, API Cost)
 *
 * This prevents duplicate components when importing from supplier quotes
 * and enables price history tracking.
 */

import { supabase } from '../supabaseClient';
import { Component, DbComponent } from '../types';
import type { AIExtractedComponent } from './claudeAI';
import { compareTwoStrings } from 'string-similarity';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface FuzzyMatchReason {
  manufacturerSimilarity: number; // 0-1
  partNumberSimilarity: number; // 0-1
  nameSimilarity: number; // 0-1
  overallScore: number; // 0-1
}

export interface FuzzyMatchResult {
  component: Component;
  matchScore: number;
  matchReasons: FuzzyMatchReason;
}

export interface AIMatchResult {
  componentIndex: number;
  isMatch: boolean;
  confidence: number; // 0-1
  reasoning: string;
  recommendation: 'same_component' | 'different_component' | 'uncertain';
}

export type MatchType = 'exact' | 'fuzzy' | 'ai' | 'none';

export interface ComponentMatch {
  component: Component;
  confidence: number;
  reasoning: string;
}

export interface MatchResult {
  matchType: MatchType;
  matches: ComponentMatch[];
  newComponent: AIExtractedComponent;
}

// ============================================
// Configuration
// ============================================

const FUZZY_MATCH_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.9, // 90%+ - Auto-suggest as match
  MEDIUM_CONFIDENCE: 0.7, // 70-89% - Use AI to verify
  MIN_CONFIDENCE: 0.6, // 60% - Minimum to consider
};

const FUZZY_MATCH_WEIGHTS = {
  partNumber: 0.5, // Part number is most important
  manufacturer: 0.3, // Manufacturer is second
  name: 0.2, // Name is least important
};

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize string for comparison
 * Removes special characters, spaces, converts to lowercase
 */
function normalize(str: string | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .replace(/\s+/g, ''); // Remove spaces
}

/**
 * Transform DbComponent to Component (UI format)
 */
function dbToComponent(dbComp: DbComponent): Component {
  return {
    id: dbComp.id,
    name: dbComp.name,
    manufacturer: dbComp.manufacturer || '',
    manufacturerPN: dbComp.manufacturer_part_number || '',
    category: dbComp.category || 'אחר',
    componentType: 'hardware', // Default to hardware for matched components
    description: dbComp.description || '',
    unitCostNIS: dbComp.unit_cost_ils || 0,
    unitCostUSD: dbComp.unit_cost_usd || 0,
    unitCostEUR: dbComp.unit_cost_eur || 0,
    supplier: dbComp.supplier || '',
    currency: (dbComp.currency as 'NIS' | 'USD' | 'EUR') || 'USD',
    originalCost: dbComp.unit_cost_usd || dbComp.unit_cost_ils || 0,
    quoteDate: new Date().toISOString().split('T')[0],
    quoteFileUrl: '',
    notes: dbComp.notes || '',
    createdAt: dbComp.created_at,
    updatedAt: dbComp.updated_at,
  };
}

// ============================================
// TIER 1: Exact Match
// ============================================

/**
 * Try exact match on manufacturer + part number
 * This is the fastest and most reliable method
 */
async function exactMatch(
  manufacturer: string | undefined,
  partNumber: string | undefined
): Promise<Component | null> {
  if (!manufacturer || !partNumber) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('manufacturer', manufacturer)
      .eq('manufacturer_part_number', partNumber)
      .single();

    if (error || !data) {
      return null;
    }

    return dbToComponent(data);
  } catch (error) {
    logger.error('Exact match error:', error);
    return null;
  }
}

// ============================================
// TIER 2: Fuzzy Logic Match
// ============================================

/**
 * Use string similarity algorithms to find potential matches
 * Handles typos, variations, and formatting differences
 */
async function fuzzyMatch(
  newComponent: AIExtractedComponent
): Promise<FuzzyMatchResult[]> {
  try {
    // Get all components from library
    const { data: allComponents, error } = await supabase
      .from('components')
      .select('*');

    if (error || !allComponents) {
      logger.error('Error fetching components for fuzzy match:', error);
      return [];
    }

    const candidates: FuzzyMatchResult[] = [];

    // Calculate similarity for each existing component
    for (const dbComp of allComponents) {
      const existingComponent = dbToComponent(dbComp);

      // Calculate individual similarity scores
      const manufacturerScore = compareTwoStrings(
        normalize(newComponent.manufacturer),
        normalize(existingComponent.manufacturer)
      );

      const partNumberScore = compareTwoStrings(
        normalize(newComponent.manufacturerPN),
        normalize(existingComponent.manufacturerPN)
      );

      const nameScore = compareTwoStrings(
        normalize(newComponent.name),
        normalize(existingComponent.name)
      );

      // Calculate weighted overall score
      const overallScore =
        partNumberScore * FUZZY_MATCH_WEIGHTS.partNumber +
        manufacturerScore * FUZZY_MATCH_WEIGHTS.manufacturer +
        nameScore * FUZZY_MATCH_WEIGHTS.name;

      // Only consider if above minimum threshold
      if (overallScore >= FUZZY_MATCH_THRESHOLDS.MIN_CONFIDENCE) {
        candidates.push({
          component: existingComponent,
          matchScore: overallScore,
          matchReasons: {
            manufacturerSimilarity: manufacturerScore,
            partNumberSimilarity: partNumberScore,
            nameSimilarity: nameScore,
            overallScore,
          },
        });
      }
    }

    // Sort by match score (best first)
    return candidates.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    logger.error('Fuzzy match error:', error);
    return [];
  }
}

// ============================================
// TIER 3: AI Semantic Match
// ============================================

/**
 * Use Claude AI to understand semantic meaning and verify matches
 * This is more expensive but handles complex cases like:
 * - Different languages (Hebrew/English)
 * - Different naming conventions
 * - Manufacturer variations
 */
async function aiSemanticMatch(
  newComponent: AIExtractedComponent,
  candidateComponents: Component[]
): Promise<AIMatchResult[]> {
  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('Anthropic API key not configured');
      return [];
    }

    const anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Allow browser usage (API key is from env)
    });

    const prompt = `You are an expert in industrial automation components and robotics parts. Your task is to determine if components are the same physical product, even if described differently.

NEW COMPONENT from supplier quote:
- Name: ${newComponent.name || 'Unknown'}
- Manufacturer: ${newComponent.manufacturer || 'Unknown'}
- Part Number: ${newComponent.manufacturerPN || 'Unknown'}
- Description: ${newComponent.description || 'None'}

EXISTING COMPONENTS in library (candidates):
${candidateComponents
  .map(
    (c, i) => `
${i + 1}. Name: ${c.name}
   Manufacturer: ${c.manufacturer}
   Part Number: ${c.manufacturerPN}
   Category: ${c.category}
   Description: ${c.description || 'None'}
`
  )
  .join('\n')}

For each existing component, analyze if it is the SAME physical product as the new component.

Consider:
- Different naming conventions (e.g., "PLC" vs "Controller", "חיישן" vs "Sensor")
- Manufacturer variations (e.g., "Siemens" vs "SIEMENS AG" vs "Siemens Ltd")
- Part number formatting (e.g., "6ES7512-1DK01-0AB0" vs "6ES7 512-1DK01-0AB0" vs "6ES75121DK010AB0")
- Language differences (Hebrew vs English)
- Model variations within same product family
- Different descriptions for same product

Return ONLY a JSON array with this EXACT format:
[
  {
    "componentIndex": 1,
    "isMatch": true,
    "confidence": 0.95,
    "reasoning": "Same part number with minor formatting difference",
    "recommendation": "same_component"
  }
]

Do not include any other text, just the JSON array.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.error('AI response did not contain valid JSON:', responseText);
      return [];
    }

    const results: AIMatchResult[] = JSON.parse(jsonMatch[0]);
    return results;
  } catch (error) {
    logger.error('AI semantic match error:', error);
    return [];
  }
}

// ============================================
// Main Matching Function
// ============================================

/**
 * Find potential matches for a new component using 3-tier approach
 * Returns the best matches with confidence scores and reasoning
 */
export async function findComponentMatches(
  newComponent: AIExtractedComponent
): Promise<MatchResult> {
  // TIER 1: Try exact match first (fastest)
  logger.debug('🔍 Tier 1: Checking for exact match...');
  const exactResult = await exactMatch(
    newComponent.manufacturer,
    newComponent.manufacturerPN
  );

  if (exactResult) {
    logger.debug('✅ Exact match found!');
    return {
      matchType: 'exact',
      matches: [
        {
          component: exactResult,
          confidence: 1.0,
          reasoning: 'Exact match on manufacturer and part number',
        },
      ],
      newComponent,
    };
  }

  // TIER 2: Try fuzzy match
  logger.debug('🔍 Tier 2: Running fuzzy logic match...');
  const fuzzyResults = await fuzzyMatch(newComponent);

  if (fuzzyResults.length === 0) {
    logger.debug('❌ No fuzzy matches found - this is a new component');
    return {
      matchType: 'none',
      matches: [],
      newComponent,
    };
  }

  const bestFuzzyMatch = fuzzyResults[0];
  logger.debug(
    `📊 Best fuzzy match: ${(bestFuzzyMatch.matchScore * 100).toFixed(0)}% confidence`
  );

  // High confidence fuzzy match (90%+) - suggest immediately
  if (bestFuzzyMatch.matchScore >= FUZZY_MATCH_THRESHOLDS.HIGH_CONFIDENCE) {
    logger.debug('✅ High confidence fuzzy match found!');
    return {
      matchType: 'fuzzy',
      matches: fuzzyResults.slice(0, 3).map(r => ({
        component: r.component,
        confidence: r.matchScore,
        reasoning: `Fuzzy match: Manufacturer ${(r.matchReasons.manufacturerSimilarity * 100).toFixed(0)}%, PN ${(r.matchReasons.partNumberSimilarity * 100).toFixed(0)}%, Name ${(r.matchReasons.nameSimilarity * 100).toFixed(0)}%`,
      })),
      newComponent,
    };
  }

  // Medium confidence fuzzy match (70-89%) - use AI to verify
  if (bestFuzzyMatch.matchScore >= FUZZY_MATCH_THRESHOLDS.MEDIUM_CONFIDENCE) {
    logger.debug('🤖 Tier 3: Using AI to verify medium-confidence matches...');

    const topCandidates = fuzzyResults.slice(0, 3).map(r => r.component);
    const aiResults = await aiSemanticMatch(newComponent, topCandidates);

    // Find best AI match
    const bestAIMatch = aiResults
      .filter(r => r.isMatch && r.confidence >= 0.85)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (bestAIMatch) {
      logger.debug('✅ AI verified match found!');
      const matchedComponent = topCandidates[bestAIMatch.componentIndex - 1];
      return {
        matchType: 'ai',
        matches: [
          {
            component: matchedComponent,
            confidence: bestAIMatch.confidence,
            reasoning: `AI verified: ${bestAIMatch.reasoning}`,
          },
        ],
        newComponent,
      };
    }
  }

  // No good matches found - it's a new component
  logger.debug(
    '❌ No confident matches found - this appears to be a new component'
  );
  return {
    matchType: 'none',
    matches: [],
    newComponent,
  };
}

/**
 * Batch match multiple components (for processing entire quotes)
 */
export async function batchMatchComponents(
  newComponents: AIExtractedComponent[]
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const component of newComponents) {
    const matchResult = await findComponentMatches(component);
    results.push(matchResult);
  }

  return results;
}
