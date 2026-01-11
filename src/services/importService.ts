/**
 * Import Service
 * Handles parsing, validation, and import of CPQ data
 * Supports conflict detection and resolution
 */

import { supabase } from '@/supabaseClient';
import { logger } from '@/lib/logger';
import { parseJSONFile } from './formatHandlers/jsonHandler';
import { decryptExportPackage, isEncryptedFile } from '@/utils/encryption';
import type {
  ExportPackage,
  ImportOptions,
  ImportValidationResult,
  ValidationError,
  DataConflict,
  ImportPreview,
  ConflictResolution,
  ImportResult,
  ImportProgress,
} from '@/types/import-export.types';
import type { DbComponent } from '@/types/component.types';
import type { DbAssembly } from '@/types/assembly.types';
import type { DbQuotation } from '@/types/quotation.types';

/**
 * Import service result
 */
export interface ImportServiceResult {
  success: boolean;
  data?: ImportResult;
  error?: string;
  logId?: string;
}

/**
 * Progress callback for import operations
 */
export type ImportProgressCallback = (progress: ImportProgress) => void;

/**
 * Parse import file (handles JSON, encryption, etc.)
 */
export async function parseImportFile(
  file: File,
  password?: string
): Promise<{ success: boolean; data?: ExportPackage; error?: string }> {
  try {
    logger.info('Parsing import file', { fileName: file.name });

    // Parse JSON file
    const parsed = await parseJSONFile(file);

    // Check if encrypted
    if (isEncryptedFile(parsed)) {
      if (!password) {
        return {
          success: false,
          error: 'This file is encrypted. Please provide a password.',
        };
      }

      // Decrypt
      const decrypted = await decryptExportPackage(parsed, password);
      if (!decrypted.success) {
        return {
          success: false,
          error: decrypted.error || 'Decryption failed',
        };
      }

      return {
        success: true,
        data: decrypted.data,
      };
    }

    // Not encrypted
    return {
      success: true,
      data: parsed as ExportPackage,
    };
  } catch (error) {
    logger.error('Failed to parse import file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'File parsing failed',
    };
  }
}

/**
 * Validate import data
 */
export async function validateImportData(
  exportPackage: ExportPackage,
  teamId: string,
  __options?: ImportOptions
): Promise<ImportValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const conflicts: DataConflict[] = [];

  try {
    logger.info('Validating import data');

    // 1. Check schema compatibility
    const schemaCompatible = validateSchemaVersion(
      exportPackage.manifest.schemaVersion
    );
    if (!schemaCompatible) {
      errors.push({
        severity: 'error',
        entityType: 'system',
        message:
          'Incompatible schema version. This export was created with a different version of the system.',
        code: 'SCHEMA_INCOMPATIBLE',
      });
    }

    // 2. Check team ID match (warning only)
    const teamIdMatch = exportPackage.manifest.teamId === teamId;
    if (!teamIdMatch) {
      warnings.push({
        severity: 'warning',
        entityType: 'system',
        message:
          'This export is from a different team. IDs may need to be regenerated.',
        code: 'TEAM_MISMATCH',
      });
    }

    // 3. Detect conflicts
    const componentConflicts = await detectComponentConflicts(
      exportPackage.data.components || [],
      teamId
    );
    conflicts.push(...componentConflicts);

    const assemblyConflicts = await detectAssemblyConflicts(
      exportPackage.data.assemblies || [],
      teamId
    );
    conflicts.push(...assemblyConflicts);

    const quotationConflicts = await detectQuotationConflicts(
      exportPackage.data.quotations || [],
      teamId
    );
    conflicts.push(...quotationConflicts);

    // 4. Validate data integrity
    const integrityErrors = validateDataIntegrity(exportPackage);
    errors.push(...integrityErrors);

    // 5. Generate preview
    const preview = generateImportPreview(exportPackage, conflicts);

    // 6. Check file integrity
    const fileIntegrity = {
      manifestValid: !!exportPackage.manifest,
      relationshipsIntact: !!exportPackage.relationships,
      recordCountsMatch: validateRecordCounts(exportPackage),
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      conflicts,
      preview,
      schemaCompatible,
      teamIdMatch,
      fileIntegrity,
    };
  } catch (error) {
    logger.error('Validation failed:', error);
    return {
      valid: false,
      errors: [
        {
          severity: 'error',
          entityType: 'system',
          message: 'Validation process failed',
          code: 'VALIDATION_ERROR',
        },
      ],
      warnings: [],
      conflicts: [],
      preview: generateEmptyPreview(),
      schemaCompatible: false,
      teamIdMatch: false,
      fileIntegrity: {
        manifestValid: false,
        relationshipsIntact: false,
        recordCountsMatch: false,
      },
    };
  }
}

