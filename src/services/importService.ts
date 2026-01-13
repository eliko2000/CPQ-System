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
  AttachmentData,
  SystemSettings,
} from '@/types/import-export.types';
import type { DbComponent } from '@/types/component.types';
import type { DbAssembly, DbAssemblyComponent } from '@/types/assembly.types';
import type {
  DbQuotation,
  DbQuotationSystem,
  DbQuotationItem,
} from '@/types/quotation.types';

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

    // Not encrypted - validate structure
    if (!parsed.manifest || !parsed.data || !parsed.relationships) {
      const missing: string[] = [];
      if (!parsed.manifest) missing.push('manifest');
      if (!parsed.data) missing.push('data');
      if (!parsed.relationships) missing.push('relationships');

      return {
        success: false,
        error: `Invalid export package structure. Missing: ${missing.join(', ')}`,
      };
    }

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
 * Implements batch processing with progress tracking
 */
export async function applyImport(
  exportPackage: ExportPackage,
  teamId: string,
  resolutions: ConflictResolution[],
  options?: ImportOptions,
  progressCallback?: ImportProgressCallback
): Promise<ImportServiceResult> {
  const startTime = Date.now();
  const batchSize = options?.batchSize || 100;

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
    completedAt: '',
  };

  try {
    logger.info('Starting import operation', { teamId, batchSize });

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Create audit log entry
    const { data: logEntry } = await supabase
      .from('export_import_logs')
      .insert({
        team_id: teamId,
        user_id: user.id,
        operation_type: 'import',
        file_format: exportPackage.manifest.includes.components
          ? 'json'
          : 'json',
        record_counts: exportPackage.manifest.counts,
        included_entities: exportPackage.manifest.includes,
        status: 'started',
      })
      .select()
      .single();

    const logId = logEntry?.id;

    try {
      // Build resolution map for quick lookup
      const resolutionMap = new Map(resolutions.map(r => [r.entityId, r]));

      // Calculate total records (including attachments for accurate progress)
      const totalRecords =
        (exportPackage.data.components?.length || 0) +
        (exportPackage.data.assemblies?.length || 0) +
        (exportPackage.data.quotations?.length || 0) +
        (exportPackage.attachments?.length || 0);

      let recordsProcessed = 0;

      // ========== STEP 1: Import Components ==========
      if (
        exportPackage.data.components &&
        exportPackage.data.components.length > 0
      ) {
        const componentResult = await importComponents(
          exportPackage.data.components,
          teamId,
          resolutionMap,
          batchSize,
          progress => {
            progressCallback?.({
              status: 'importing',
              currentEntity: 'component',
              currentBatch: progress.currentBatch,
              totalBatches: progress.totalBatches,
              recordsProcessed: recordsProcessed + progress.recordsProcessed,
              totalRecords,
              percentComplete:
                ((recordsProcessed + progress.recordsProcessed) /
                  totalRecords) *
                100,
              errors: result.errors.length,
              warnings: result.warnings.length,
            });
          }
        );

        result.recordsCreated.components = componentResult.created;
        result.recordsUpdated.components = componentResult.updated;
        result.recordsSkipped.components = componentResult.skipped;
        result.errors.push(...componentResult.errors);
        result.warnings.push(...componentResult.warnings);
        recordsProcessed += exportPackage.data.components.length;
      }

      // ========== STEP 2: Import Assemblies ==========
      if (
        exportPackage.data.assemblies &&
        exportPackage.data.assemblies.length > 0
      ) {
        const assemblyResult = await importAssemblies(
          exportPackage.data.assemblies,
          exportPackage.data.assemblyComponents || [],
          teamId,
          resolutionMap,
          batchSize,
          progress => {
            progressCallback?.({
              status: 'importing',
              currentEntity: 'assembly',
              currentBatch: progress.currentBatch,
              totalBatches: progress.totalBatches,
              recordsProcessed: recordsProcessed + progress.recordsProcessed,
              totalRecords,
              percentComplete:
                ((recordsProcessed + progress.recordsProcessed) /
                  totalRecords) *
                100,
              errors: result.errors.length,
              warnings: result.warnings.length,
            });
          }
        );

        result.recordsCreated.assemblies = assemblyResult.created;
        result.recordsUpdated.assemblies = assemblyResult.updated;
        result.recordsSkipped.assemblies = assemblyResult.skipped;
        result.errors.push(...assemblyResult.errors);
        result.warnings.push(...assemblyResult.warnings);
        recordsProcessed += exportPackage.data.assemblies.length;
      }

      // ========== STEP 3: Import Quotations ==========
      if (
        exportPackage.data.quotations &&
        exportPackage.data.quotations.length > 0
      ) {
        const quotationResult = await importQuotations(
          exportPackage.data.quotations,
          exportPackage.data.quotationSystems || [],
          exportPackage.data.quotationItems || [],
          teamId,
          resolutionMap,
          batchSize,
          progress => {
            progressCallback?.({
              status: 'importing',
              currentEntity: 'quotation',
              currentBatch: progress.currentBatch,
              totalBatches: progress.totalBatches,
              recordsProcessed: recordsProcessed + progress.recordsProcessed,
              totalRecords,
              percentComplete:
                ((recordsProcessed + progress.recordsProcessed) /
                  totalRecords) *
                100,
              errors: result.errors.length,
              warnings: result.warnings.length,
            });
          }
        );

        result.recordsCreated.quotations = quotationResult.created;
        result.recordsUpdated.quotations = quotationResult.updated;
        result.recordsSkipped.quotations = quotationResult.skipped;
        result.errors.push(...quotationResult.errors);
        result.warnings.push(...quotationResult.warnings);
        recordsProcessed += exportPackage.data.quotations.length;
      }

      // ========== STEP 4: Restore Attachments (if included) ==========
      if (exportPackage.attachments && exportPackage.attachments.length > 0) {
        const attachmentResult = await restoreAttachments(
          exportPackage.attachments,
          teamId,
          progress => {
            progressCallback?.({
              status: 'importing',
              currentEntity: 'attachment',
              currentBatch: progress.current,
              totalBatches: progress.total,
              currentOperation: progress.operation,
              recordsProcessed: recordsProcessed + progress.current,
              totalRecords,
              percentComplete:
                ((recordsProcessed + progress.current) / totalRecords) * 100,
              errors: result.errors.length,
              warnings: result.warnings.length,
            });
          }
        );
        result.warnings.push(...attachmentResult.warnings);
        recordsProcessed += exportPackage.attachments.length;
      }

      // ========== STEP 5: Restore Settings (if included) ==========
      if (exportPackage.data.settings) {
        const settingsResult = await restoreSettings(
          exportPackage.data.settings,
          teamId
        );
        result.warnings.push(...settingsResult.warnings);
      }

      // Calculate duration
      result.duration = Date.now() - startTime;
      result.completedAt = new Date().toISOString();

      // Update audit log - success
      if (logId) {
        await supabase.rpc('complete_export_import_operation', {
          p_log_id: logId,
          p_status: 'completed',
        });
      }

      logger.info('Import completed successfully', {
        created: result.recordsCreated,
        updated: result.recordsUpdated,
        skipped: result.recordsSkipped,
        errors: result.errors.length,
        warnings: result.warnings.length,
        duration: result.duration,
      });

      return {
        success: true,
        data: result,
        logId,
      };
    } catch (error) {
      // Update audit log - failed
      if (logId) {
        await supabase.rpc('complete_export_import_operation', {
          p_log_id: logId,
          p_status: 'failed',
          p_error_message:
            error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Import failed:', error);
    result.success = false;
    result.duration = Date.now() - startTime;
    result.completedAt = new Date().toISOString();

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
      data: result,
    };
  }
}

/**
 * Import components in batches
 */
async function importComponents(
  components: DbComponent[],
  teamId: string,
  resolutionMap: Map<string, ConflictResolution>,
  batchSize: number,
  progressCallback?: (progress: {
    currentBatch: number;
    totalBatches: number;
    recordsProcessed: number;
  }) => void
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}> {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as ValidationError[],
    warnings: [] as ValidationError[],
  };

  const totalBatches = Math.ceil(components.length / batchSize);

  for (let i = 0; i < components.length; i += batchSize) {
    const batch = components.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;

    const toCreate: DbComponent[] = [];
    const toUpdate: { id: string; data: Partial<DbComponent> }[] = [];

    for (const component of batch) {
      const resolution = resolutionMap.get(component.id);

      if (resolution?.resolution === 'skip') {
        result.skipped++;
        continue;
      }

      if (resolution?.resolution === 'create_new') {
        // Generate new ID and create
        toCreate.push({
          ...component,
          id: resolution.newId || crypto.randomUUID(),
          team_id: teamId,
        });
      } else if (resolution?.resolution === 'update') {
        // Update existing record
        toUpdate.push({
          id: component.id,
          data: {
            ...component,
            team_id: teamId,
          },
        });
      } else {
        // No conflict in target team
        // CRITICAL: Check if this is cross-team import
        if (component.team_id && component.team_id !== teamId) {
          // Cross-team import - MUST generate new ID to avoid overwriting source team
          logger.debug(
            `Cross-team import detected for component ${component.id}, generating new ID`
          );
          toCreate.push({
            ...component,
            id: crypto.randomUUID(),
            team_id: teamId,
          });
        } else {
          // Same team disaster recovery - preserve original ID
          toCreate.push({
            ...component,
            team_id: teamId,
          });
        }
      }
    }

    // Batch upsert new components (INSERT or UPDATE if exists)
    if (toCreate.length > 0) {
      try {
        const { error } = await supabase
          .from('components')
          .upsert(toCreate, { onConflict: 'id' });

        if (error) {
          logger.error('Failed to upsert component batch:', error);
          result.errors.push({
            severity: 'error',
            entityType: 'component',
            message: `Failed to upsert batch: ${error.message}`,
            code: 'BATCH_UPSERT_FAILED',
          });
        } else {
          result.created += toCreate.length;
        }
      } catch (error) {
        logger.error('Component batch upsert error:', error);
        result.errors.push({
          severity: 'error',
          entityType: 'component',
          message:
            error instanceof Error ? error.message : 'Batch upsert failed',
          code: 'BATCH_UPSERT_ERROR',
        });
      }
    }

    // Batch update existing components
    for (const update of toUpdate) {
      try {
        const { error } = await supabase
          .from('components')
          .update(update.data)
          .eq('id', update.id)
          .eq('team_id', teamId);

        if (error) {
          logger.error('Failed to update component:', error);
          result.errors.push({
            severity: 'error',
            entityType: 'component',
            entityId: update.id,
            message: `Failed to update: ${error.message}`,
            code: 'UPDATE_FAILED',
          });
        } else {
          result.updated++;
        }
      } catch (error) {
        logger.error('Component update error:', error);
        result.errors.push({
          severity: 'error',
          entityType: 'component',
          entityId: update.id,
          message: error instanceof Error ? error.message : 'Update failed',
          code: 'UPDATE_ERROR',
        });
      }
    }

    progressCallback?.({
      currentBatch,
      totalBatches,
      recordsProcessed: Math.min(i + batchSize, components.length),
    });
  }

  return result;
}

/**
 * Import assemblies and their components in batches
 */
async function importAssemblies(
  assemblies: DbAssembly[],
  assemblyComponents: DbAssemblyComponent[],
  teamId: string,
  resolutionMap: Map<string, ConflictResolution>,
  batchSize: number,
  progressCallback?: (progress: {
    currentBatch: number;
    totalBatches: number;
    recordsProcessed: number;
  }) => void
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}> {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as ValidationError[],
    warnings: [] as ValidationError[],
  };

  const totalBatches = Math.ceil(assemblies.length / batchSize);
  const idMapping = new Map<string, string>(); // old ID -> new ID for create_new

  for (let i = 0; i < assemblies.length; i += batchSize) {
    const batch = assemblies.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;

    const toCreate: DbAssembly[] = [];
    const toUpdate: { id: string; data: Partial<DbAssembly> }[] = [];

    for (const assembly of batch) {
      const resolution = resolutionMap.get(assembly.id);

      if (resolution?.resolution === 'skip') {
        result.skipped++;
        continue;
      }

      if (resolution?.resolution === 'create_new') {
        const newId = resolution.newId || crypto.randomUUID();
        idMapping.set(assembly.id, newId);
        toCreate.push({
          ...assembly,
          id: newId,
          team_id: teamId,
        });
      } else if (resolution?.resolution === 'update') {
        toUpdate.push({
          id: assembly.id,
          data: {
            ...assembly,
            team_id: teamId,
          },
        });
      } else {
        // No conflict in target team
        // CRITICAL: Check if this is cross-team import
        if (assembly.team_id && assembly.team_id !== teamId) {
          // Cross-team import - MUST generate new ID
          const newId = crypto.randomUUID();
          idMapping.set(assembly.id, newId);
          logger.debug(
            `Cross-team import detected for assembly ${assembly.id}, generating new ID ${newId}`
          );
          toCreate.push({
            ...assembly,
            id: newId,
            team_id: teamId,
          });
        } else {
          // Same team disaster recovery - preserve original ID
          toCreate.push({
            ...assembly,
            team_id: teamId,
          });
        }
      }
    }

    // Batch upsert new assemblies (INSERT or UPDATE if exists)
    if (toCreate.length > 0) {
      try {
        const { error } = await supabase
          .from('assemblies')
          .upsert(toCreate, { onConflict: 'id' });

        if (error) {
          result.errors.push({
            severity: 'error',
            entityType: 'assembly',
            message: `Failed to insert batch: ${error.message}`,
            code: 'BATCH_INSERT_FAILED',
          });
        } else {
          result.created += toCreate.length;
        }
      } catch (error) {
        result.errors.push({
          severity: 'error',
          entityType: 'assembly',
          message:
            error instanceof Error ? error.message : 'Batch insert failed',
          code: 'BATCH_INSERT_ERROR',
        });
      }
    }

    // Batch update existing assemblies
    for (const update of toUpdate) {
      try {
        const { error } = await supabase
          .from('assemblies')
          .update(update.data)
          .eq('id', update.id)
          .eq('team_id', teamId);

        if (error) {
          result.errors.push({
            severity: 'error',
            entityType: 'assembly',
            entityId: update.id,
            message: `Failed to update: ${error.message}`,
            code: 'UPDATE_FAILED',
          });
        } else {
          result.updated++;
        }
      } catch (error) {
        result.errors.push({
          severity: 'error',
          entityType: 'assembly',
          entityId: update.id,
          message: error instanceof Error ? error.message : 'Update failed',
          code: 'UPDATE_ERROR',
        });
      }
    }

    progressCallback?.({
      currentBatch,
      totalBatches,
      recordsProcessed: Math.min(i + batchSize, assemblies.length),
    });
  }

  // Import assembly_components relationships
  if (assemblyComponents.length > 0) {
    const componentsToInsert = assemblyComponents.map(ac => ({
      ...ac,
      assembly_id: idMapping.get(ac.assembly_id) || ac.assembly_id,
      team_id: teamId,
    }));

    try {
      // Delete existing assembly_components for updated assemblies
      const assemblyIds = [
        ...new Set(componentsToInsert.map(c => c.assembly_id)),
      ];
      await supabase
        .from('assembly_components')
        .delete()
        .in('assembly_id', assemblyIds)
        .eq('team_id', teamId);

      // Upsert relationships (INSERT or UPDATE if exists)
      const { error } = await supabase
        .from('assembly_components')
        .upsert(componentsToInsert, { onConflict: 'id' });

      if (error) {
        result.warnings.push({
          severity: 'warning',
          entityType: 'assembly',
          message: `Failed to restore assembly components: ${error.message}`,
          code: 'ASSEMBLY_COMPONENTS_FAILED',
        });
      }
    } catch (error) {
      result.warnings.push({
        severity: 'warning',
        entityType: 'assembly',
        message:
          error instanceof Error
            ? error.message
            : 'Assembly components restore failed',
        code: 'ASSEMBLY_COMPONENTS_ERROR',
      });
    }
  }

  return result;
}

