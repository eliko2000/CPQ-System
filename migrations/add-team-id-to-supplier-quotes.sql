-- Add team_id to supplier_quotes and component_quote_history
-- Enable RLS and add policies

-- 1. Add team_id to supplier_quotes
ALTER TABLE supplier_quotes 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Update existing records to have a team_id (if any exist, assign to first team or handle manually)
-- For now, we assume this is a fresh install or we'll set it to a default if needed.
-- Since we can't easily guess, we'll leave it nullable for existing, but enforce for new.
-- Actually, let's try to infer from components if possible, or just set to NOT NULL after manual fix.
-- For this migration, we'll make it nullable initially, then you might want to enforce it.
-- But to be safe for new inserts, we'll make it NOT NULL and default to a dummy if needed, but better to just leave nullable for migration safety and enforce in app, 
-- OR better: DELETE existing data if it's test data.
-- Let's assume test data can be deleted or we just add the column.
-- We will set NOT NULL constraint. If there is data, this will fail.
-- TRUNCATE supplier_quotes CASCADE; -- UNCOMMENT IF YOU WANT TO WIPE DATA

-- ALTER TABLE supplier_quotes ALTER COLUMN team_id SET NOT NULL; -- UNCOMMENT AFTER DATA FIX

-- 2. Add team_id to component_quote_history
ALTER TABLE component_quote_history
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 3. Enable RLS
ALTER TABLE supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_quote_history ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- supplier_quotes policies
DROP POLICY IF EXISTS "Team members can view their team's supplier quotes" ON supplier_quotes;
CREATE POLICY "Team members can view their team's supplier quotes"
  ON supplier_quotes FOR SELECT
  USING (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Team members can insert supplier quotes" ON supplier_quotes;
CREATE POLICY "Team members can insert supplier quotes"
  ON supplier_quotes FOR INSERT
  WITH CHECK (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Team members can update their team's supplier quotes" ON supplier_quotes;
CREATE POLICY "Team members can update their team's supplier quotes"
  ON supplier_quotes FOR UPDATE
  USING (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Team members can delete their team's supplier quotes" ON supplier_quotes;
CREATE POLICY "Team members can delete their team's supplier quotes"
  ON supplier_quotes FOR DELETE
  USING (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

-- component_quote_history policies
DROP POLICY IF EXISTS "Team members can view their team's component history" ON component_quote_history;
CREATE POLICY "Team members can view their team's component history"
  ON component_quote_history FOR SELECT
  USING (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Team members can insert component history" ON component_quote_history;
CREATE POLICY "Team members can insert component history"
  ON component_quote_history FOR INSERT
  WITH CHECK (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Team members can update their team's component history" ON component_quote_history;
CREATE POLICY "Team members can update their team's component history"
  ON component_quote_history FOR UPDATE
  USING (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Team members can delete their team's component history" ON component_quote_history;
CREATE POLICY "Team members can delete their team's component history"
  ON component_quote_history FOR DELETE
  USING (team_id = (SELECT team_id FROM user_profiles WHERE id = auth.uid()));

-- 5. Update Views to include team_id and use security_invoker

-- View: Components with their quote source info
DROP VIEW IF EXISTS components_with_quote_source;
CREATE OR REPLACE VIEW components_with_quote_source WITH (security_invoker = true) AS
SELECT
  c.*,
  sq.quote_number,
  sq.supplier_name as quote_supplier,
  sq.quote_date as quote_date,
  sq.file_name as quote_file_name,
  sq.team_id as quote_team_id
FROM components c
LEFT JOIN supplier_quotes sq ON c.current_quote_id = sq.id;

-- View: Component price history summary
-- Note: Need to group by team_id as well if we want per-team stats, or just rely on RLS filtering the base table
DROP VIEW IF EXISTS component_price_history_summary;
CREATE OR REPLACE VIEW component_price_history_summary WITH (security_invoker = true) AS
SELECT
  c.id as component_id,
  c.name as component_name,
  c.manufacturer,
  c.manufacturer_part_number,
  c.team_id,
  COUNT(cqh.id) as quote_count,
  MIN(cqh.unit_price_usd) as min_price_usd,
  MAX(cqh.unit_price_usd) as max_price_usd,
  AVG(cqh.unit_price_usd) as avg_price_usd,
  MIN(cqh.quote_date) as first_quote_date,
  MAX(cqh.quote_date) as latest_quote_date
FROM components c
LEFT JOIN component_quote_history cqh ON c.id = cqh.component_id
GROUP BY c.id, c.name, c.manufacturer, c.manufacturer_part_number, c.team_id;

-- View: Supplier quote details with component count
DROP VIEW IF EXISTS supplier_quotes_summary;
CREATE OR REPLACE VIEW supplier_quotes_summary WITH (security_invoker = true) AS
SELECT
  sq.*,
  COUNT(DISTINCT cqh.component_id) as actual_component_count,
  AVG(cqh.confidence_score) as avg_confidence
FROM supplier_quotes sq
LEFT JOIN component_quote_history cqh ON sq.id = cqh.quote_id
GROUP BY sq.id;