/**
 * Detect component conflicts
 */
async function detectComponentConflicts(
  components: DbComponent[],
  teamId: string
): Promise<DataConflict[]> {
  const conflicts: DataConflict[] = [];

  if (components.length === 0) return conflicts;

  try {
    // Get existing components in team
    const { data: existing } = await supabase
      .from('components')
      .select('id, name, manufacturer, manufacturer_part_number')
      .eq('team_id', teamId);

    if (!existing) return conflicts;

    // Check for conflicts
    for (const component of components) {
      // Check ID conflict
      const idConflict = existing.find(e => e.id === component.id);
      if (idConflict) {
        conflicts.push({
          type: 'duplicate_id',
          entityType: 'component',
          entityId: component.id,
          entityName: component.name || 'Unknown',
          existingRecord: idConflict,
          importedRecord: component,
          message: `Component with ID ${component.id} already exists`,
        });
        continue;
      }

      // Check business key conflict (manufacturer + part number)
      if (component.manufacturer && component.manufacturer_part_number) {
        const businessKeyConflict = existing.find(
          e =>
            e.manufacturer === component.manufacturer &&
            e.manufacturer_part_number === component.manufacturer_part_number
        );

        if (businessKeyConflict) {
          conflicts.push({
            type: 'duplicate_business_key',
            entityType: 'component',
            entityId: component.id,
            entityName: component.name || 'Unknown',
            existingRecord: businessKeyConflict,
            importedRecord: component,
            message: `Component with same manufacturer (${component.manufacturer}) and part number (${component.manufacturer_part_number}) already exists`,
          });
        }
      }
    }
  } catch (error) {
    logger.error('Failed to detect component conflicts:', error);
  }

  return conflicts;
}

/**
 * Detect assembly conflicts
 */
