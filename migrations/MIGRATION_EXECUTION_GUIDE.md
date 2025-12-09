# Multi-Tenant Auth Migration Execution Guide

## Overview

This guide walks you through applying the multi-tenant authentication migrations to your Supabase database.

## Prerequisites

- Access to Supabase Dashboard (https://supabase.com/dashboard)
- SQL Editor access
- Decision on whether to keep or delete existing data

## Migration Files (Execute in Order)

### Part 1: Core Tables

**File:** `multi-tenant-auth-001-core-tables.sql`

Creates:

- `user_profiles` table
- `teams` table
- `team_members` table (junction)
- `team_invitations` table
- `feature_flags` table
- `team_feature_access` table

**Status:** ✓ SAFE - Creates new tables, doesn't modify existing data

### Part 2: Add Team Isolation

**File:** `multi-tenant-auth-002-add-team-isolation.sql`

Adds `team_id` columns to:

- `components`
- `assemblies`
- `assembly_components`
- `quotations`
- `quotation_systems`
- `quotation_items`
- `projects`
- `user_table_configs`
- `user_settings`

**⚠️ CRITICAL DECISION REQUIRED:**

Before running this migration, you must choose ONE option:

#### Option 1: Delete All Existing Data (Fresh Start)

Uncomment lines 19-35 in the migration file to delete all existing data.

```sql
DELETE FROM quotation_items;
DELETE FROM quotation_systems;
DELETE FROM quotations;
DELETE FROM assembly_components;
DELETE FROM assemblies;
DELETE FROM components;
DELETE FROM user_table_configs;
DELETE FROM user_settings;
-- etc.
```

**Use this if:**

- You're setting up a new system
- You don't have production data yet
- You want to start clean

#### Option 2: Migrate to Default Team

Uncomment lines 42-52 and 127-142 to create a default team and assign all data to it.

```sql
-- Create default team
INSERT INTO teams (id, name, slug, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Team',
  'default-team',
  NOW()
);

-- Later: Migrate all data to default team
UPDATE components SET team_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE team_id IS NULL;
-- etc.
```

**Use this if:**

- You have existing data to preserve
- You're migrating a production system
- You want to review data before splitting into teams

### Part 3: Row-Level Security Policies

**File:** `multi-tenant-auth-003-rls-policies.sql`

- Drops old permissive RLS policies (`USING (true)`)
- Creates team-based RLS policies
- Enforces data isolation at database level

**Status:** ⚠️ IMPORTANT - Changes security model, test thoroughly

### Part 4: Functions & Triggers

**File:** `multi-tenant-auth-004-functions-triggers.sql`

Creates database functions:

- `handle_new_user()` - Auto-create user profile on signup
- `get_user_teams()` - Fetch user's teams
- `switch_team()` - Update last accessed team
- `is_team_admin()` - Check admin status
- `soft_delete_team()` - Soft delete with 90-day retention
- `check_feature_flag()` - Check if feature enabled for team

**Status:** ✓ SAFE - Helper functions, no data modification

### Part 5: Seed Feature Flags

**File:** `multi-tenant-auth-005-seed-feature-flags.sql`

Seeds initial feature flags:

- `ai_import` (enabled)
- `analytics` (disabled)
- `advanced_pricing` (disabled)
- `api_access` (disabled)
- `custom_branding` (disabled)
- `export_pdf` (enabled)
- `multi_currency` (enabled)
- `team_collaboration` (disabled)

**Status:** ✓ SAFE - Seeds data, idempotent

## Step-by-Step Execution

### Step 1: Check Current Status

Run the status check script first:

```bash
# In Supabase SQL Editor
-- Open: migrations/check-rls-status.sql
-- Click "Run"
```

This will show you:

- Which tables exist
- Which RLS policies are applied
- Which functions are created
- Which migrations have been run

### Step 2: Decide on Data Migration Strategy

**Fresh Start (Recommended for Development):**

- Edit `multi-tenant-auth-002-add-team-isolation.sql`
- Uncomment lines 19-35 (DELETE statements)
- Proceed to Step 3

**Migrate Existing Data (Production):**

- Edit `multi-tenant-auth-002-add-team-isolation.sql`
- Uncomment lines 42-52 (Create default team)
- Uncomment lines 127-142 (Migrate data to default team)
- Proceed to Step 3

### Step 3: Execute Migrations in Order

**In Supabase Dashboard → SQL Editor:**

1. **Run Part 1** - Core Tables

   ```
   Copy/paste multi-tenant-auth-001-core-tables.sql
   Click "Run"
   ```

2. **Run Part 2** - Team Isolation (with your chosen option uncommented)

   ```
   Copy/paste multi-tenant-auth-002-add-team-isolation.sql
   Click "Run"
   ```

3. **Run Part 3** - RLS Policies

   ```
   Copy/paste multi-tenant-auth-003-rls-policies.sql
   Click "Run"
   ```

4. **Run Part 4** - Functions & Triggers

   ```
   Copy/paste multi-tenant-auth-004-functions-triggers.sql
   Click "Run"
   ```

5. **Run Part 5** - Seed Feature Flags
   ```
   Copy/paste multi-tenant-auth-005-seed-feature-flags.sql
   Click "Run"
   ```

### Step 4: Verify Migrations

Run the status check again:

```sql
-- In Supabase SQL Editor
-- Open: migrations/check-rls-status.sql
-- Click "Run"
```

**Expected Results:**

```
Auth Tables: ✓
RLS Enabled on All Tables: ✓
Old Permissive Policies Removed: ✓
Database Functions Created: ✓
Feature Flags Seeded: ✓
```

### Step 5: Set System Admin

Make yourself a system admin:

```sql
-- Replace with your actual user email
UPDATE user_profiles
SET is_system_admin = true
WHERE email = 'your-email@example.com';
```

Verify:

```sql
SELECT id, email, is_system_admin
FROM user_profiles
WHERE is_system_admin = true;
```

### Step 6: Test Basic Functionality

1. **Sign up a new user** in your app
2. **Check user_profiles** was created automatically:

   ```sql
   SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 5;
   ```

3. **Create a team** via the UI
4. **Check team and team_members** were created:

   ```sql
   SELECT t.name, tm.role, up.email
   FROM teams t
   JOIN team_members tm ON t.id = tm.team_id
   JOIN user_profiles up ON tm.user_id = up.id;
   ```

5. **Try creating a component** in the team
6. **Verify team_id** is set:
   ```sql
   SELECT name, team_id FROM components;
   ```

## Troubleshooting

### Error: "column team_id does not exist"

You skipped Part 2. Run `multi-tenant-auth-002-add-team-isolation.sql`.

### Error: "new row violates row-level security policy"

You haven't been added to a team. Create a team or add yourself to the default team:

```sql
-- Option 1: Create new team and add yourself
INSERT INTO teams (name, slug, created_by)
VALUES ('My Team', 'my-team', auth.uid())
RETURNING id;

-- Use the returned id
INSERT INTO team_members (team_id, user_id, role)
VALUES ('<team-id-from-above>', auth.uid(), 'admin');

-- Option 2: Add yourself to default team (if using Option 2)
INSERT INTO team_members (team_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, auth.uid(), 'admin');
```

### Error: "function handle_new_user() does not exist"

You skipped Part 4. Run `multi-tenant-auth-004-functions-triggers.sql`.

### No data visible after migration

Check if you're a member of a team:

```sql
SELECT tm.team_id, t.name, tm.role
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.user_id = auth.uid();
```

If no results, add yourself to a team (see above).

### Data appears in wrong team

Check the team_id values:

```sql
SELECT
  'components' as table_name,
  c.name,
  c.team_id,
  t.name as team_name
FROM components c
LEFT JOIN teams t ON t.id = c.team_id;
```

## Rollback (Emergency Only)

If you need to rollback to the old permissive model:

```sql
-- WARNING: This removes all team-based security!
-- Only use in development or emergency

-- Drop all team-based policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE '%Team members%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Re-enable permissive policies (for TESTING ONLY!)
CREATE POLICY "Enable all operations for components" ON components USING (true);
CREATE POLICY "Enable all operations for assemblies" ON assemblies USING (true);
CREATE POLICY "Enable all operations for quotations" ON quotations USING (true);
-- etc.
```

**DO NOT USE IN PRODUCTION!**

## Next Steps After Migration

1. **Test team switching** - Create 2+ teams, switch between them
2. **Verify data isolation** - Data from Team A should not appear in Team B
3. **Test feature flags** - Toggle flags in System Admin page
4. **Test team member management** - Add/remove members, change roles
5. **Test RLS enforcement** - Try direct DB queries to access other team's data (should fail)

## Support

If you encounter issues:

1. Run `check-rls-status.sql` and share the output
2. Check Supabase logs for error messages
3. Verify you're using the latest migration files
4. Check that you followed the steps in order

## Migration Verification Checklist

- [ ] Part 1 executed successfully
- [ ] Part 2 executed successfully (with chosen data strategy)
- [ ] Part 3 executed successfully
- [ ] Part 4 executed successfully
- [ ] Part 5 executed successfully
- [ ] Status check shows all ✓
- [ ] System admin user created
- [ ] Test user can sign up and create profile
- [ ] Test user can create team
- [ ] Test user can create components in team
- [ ] Test team switching works
- [ ] Test data isolation (Team A can't see Team B data)
- [ ] Test feature flags toggle correctly
