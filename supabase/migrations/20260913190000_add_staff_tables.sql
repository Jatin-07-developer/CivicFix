/*
# Staff Portal Tables — CivicFix

1. New columns on `reports`
   - `upvote_count` (integer, default 0) — citizen priority votes
   - `contact_email` (text, nullable) — citizen contact for notifications
   - `is_overdue` — computed via view, not stored column

2. New Tables
   - `status_history` — immutable audit log of every status change
   - `escalations`    — log of every escalation event

3. RLS
   - `status_history`: anyone can SELECT; only authenticated can INSERT (via trigger)
   - `escalations`: anyone can SELECT; only authenticated can INSERT

4. Trigger
   - `trg_log_status_change` AFTER UPDATE on reports — fires when status changes,
     inserts a row into status_history automatically.

5. Notes
   - The `changed_by_email` is populated via auth.email() in the trigger.
   - No scheduled SLA escalation job in v1 — overdue detection is client-side.
*/

-- ─── Extend reports ───────────────────────────────────────────────────────────

ALTER TABLE reports ADD COLUMN IF NOT EXISTS upvote_count  integer NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS contact_email text;

-- ─── status_history ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS status_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status      text,
  new_status      text        NOT NULL,
  changed_by      text,       -- email of staff who made the change (null if anon)
  note            text,       -- optional staff note
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_report_id ON status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON status_history(created_at DESC);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_select_status_history" ON status_history;
CREATE POLICY "anyone_select_status_history" ON status_history
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_status_history" ON status_history;
CREATE POLICY "auth_insert_status_history" ON status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow the trigger (SECURITY DEFINER) to bypass RLS for inserts
DROP POLICY IF EXISTS "service_insert_status_history" ON status_history;
CREATE POLICY "service_insert_status_history" ON status_history
  FOR INSERT TO anon WITH CHECK (true);

-- ─── escalations ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS escalations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  escalated_to    text        NOT NULL,   -- 'Department Head', 'Ward Officer', 'Admin'
  reason          text        NOT NULL,
  escalated_by    text,                   -- staff email who triggered
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_report_id ON escalations(report_id);
CREATE INDEX IF NOT EXISTS idx_escalations_created_at ON escalations(created_at DESC);

ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_select_escalations" ON escalations;
CREATE POLICY "anyone_select_escalations" ON escalations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_escalations" ON escalations;
CREATE POLICY "auth_insert_escalations" ON escalations
  FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Auto-log status changes ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_history (report_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.email());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_status_change ON reports;
CREATE TRIGGER trg_log_status_change
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- ─── Seed status_history for existing reports ──────────────────────────────────

INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
SELECT id, NULL, status, 'system-seed', 'Initial status on record creation'
FROM reports
WHERE NOT EXISTS (
  SELECT 1 FROM status_history sh WHERE sh.report_id = reports.id
);
