-- Public storage bucket for job fair banner images.
-- Admins can upload/manage images; visitors can read them via public URLs.

INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'job-fair-banners',
  'job-fair-banners',
  true,
  ARRAY['image/png', 'image/jpeg', 'image/webp'],
  5242880
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Anyone can read job fair banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload job fair banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update job fair banners" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete job fair banners" ON storage.objects;

CREATE POLICY "Anyone can read job fair banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-fair-banners');

CREATE POLICY "Admins can upload job fair banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-fair-banners'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update job fair banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'job-fair-banners'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'job-fair-banners'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete job fair banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-fair-banners'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
