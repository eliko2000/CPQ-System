/**
 * Component Type Classifier
 *
 * Intelligent classification of components into Hardware, Software, or Labor
 * with automatic detection based on name, description, and category.
 *
 * Supports both English and Hebrew keywords for maximum accuracy.
 */

import type { ComponentType, LaborSubtype } from '../types';

// ============ Classification Result ============

export interface ClassificationResult {
  componentType: ComponentType;
  laborSubtype?: LaborSubtype;
  confidence: number; // 0-1 score
  reasoning: string; // Why this classification was chosen
  keywords: string[]; // Keywords that triggered the classification
}

// ============ Keyword Patterns ============

// Software keywords (English + Hebrew)
const SOFTWARE_KEYWORDS = [
  // English
  'software', 'license', 'subscription', 'scada', 'hmi', 'plc software',
  'programming software', 'simulation', 'cad', 'cam', 'erp', 'mes',
  'cloud', 'saas', 'application', 'database', 'operating system', 'os',
  'firmware', 'driver', 'plugin', 'extension', 'sdk', 'api',
  'wincc', 'tia portal', 'step 7', 'rslogix', 'codesys', 'labview',

  // Hebrew
  'תוכנה', 'רישיון', 'מנוי', 'תוכנת', 'אפליקציה', 'מערכת הפעלה',
  'תוכנת תכנות', 'תוכנת סימולציה', 'תוכנת ניהול'
];

// Labor keywords (English + Hebrew)
const LABOR_KEYWORDS = [
  // English - General
  'labor', 'work', 'service', 'hour', 'hours', 'days', 'day work',
  'man hour', 'man-hour', 'manhour', 'person day', 'technician',
  'work day', 'working day', 'hourly', 'daily',

  // Hebrew - General
  'עבודה', 'שעות עבודה', 'ימי עבודה', 'יום עבודה', 'שעת עבודה',
  'טכנאי', 'איש יום', 'שירות'
];

// Engineering-specific keywords
const ENGINEERING_KEYWORDS = [
  // English
  'engineering', 'design', 'development', 'programming', 'coding',
  'software development', 'system design', 'plc programming',
  'hmi programming', 'robot programming', 'integration', 'customization',
  'configuration', 'setup', 'implementation', 'analysis',

  // Hebrew
  'הנדסה', 'תכנון', 'פיתוח', 'תכנות', 'אינטגרציה', 'התאמה אישית',
  'קונפיגורציה', 'הטמעה', 'ניתוח', 'תכנות רובוט', 'תכנות PLC'
];

// Commissioning-specific keywords
const COMMISSIONING_KEYWORDS = [
  // English
  'commissioning', 'startup', 'start-up', 'testing', 'test', 'validation',
  'verification', 'debugging', 'troubleshooting', 'optimization',
  'calibration', 'tuning', 'acceptance test', 'fat', 'sat',
  'factory acceptance', 'site acceptance', 'performance test',

  // Hebrew
  'הרצה', 'בדיקה', 'בדיקות', 'אימות', 'כיול', 'כיוונון', 'ניפוי שגיאות',
  'אופטימיזציה', 'בדיקת קבלה', 'בדיקת ביצועים'
];

// Installation-specific keywords
const INSTALLATION_KEYWORDS = [
  // English
  'installation', 'install', 'mounting', 'assembly', 'wiring',
  'cabling', 'mechanical installation', 'electrical installation',
  'field installation', 'on-site installation', 'deployment',

  // Hebrew
  'התקנה', 'הרכבה', 'חיווט', 'פריסה', 'התקנה מכנית',
  'התקנה חשמלית', 'התקנה בשטח'
];

// Robot-specific keywords (for robot analysis)
export const ROBOT_KEYWORDS = [
  // English
  'robot', 'robotic', 'arm', 'cobot', 'collaborative robot',
  'industrial robot', 'pick and place', 'palletizing robot',
  'welding robot', 'assembly robot', 'scara', 'delta robot',
  'articulated robot', 'cartesian robot', 'gantry',

  // Brands
  'abb', 'fanuc', 'kuka', 'yaskawa', 'motoman', 'staubli',
  'universal robots', 'ur3', 'ur5', 'ur10', 'ur16', 'ur20',
  'dobot', 'epson', 'denso', 'kawasaki', 'nachi',

  // Hebrew
  'רובוט', 'רובוטיקה', 'זרוע רובוטית', 'רובוט תעשייתי',
  'רובוט שיתופי', 'קובוט'
];

// ============ Helper Functions ============

/**
 * Check if text contains any of the keywords (case-insensitive)
 */
function containsKeyword(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }

  return foundKeywords;
}