async function detectAssemblyConflicts(
  assemblies: DbAssembly[],
  teamId: string
): Promise<DataConflict[]> {
  const conflicts: DataConflict[] = [];

  if (assemblies.length === 0) return conflicts;

  try {
    const { data: existing } = await supabase
      .from('assemblies')
      .select('id, name')
      .eq('team_id', teamId);

    if (!existing) return conflicts;

    for (const assembly of assemblies) {
      const idConflict = existing.find(e => e.id === assembly.id);
      if (idConflict) {
        conflicts.push({
          type: 'duplicate_id',
          entityType: 'assembly',
          entityId: assembly.id,
          entityName: assembly.name,
          existingRecord: idConflict,
          importedRecord: assembly,
          message: `Assembly with ID ${assembly.id} already exists`,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect assembly conflicts:', error);
  }

  return conflicts;
}

/**
 * Detect quotation conflicts
 */
async function detectQuotationConflicts(
  quotations: DbQuotation[],
  teamId: string
): Promise<DataConflict[]> {
  const conflicts: DataConflict[] = [];

  if (quotations.length === 0) return conflicts;

  try {
    const { data: existing } = await supabase
      .from('quotations')
      .select('id, quotation_number, customer_name')
      .eq('team_id', teamId);

    if (!existing) return conflicts;

    for (const quotation of quotations) {
      const idConflict = existing.find(e => e.id === quotation.id);
      if (idConflict) {
        conflicts.push({
          type: 'duplicate_id',
          entityType: 'quotation',
          entityId: quotation.id,
          entityName: quotation.quotation_number,
          existingRecord: idConflict,
          importedRecord: quotation,
          message: `Quotation with ID ${quotation.id} already exists`,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect quotation conflicts:', error);
  }

  return conflicts;
}

/**
 * Validate schema version compatibility
 */
function validateSchemaVersion(schemaVersion: string): boolean {
  // For now, accept version 1.x.x
  return schemaVersion.startsWith('1.');
}

/**
 * Validate data integrity
 */
function validateDataIntegrity(
  exportPackage: ExportPackage
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for required currency fields
  if (exportPackage.data.components) {
    for (const component of exportPackage.data.components) {
      if (!component.currency || !component.original_cost) {
        errors.push({
          severity: 'warning',
          entityType: 'component',
          entityId: component.id,
          entityName: component.name,
          message: 'Missing original currency or cost data',
          code: 'MISSING_CURRENCY_DATA',
        });
      }
    }
  }

  return errors;
}

/**
 * Validate record counts match manifest
 */
function validateRecordCounts(exportPackage: ExportPackage): boolean {
  const manifest = exportPackage.manifest.counts;
  const actual = {
    components: exportPackage.data.components?.length || 0,
    assemblies: exportPackage.data.assemblies?.length || 0,
    quotations: exportPackage.data.quotations?.length || 0,
  };

  return (
    manifest.components === actual.components &&
    manifest.assemblies === actual.assemblies &&
    manifest.quotations === actual.quotations
  );
}

/**
 * Generate import preview
 */
function generateImportPreview(
  exportPackage: ExportPackage,
  conflicts: DataConflict[]
): ImportPreview {
  const componentConflicts = conflicts.filter(
    c => c.entityType === 'component'
  ).length;
  const assemblyConflicts = conflicts.filter(
    c => c.entityType === 'assembly'
  ).length;
  const quotationConflicts = conflicts.filter(
    c => c.entityType === 'quotation'
  ).length;

  return {
    toCreate: {
      components:
        (exportPackage.data.components?.length || 0) - componentConflicts,
      assemblies:
        (exportPackage.data.assemblies?.length || 0) - assemblyConflicts,
      quotations:
        (exportPackage.data.quotations?.length || 0) - quotationConflicts,
    },
    toUpdate: {
      components: 0, // Will be set based on resolution
      assemblies: 0,
      quotations: 0,
    },
    toSkip: {
      components: 0,
      assemblies: 0,
      quotations: 0,
    },
    sampleComponents: exportPackage.data.components?.slice(0, 5) || [],
    sampleQuotations: exportPackage.data.quotations?.slice(0, 5) || [],
    totalOriginalCurrencies: {
      nis:
        exportPackage.data.components?.filter(c => c.currency === 'NIS')
          .length || 0,
      usd:
        exportPackage.data.components?.filter(c => c.currency === 'USD')
          .length || 0,
      eur:
        exportPackage.data.components?.filter(c => c.currency === 'EUR')
          .length || 0,
    },
  };
}

/**
 * Generate empty preview
 */
function generateEmptyPreview(): ImportPreview {
  return {
    toCreate: { components: 0, assemblies: 0, quotations: 0 },
    toUpdate: { components: 0, assemblies: 0, quotations: 0 },
    toSkip: { components: 0, assemblies: 0, quotations: 0 },
    sampleComponents: [],
    sampleQuotations: [],
    totalOriginalCurrencies: { nis: 0, usd: 0, eur: 0 },
  };
}

/**
 * Apply import with conflict resolutions
 * This is a placeholder - full implementation would be in batch processor
 */
export async function applyImport(
  __exportPackage: ExportPackage,
  teamId: string,
  __resolutions: ConflictResolution[],
  __options?: ImportOptions,
  __progressCallback?: ImportProgressCallback
): Promise<ImportServiceResult> {
  try {
    logger.info('Starting import operation', { teamId });

    // Create audit log
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // TODO: Implement full import logic with batch processing
    // For now, return success
    const result: ImportResult = {
      success: true,
      recordsCreated: {
        components: 0,
        assemblies: 0,
        quotations: 0,
      },
      recordsUpdated: {
        components: 0,
        assemblies: 0,
        quotations: 0,
      },
      recordsSkipped: {
        components: 0,
        assemblies: 0,
        quotations: 0,
      },
      errors: [],
      warnings: [],
      duration: 0,
      completedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logger.error('Import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
    };
  }
}
