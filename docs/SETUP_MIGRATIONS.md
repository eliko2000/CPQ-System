# SETUP MIGRATIONS - Supabase Database Migration Guide

## Overview

This guide explains how to set up and manage database migrations for the CPQ System using the Supabase CLI.

---

## Prerequisites

✅ **Completed** (already installed):

- Node.js and npm
- Supabase CLI (`npx supabase --version` shows 2.65.2)
- Supabase project initialized (config at `supabase/config.toml`)

⚠️ **Required** (you need to complete):

- Supabase access token in `.env.local`

---

## Step 1: Get Supabase Access Token

### 1.1 Navigate to Supabase Dashboard

Go to: **https://supabase.com/dashboard/account/tokens**

### 1.2 Generate Access Token

1. Click "Generate new token"
2. Name it: `CPQ System CLI`
3. Copy the generated token (starts with `sbp_...`)

### 1.3 Add to .env.local

Open `C:\Users\Eli\Desktop\Claude Code\CPQ-System\.env.local` and add:

```bash
# Supabase CLI Access Token (for migrations)
# Get from: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=sbp_your_token_here
```

**IMPORTANT**: Replace `sbp_your_token_here` with your actual token!

---

## Step 2: Link Project (One-Time Setup)

Run this command once to link your local project to the remote Supabase project:

```bash
npx supabase link --project-ref uxkvfghfcwnynshmzeck
```

**Expected Output**:

```
Linked to project: CPQ-System (uxkvfghfcwnynshmzeck)
```

**If you see "Access token not provided"**:

- Check that `SUPABASE_ACCESS_TOKEN` is in `.env.local`
- Restart your terminal/IDE to load the new environment variable

---

## Step 3: Understanding Migration Directories

The CPQ System has two migration directories:

### Legacy Location (OLD):

```
C:\Users\Eli\Desktop\Claude Code\CPQ-System\migrations\
```

- Contains old migration files
- **Should be moved** to the new location

### Supabase CLI Location (NEW):

```
C:\Users\Eli\Desktop\Claude Code\CPQ-System\supabase\migrations\
```

- Managed by Supabase CLI
- **All new migrations go here**

---

## Step 4: Organize Existing Migrations

You have migration files in the old `/migrations` folder. Let's organize them:

### 4.1 Review Existing Migrations

List files in old location:

```bash
ls migrations/
```

### 4.2 Move to New Location

For each migration file that needs to be applied:

1. **Rename** with proper format: `YYYYMMDDHHMMSS_description.sql`
2. **Move** to `supabase/migrations/`
3. **Review** SQL for idempotency (add `IF NOT EXISTS` / `IF EXISTS`)

**Example**:

```bash
# Old file: migrations/add-currency-tracking.sql
# New file: supabase/migrations/20241203120000_add_currency_tracking.sql
```

### 4.3 Check Migration Order

Migrations run in **alphabetical order** by filename. Ensure timestamps are correct!

```bash
# List migrations in order
ls -1 supabase/migrations/
```

---

## Step 5: Push Migrations to Remote Database

### Using the /migrate Slash Command (RECOMMENDED)

```bash
/migrate
```

This will:

1. List all pending migrations
2. Show what will change
3. Ask for confirmation
4. Push to remote database
5. Show success/failure

### Manual Push (Alternative)

```bash
npx supabase db push
```

**Expected Output**:

```
Connecting to database...
Applying migration: 20241203120000_add_currency_tracking.sql
Migration applied successfully!
```

---

## Step 6: Verify Migration Success

### 6.1 Check Migration History

```bash
npx supabase migration list
```

Shows all applied migrations with timestamps.

### 6.2 Verify in Supabase Dashboard

1. Go to: **https://uxkvfghfcwnynshmzeck.supabase.co**
2. Navigate to **Database > Migrations**
3. Verify your migration appears in the list

### 6.3 Test Queries

Use the Supabase dashboard to test queries against the new schema:

```sql
-- Check if new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'components'
AND column_name IN ('currency', 'original_cost');
```

---

## Common Migration Workflows

### Creating a New Migration

```bash
# Generate new migration file
npx supabase migration new add_team_settings

# This creates: supabase/migrations/YYYYMMDDHHMMSS_add_team_settings.sql
```

### Pulling Remote Schema Changes

If someone else made changes to the database:

```bash
npx supabase db pull
```

This creates a migration file with the remote changes.

### Generating Migration from Diff

Compare local and remote, generate migration for differences:

```bash
npx supabase db diff -f fix_schema_differences
```

### Reset Local Database (Development Only)

⚠️ **WARNING**: Destroys all local data!

```bash
npx supabase db reset
```

This:

1. Drops local database
2. Recreates it
3. Applies all migrations in order
4. Runs seed files

---

## Migration Best Practices

### 1. Always Use Idempotent SQL

✅ **Good** (can run multiple times):

```sql
ALTER TABLE components
ADD COLUMN IF NOT EXISTS currency TEXT;
```

❌ **Bad** (fails on second run):

```sql
ALTER TABLE components
ADD COLUMN currency TEXT;
```

### 2. Wrap in Transactions

```sql
BEGIN;

-- Your changes here
ALTER TABLE components ADD COLUMN IF NOT EXISTS currency TEXT;

COMMIT;
```

### 3. Include Rollback Plan (as comment)

```sql
-- Rollback:
-- BEGIN;
-- ALTER TABLE components DROP COLUMN IF EXISTS currency;
-- COMMIT;
```

