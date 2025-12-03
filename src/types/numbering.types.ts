/**
 * Numbering System Types
 * Defines types for customizable project and quotation numbering
 */

/**
 * Numbering configuration for projects and quotations
 */
export interface NumberingConfig {
  projectPrefix: string; // e.g., "PRJ"
  quotationPrefix: string; // e.g., "QT"
  padding: number; // Number of digits (e.g., 4 for 0001)
  separator: string; // e.g., "-"
}

/**
 * Default numbering configuration
 */
export const DEFAULT_NUMBERING_CONFIG: NumberingConfig = {
  projectPrefix: 'PRJ',
  quotationPrefix: 'QT',
  padding: 4,
  separator: '-',
};

/**
 * Database record for numbering sequences
 */
export interface DbNumberingSequence {
  id: string;
  team_id: string;
  sequence_type: 'project' | 'quotation';
  current_value: number;
  created_at: string;
  updated_at: string;
}

/**
 * Result from generating a new number
 */
export interface GeneratedNumber {
  number: string;
  sequenceValue: number;
}
