-- Create certificates storage bucket (private).
-- Reads go through short-lived signed URLs; see
-- make_certificates_bucket_private.sql for the RLS that replaces the
-- original public-read policy.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Drop legacy policies from the first iteration of this migration so
-- re-running the file cannot reintroduce them.
DROP POLICY IF EXISTS "Users can upload own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read certificates" ON storage.objects;
DROP POLICY IF EXISTS "Owners and admins can read certificates" ON storage.objects;

-- Allow authenticated users to upload their own certificates
CREATE POLICY "Users can upload own certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to replace/update their own certificates
CREATE POLICY "Users can update own certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own certificates
CREATE POLICY "Users can delete own certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read access: file owner OR any admin. No anonymous reads.
-- Clients retrieve files via supabase.storage.from('certificates')
--   .createSignedUrl(path, expiresIn) — see src/utils/certificateUtils.js.
CREATE POLICY "Owners and admins can read certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.get_admin_level(auth.uid()) IS NOT NULL
  )
);
