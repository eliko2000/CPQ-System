// Import/Export Types - Data backup, export, and import system

import type { Component, DbComponent } from './component.types';
import type {
  Assembly,
  DbAssembly,
  DbAssemblyComponent,
} from './assembly.types';
import type {
  QuotationProject,
  DbQuotation,
  DbQuotationSystem,
  DbQuotationItem,
} from './quotation.types';
import type { Currency } from './common.types';

// ============ Export Configuration ============

/**
 * File formats supported for export/import
 */
export type ExportFormat = 'json' | 'excel' | 'xml';

/**
 * Export operation status
 */
export type ExportStatus =
  | 'preparing'
  | 'exporting'
  | 'encrypting'
  | 'completed'
  | 'failed';

/**
 * Import operation status
 */
export type ImportStatus =
  | 'uploading'
  | 'parsing'
  | 'validating'
  | 'resolving_conflicts'
  | 'importing'
  | 'completed'
  | 'failed';

/**
 * Export options selected by user
 */
export interface ExportOptions {
  // Entity selection
  includeComponents: boolean;
  includeAssemblies: boolean;
  includeQuotations: boolean;
  includeSettings: boolean;

  // Related data depth
  includePriceHistory: boolean;
  includeActivityLogs: boolean;
  includeAttachments: boolean; // Embed files vs URLs only

  // Output format
  format: ExportFormat;

  // Security
  encryptData: boolean;
  password?: string; // Required if encryptData is true

  // Metadata
  description?: string; // User description of this export
}

/**
 * Import options
 */
export interface ImportOptions {
  // Conflict resolution strategy (if not interactive)
  defaultConflictResolution?: 'update' | 'skip' | 'create_new';

  // Validation strictness
  strictValidation: boolean; // Fail on warnings or only on errors

  // Batch size for processing
  batchSize: number; // Default: 500

  // Decryption
  password?: string; // Required if file is encrypted
}

// ============ Export Manifest ============

/**
 * Metadata about the export package
 */
export interface ExportManifest {
  // Package metadata
  version: string; // Package format version (e.g., "1.0.0")
  schemaVersion: string; // Database schema version
  exportedAt: string; // ISO timestamp
  exportedBy: string; // User ID
  exportedByEmail?: string; // User email for reference

  // Team context
  teamId: string;
  teamName: string;

  // Content description
  description?: string; // User-provided description
  includes: {
    components: boolean;
    assemblies: boolean;
    quotations: boolean;
    settings: boolean;
    priceHistory: boolean;
    activityLogs: boolean;
    attachments: boolean;
  };

  // Record counts
  counts: {
    components: number;
    assemblies: number;
    quotations: number;
    quotationSystems: number;
    quotationItems: number;
    attachments: number;
  };

  // Encryption status
  encryption: {
    enabled: boolean;
    algorithm?: string; // e.g., "AES-256-GCM"
    keyDerivation?: string; // e.g., "PBKDF2"
  };

  // File metadata
  fileSizeBytes?: number;
  compressionUsed?: boolean;
}

// ============ Export Package Structure ============

/**
 * Relationship mapping for foreign keys
 */
export interface RelationshipMap {
  // Component → Quotation Items
  componentToItems: Record<string, string[]>; // componentId → itemIds

  // Assembly → Components
  assemblyToComponents: Record<string, string[]>; // assemblyId → componentIds

  // Quotation → Systems → Items
  quotationToSystems: Record<string, string[]>; // quotationId → systemIds
  systemToItems: Record<string, string[]>; // systemId → itemIds

  // Component → Assembly membership
  componentToAssemblies: Record<string, string[]>; // componentId → assemblyIds
}

/**
 * Attachment data (embedded or referenced)
 */
export interface AttachmentData {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  url?: string; // Original URL if not embedded
  embedded: boolean;
  base64Data?: string; // Base64 encoded file content if embedded
  entityType: 'component' | 'quotation';
  entityId: string;
}

/**
 * System settings export
 */
export interface SystemSettings {
  // Exchange rates
  exchangeRates: {
    usdToIls: number;
    eurToIls: number;
    updatedAt: string;
  };

  // Default pricing parameters
  defaultPricing: {
    markupPercent: number;
    profitPercent: number;
    riskPercent: number;
    vatRate: number;
    includeVAT: boolean;
    dayWorkCost: number;
  };

  // Component categories
  categories: string[];

  // Custom numbering templates
  numberingTemplates?: {
    projectNumberFormat?: string;
    quotationNumberFormat?: string;
  };

  // Team preferences
  preferences?: {
    defaultCurrency: Currency;
    dateFormat?: string;
    language?: string;
  };
}

/**
 * Complete export package
 */
export interface ExportPackage {
  manifest: ExportManifest;
  data: {
    components?: DbComponent[];
    assemblies?: DbAssembly[];
    assemblyComponents?: DbAssemblyComponent[];
    quotations?: DbQuotation[];
    quotationSystems?: DbQuotationSystem[];
    quotationItems?: DbQuotationItem[];
    settings?: SystemSettings;
  };
  relationships: RelationshipMap;
  attachments?: AttachmentData[];
}

// ============ Import Validation ============

