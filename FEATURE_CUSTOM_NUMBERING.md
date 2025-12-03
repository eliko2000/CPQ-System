# Custom Project and Quotation Numbering

## Overview

This feature enables administrators to define custom numbering sequences for projects and quotations. The system generates human-readable numbers in the format specified by the admin, such as `PRJ-0001` for projects and `PRJ-0001-QT-001` for quotations.

## Key Features

✅ **Customizable Format**: Configure prefix, padding, and separator
✅ **Automatic Generation**: Numbers generated automatically on creation
✅ **Project-Linked Quotations**: Quotation numbers include parent project number
✅ **Never Reset**: Sequence continues indefinitely (no yearly/monthly resets)
✅ **Existing Data Preserved**: Existing projects/quotations keep their IDs
✅ **Admin-Only Configuration**: Only team admins can modify numbering settings

---

## Installation

### Step 1: Run Database Migrations

Run these SQL migrations in your Supabase SQL Editor in order:

#### 1. Add Numbering Infrastructure

```sql
-- File: migrations/add-numbering-sequences.sql
-- Run this first
```

This migration:

- Adds `project_number` column to `projects` table
- Creates `numbering_sequences` table to track counters
- Creates database functions for generating numbers
- Sets up RLS policies for team isolation

#### 2. Update Project Summary View

```sql
-- File: migrations/update-project-summary-view-with-number.sql
-- Run this second
```

This migration:

- Updates the `project_summary` view to include `project_number`

### Step 2: Verify Installation

After running migrations, verify in Supabase:

```sql
-- Check that project_number column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'project_number';

-- Check that numbering_sequences table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'numbering_sequences';

-- Check that functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('generate_project_number', 'generate_quotation_number');
```

---

## Configuration

### Admin Settings

1. Navigate to **Settings** → **מספור פרויקטים והצעות מחיר** (Project and Quotation Numbering)
2. Configure the following:

| Setting                                 | Description             | Example            |
| --------------------------------------- | ----------------------- | ------------------ |
| **קידומת פרויקט** (Project Prefix)      | Letters/numbers only    | `PRJ`, `PROJ`, `P` |
| **קידומת הצעת מחיר** (Quotation Prefix) | Letters/numbers only    | `QT`, `QUOTE`, `Q` |
| **אורך מספר** (Padding)                 | Number of digits (1-10) | `4` → 0001, 0002   |
| **מפריד** (Separator)                   | Character between parts | `-`, `_`, `/`      |

### Default Configuration

```typescript
{
  projectPrefix: 'PRJ',
  quotationPrefix: 'QT',
  padding: 4,
  separator: '-'
}
```

Results in:

- Projects: `PRJ-0001`, `PRJ-0002`, `PRJ-0003`
- Quotations: `PRJ-0001-QT-001`, `PRJ-0001-QT-002`, `PRJ-0002-QT-001`

### Configuration Examples

#### Example 1: Minimal Format

```typescript
{
  projectPrefix: 'P',
  quotationPrefix: 'Q',
  padding: 3,
  separator: '/'
}
```

Results: `P/001`, `P/001/Q/001`

#### Example 2: Descriptive Format

```typescript
{
  projectPrefix: 'PROJECT',
  quotationPrefix: 'QUOTE',
  padding: 6,
  separator: '-'
}
```

Results: `PROJECT-000001`, `PROJECT-000001-QUOTE-000001`

#### Example 3: Underscore Separator

```typescript
{
  projectPrefix: 'PROJ',
  quotationPrefix: 'QT',
  padding: 4,
  separator: '_'
}
```

Results: `PROJ_0001`, `PROJ_0001_QT_0001`

---

## Usage

### Creating a New Project

When you create a project:

1. System automatically generates next project number
2. Number is assigned and saved to database
3. Project number is visible in project list

**Code Example** (from `useProjects.ts`):

```typescript
const projectNumber = await generateProjectNumber(currentTeam.id);

const { data, error } = await supabase.from('projects').insert([
  {
    project_number: projectNumber, // ← Automatically generated
    company_name: projectData.companyName,
    project_name: projectData.projectName,
    // ...
  },
]);
```

### Creating a New Quotation

When you create a quotation for a project:

1. System reads project's `project_number`
2. Generates quotation number including project number
3. Quotation number saved to database

**Code Example** (from `QuotationDataGrid.tsx`):

