-- Create resumes storage bucket
-- Run in Supabase Dashboard > SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own resumes
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/replace their own resumes
CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (bucket is public, so URLs work without auth)
CREATE POLICY "Anyone can read resumes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');
