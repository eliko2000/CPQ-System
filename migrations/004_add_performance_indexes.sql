-- Migration: Add Performance Indexes for Phase 4.3
-- Date: 2025-01-25
-- Purpose: Optimize common query patterns for components, quotations, and projects

-- ============================================================
-- COMPONENTS TABLE INDEXES
-- ============================================================

-- Index for name ordering (most common sort)
CREATE INDEX IF NOT EXISTS idx_components_name ON components(name);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);

-- Index for component type filtering (hardware vs labor)
CREATE INDEX IF NOT EXISTS idx_components_component_type ON components(component_type);

-- Index for manufacturer lookups
CREATE INDEX IF NOT EXISTS idx_components_manufacturer ON components(manufacturer);

-- Index for supplier filtering
CREATE INDEX IF NOT EXISTS idx_components_supplier ON components(supplier);

-- Composite index for category + name (common filter + sort combo)
CREATE INDEX IF NOT EXISTS idx_components_category_name ON components(category, name);

-- Index for created_at sorting (recent components)
CREATE INDEX IF NOT EXISTS idx_components_created_at ON components(created_at DESC);


-- ============================================================
-- QUOTATIONS TABLE INDEXES
-- ============================================================

-- Index for quotation number lookups
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

-- Index for customer name searches
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_name);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Index for project_id lookups
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);

-- Index for date sorting
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);

-- Composite index for status + date (common filter combo)
CREATE INDEX IF NOT EXISTS idx_quotations_status_date ON quotations(status, created_at DESC);


-- ============================================================
-- QUOTATION_ITEMS TABLE INDEXES
-- ============================================================

-- Index for quotation_id lookups (foreign key)
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- Index for component_id lookups (foreign key)
CREATE INDEX IF NOT EXISTS idx_quotation_items_component_id ON quotation_items(component_id);

-- Index for system_id grouping
CREATE INDEX IF NOT EXISTS idx_quotation_items_system_id ON quotation_items(system_id);


-- ============================================================
-- QUOTATION_SYSTEMS TABLE INDEXES
-- ============================================================

-- Index for quotation_id lookups (foreign key)
CREATE INDEX IF NOT EXISTS idx_quotation_systems_quotation_id ON quotation_systems(quotation_id);

-- Index for system name searches
CREATE INDEX IF NOT EXISTS idx_quotation_systems_name ON quotation_systems(name);


-- ============================================================
-- PROJECTS TABLE INDEXES
-- ============================================================

-- Index for project name searches
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(project_name);

-- Index for company name searches
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_name);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);


-- ============================================================
-- ASSEMBLIES TABLE INDEXES
-- ============================================================

-- Index for assembly name searches
CREATE INDEX IF NOT EXISTS idx_assemblies_name ON assemblies(name);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_assemblies_category ON assemblies(category);

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_assemblies_created_at ON assemblies(created_at DESC);


-- ============================================================
-- SUPPLIER_QUOTES TABLE INDEXES
-- ============================================================

-- Index for supplier name searches
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON supplier_quotes(supplier_name);

-- Index for date sorting
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_date ON supplier_quotes(quote_date DESC);

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_created_at ON supplier_quotes(created_at DESC);


-- ============================================================
-- VERIFY INDEXES
-- ============================================================

-- Run this query to verify all indexes were created:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
