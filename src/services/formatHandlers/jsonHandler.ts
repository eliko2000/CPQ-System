/**
 * JSON Format Handler
 * Serializes and deserializes export packages to/from JSON format
 * Uses hybrid structure with manifest + normalized entities
 */

import type { ExportPackage } from '@/types/import-export.types';
import { logger } from '@/lib/logger';

/**
 * Serialize export package to JSON string
 * Pretty-printed for human readability
 */
export function serializeToJSON(exportPackage: ExportPackage): string {
  try {
    return JSON.stringify(exportPackage, null, 2);
  } catch (error) {
    logger.error('Failed to serialize to JSON:', error);
    throw new Error('JSON serialization failed');
  }
}

/**
 * Serialize export package to JSON Blob for download
 */
export function createJSONBlob(exportPackage: ExportPackage): Blob {
  try {
    const jsonString = serializeToJSON(exportPackage);
    return new Blob([jsonString], { type: 'application/json' });
  } catch (error) {
    logger.error('Failed to create JSON blob:', error);
    throw new Error('Failed to create JSON file');
  }
}

/**
 * Parse JSON string to export package
 */
export function parseJSONString(jsonString: string): ExportPackage {
  try {
    const parsed = JSON.parse(jsonString);

    // Validate structure
    if (!parsed.manifest || !parsed.data || !parsed.relationships) {
      throw new Error('Invalid export package structure');
    }

    return parsed as ExportPackage;
  } catch (error) {
    logger.error('Failed to parse JSON:', error);
    throw new Error('Invalid JSON format');
  }
}

/**
 * Parse JSON file to export package
 */
export async function parseJSONFile(file: File): Promise<ExportPackage> {
  try {
    const text = await file.text();
    return parseJSONString(text);
  } catch (error) {
    logger.error('Failed to parse JSON file:', error);
    throw new Error('Failed to read JSON file');
  }
}

/**
 * Generate filename for JSON export
 */
export function generateJSONFilename(
  teamName: string,
  timestamp: string
): string {
  const sanitizedName = teamName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const date = new Date(timestamp).toISOString().split('T')[0];
  return `CPQ_Export_${sanitizedName}_${date}.json`;
}

/**
 * Validate JSON export package structure
 */
export function validateJSONStructure(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required top-level properties
  if (!data.manifest) errors.push('Missing manifest');
  if (!data.data) errors.push('Missing data');
  if (!data.relationships) errors.push('Missing relationships');

  // Validate manifest structure
  if (data.manifest) {
    if (!data.manifest.version) errors.push('Missing manifest.version');
    if (!data.manifest.schemaVersion)
      errors.push('Missing manifest.schemaVersion');
    if (!data.manifest.exportedAt) errors.push('Missing manifest.exportedAt');
    if (!data.manifest.teamId) errors.push('Missing manifest.teamId');
  }

  // Validate data structure
  if (data.data) {
    // Components should be array if present
    if (
      data.data.components !== undefined &&
      !Array.isArray(data.data.components)
    ) {
      errors.push('data.components must be an array');
    }

    // Assemblies should be array if present
    if (
      data.data.assemblies !== undefined &&
      !Array.isArray(data.data.assemblies)
    ) {
      errors.push('data.assemblies must be an array');
    }

    // Quotations should be array if present
    if (
      data.data.quotations !== undefined &&
      !Array.isArray(data.data.quotations)
    ) {
      errors.push('data.quotations must be an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get size estimate for JSON export
 */
export function estimateJSONSize(exportPackage: ExportPackage): number {
  try {
    const jsonString = serializeToJSON(exportPackage);
    return new Blob([jsonString]).size;
  } catch (error) {
    logger.error('Failed to estimate JSON size:', error);
    return 0;
  }
}

/**
 * Compress JSON data (minify)
 */
export function compressJSON(exportPackage: ExportPackage): string {
  try {
    return JSON.stringify(exportPackage); // No pretty-print for compression
  } catch (error) {
    logger.error('Failed to compress JSON:', error);
    throw new Error('JSON compression failed');
  }
}