/**
 * Import quotations with systems and items in batches
 */
async function importQuotations(
  quotations: DbQuotation[],
  quotationSystems: DbQuotationSystem[],
  quotationItems: DbQuotationItem[],
  teamId: string,
  resolutionMap: Map<string, ConflictResolution>,
  batchSize: number,
  progressCallback?: (progress: {
    currentBatch: number;
    totalBatches: number;
    recordsProcessed: number;
  }) => void
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}> {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as ValidationError[],
    warnings: [] as ValidationError[],
  };

  const totalBatches = Math.ceil(quotations.length / batchSize);
  const idMapping = new Map<string, string>(); // old ID -> new ID
  const systemIdMapping = new Map<string, string>(); // old system ID -> new system ID

  for (let i = 0; i < quotations.length; i += batchSize) {
    const batch = quotations.slice(i, i + batchSize);
    const currentBatch = Math.floor(i / batchSize) + 1;

    const toCreate: DbQuotation[] = [];
    const toUpdate: { id: string; data: Partial<DbQuotation> }[] = [];

    for (const quotation of batch) {
      const resolution = resolutionMap.get(quotation.id);

      if (resolution?.resolution === 'skip') {
        result.skipped++;
        continue;
      }

      if (resolution?.resolution === 'create_new') {
        const newId = resolution.newId || crypto.randomUUID();
        idMapping.set(quotation.id, newId);
        toCreate.push({
          ...quotation,
          id: newId,
          team_id: teamId,
        });
      } else if (resolution?.resolution === 'update') {
        toUpdate.push({
          id: quotation.id,
          data: {
            ...quotation,
            team_id: teamId,
          },
        });
      } else {
        // No conflict in target team
        // CRITICAL: Check if this is cross-team import
        if (quotation.team_id && quotation.team_id !== teamId) {
          // Cross-team import - MUST generate new ID
          const newId = crypto.randomUUID();
          idMapping.set(quotation.id, newId);
          logger.debug(
            `Cross-team import detected for quotation ${quotation.id}, generating new ID ${newId}`
          );
          toCreate.push({
            ...quotation,
            id: newId,
            team_id: teamId,
          });
        } else {
          // Same team disaster recovery - preserve original ID
          toCreate.push({
            ...quotation,
            team_id: teamId,
          });
        }
      }
    }

    // Batch upsert new quotations (INSERT or UPDATE if exists)
    if (toCreate.length > 0) {
      try {
        const { error } = await supabase
          .from('quotations')
          .upsert(toCreate, { onConflict: 'id' });

        if (error) {
          result.errors.push({
            severity: 'error',
            entityType: 'quotation',
            message: `Failed to insert batch: ${error.message}`,
            code: 'BATCH_INSERT_FAILED',
          });
        } else {
          result.created += toCreate.length;
        }
      } catch (error) {
        result.errors.push({
          severity: 'error',
          entityType: 'quotation',
          message:
            error instanceof Error ? error.message : 'Batch insert failed',
          code: 'BATCH_INSERT_ERROR',
        });
      }
    }

    // Batch update existing quotations
    for (const update of toUpdate) {
      try {
        const { error } = await supabase
          .from('quotations')
          .update(update.data)
          .eq('id', update.id)
          .eq('team_id', teamId);

        if (error) {
          result.errors.push({
            severity: 'error',
            entityType: 'quotation',
            entityId: update.id,
            message: `Failed to update: ${error.message}`,
            code: 'UPDATE_FAILED',
          });
        } else {
          result.updated++;
        }
      } catch (error) {
        result.errors.push({
          severity: 'error',
          entityType: 'quotation',
          entityId: update.id,
          message: error instanceof Error ? error.message : 'Update failed',
          code: 'UPDATE_ERROR',
        });
      }
    }

    progressCallback?.({
      currentBatch,
      totalBatches,
      recordsProcessed: Math.min(i + batchSize, quotations.length),
    });
  }

  // Import quotation_systems
  if (quotationSystems.length > 0) {
    const systemsToInsert = quotationSystems.map(qs => {
      const newSystemId = crypto.randomUUID();
      systemIdMapping.set(qs.id, newSystemId);
      return {
        ...qs,
        id: newSystemId,
        quotation_id: idMapping.get(qs.quotation_id) || qs.quotation_id,
        team_id: teamId,
      };
    });

    try {
      const quotationIds = [
        ...new Set(systemsToInsert.map(s => s.quotation_id)),
      ];
      await supabase
        .from('quotation_systems')
        .delete()
        .in('quotation_id', quotationIds)
        .eq('team_id', teamId);

      const { error } = await supabase
        .from('quotation_systems')
        .upsert(systemsToInsert, { onConflict: 'id' });

      if (error) {
        result.warnings.push({
          severity: 'warning',
          entityType: 'quotation',
          message: `Failed to restore quotation systems: ${error.message}`,
          code: 'QUOTATION_SYSTEMS_FAILED',
        });
      }
    } catch (error) {
      result.warnings.push({
        severity: 'warning',
        entityType: 'quotation',
        message:
          error instanceof Error
            ? error.message
            : 'Quotation systems restore failed',
        code: 'QUOTATION_SYSTEMS_ERROR',
      });
    }
  }

  // Import quotation_items
  if (quotationItems.length > 0) {
    const itemsToInsert = quotationItems.map(qi => ({
      ...qi,
      id: crypto.randomUUID(),
      quotation_system_id:
        systemIdMapping.get(qi.quotation_system_id) || qi.quotation_system_id,
      team_id: teamId,
    }));

    try {
      const systemIds = [
        ...new Set(itemsToInsert.map(i => i.quotation_system_id)),
      ];
      await supabase
        .from('quotation_items')
        .delete()
        .in('quotation_system_id', systemIds)
        .eq('team_id', teamId);

      const { error } = await supabase
        .from('quotation_items')
        .upsert(itemsToInsert, { onConflict: 'id' });

      if (error) {
        result.warnings.push({
          severity: 'warning',
          entityType: 'quotation',
          message: `Failed to restore quotation items: ${error.message}`,
          code: 'QUOTATION_ITEMS_FAILED',
        });
      }
    } catch (error) {
      result.warnings.push({
        severity: 'warning',
        entityType: 'quotation',
        message:
          error instanceof Error
            ? error.message
            : 'Quotation items restore failed',
        code: 'QUOTATION_ITEMS_ERROR',
      });
    }
  }

  return result;
}