/**
 * Validation error severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Validation error details
 */
export interface ValidationError {
  severity: ValidationSeverity;
  entityType:
    | 'component'
    | 'assembly'
    | 'quotation'
    | 'system'
    | 'item'
    | 'setting';
  entityId?: string;
  entityName?: string;
  field?: string;
  message: string;
  code: string; // Error code for programmatic handling
}

/**
 * Data conflict types
 */
export type ConflictType =
  | 'duplicate_id' // Same UUID exists
  | 'duplicate_business_key' // Same manufacturer + part number
  | 'missing_reference' // Referenced entity doesn't exist
  | 'version_mismatch' // Schema version incompatibility
  | 'team_mismatch'; // Data from different team

/**
 * Data conflict details
 */
export interface DataConflict {
  type: ConflictType;
  entityType: 'component' | 'assembly' | 'quotation';
  entityId: string;
  entityName: string;

  // Conflict details
  existingRecord?: Partial<Component | Assembly | QuotationProject>;
  importedRecord: Partial<Component | Assembly | QuotationProject>;

  // Resolution (set by user or default strategy)
  resolution?: 'update' | 'skip' | 'create_new';
  resolvedBy?: 'user' | 'auto';

  // Additional context
  message: string;
  affectedCount?: number; // Number of dependent records
}

/**
 * Import preview summary
 */
export interface ImportPreview {
  // What will be created/updated
  toCreate: {
    components: number;
    assemblies: number;
    quotations: number;
  };
  toUpdate: {
    components: number;
    assemblies: number;
    quotations: number;
  };
  toSkip: {
    components: number;
    assemblies: number;
    quotations: number;
  };

  // Sample records for user review
  sampleComponents: DbComponent[];
  sampleQuotations: DbQuotation[];

  // Pricing integrity check
  totalOriginalCurrencies: {
    nis: number;
    usd: number;
    eur: number;
  };
}

/**
 * Complete import validation result
 */
export interface ImportValidationResult {
  valid: boolean; // True if no errors (warnings OK)
  errors: ValidationError[];
  warnings: ValidationError[];
  conflicts: DataConflict[];
  preview: ImportPreview;

  // Compatibility checks
  schemaCompatible: boolean;
  teamIdMatch: boolean;

  // File integrity
  fileIntegrity: {
    manifestValid: boolean;
    relationshipsIntact: boolean;
    recordCountsMatch: boolean;
  };
}

/**
 * Conflict resolution decisions
 */
export interface ConflictResolution {
  conflictId: string; // Reference to DataConflict
  entityId: string;
  entityType: string;
  resolution: 'update' | 'skip' | 'create_new';
  newId?: string; // If create_new, specify the new UUID
}

// ============ Import Progress ============

/**
 * Progress update during import
 */
export interface ImportProgress {
  status: ImportStatus;
  currentBatch: number;
  totalBatches: number;
  recordsProcessed: number;
  totalRecords: number;
  currentEntity: 'component' | 'assembly' | 'quotation' | 'setting';
  percentComplete: number;
  errors: number;
  warnings: number;
}

/**
 * Import result summary
 */
export interface ImportResult {
  success: boolean;
  recordsCreated: {
    components: number;
    assemblies: number;
    quotations: number;
  };
  recordsUpdated: {
    components: number;
    assemblies: number;
    quotations: number;
  };
  recordsSkipped: {
    components: number;
    assemblies: number;
    quotations: number;
  };
  errors: ValidationError[];
  warnings: ValidationError[];
  duration: number; // Milliseconds
  completedAt: string; // ISO timestamp
}

// ============ Audit Trail ============

/**
 * Export/Import audit log entry (database schema)
 */
export interface DbExportImportLog {
  id: string;
  team_id: string;
  user_id: string;
  operation_type: 'export' | 'import';
  file_format: ExportFormat;
  file_size_bytes?: number;
  record_counts?: {
    components?: number;
    assemblies?: number;
    quotations?: number;
  };
  included_entities?: {
    components: boolean;
    assemblies: boolean;
    quotations: boolean;
    settings: boolean;
    priceHistory: boolean;
    activityLogs: boolean;
    attachments: boolean;
  };
  status: 'started' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Audit log entry (application model)
 */
export interface ExportImportLog {
  id: string;
  teamId: string;
  userId: string;
  userEmail?: string;
  operationType: 'export' | 'import';
  fileFormat: ExportFormat;
  fileSizeBytes?: number;
  recordCounts?: {
    components?: number;
    assemblies?: number;
    quotations?: number;
  };
  includedEntities?: {
    components: boolean;
    assemblies: boolean;
    quotations: boolean;
    settings: boolean;
  };
  status: 'started' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  duration?: number; // Milliseconds (calculated)
}

// ============ Encryption ============

/**
 * Encrypted file wrapper
 */
export interface EncryptedExportFile {
  encrypted: true;
  algorithm: string; // e.g., "AES-256-GCM"
  keyDerivation: string; // e.g., "PBKDF2"
  salt: string; // Base64 encoded salt for key derivation
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
  encryptedData: string; // Base64 encoded encrypted ExportPackage JSON
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  success: boolean;
  data?: ExportPackage;
  error?: string;
}
