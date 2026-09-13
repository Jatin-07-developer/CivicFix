/*
# Create reports table for CivicFix

1. New Tables
- `reports`
  - `id` (uuid, primary key) — the internal record ID
  - `tracking_id` (text, unique, not null) — short human-readable ID citizens use to track (e.g. "CF-AB12CD")
  - `issue_type` (text, not null) — one of: Pothole, Garbage, Water Leak, Streetlight, Waterlogging, Other
  - `description` (text, nullable) — optional citizen-provided description
  - `photo_url` (text, nullable) — URL to uploaded photo in storage bucket
  - `latitude` (double precision, nullable) — GPS latitude
  - `longitude` (double precision, nullable) — GPS longitude
  - `location_text` (text, nullable) — fallback location description (map pin address)
  - `status` (text, not null, default 'Reported') — one of: Reported, Acknowledged, In Progress, Resolved, Verified
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `reports`.
- Citizen side is no-login (anon), so SELECT and INSERT are open to anon + authenticated.
- Status updates are a privileged municipal action — restricted to `authenticated` (staff who logged in).
- DELETE restricted to `authenticated`.
- This split means anon can report and track, but only logged-in staff can change status or delete.

3. Notes
- Tracking ID is generated server-side via a default expression to ensure uniqueness.
- `updated_at` auto-updates via trigger.
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text UNIQUE NOT NULL DEFAULT ('CF-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))),
  issue_type text NOT NULL CHECK (issue_type IN ('Pothole', 'Garbage', 'Water Leak', 'Streetlight', 'Waterlogging', 'Other')),
  description text,
  photo_url text,
  latitude double precision,
  longitude double precision,
  location_text text,
  status text NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported', 'Acknowledged', 'In Progress', 'Resolved', 'Verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Citizens (anon) can read all reports (needed for tracking by ID and map view)
DROP POLICY IF EXISTS "anon_select_reports" ON reports;
CREATE POLICY "anon_select_reports" ON reports FOR SELECT
  TO anon, authenticated USING (true);

-- Citizens (anon) can submit new reports
DROP POLICY IF EXISTS "anon_insert_reports" ON reports;
CREATE POLICY "anon_insert_reports" ON reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated staff can update report status
DROP POLICY IF EXISTS "auth_update_reports" ON reports;
CREATE POLICY "auth_update_reports" ON reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated staff can delete reports
DROP POLICY IF EXISTS "auth_delete_reports" ON reports;
CREATE POLICY "auth_delete_reports" ON reports FOR DELETE
  TO authenticated USING (true);

-- Index for tracking lookups
CREATE INDEX IF NOT EXISTS idx_reports_tracking_id ON reports(tracking_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