```typescript
const projectNumber = project.project_number || 'UNKNOWN';
const quotationNumber = await generateQuotationNumber(
  currentTeam.id,
  projectNumber
);

const newQuotation = await addQuotation({
  quotation_number: quotationNumber, // ← e.g., PRJ-0001-QT-001
  // ...
});
```

---

## Technical Implementation

### Database Schema

#### Projects Table

```sql
ALTER TABLE projects
ADD COLUMN project_number TEXT UNIQUE;
```

#### Numbering Sequences Table

```sql
CREATE TABLE numbering_sequences (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id),
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('project', 'quotation')),
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(team_id, sequence_type)
);
```

### Database Functions

#### generate_project_number

```sql
CREATE OR REPLACE FUNCTION generate_project_number(
  p_team_id UUID,
  p_prefix TEXT,
  p_padding INTEGER,
  p_separator TEXT
) RETURNS TEXT
```

**Logic**:

1. Lock row in `numbering_sequences` for `team_id` + `'project'`
2. Increment `current_value` by 1
3. Format number with padding (e.g., `0001`)
4. Return `{prefix}{separator}{number}`

#### generate_quotation_number

```sql
CREATE OR REPLACE FUNCTION generate_quotation_number(
  p_team_id UUID,
  p_project_number TEXT,
  p_quotation_prefix TEXT,
  p_padding INTEGER,
  p_separator TEXT
) RETURNS TEXT
```

**Logic**:

1. Count existing quotations for project
2. Next number = count + 1
3. Format with padding
4. Return `{project_number}{separator}{quotation_prefix}{separator}{number}`

### Service Layer

**File**: `src/services/numberingService.ts`

Key functions:

- `getNumberingConfig(teamId)`: Load configuration from database
- `saveNumberingConfig(teamId, config)`: Save configuration
- `generateProjectNumber(teamId)`: Call DB function to generate number
- `generateQuotationNumber(teamId, projectNumber)`: Generate quotation number
- `validateNumberingConfig(config)`: Validate configuration rules
- `previewNumbers(config)`: Preview what numbers would look like

### React Hook

**File**: `src/hooks/useNumbering.ts`

```typescript
const {
  config, // Current numbering config
  loading, // Loading state
  error, // Error message
  updateConfig, // Save new config
  getNextProjectNumber, // Generate next project number
  getNextQuotationNumber, // Generate next quotation number
  getPreview, // Get preview of numbers
} = useNumbering();
```

### UI Component

**File**: `src/components/settings/sections/NumberingSettings.tsx`

Features:

- Configuration form with validation
- Live preview of numbering format
- Save/cancel buttons
- Error/success feedback
- Important notices about existing data

---

## Migration Strategy

### Handling Existing Data

**Policy**: Keep existing IDs unchanged, apply new numbering only to new items.

#### Existing Projects (No project_number)

- `project_number` will be `NULL`
- Displayed as empty in UI
- When creating new quotation, fallback to `'UNKNOWN'`

#### New Projects

- Automatically get `project_number` on creation
- Number displayed in project list

#### Recommendation

You can manually assign project numbers to existing projects:

```sql
-- Option 1: Assign numbers manually
UPDATE projects
SET project_number = 'PRJ-0001'
WHERE id = 'existing-project-id';

-- Option 2: Bulk assign with sequence
-- (Requires careful planning to avoid conflicts)
```

### Counter Initialization

When a team first configures numbering:

- Counter starts at 0
- First project gets number 1 (e.g., `PRJ-0001`)
- Counter continues from there

If you want to start from a different number:

```sql
-- Set starting value (e.g., start from 100)
INSERT INTO numbering_sequences (team_id, sequence_type, current_value)
VALUES ('your-team-id', 'project', 99)
ON CONFLICT (team_id, sequence_type)
DO UPDATE SET current_value = 99;
```

---

## Testing

### Unit Tests

**File**: `src/services/__tests__/numberingService.test.ts`

Test coverage includes:

- ✅ Configuration validation (15 tests)
- ✅ Empty prefix rejection
- ✅ Invalid padding rejection
- ✅ Invalid character rejection
- ✅ Preview generation with various configs

**Run tests**:

```bash
npm test -- src/services/__tests__/numberingService.test.ts
```

### Manual Testing Checklist

