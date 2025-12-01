# Multi-Tenant Authentication Migrations

This directory contains the database migrations for implementing multi-tenant authentication with team-based data isolation.

## Migration Files

Execute these migrations **in order** in your Supabase SQL Editor:

### 1. `multi-tenant-auth-001-core-tables.sql`

Creates core authentication and team tables:

- `user_profiles` - Global user data
- `teams` - Team metadata
- `team_members` - User-team relationships
- `team_invitations` - Team invite system
- `feature_flags` - System-wide feature control
- `team_feature_access` - Team-level feature access

### 2. `multi-tenant-auth-002-add-team-isolation.sql`

Adds `team_id` columns to all existing tables:

- `components`, `assemblies`, `assembly_components`
- `quotations`, `quotation_systems`, `quotation_items`
- `projects`
- `user_table_configs`, `user_settings`

### 3. `multi-tenant-auth-003-rls-policies.sql`

Replaces permissive RLS policies with team-based security:

- Drops existing `USING (true)` policies
- Creates team-based SELECT/INSERT/UPDATE/DELETE policies
- Ensures data isolation between teams

### 4. `multi-tenant-auth-004-functions-triggers.sql`

Creates database helper functions:

- `handle_new_user()` - Auto-create user profile on signup
- `get_user_teams()` - Fetch user's teams
- `switch_team()` - Update last accessed team
- `is_team_admin()` - Check admin status
- `soft_delete_team()` - Soft delete with 90-day retention
- `cleanup_deleted_teams()` - Remove old deleted teams
- `check_feature_flag()` - Check if feature enabled for team

### 5. `multi-tenant-auth-005-seed-feature-flags.sql`

Seeds initial feature flags:

- AI Document Import
- Analytics Dashboard
- Advanced Pricing
- API Access
- Custom Branding
- PDF Export
- Multi-Currency Support
- Team Collaboration

## How to Execute Migrations

### Step 1: Backup Your Database

Before running any migrations, create a backup of your database:

1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup

### Step 2: Run Migrations in Supabase SQL Editor

1. Navigate to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy the contents of `multi-tenant-auth-001-core-tables.sql`
4. Click "Run" to execute
5. Verify success (check for errors in output)
6. Repeat for migrations 002 through 005 **in order**

### Step 3: Verify Migrations

After running all migrations, verify they were successful:

```sql
-- Verify all new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'user_profiles', 'teams', 'team_members', 'team_invitations',
  'feature_flags', 'team_feature_access'
);
-- Should return 6 rows

-- Verify team_id columns added
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'team_id'
AND table_schema = 'public'
ORDER BY table_name;
-- Should return 8+ rows

-- Verify RLS policies created
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Should return 50+ policies

-- Verify functions created
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'handle_new_user', 'get_user_teams', 'switch_team',
  'is_team_admin', 'soft_delete_team', 'cleanup_deleted_teams',
  'check_feature_flag'
);
-- Should return 7+ rows

-- Verify feature flags seeded
SELECT COUNT(*) FROM feature_flags;
-- Should return 8 rows
```

### Step 4: Configure Supabase Auth

Follow the instructions in `MULTI_TENANT_AUTH_SETUP.md` to:

1. Enable email authentication
2. Configure redirect URLs
3. Customize email templates
4. Set up environment variables

## Important Notes

### Fresh Start vs. Existing Data

These migrations are designed for a **fresh start**. If you have existing data:

1. **DO NOT** run migration 002 with the NOT NULL constraints
2. First migrate existing data to default teams
3. Then run the NOT NULL constraints

### Breaking Changes

⚠️ **Warning**: These migrations introduce breaking changes:

- All existing data must be associated with teams
- Anonymous access is removed
- All users must authenticate via Supabase Auth

### Rollback

If you need to rollback:

1. Restore from backup (recommended)
2. Or manually drop tables and policies:

```sql
-- Drop new tables (cascades will handle foreign keys)
DROP TABLE IF EXISTS team_feature_access CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Remove team_id columns from existing tables
ALTER TABLE components DROP COLUMN IF EXISTS team_id;
ALTER TABLE assemblies DROP COLUMN IF EXISTS team_id;
ALTER TABLE quotations DROP COLUMN IF EXISTS team_id;
-- ... repeat for all tables
```

## Next Steps

After successfully running all migrations:

1. ✅ Configure Supabase Auth (see `MULTI_TENANT_AUTH_SETUP.md`)
2. ✅ Update environment variables with system admin emails
3. ✅ Frontend agent implements authentication UI (tasks F1-F8)
4. ✅ Test complete signup → login → team creation flow

## Support

If you encounter issues:

1. Check Supabase logs in Dashboard → Logs
2. Verify each migration ran successfully
3. Check for error messages in SQL Editor output
4. Ensure migrations were run in correct order
