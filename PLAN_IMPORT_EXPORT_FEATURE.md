# Import/Export System - Implementation Plan

## Overview

Comprehensive import/export feature for CPQ system backup, recovery, and team data management.

## Requirements Summary

### Data Scope

- ✅ Components (Library) - All component data with multi-currency pricing
- ✅ Assemblies (BOMs) - Nested structures with calculated costs
- ✅ Quotations (Projects) - Complete quotation projects with systems and items
- ✅ Settings & Configuration - Exchange rates, markups, categories, templates
- ✅ **User-selectable** - Choose which entities to include in each export

### File Formats

- ✅ JSON (.json) - Primary format with manifest and schema versioning
- ✅ Excel (.xlsx) - Human-readable structured format
- ✅ XML (.xml) - Industry standard for integration

### Export Strategy

- ✅ Full system export (single action for complete backup)
- ✅ Team-isolated (only current team's data)
- ✅ Configurable depth (user chooses: include/exclude price history, activity logs, attachments)
- ✅ Optional attachment inclusion (default: URLs only, optional: embed files)
- ✅ Full audit trail (track who exported what, when, file size, contents)

### Import Strategy

- ✅ Full preview with approval (parse → preview → confirm)
- ✅ Interactive conflict resolution (user decides per conflict)
- ✅ Batch processing (chunks with progress indicators)
- ✅ Preserve exact IDs (perfect disaster recovery)
- ✅ Preserve original currency (recalculate conversions on import)

### Security

- ✅ Admin-only access (role-based permission check)
- ✅ Encryption at rest (password-protected export files)
- ✅ Access control logging (audit trail of all operations)
- ✅ Direct browser download (no cloud storage)

### UI Integration

- ✅ Enhanced DatabaseSettings section in Settings page
- ✅ Replace placeholder buttons with full-featured interface

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DatabaseSettings UI                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Export Wizard│  │ Import Wizard│  │ History View │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ exportService  │  │ importService  │  │ auditService │  │
│  │ - extractData  │  │ - parseFile    │  │ - logExport  │  │
│  │ - serialize    │  │ - validate     │  │ - logImport  │  │
│  │ - encrypt      │  │ - detectConf.  │  │ - getHistory │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Format Handlers (Strategy Pattern)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  JSON    │  │  Excel   │  │   XML    │                  │
│  │ Handler  │  │ Handler  │  │ Handler  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database Layer                         │
│  components, quotations, assemblies, settings, audit_log     │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Foundation (Types & Database)

### 1.1 TypeScript Type Definitions

**File**: `src/types/import-export.types.ts`

```typescript
// Export manifest structure
interface ExportManifest {
  version: string;
  exportedAt: string;
  exportedBy: string;
  teamId: string;
  teamName: string;
  schemaVersion: string;
  includes: {
    components: boolean;
    assemblies: boolean;
    quotations: boolean;
    settings: boolean;
    priceHistory: boolean;
    activityLogs: boolean;
    attachments: boolean;
  };
  counts: {
    components: number;
    assemblies: number;
    quotations: number;
  };
  encryption: {
    enabled: boolean;
    algorithm?: string;
  };
}

// Export package structure
interface ExportPackage {
  manifest: ExportManifest;
  data: {
    components?: Component[];
    assemblies?: Assembly[];
    quotations?: QuotationProject[];
    settings?: SystemSettings;
  };
  relationships: RelationshipMap;
  attachments?: AttachmentData[];
}

// Import validation result
interface ImportValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  conflicts: DataConflict[];
  preview: ImportPreview;
}

// Conflict types
interface DataConflict {
  type: 'duplicate_id' | 'duplicate_business_key' | 'missing_reference';
  entityType: 'component' | 'assembly' | 'quotation';
  existingRecord?: any;
  importedRecord: any;
  resolution?: 'update' | 'skip' | 'create_new';
}
```

### 1.2 Database Schema

**Migration**: `supabase/migrations/YYYYMMDD_create_export_import_audit.sql`

```sql
-- Export/Import audit trail
CREATE TABLE export_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('export', 'import')),
  file_format TEXT NOT NULL CHECK (file_format IN ('json', 'excel', 'xml')),
  file_size_bytes BIGINT,
  record_counts JSONB,
  included_entities JSONB,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- RLS policies
ALTER TABLE export_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's export/import logs"
  ON export_import_logs FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can create export/import logs"
  ON export_import_logs FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## Phase 2: Export System

### 2.1 Export Service

**File**: `src/services/exportService.ts`

**Key Functions**:

- `exportData(options: ExportOptions): Promise<ExportPackage>`
- `extractComponents(teamId: string, includeHistory: boolean)`
- `extractAssemblies(teamId: string)`
- `extractQuotations(teamId: string, includeActivity: boolean)`
- `extractSettings(teamId: string)`
- `buildRelationshipMap(data: ExportData)`
- `generateManifest(data: ExportData, options: ExportOptions)`

**Features**:

- Team-isolated data extraction
- Configurable depth (related data)
- ID preservation
- Original currency preservation
- Relationship mapping

### 2.2 Format Handlers

**JSON Handler** (`src/services/formatHandlers/jsonHandler.ts`)

- Hybrid structure with manifest + normalized entities
- Schema versioning for forward compatibility
- Pretty-printed for human readability

**Excel Handler** (`src/services/formatHandlers/excelHandler.ts`)

- Multiple worksheets: Manifest, Components, Assemblies, Quotations, Settings
- Formatted columns with data validation
- Uses `xlsx` library

**XML Handler** (`src/services/formatHandlers/xmlHandler.ts`)

- Industry-standard schema with namespaces
- XSD schema for validation
- Uses `fast-xml-parser` library

### 2.3 Encryption Utility

**File**: `src/utils/encryption.ts`

- AES-256-GCM encryption
- Password-based key derivation (PBKDF2)
- Encrypted metadata in file header
- Uses Web Crypto API for browser compatibility

## Phase 3: Import System

### 3.1 Import Parser

**File**: `src/services/importService.ts`

**Key Functions**:

- `parseImportFile(file: File): Promise<ExportPackage>`
- `validateImportData(data: ExportPackage): Promise<ImportValidationResult>`
- `detectConflicts(data: ExportPackage, teamId: string): Promise<DataConflict[]>`
- `applyImport(data: ExportPackage, resolutions: ConflictResolution[])`

### 3.2 Validation Engine

- Schema version compatibility check
- TypeScript type validation
- Business rule validation (positive quantities, valid currencies)
- Foreign key integrity checks
- Team isolation enforcement

### 3.3 Batch Processor

**File**: `src/utils/batchProcessor.ts`

- Process large imports in chunks (500 records/batch)
- Progress tracking with callbacks
- Transaction management for rollback capability
- Memory-efficient streaming

### 3.4 Conflict Resolution

- Detect conflicts: duplicate IDs, existing part numbers
- Present user with options per conflict
- Preview changes before applying
- Generate conflict report

## Phase 4: User Interface

### 4.1 Enhanced DatabaseSettings Component

**File**: `src/components/settings/sections/DatabaseSettings.tsx`

Replace placeholder buttons with:

- Export section with entity selection
- Import section with file upload
- Export history table

### 4.2 Export Wizard Dialog

**File**: `src/components/settings/dialogs/ExportWizard.tsx`

**Steps**:

1. Select Entities (checkboxes)
2. Options (include history, format, encryption)
3. Review & Export (summary + action)

### 4.3 Import Wizard Dialog

**File**: `src/components/settings/dialogs/ImportWizard.tsx`

**Steps**:

1. Upload File (drag-drop)
2. Validation & Preview (show counts, detect conflicts)
3. Conflict Resolution (user decisions)
4. Confirm & Import (final review + action)

### 4.4 Export History Table

**Component**: Part of DatabaseSettings

**Columns**:

- Date, User, Entities, File Size, Format, Status
- Actions: Download, View Details

## Phase 5: Security & Testing

### 5.1 Security Implementation

- Admin-only access control check
- Encrypt sensitive pricing data in exports
- Audit logging for compliance
- Input validation on imports (prevent injection)
- File type validation (MIME type checking)

### 5.2 Test Coverage

**Unit Tests**:

- Export service (90% target)
- Import parser (90% target)
- Encryption utils (95% target)
- Format handlers (85% target)

**Integration Tests**:

- Full export → import cycle
- Conflict resolution workflow
- Batch processing with large datasets

**E2E Tests** (Optional):

- User workflow from UI to completion
- Export → manual file edit → import

**Security Tests**:

- Encryption strength
- Access control enforcement
- SQL injection prevention

### 5.3 Pricing Verification

- Test original currency preservation
- Verify exchange rate recalculation
- Validate markup and calculation integrity
- Test with real-world data samples

## File Structure

```
src/
├── services/
│   ├── exportService.ts           # Core export logic
│   ├── importService.ts           # Core import logic
│   ├── auditLogService.ts         # Export/import audit trail
│   └── formatHandlers/
│       ├── jsonHandler.ts
│       ├── excelHandler.ts
│       └── xmlHandler.ts
├── utils/
│   ├── encryption.ts              # AES-256 encryption
│   └── batchProcessor.ts          # Chunk processing
├── types/
│   └── import-export.types.ts     # Type definitions
├── components/
│   └── settings/
│       ├── sections/
│       │   └── DatabaseSettings.tsx    # Enhanced UI
│       └── dialogs/
│           ├── ExportWizard.tsx
│           ├── ImportWizard.tsx
│           ├── ConflictResolution.tsx
│           └── ExportHistory.tsx
└── hooks/
    ├── useExport.ts               # Export operations hook
    └── useImport.ts               # Import operations hook
```

## Success Criteria

✅ Admin can export full team data in JSON/Excel/XML format
✅ Exports are encrypted with password protection
✅ Import validates file and shows detailed preview
✅ Conflicts are detected and user can resolve interactively
✅ Original currency and IDs are preserved perfectly
✅ Batch processing handles 10,000+ components smoothly
✅ All operations logged in audit trail
✅ 85%+ test coverage for services
✅ Security audit passes (no data exposure risks)
✅ Type check passes with 0 errors

## Dependencies

**NPM Packages to Install**:

- `xlsx` - Excel file generation and parsing
- `fast-xml-parser` - XML parsing and generation
- `file-saver` - Browser file download utility

**Browser APIs**:

- Web Crypto API (for encryption)
- File API (for file uploads)
- Blob API (for file generation)

## Timeline Estimate

- Phase 1 (Foundation): Types + Database
- Phase 2 (Export): Core export service + format handlers
- Phase 3 (Import): Parser + validation + batch processing
- Phase 4 (UI): Wizards + enhanced settings page
- Phase 5 (Testing): Unit tests + integration tests + security audit

**Total**: 22 tracked tasks in todo list

## Notes

- Follow CLAUDE.md guidelines for TypeScript best practices
- All database operations through service layer
- Maintain pricing integrity and currency preservation
- Security is non-negotiable (admin-only + encryption)
- Test coverage must meet targets before commit