/**
 * Get MIME type from filename extension
 */
function getMimeTypeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Sanitize filename for storage (ASCII-only, safe characters)
 * Preserves file extension
 */
function sanitizeFilename(filename: string): string {
  // Extract extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name =
    lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

  // Replace non-ASCII and unsafe characters with underscores
  // Keep only: letters, numbers, hyphens, underscores
  const safeName = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

  // If name becomes empty, use timestamp
  const finalName = safeName || `file_${Date.now()}`;

  const result = `${finalName}${extension}`;

  // Log sanitization for debugging
  if (filename !== result) {
    logger.debug(`[Import] Sanitized filename: "${filename}" -> "${result}"`);
  }

  return result;
}

/**
 * Restore attachments (supplier quote files) to storage
 */
async function restoreAttachments(
  attachments: AttachmentData[],
  teamId: string,
  progressCallback?: (progress: {
    current: number;
    total: number;
    operation: string;
  }) => void
): Promise<{
  warnings: ValidationError[];
}> {
  const warnings: ValidationError[] = [];
  const total = attachments.length;

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];

    // Report progress
    progressCallback?.({
      current: i + 1,
      total,
      operation: `מעלה קובץ: ${attachment.fileName}`,
    });
    if (!attachment.embedded || !attachment.base64Data) {
      warnings.push({
        severity: 'warning',
        entityType: 'system',
        message: `Attachment ${attachment.fileName} was not embedded and cannot be restored`,
        code: 'ATTACHMENT_NOT_EMBEDDED',
      });
      continue;
    }

    try {
      // Decode base64 data
      const fileData = Uint8Array.from(atob(attachment.base64Data), c =>
        c.charCodeAt(0)
      );

      // Sanitize filename for storage (removes Hebrew/special characters)
      const sanitizedFileName = sanitizeFilename(attachment.fileName);

      // Get proper MIME type from file extension
      const mimeType = getMimeTypeFromFilename(attachment.fileName);

      // Upload to storage with sanitized filename
      const filePath = `${teamId}/${attachment.entityId}/${sanitizedFileName}`;

      logger.info(
        `[Import] Uploading file: ${attachment.fileName} -> ${filePath} (MIME: ${mimeType})`
      );

      const { error: uploadError } = await supabase.storage
        .from('supplier-quotes')
        .upload(filePath, fileData, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        logger.error(
          `[Import] File upload failed: ${attachment.fileName}`,
          uploadError
        );

        // Check if it's an RLS policy violation
        const isRLSError =
          uploadError.message?.includes('row-level security') ||
          uploadError.message?.includes('policy');

        warnings.push({
          severity: 'warning',
          entityType: 'system',
          message: isRLSError
            ? `RLS policy blocked upload: ${attachment.fileName}. Check storage bucket permissions.`
            : `Failed to upload ${attachment.fileName}: ${uploadError.message}`,
          code: isRLSError
            ? 'RLS_POLICY_VIOLATION'
            : 'ATTACHMENT_UPLOAD_FAILED',
        });
        continue;
      }

      logger.info(
        `[Import] File uploaded successfully: ${attachment.fileName}`
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('supplier-quotes')
        .getPublicUrl(filePath);

      // Create supplier_quotes record if entity type is component
      // Store ORIGINAL filename for display, but use sanitized URL
      // CRITICAL: Always use new ID for cross-team imports to avoid overwriting source
      if (attachment.entityType === 'component') {
        const { error: dbError } = await supabase
          .from('supplier_quotes')
          .upsert(
            {
              id: crypto.randomUUID(), // Always generate new ID for imported files
              file_name: attachment.fileName, // Original filename for display
              file_url: urlData.publicUrl, // URL with sanitized filename
              file_type: attachment.fileType,
              file_size_kb: Math.round(attachment.fileSizeBytes / 1024),
              status: 'completed',
              team_id: teamId,
            },
            { onConflict: 'id' }
          );

        if (dbError) {
          logger.error(
            `[Import] Failed to create supplier_quotes record for ${attachment.fileName}`,
            dbError
          );
          warnings.push({
            severity: 'warning',
            entityType: 'system',
            message: `File uploaded but database record failed: ${attachment.fileName}`,
            code: 'DB_RECORD_FAILED',
          });
        }
      }
    } catch (error) {
      warnings.push({
        severity: 'warning',
        entityType: 'system',
        message: `Failed to restore attachment ${attachment.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'ATTACHMENT_RESTORE_ERROR',
      });
    }
  }

  return { warnings };
}

/**
 * Restore system settings to user_settings table
 */
async function restoreSettings(
  settings: SystemSettings,
  teamId: string
): Promise<{
  warnings: ValidationError[];
}> {
  const warnings: ValidationError[] = [];

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      warnings.push({
        severity: 'warning',
        entityType: 'setting',
        message: 'Settings not restored: no authenticated user',
        code: 'NO_USER',
      });
      return { warnings };
    }

    // Restore component categories
    if (settings.categories && settings.categories.length > 0) {
      const { error: categoriesError } = await supabase
        .from('user_settings')
        .upsert(
          {
            setting_key: 'componentCategories',
            setting_value: { categories: settings.categories },
            team_id: teamId,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,setting_key' }
        );

      if (categoriesError) {
        logger.error('[Import] Failed to restore categories:', categoriesError);
        warnings.push({
          severity: 'warning',
          entityType: 'setting',
          message: `Failed to restore categories: ${categoriesError.message}`,
          code: 'CATEGORIES_RESTORE_FAILED',
        });
      } else {
        logger.info(
          `[Import] Restored ${settings.categories.length} categories`
        );
      }
    }

    // Restore exchange rates
    if (settings.exchangeRates) {
      const { error: ratesError } = await supabase.from('user_settings').upsert(
        {
          setting_key: 'exchangeRates',
          setting_value: {
            usdToIls: settings.exchangeRates.usdToIls,
            eurToIls: settings.exchangeRates.eurToIls,
            updatedAt: settings.exchangeRates.updatedAt,
          },
          team_id: teamId,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,setting_key' }
      );

      if (ratesError) {
        logger.error('[Import] Failed to restore exchange rates:', ratesError);
        warnings.push({
          severity: 'warning',
          entityType: 'setting',
          message: `Failed to restore exchange rates: ${ratesError.message}`,
          code: 'EXCHANGE_RATES_RESTORE_FAILED',
        });
      } else {
        logger.info('[Import] Restored exchange rates');
      }
    }

    // Restore numbering templates
    if (settings.numberingTemplates) {
      const { error: numberingError } = await supabase
        .from('user_settings')
        .upsert(
          {
            setting_key: 'numbering_config',
            setting_value: settings.numberingTemplates,
            team_id: teamId,
            user_id: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,setting_key' }
        );

      if (numberingError) {
        logger.error(
          '[Import] Failed to restore numbering templates:',
          numberingError
        );
        warnings.push({
          severity: 'warning',
          entityType: 'setting',
          message: `Failed to restore numbering templates: ${numberingError.message}`,
          code: 'NUMBERING_RESTORE_FAILED',
        });
      } else {
        logger.info('[Import] Restored numbering templates');
      }
    }

    logger.info('[Import] Settings restore complete');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Settings restore failed';
    logger.error('[Import] Settings restore error:', error);

    warnings.push({
      severity: 'warning',
      entityType: 'setting',
      message: errorMessage,
      code: 'SETTINGS_RESTORE_ERROR',
    });
  }

  return { warnings };
}
