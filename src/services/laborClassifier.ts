/**
 * Labor Subtype Classification Service
 *
 * Automatically detects labor subtype from component name and description
 * using keyword matching in both Hebrew and English.
 */

import type { LaborSubtype } from '../types';

interface LaborClassification {
  laborSubtype: LaborSubtype;
  confidence: number; // 0-1 score indicating match confidence
  matchedKeywords: string[];
}

// Keyword patterns for each labor subtype
const LABOR_KEYWORDS: Record<LaborSubtype, string[]> = {
  engineering: [
    // Hebrew - includes programming/development
    'הנדסה',
    'הנדס',
    'תכנון',
    'עיצוב',
    'תכנן',
    'מהנדס',
    'תכנות',
    'תכנת',
    'קוד',
    'סקריפט',
    'תוכנה',
    'פיתוח',
    'קידוד',
    'plc',
    'hmi',
    'scada',
    // English
    'engineering',
    'engineer',
    'design',
    'planning',
    'architect',
    'programming',
    'program',
    'coding',
    'code',
    'software',
    'development',
    'script',
    'ladder',
    'logic',
  ],
  commissioning: [
    // Hebrew
    'הזמנה',
    'הפעלה',
    'הזמנות',
    'הפעלות',
    'קבלת עבודה',
    'אימות',
    'ריצה',
    'בדיקה',
    'טסט',
    'ניסוי',
    // English
    'commissioning',
    'startup',
    'testing',
    'validation',
    'checkout',
    'trial',
    'run',
    'acceptance',
  ],
  installation: [
    // Hebrew
    'התקנה',
    'התקנת',
    'מתקין',
    'הרכבה',
    'הרכב',
    'הקמה',
    'בנייה',
    // English
    'installation',
    'install',
    'mounting',
    'assembly',
    'setup',
    'installation',
    'install',
    'mounting',
    'assembly',
    'setup',
    'construction',
    'erection',
  ],
  programming: [
    // Hebrew
    'תכנות',
    'קוד',
    'פיתוח',
    'תוכנה',
    // English
    'programming',
    'coding',
    'software',
    'development',
  ],
};

/**
 * Classify labor component into subtype based on name and description
 *
 * @param name - Component name
 * @param description - Optional component description
 * @returns Classification result with confidence score
 */
export function classifyLaborSubtype(
  name: string,
  description?: string
): LaborClassification {
  const text = `${name} ${description || ''}`.toLowerCase();

  // Track matches for each subtype
  const matches: Record<LaborSubtype, { count: number; keywords: string[] }> = {
    engineering: { count: 0, keywords: [] },
    commissioning: { count: 0, keywords: [] },
    installation: { count: 0, keywords: [] },
    programming: { count: 0, keywords: [] },
  };

  // Check each subtype's keywords
  for (const [subtype, keywords] of Object.entries(LABOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches[subtype as LaborSubtype].count++;
        matches[subtype as LaborSubtype].keywords.push(keyword);
      }
    }
  }

  // Find subtype with most matches
  let bestSubtype: LaborSubtype = 'engineering'; // default
  let maxCount = 0;
  let matchedKeywords: string[] = [];

  for (const [subtype, match] of Object.entries(matches)) {
    if (match.count > maxCount) {
      maxCount = match.count;
      bestSubtype = subtype as LaborSubtype;
      matchedKeywords = match.keywords;
    }
  }

  // Calculate confidence based on number of matches and text length
  // More matches = higher confidence, but cap at 0.95 (never 100% certain)
  const confidence = maxCount > 0 ? Math.min(0.95, 0.5 + maxCount * 0.15) : 0.3; // Low confidence if no matches

  return {
    laborSubtype: bestSubtype,
    confidence,
    matchedKeywords,
  };
}

/**
 * Get suggested labor subtype with confidence indicator
 * Returns undefined if not confident enough
 *
 * @param name - Component name
 * @param description - Optional description
 * @param minConfidence - Minimum confidence threshold (default 0.5)
 * @returns Suggested subtype or undefined
 */
export function suggestLaborSubtype(
  name: string,
  description?: string,
  minConfidence: number = 0.5
): LaborSubtype | undefined {
  const classification = classifyLaborSubtype(name, description);

  if (classification.confidence >= minConfidence) {
    return classification.laborSubtype;
  }

  return undefined;
}

/**
 * Get all labor subtypes with their confidence scores
 * Useful for showing multiple suggestions to user
 */
export function getAllLaborScores(
  name: string,
  description?: string
): Array<{ subtype: LaborSubtype; confidence: number; keywords: string[] }> {
  const text = `${name} ${description || ''}`.toLowerCase();
  const results: Array<{
    subtype: LaborSubtype;
    confidence: number;
    keywords: string[];
  }> = [];

  for (const [subtype, keywords] of Object.entries(LABOR_KEYWORDS)) {
    const matchedKeywords: string[] = [];
    let matchCount = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }

    const confidence =
      matchCount > 0 ? Math.min(0.95, 0.5 + matchCount * 0.15) : 0;

    results.push({
      subtype: subtype as LaborSubtype,
      confidence,
      keywords: matchedKeywords,
    });
  }

  // Sort by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence);
}
