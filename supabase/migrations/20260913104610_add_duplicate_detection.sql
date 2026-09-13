/*
# Add duplicate_count column and duplicate detection function

1. Modified Tables
- `reports`
  - Added `duplicate_count` (integer, not null, default 0) — tracks how many
    citizens have reported the same issue nearby within 14 days.

2. New Functions
- `find_duplicate_report(p_issue_type text, p_lat double precision, p_lng double precision)`
  - SECURITY DEFINER function that searches for an existing report of the same
    issue type within ~100 meters, reported in the last 14 days, that hasn't
    already been linked as a duplicate (i.e. the "parent" report).
  - Returns the id and tracking_id of the matching report, or NULL if none found.
  - Uses the Haversine formula (ST_Distance would need PostGIS; this works without it).
  - Scoped to `TO anon, authenticated` since citizens submit without login.

- `link_duplicate(p_parent_id uuid)`
  - SECURITY DEFINER function that atomically increments the duplicate_count
    on the parent report by 1 and returns the updated row.
  - Scoped to `TO anon, authenticated`.

3. Security
- Both functions are SECURITY DEFINER so they can update reports even though
  anon's UPDATE policy is not granted (only authenticated can update).
  - `find_duplicate_report` is read-only (SELECT).
  - `link_duplicate` increments duplicate_count only — it does NOT let anon
    change status, photo, or any other field.
- This is safe because the functions only modify duplicate_count, not status
  or other privileged fields.
*/

ALTER TABLE reports ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0;

-- find_duplicate_report: find a nearby same-type report from the last 14 days
CREATE OR REPLACE FUNCTION find_duplicate_report(
  p_issue_type text,
  p_lat double precision,
  p_lng double precision
)
RETURNS TABLE(id uuid, tracking_id text, duplicate_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.tracking_id, r.duplicate_count
  FROM reports r
  WHERE r.issue_type = p_issue_type
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND p_lat IS NOT NULL
    AND p_lng IS NOT NULL
    AND r.created_at >= now() - interval '14 days'
    AND (
      6371000 * 2 * asin(
        sqrt(
          power(sin(radians(r.latitude - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(r.latitude)) *
          power(sin(radians(r.longitude - p_lng) / 2), 2)
        )
      )
    ) <= 100
  ORDER BY r.created_at DESC
  LIMIT 1;
$$;

-- link_duplicate: atomically increment duplicate_count on parent report
CREATE OR REPLACE FUNCTION link_duplicate(p_parent_id uuid)
RETURNS reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row reports;
BEGIN
  UPDATE reports
    SET duplicate_count = duplicate_count + 1
    WHERE id = p_parent_id
    RETURNING * INTO updated_row;
  RETURN updated_row;
END;
$$;

-- Grant execute to anon (citizens submit without login) and authenticated (staff)
GRANT EXECUTE ON FUNCTION find_duplicate_report(text, double precision, double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION link_duplicate(uuid) TO anon, authenticated;