/**
 * Calculate confidence based on keyword matches
 */
function calculateConfidence(
  keywordMatches: number,
  textLength: number
): number {
  // Base confidence from keyword matches
  let confidence = Math.min(0.3 + (keywordMatches * 0.2), 1.0);

  // Reduce confidence for very short text (less reliable)
  if (textLength < 10) {
    confidence *= 0.8;
  }

  return Number(confidence.toFixed(2));
}

// ============ Main Classification Functions ============

/**
 * Classify a component based on name, description, and category
 */
export function classifyComponent(
  name: string,
  category?: string,
  description?: string
): ClassificationResult {
  // Combine all text for analysis
  const combinedText = [name, category, description]
    .filter(Boolean)
    .join(' ');

  const textLength = combinedText.length;

  // 1. Check for Software keywords
  const softwareMatches = containsKeyword(combinedText, SOFTWARE_KEYWORDS);
  if (softwareMatches.length > 0) {
    return {
      componentType: 'software',
      confidence: calculateConfidence(softwareMatches.length, textLength),
      reasoning: 'Detected software-related keywords',
      keywords: softwareMatches
    };
  }

  // 2. Check for Labor keywords
  const laborMatches = containsKeyword(combinedText, LABOR_KEYWORDS);
  if (laborMatches.length > 0) {
    // Determine labor subtype
    const { subtype, subtypeKeywords } = classifyLaborSubtype(combinedText);

    return {
      componentType: 'labor',
      laborSubtype: subtype,
      confidence: calculateConfidence(
        laborMatches.length + subtypeKeywords.length,
        textLength
      ),
      reasoning: `Detected labor-related keywords (${subtype})`,
      keywords: [...laborMatches, ...subtypeKeywords]
    };
  }

  // 3. Default to Hardware
  // Most components are hardware, so this is a safe default
  return {
    componentType: 'hardware',
    confidence: 0.7, // Medium confidence for default
    reasoning: 'No software or labor keywords found - defaulting to hardware',
    keywords: []
  };
}

/**
 * Classify labor subtype based on text analysis
 */
export function classifyLaborSubtype(text: string): {
  subtype: LaborSubtype;
  subtypeKeywords: string[];
} {
  // Check each subtype in order of specificity
  const engineeringMatches = containsKeyword(text, ENGINEERING_KEYWORDS);
  if (engineeringMatches.length > 0) {
    return { subtype: 'engineering', subtypeKeywords: engineeringMatches };
  }

  const commissioningMatches = containsKeyword(text, COMMISSIONING_KEYWORDS);
  if (commissioningMatches.length > 0) {
    return { subtype: 'commissioning', subtypeKeywords: commissioningMatches };
  }

  const installationMatches = containsKeyword(text, INSTALLATION_KEYWORDS);
  if (installationMatches.length > 0) {
    return { subtype: 'installation', subtypeKeywords: installationMatches };
  }

  // Default to engineering for generic labor
  return { subtype: 'engineering', subtypeKeywords: [] };
}

/**
 * Check if component is robot-related (for statistics)
 */
export function isRobotComponent(
  name: string,
  category?: string,
  description?: string
): boolean {
  const combinedText = [name, category, description]
    .filter(Boolean)
    .join(' ');

  const matches = containsKeyword(combinedText, ROBOT_KEYWORDS);
  return matches.length > 0;
}

/**
 * Classify category into component type
 * Maps standard categories to types (for migration)
 */
export function classifyByCategory(category: string): ComponentType {
  const lowerCategory = category.toLowerCase();

  // Software categories
  if (lowerCategory.includes('software') ||
      lowerCategory.includes('license') ||
      lowerCategory.includes('תוכנה') ||
      lowerCategory.includes('רישיון')) {
    return 'software';
  }

  // Labor categories
  if (lowerCategory.includes('labor') ||
      lowerCategory.includes('work') ||
      lowerCategory.includes('service') ||
      lowerCategory.includes('עבודה') ||
      lowerCategory.includes('שירות') ||
      lowerCategory.includes('הנדסה') ||
      lowerCategory.includes('הרצה')) {
    return 'labor';
  }

  // Everything else is hardware
  return 'hardware';
}

/**
 * Batch classify multiple components
 */
export function classifyComponents(
  components: Array<{
    name: string;
    category?: string;
    description?: string;
  }>
): ClassificationResult[] {
  return components.map(comp =>
    classifyComponent(comp.name, comp.category, comp.description)
  );
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

/**
 * Suggest labor subtype based on item name
 */
export function suggestLaborSubtype(itemName: string): LaborSubtype {
  const result = classifyLaborSubtype(itemName);
  return result.subtype;
}
