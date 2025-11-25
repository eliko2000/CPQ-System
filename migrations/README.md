# Database Migrations

This directory contains SQL migration files for the CPQ System database.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of the migration file
5. Paste into the editor
6. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push migrations/004_add_performance_indexes.sql
```

### Option 3: Direct SQL via psql

```bash
# Connect to your Supabase PostgreSQL database
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
\i migrations/004_add_performance_indexes.sql
```

## Migration History

| #   | File                            | Description                       | Date       | Status |
| --- | ------------------------------- | --------------------------------- | ---------- | ------ |
| 004 | 004_add_performance_indexes.sql | Add indexes for query performance | 2025-01-25 | ✅ New |

## Verifying Migrations

After applying a migration, verify it was successful:

### Check Indexes

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

### Check Query Performance

Use `EXPLAIN ANALYZE` to verify queries are using indexes:

```sql
EXPLAIN ANALYZE
SELECT * FROM components
WHERE category = 'בקרים'
ORDER BY name;
```

Look for `Index Scan` or `Index Only Scan` in the output (good!).
Avoid `Seq Scan` on large tables (bad for performance).

## Rollback

If you need to rollback a migration:

```sql
-- Drop all indexes from migration 004
DROP INDEX IF EXISTS idx_components_name;
DROP INDEX IF EXISTS idx_components_category;
-- ... etc
```

## Best Practices

1. **Always backup** before running migrations
2. **Test in development** environment first
3. **Monitor performance** after applying
4. **Verify with EXPLAIN ANALYZE** that indexes are being used
5. **Keep migrations small** and focused

## Performance Impact

Expected improvements after applying 004_add_performance_indexes.sql:

- **Component library loading**: 50-80% faster
- **Quotation list filtering**: 60-90% faster
- **Search operations**: 70-95% faster
- **Sorting**: 40-70% faster

Actual results depend on database size.