### 4. Test Locally First

```bash
# Reset local DB (applies all migrations)
npx supabase db reset

# Verify everything works
npm test
npm run build
```

### 5. Document Why

```sql
-- Migration: Add currency tracking
-- Purpose: Support multi-currency pricing with original currency preservation
-- Related: Feature implementation in PR #123
-- Author: Claude Code Agent
-- Date: 2024-12-03
```

---

## Troubleshooting

### Error: "Access token not provided"

**Cause**: `SUPABASE_ACCESS_TOKEN` not set in `.env.local`

**Fix**:

1. Get token from https://supabase.com/dashboard/account/tokens
2. Add to `.env.local`: `SUPABASE_ACCESS_TOKEN=sbp_...`
3. Restart terminal/IDE

### Error: "Project not linked"

**Cause**: Local project not linked to remote

**Fix**:

```bash
npx supabase link --project-ref uxkvfghfcwnynshmzeck
```

### Error: "Migration already exists"

**Cause**: Migration was already applied to remote database

**Fix**:

1. Check migration history: `npx supabase migration list`
2. If it's already applied, you can:
   - Skip it (it's already done)
   - Create a new migration to make additional changes

### Error: SQL syntax error in migration

**Cause**: Invalid SQL in migration file

**Fix**:

1. Read the error message carefully
2. Fix the SQL syntax
3. Test locally: `npx supabase db reset`
4. Push again after fixing

### Error: Migration conflicts with existing schema

**Cause**: Remote database has conflicting changes

**Fix**:

1. Pull remote schema: `npx supabase db pull`
2. Review differences
3. Create new migration to resolve conflicts

---

## Migration File Template

Use this template for new migrations:

```sql
-- ============================================================================
-- Migration: [Short Description]
-- ============================================================================
-- Purpose: [Why this migration is needed]
-- Project: CPQ System (uxkvfghfcwnynshmzeck)
-- Author: [Your Name / Claude Code Agent]
-- Date: [YYYY-MM-DD]
-- Related: [PR/Issue number if applicable]
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Schema Changes
-- ============================================================================

-- Add new tables
CREATE TABLE IF NOT EXISTS example_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modify existing tables
ALTER TABLE components
ADD COLUMN IF NOT EXISTS example_column TEXT;

-- ============================================================================
-- SECTION 2: Constraints & Indexes
-- ============================================================================

-- Add constraints
ALTER TABLE components
ADD CONSTRAINT example_check
  CHECK (example_column IN ('option1', 'option2'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_components_example
  ON components(example_column);

-- ============================================================================
-- SECTION 3: RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own records"
  ON example_table FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 4: Comments & Documentation
-- ============================================================================

COMMENT ON TABLE example_table IS 'Stores example data for the CPQ system';
COMMENT ON COLUMN components.example_column IS 'Example field description';

-- ============================================================================
-- SECTION 5: Data Migrations (if needed)
-- ============================================================================

-- Update existing data
-- UPDATE components SET example_column = 'default' WHERE example_column IS NULL;

COMMIT;

-- ============================================================================
-- ROLLBACK PLAN (for reference, not executed)
-- ============================================================================
-- Run this manually if you need to undo this migration:
--
-- BEGIN;
-- ALTER TABLE components DROP COLUMN IF EXISTS example_column;
-- DROP TABLE IF EXISTS example_table;
-- COMMIT;
-- ============================================================================
```

---

## Integration with Claude Code Agents

### Implementer Agent

When implementing features requiring database changes:

1. Agent creates migration file in `supabase/migrations/`
2. Agent tells you: "Migration created, run `/migrate` to push"
3. You review and push the migration
4. Agent continues with application code

### Refactor Agent

When refactoring requires schema changes:

1. Documents current schema (BEFORE testing)
2. Creates migration file
3. Waits for you to push migration
4. Continues with code changes (AFTER testing)

### Using /migrate Command

```bash
# Review and push all pending migrations
/migrate
```

The `/migrate` command will:

- List all migrations in `supabase/migrations/`
- Show which are already applied
- Show which are pending
- Ask for confirmation
- Push pending migrations
- Report success/failure

---

## Quick Reference Commands

```bash
# Check Supabase CLI version
npx supabase --version

# Link project (one-time setup)
npx supabase link --project-ref uxkvfghfcwnynshmzeck

# Create new migration
npx supabase migration new <description>

# List migrations (local)
ls -1 supabase/migrations/

# List migrations (remote history)
npx supabase migration list

# Push migrations to remote
npx supabase db push

# Pull remote schema
npx supabase db pull

# Generate migration from diff
npx supabase db diff -f <name>

# Reset local database (development only)
npx supabase db reset

# Test migrations locally
npx supabase db reset && npm test
```

---

## Project Information

- **Project Reference**: `uxkvfghfcwnynshmzeck`
- **Project URL**: `https://uxkvfghfcwnynshmzeck.supabase.co`
- **Migrations Directory**: `C:\Users\Eli\Desktop\Claude Code\CPQ-System\supabase\migrations`
- **Supabase Config**: `C:\Users\Eli\Desktop\Claude Code\CPQ-System\supabase\config.toml`

---

## Next Steps

1. ✅ Get Supabase access token (Step 1)
2. ✅ Add token to `.env.local`
3. ✅ Link project (Step 2)
4. ✅ Review existing migrations (Step 4)
5. ✅ Push migrations (Step 5)
6. ✅ Verify success (Step 6)

---

**Ready to migrate? Run `/migrate` to get started!**
