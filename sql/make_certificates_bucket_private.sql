-- Make the `certificates` bucket private.
--
-- Prior state (see create_certificates_bucket.sql): the bucket was public
-- and a storage.objects SELECT policy granted read to everyone, so anyone
-- on the internet who guessed a path could download a user's certificate.
--
-- New state:
--   * bucket.public = false (no anonymous read)
--   * owner can read their own files
--   * any admin (admin_level in ('admin','sub-admin')) can read any file
--   * existing write/update/delete policies are unchanged
--
-- Safe to re-run.

-- 1. Mark the bucket private.
update storage.buckets
   set public = false
 where id = 'certificates';

-- 2. Remove the blanket public-read policy (idempotent).
drop policy if exists "Anyone can read certificates" on storage.objects;
drop policy if exists "Owners and admins can read certificates" on storage.objects;

-- 3. Add a scoped read policy: file owner OR any admin.
create policy "Owners and admins can read certificates"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'certificates'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.get_admin_level(auth.uid()) is not null
    )
  );
