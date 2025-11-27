-- Supplier Quotes & Component History Schema
-- This migration adds support for tracking supplier quotes and component price history
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. SUPPLIER QUOTES TABLE
-- ============================================
-- Stores metadata about uploaded supplier quotes
CREATE TABLE IF NOT EXISTS supplier_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic quote information
  quote_number TEXT,
  supplier_name TEXT,
  quote_date DATE,

  -- File information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'excel', 'pdf', 'csv', 'image'
  file_size_kb INTEGER,

  -- Processing status
  status TEXT DEFAULT 'completed' CHECK (status IN ('uploaded', 'processing', 'completed', 'error')),

  -- Extraction metadata
  document_type TEXT, -- 'excel', 'pdf', 'image', 'unknown'
  extraction_method TEXT, -- 'native', 'text', 'structured', 'ai_vision'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  total_components INTEGER DEFAULT 0,

  -- Parsing metadata (JSON)
  metadata JSONB, -- Stores sheet names, page count, etc.

  -- Additional info
  notes TEXT,

  -- Timestamps
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_supplier ON supplier_quotes(supplier_name);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_date ON supplier_quotes(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_status ON supplier_quotes(status);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_created ON supplier_quotes(created_at DESC);

-- ============================================
-- 2. COMPONENT QUOTE HISTORY TABLE
-- ============================================
-- Many-to-many relationship tracking which components appeared in which quotes
-- Enables price history and supplier comparison
CREATE TABLE IF NOT EXISTS component_quote_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES supplier_quotes(id) ON DELETE CASCADE,

  -- Price snapshot at time of quote
  unit_price_nis DECIMAL(12,2),
  unit_price_usd DECIMAL(12,2),
  unit_price_eur DECIMAL(12,2),
  currency TEXT, -- 'NIS', 'USD', 'EUR'

  -- Quote context
  quote_date DATE,
  supplier_name TEXT,

  -- Extraction quality
  confidence_score DECIMAL(3,2), -- Component-specific confidence from parsing

  -- Is this the current active price?
  is_current_price BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique component-quote combination
  UNIQUE(component_id, quote_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_component_quote_history_component ON component_quote_history(component_id);
CREATE INDEX IF NOT EXISTS idx_component_quote_history_quote ON component_quote_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_component_quote_history_date ON component_quote_history(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_component_quote_history_current ON component_quote_history(is_current_price) WHERE is_current_price = true;

-- ============================================
-- 3. UPDATE COMPONENTS TABLE
-- ============================================
-- Add fields to track current quote source
ALTER TABLE components
ADD COLUMN IF NOT EXISTS current_quote_id UUID REFERENCES supplier_quotes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD' CHECK (currency IN ('NIS', 'USD', 'EUR')),
ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2);

-- Create index for quote lookups
CREATE INDEX IF NOT EXISTS idx_components_current_quote ON components(current_quote_id);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_quote_history ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
DROP POLICY IF EXISTS "Enable all operations for supplier_quotes" ON supplier_quotes;
CREATE POLICY "Enable all operations for supplier_quotes"
  ON supplier_quotes FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations for component_quote_history" ON component_quote_history;
CREATE POLICY "Enable all operations for component_quote_history"
  ON component_quote_history FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================
-- 5. AUTO-UPDATE TRIGGERS
-- ============================================
-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_supplier_quotes_updated_at ON supplier_quotes;
CREATE TRIGGER update_supplier_quotes_updated_at
  BEFORE UPDATE ON supplier_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. STORAGE BUCKET (if not exists)
-- ============================================
-- Note: This is for reference only. Create the storage bucket in Supabase Dashboard:
-- 1. Go to Storage > Create Bucket
-- 2. Name: "supplier-quotes"
-- 3. Public: false (private bucket)
-- 4. File size limit: 10MB
-- 5. Allowed MIME types:
--    - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (Excel)
--    - application/vnd.ms-excel (Excel legacy)
--    - application/pdf (PDF)
--    - text/csv (CSV)
--    - image/jpeg, image/png, image/gif, image/webp (Images)

-- ============================================
-- 7. HELPFUL VIEWS
-- ============================================

-- View: Components with their quote source info
CREATE OR REPLACE VIEW components_with_quote_source AS
SELECT
  c.*,
  sq.quote_number,
  sq.supplier_name as quote_supplier,
  sq.quote_date as quote_date,
  sq.file_name as quote_file_name
FROM components c
LEFT JOIN supplier_quotes sq ON c.current_quote_id = sq.id;

-- View: Component price history summary
CREATE OR REPLACE VIEW component_price_history_summary AS
SELECT
  c.id as component_id,
  c.name as component_name,
  c.manufacturer,
  c.manufacturer_part_number,
  COUNT(cqh.id) as quote_count,
  MIN(cqh.unit_price_usd) as min_price_usd,
  MAX(cqh.unit_price_usd) as max_price_usd,
  AVG(cqh.unit_price_usd) as avg_price_usd,
  MIN(cqh.quote_date) as first_quote_date,
  MAX(cqh.quote_date) as latest_quote_date
FROM components c
LEFT JOIN component_quote_history cqh ON c.id = cqh.component_id
GROUP BY c.id, c.name, c.manufacturer, c.manufacturer_part_number;

-- View: Supplier quote details with component count
CREATE OR REPLACE VIEW supplier_quotes_summary AS
SELECT
  sq.*,
  COUNT(DISTINCT cqh.component_id) as actual_component_count,
  AVG(cqh.confidence_score) as avg_confidence
FROM supplier_quotes sq
LEFT JOIN component_quote_history cqh ON sq.id = cqh.quote_id
GROUP BY sq.id;

-- ============================================
-- 8. HELPFUL FUNCTIONS
-- ============================================

-- Function: Get price history for a component
CREATE OR REPLACE FUNCTION get_component_price_history(
  p_component_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  quote_id UUID,
  quote_number TEXT,
  supplier_name TEXT,
  quote_date DATE,
  unit_price_usd DECIMAL(12,2),
  unit_price_nis DECIMAL(12,2),
  currency TEXT,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sq.id,
    sq.quote_number,
    sq.supplier_name,
    cqh.quote_date,
    cqh.unit_price_usd,
    cqh.unit_price_nis,
    cqh.currency,
    cqh.is_current_price
  FROM component_quote_history cqh
  JOIN supplier_quotes sq ON cqh.quote_id = sq.id
  WHERE cqh.component_id = p_component_id
  ORDER BY cqh.quote_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Find similar components (for fuzzy matching)
CREATE OR REPLACE FUNCTION find_similar_components(
  p_manufacturer TEXT,
  p_part_number TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  manufacturer TEXT,
  manufacturer_part_number TEXT,
  similarity_score DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.manufacturer,
    c.manufacturer_part_number,
    GREATEST(
      similarity(LOWER(c.manufacturer), LOWER(p_manufacturer)),
      similarity(LOWER(c.manufacturer_part_number), LOWER(p_part_number))
    )::DECIMAL(3,2) as similarity_score
  FROM components c
  WHERE
    similarity(LOWER(c.manufacturer), LOWER(p_manufacturer)) > 0.3
    OR similarity(LOWER(c.manufacturer_part_number), LOWER(p_part_number)) > 0.3
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for similarity searches (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Create storage bucket "supplier-quotes" in Supabase Dashboard
-- 2. Update application code to use new tables
-- 3. Test upload workflow with matching logic
