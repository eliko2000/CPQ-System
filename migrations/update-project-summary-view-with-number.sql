-- Update project_summary view to include project_number

DROP VIEW IF EXISTS project_summary;

CREATE OR REPLACE VIEW project_summary AS
SELECT
  p.id,
  p.project_number,
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
LEFT JOIN quotations q ON q.project_id = p.id
GROUP BY p.id, p.project_number, p.company_name, p.project_name, p.description, p.status, p.created_at, p.updated_at, p.team_id;

-- Grant access to the view
GRANT SELECT ON project_summary TO authenticated, anon;
