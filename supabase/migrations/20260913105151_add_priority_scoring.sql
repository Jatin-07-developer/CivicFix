/*
# Add severity, priority_score, and department columns to reports

1. Modified Tables
- `reports`
  - Added `severity` (text, not null, default 'Medium') — one of: Low, Medium, High.
  - Added `priority_score` (integer, not null, default 0) — (severity_value * 10) + (duplicate_count * 5).
  - Added `department` (text, not null) — auto-assigned from issue type.

2. New Functions
- `assign_department(p_issue_type text)` — returns department for issue type.
- `assign_severity(p_issue_type text, p_description text)` — returns Low/Medium/High.
- `auto_assign_report_fields()` — BEFORE INSERT trigger function.
- `link_duplicate(p_parent_id uuid)` — updated to recalc priority_score.

3. New Trigger
- `trg_reports_auto_assign` BEFORE INSERT — auto-sets severity, department, priority_score.

4. Backfill existing rows.
*/

ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'Medium';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority_score integer NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'General Department';

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_severity_check;
ALTER TABLE reports ADD CONSTRAINT reports_severity_check
  CHECK (severity IN ('Low', 'Medium', 'High'));

-- Department assignment based on issue type
CREATE OR REPLACE FUNCTION assign_department(p_issue_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_issue_type = 'Pothole' THEN 'Roads Department'
    WHEN p_issue_type = 'Garbage' THEN 'Sanitation Department'
    WHEN p_issue_type = 'Water Leak' THEN 'Water Department'
    WHEN p_issue_type = 'Streetlight' THEN 'Electrical Department'
    WHEN p_issue_type = 'Waterlogging' THEN 'Drainage Department'
    ELSE 'General Department'
  END;
$$;

-- Severity estimation based on issue type and description keywords
CREATE OR REPLACE FUNCTION assign_severity(p_issue_type text, p_description text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_score integer;
  desc_lower text;
  keyword_hits integer;
  desc_len integer;
BEGIN
  base_score := CASE
    WHEN p_issue_type = 'Waterlogging' THEN 3
    WHEN p_issue_type = 'Water Leak' THEN 2
    WHEN p_issue_type = 'Pothole' THEN 2
    WHEN p_issue_type = 'Streetlight' THEN 1
    WHEN p_issue_type = 'Garbage' THEN 1
    ELSE 1
  END;

  desc_lower := lower(COALESCE(p_description, ''));
  desc_len := length(desc_lower);

  keyword_hits := 0;
  IF desc_lower LIKE '%flooding%' OR desc_lower LIKE '%flood%' OR desc_lower LIKE '%large%' OR desc_lower LIKE '%deep%' OR desc_lower LIKE '%dangerous%' OR desc_lower LIKE '%urgent%' OR desc_lower LIKE '%broken%' OR desc_lower LIKE '%sinkhole%' OR desc_lower LIKE '%overflow%' OR desc_lower LIKE '%overflowing%' OR desc_lower LIKE '%blocked%' OR desc_lower LIKE '%collapsed%' OR desc_lower LIKE '%severe%' OR desc_lower LIKE '%huge%' OR desc_lower LIKE '%cracked%' OR desc_lower LIKE '%structural%' THEN
    keyword_hits := keyword_hits + 1;
  END IF;

  IF desc_lower LIKE '%road%' OR desc_lower LIKE '%street%' OR desc_lower LIKE '%highway%' OR desc_lower LIKE '%intersection%' OR desc_lower LIKE '%crosswalk%' OR desc_lower LIKE '%sidewalk%' THEN
    keyword_hits := keyword_hits + 1;
  END IF;

  base_score := base_score + keyword_hits;

  IF desc_len > 100 THEN
    base_score := base_score + 1;
  END IF;

  IF base_score > 3 THEN
    base_score := 3;
  END IF;

  RETURN CASE base_score
    WHEN 1 THEN 'Low'
    WHEN 2 THEN 'Medium'
    ELSE 'High'
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_department(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_severity(text, text) TO anon, authenticated;

-- Trigger function: auto-assign severity, department, priority_score on insert
CREATE OR REPLACE FUNCTION auto_assign_report_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sev_value integer;
BEGIN
  NEW.severity := assign_severity(NEW.issue_type, NEW.description);
  NEW.department := assign_department(NEW.issue_type);

  sev_value := CASE NEW.severity
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    ELSE 2
  END;
  NEW.priority_score := (sev_value * 10) + (COALESCE(NEW.duplicate_count, 0) * 5);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_auto_assign ON reports;
CREATE TRIGGER trg_reports_auto_assign
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_report_fields();

-- Update link_duplicate to also recalculate priority_score
CREATE OR REPLACE FUNCTION link_duplicate(p_parent_id uuid)
RETURNS reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row reports;
  sev_value integer;
BEGIN
  UPDATE reports
    SET duplicate_count = duplicate_count + 1
    WHERE id = p_parent_id
    RETURNING * INTO updated_row;

  sev_value := CASE updated_row.severity
    WHEN 'Low' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'High' THEN 3
    ELSE 2
  END;
  UPDATE reports
    SET priority_score = (sev_value * 10) + (updated_row.duplicate_count * 5)
    WHERE id = p_parent_id
    RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION link_duplicate(uuid) TO anon, authenticated;

-- Backfill existing rows
UPDATE reports SET
  severity = assign_severity(issue_type, description),
  department = assign_department(issue_type),
  priority_score = (
    CASE assign_severity(issue_type, description)
      WHEN 'Low' THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'High' THEN 3
      ELSE 2
    END * 10
  ) + (COALESCE(duplicate_count, 0) * 5);

CREATE INDEX IF NOT EXISTS idx_reports_priority_score ON reports(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_reports_department ON reports(department);
