# Migration Helper Command

You are helping the user manage database migrations for the CPQ System Supabase project.

## Project Details
- **Project Reference**: uxkvfghfcwnynshmzeck
- **Project URL**: https://uxkvfghfcwnynshmzeck.supabase.co
- **Migrations Directory**: `C:\Users\Eli\Desktop\Claude Code\CPQ-System\migrations`
- **Supabase Directory**: `C:\Users\Eli\Desktop\Claude Code\CPQ-System\supabase\migrations`

## Prerequisites Check

Before running any migration commands, verify:

1. **Supabase CLI is installed**: `npx supabase --version`
2. **Access token is set**: Check that `SUPABASE_ACCESS_TOKEN` exists in `.env.local`
3. **Project is linked**: Run `npx supabase link --project-ref uxkvfghfcwnynshmzeck` if not already linked

## Migration Workflow

### Step 1: Organize Migration Files

The user has migrations in two locations:
- `/migrations` - Custom migration files (legacy location)
- `/supabase/migrations` - Supabase CLI managed migrations

**Action**: If there are new migration files in `/migrations`, move them to `/supabase/migrations` with proper naming:

```bash
# Naming format: YYYYMMDDHHMMSS_description.sql
# Example: 20241203120000_add_custom_item_flag.sql
```

### Step 2: Review Migration Files

Read the migration files in `/supabase/migrations` and summarize:
- What tables/columns are being created/modified
- Any potential breaking changes
- Dependencies between migrations

### Step 3: Push Migrations to Remote

Use the Supabase CLI to push migrations:

```bash
npx supabase db push
```

This command will:
1. Connect to the remote Supabase project (uxkvfghfcwnynshmzeck)
2. Compare local migrations with remote database
3. Apply any new migrations in order
4. Show success/failure status

### Step 4: Verify Migration Success

After pushing, verify:

```bash
# Check migration history
npx supabase migration list

# Or check via Supabase dashboard
```

## Common Migration Tasks

### Create a New Migration

```bash
# Generate a new migration file
npx supabase migration new <description>

# Example:
npx supabase migration new add_team_settings_table
```

### Pull Remote Schema Changes

```bash
# Pull schema changes from remote
npx supabase db pull
```

### Generate Migration from Diff

```bash
# Compare local and remote schemas, generate migration
npx supabase db diff -f <migration_name>
```

### Reset Local Database (Development Only)

```bash
# WARNING: This will destroy local data
npx supabase db reset
```

## Troubleshooting

### Error: Access token not provided

**Solution**: Add SUPABASE_ACCESS_TOKEN to .env.local

1. Get token from: https://supabase.com/dashboard/account/tokens
2. Add to `.env.local`:
   ```
   SUPABASE_ACCESS_TOKEN=sbp_your_token_here
   ```

### Error: Project not linked

**Solution**: Link the project

```bash
npx supabase link --project-ref uxkvfghfcwnynshmzeck
```

### Error: Migration file already exists remotely

**Solution**: This migration was already applied. You can:
1. Skip it (it's already applied)
2. Create a new migration with different changes
3. Check migration history: `npx supabase migration list`

### Error: Migration failed with SQL error

**Solution**: Fix the SQL in the migration file
1. Read the error message carefully
2. Fix the SQL syntax or logic
3. Test locally if possible: `npx supabase db reset` (applies all migrations locally)
4. Push again after fixing

## Best Practices

1. **Always review migrations before pushing**: Read the SQL to understand what will change
2. **Test locally first**: Use `npx supabase db reset` to test migrations locally
3. **Backup before major changes**: Take a database backup from Supabase dashboard
4. **Use transactions**: Wrap DDL statements in transactions when possible
5. **Name migrations clearly**: Use descriptive names like `add_currency_tracking_to_components`
6. **Order matters**: Migrations run in alphabetical order by filename
7. **Never edit applied migrations**: Create a new migration to fix issues

## Migration File Template

```sql
-- Migration: <Description>
-- Created: <Date>
-- Purpose: <Why this migration is needed>

-- Start transaction (PostgreSQL supports DDL in transactions)
BEGIN;

-- Your changes here
-- Example:
-- ALTER TABLE components ADD COLUMN IF NOT EXISTS currency TEXT;

-- Verify changes
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'components';

COMMIT;

-- Rollback plan (commented out, for reference):
-- BEGIN;
-- ALTER TABLE components DROP COLUMN IF EXISTS currency;
-- COMMIT;
```

## After Running This Command

Always:
1. Show the user what migrations exist
2. Offer to push them to remote
3. Summarize what will change
4. Ask for confirmation before pushing
5. Report success/failure clearly
