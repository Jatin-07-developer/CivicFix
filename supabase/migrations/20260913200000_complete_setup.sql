-- ============================================================
-- CivicFix: Complete Supabase Setup Script
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Create the storage bucket (if it doesn't exist) ─────────────────────
-- NOTE: Bucket creation via SQL only works in Supabase versions that support it.
-- If the INSERT below fails, create the bucket manually:
--   Storage → New bucket → Name: "report-photos" → Make it PUBLIC

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-photos',
  'report-photos',
  true,                              -- public bucket
  10485760,                          -- 10 MB max file size
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- ── 2. Storage RLS policies ─────────────────────────────────────────────────

-- Allow anyone (anon + logged-in) to upload to report-photos
DROP POLICY IF EXISTS "anon_upload_report_photos" ON storage.objects;
CREATE POLICY "anon_upload_report_photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'report-photos');

-- Allow public read of report photos
DROP POLICY IF EXISTS "public_read_report_photos" ON storage.objects;
CREATE POLICY "public_read_report_photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'report-photos');

-- Allow authenticated staff to delete photos
DROP POLICY IF EXISTS "auth_delete_report_photos" ON storage.objects;
CREATE POLICY "auth_delete_report_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos');

-- ── 3. Ensure reports table has all required columns ───────────────────────
ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'Medium'
  CHECK (severity IN ('Low', 'Medium', 'High'));
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority_score integer NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'General Department';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS contact_email text;

-- ── 4. Ensure RLS is enabled and policies are correct ──────────────────────
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_reports" ON reports;
CREATE POLICY "auth_update_reports" ON reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ── 5. status_history table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_status_history" ON status_history;
CREATE POLICY "select_status_history" ON status_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_status_history" ON status_history;
CREATE POLICY "insert_status_history" ON status_history FOR INSERT TO authenticated WITH CHECK (true);

-- ── 6. escalations table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  escalated_to text NOT NULL,
  reason text NOT NULL,
  escalated_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_escalations" ON escalations;
CREATE POLICY "select_escalations" ON escalations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_escalations" ON escalations;
CREATE POLICY "insert_escalations" ON escalations FOR INSERT TO authenticated WITH CHECK (true);

-- ── 7. Trigger: auto-log status changes to status_history ──────────────────
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO status_history (report_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_status_change ON reports;
CREATE TRIGGER trg_log_status_change
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- ── 8. find_duplicate_report function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION find_duplicate_report(
  p_issue_type text,
  p_lat double precision,
  p_lng double precision
)
RETURNS TABLE(id uuid, tracking_id text, duplicate_count integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.tracking_id, r.duplicate_count
  FROM reports r
  WHERE r.issue_type = p_issue_type
    AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
    AND p_lat IS NOT NULL AND p_lng IS NOT NULL
    AND r.created_at >= now() - interval '14 days'
    AND (
      6371000 * 2 * asin(sqrt(
        power(sin(radians(r.latitude - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(r.latitude)) *
        power(sin(radians(r.longitude - p_lng) / 2), 2)
      ))
    ) <= 100
  ORDER BY r.created_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION find_duplicate_report(text, double precision, double precision) TO anon, authenticated;

-- ── 9. link_duplicate function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION link_duplicate(p_parent_id uuid)
RETURNS reports LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_row reports;
BEGIN
  UPDATE reports SET duplicate_count = duplicate_count + 1 WHERE id = p_parent_id RETURNING * INTO updated_row;
  RETURN updated_row;
END;
$$;
GRANT EXECUTE ON FUNCTION link_duplicate(uuid) TO anon, authenticated;

-- ── 10. Auto-assign severity + department on insert ────────────────────────
CREATE OR REPLACE FUNCTION assign_department(p_issue_type text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN p_issue_type = 'Pothole' THEN 'Roads Department'
    WHEN p_issue_type = 'Garbage' THEN 'Sanitation Department'
    WHEN p_issue_type = 'Water Leak' THEN 'Water Department'
    WHEN p_issue_type = 'Streetlight' THEN 'Electrical Department'
    WHEN p_issue_type = 'Waterlogging' THEN 'Drainage Department'
    ELSE 'General Department'
  END;
$$;

CREATE OR REPLACE FUNCTION assign_severity(p_issue_type text, p_description text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE s int; d text; kw int;
BEGIN
  s := CASE p_issue_type WHEN 'Waterlogging' THEN 3 WHEN 'Water Leak' THEN 2 WHEN 'Pothole' THEN 2 ELSE 1 END;
  d := lower(COALESCE(p_description, ''));
  kw := 0;
  IF d LIKE ANY(ARRAY['%flood%','%large%','%deep%','%dangerous%','%urgent%','%sinkhole%','%collapsed%','%severe%','%huge%','%overflow%','%blocked%']) THEN kw := kw + 1; END IF;
  s := LEAST(3, s + kw + CASE WHEN length(d) > 100 THEN 1 ELSE 0 END);
  RETURN CASE s WHEN 1 THEN 'Low' WHEN 2 THEN 'Medium' ELSE 'High' END;
END;
$$;

CREATE OR REPLACE FUNCTION auto_assign_report_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE sv int;
BEGIN
  NEW.severity := assign_severity(NEW.issue_type, NEW.description);
  NEW.department := assign_department(NEW.issue_type);
  sv := CASE NEW.severity WHEN 'Low' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END;
  NEW.priority_score := (sv * 10) + (COALESCE(NEW.duplicate_count, 0) * 5);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reports_auto_assign ON reports;
CREATE TRIGGER trg_reports_auto_assign
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION auto_assign_report_fields();

GRANT EXECUTE ON FUNCTION assign_department(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_severity(text, text) TO anon, authenticated;

-- ── Done! ───────────────────────────────────────────────────────────────────
-- After running this script:
-- 1. Go to Supabase → Storage → report-photos → Settings
--    and confirm the bucket is set to "Public"
-- 2. Test by submitting a report at /report