- [ ] Run both database migrations
- [ ] Navigate to Settings → Numbering Settings
- [ ] Change configuration and save
- [ ] Create new project → verify number generated
- [ ] Create quotation for project → verify number includes project number
- [ ] View project list → verify project numbers displayed
- [ ] View quotation list → verify quotation numbers displayed
- [ ] Try invalid config (e.g., empty prefix) → verify error shown
- [ ] Check preview updates as you change config

---

## TypeScript Types

### NumberingConfig

```typescript
interface NumberingConfig {
  projectPrefix: string; // e.g., "PRJ"
  quotationPrefix: string; // e.g., "QT"
  padding: number; // e.g., 4 (for 0001)
  separator: string; // e.g., "-"
}
```

### DbNumberingSequence

```typescript
interface DbNumberingSequence {
  id: string;
  team_id: string;
  sequence_type: 'project' | 'quotation';
  current_value: number;
  created_at: string;
  updated_at: string;
}
```

### Project Types (Updated)

```typescript
interface ProjectMetadata {
  id: string;
  projectNumber?: string; // ← New field
  companyName: string;
  projectName: string;
  // ...
}
```

---

## Files Changed

### New Files

- `migrations/add-numbering-sequences.sql`
- `migrations/update-project-summary-view-with-number.sql`
- `src/types/numbering.types.ts`
- `src/services/numberingService.ts`
- `src/services/__tests__/numberingService.test.ts`
- `src/hooks/useNumbering.ts`
- `src/components/settings/sections/NumberingSettings.tsx`

### Modified Files

- `src/types/project.types.ts` - Added `projectNumber` field
- `src/hooks/useProjects.ts` - Generate project number on create
- `src/components/quotations/QuotationDataGrid.tsx` - Generate quotation number on create
- `src/components/settings/SettingsPage.tsx` - Added numbering settings section

---

## Troubleshooting

### Problem: Project numbers not generating

**Check**:

1. Migrations ran successfully
2. Functions exist: `SELECT * FROM pg_proc WHERE proname LIKE 'generate_%';`
3. `numbering_sequences` table exists
4. RLS policies allow access

**Solution**:

```sql
-- Check if sequence exists for team
SELECT * FROM numbering_sequences WHERE team_id = 'your-team-id';

-- Initialize if missing
INSERT INTO numbering_sequences (team_id, sequence_type, current_value)
VALUES ('your-team-id', 'project', 0);
```

### Problem: Quotation number shows "UNKNOWN"

**Cause**: Parent project has no `project_number`

**Solution**: Assign project number to existing project:

```sql
UPDATE projects
SET project_number = 'PRJ-XXXX'
WHERE id = 'project-id';
```

### Problem: Duplicate project numbers

**Cause**: Race condition or manual insertion bypassing function

**Solution**: Use database function exclusively, never insert project numbers manually

### Problem: Configuration not saving

**Check**:

1. User is admin
2. `user_settings` table has correct permissions
3. No validation errors in config

---

## Best Practices

1. **Configure Once**: Set numbering format before creating projects
2. **Don't Change Mid-Stream**: Changing format affects only new items
3. **Keep It Simple**: Shorter prefixes and reasonable padding (3-6 digits)
4. **Document Your Format**: Add notes about what prefixes mean
5. **Backup Before Migration**: Always backup before running migrations

---

## Future Enhancements

Potential improvements for future versions:

- [ ] Date-based patterns (e.g., `2025-001`, `202512-001`)
- [ ] Custom format with placeholders (e.g., `{YEAR}-{PREFIX}-{NUM}`)
- [ ] Periodic reset options (yearly, monthly, quarterly)
- [ ] Bulk re-numbering tool for existing projects
- [ ] Export/import numbering configuration
- [ ] Audit log of number assignments

---

## Support

For issues or questions:

1. Check this documentation
2. Review Troubleshooting section
3. Check Supabase logs for database errors
4. Verify migrations ran correctly
5. Test with a new project/quotation

---

## Summary

The custom numbering feature provides:

- ✅ Professional, human-readable numbers
- ✅ Admin-configurable format
- ✅ Automatic generation
- ✅ Project-linked quotations
- ✅ Safe migration (preserves existing data)
- ✅ Full test coverage

**Next Steps**:

1. Run migrations
2. Configure numbering in Settings
3. Create a test project
4. Verify number generated correctly
5. Create test quotation
6. Verify quotation number includes project number
