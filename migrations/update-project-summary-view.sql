-- Update project_summary view to include team_id and use security_invoker for RLS
-- Drop first because we are changing column structure (adding team_id)
DROP VIEW IF EXISTS project_summary;

CREATE OR REPLACE VIEW project_summary WITH (security_invoker = true) AS
SELECT
  p.id,
  p.company_name,
  p.project_name,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  p.team_id,
  COUNT(q.id) as quotation_count,
  MAX(q.updated_at) as last_quotation_update
FROM projects p
LEFT JOIN quotations q ON p.id = q.project_id
GROUP BY p.id;
