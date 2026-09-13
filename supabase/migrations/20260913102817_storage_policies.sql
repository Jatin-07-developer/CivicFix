/*
# Storage policies for report-photos bucket

1. Security
- Allow anon + authenticated to upload photos (citizens submit reports without login)
- Allow public read of photos (so they display in report details and dashboard)
- Only authenticated staff can delete photos
*/

DROP POLICY IF EXISTS "anon_upload_report_photos" ON storage.objects;
CREATE POLICY "anon_upload_report_photos" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'report-photos');

DROP POLICY IF EXISTS "public_read_report_photos" ON storage.objects;
CREATE POLICY "public_read_report_photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'report-photos');

DROP POLICY IF EXISTS "auth_delete_report_photos" ON storage.objects;
CREATE POLICY "auth_delete_report_photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos');
