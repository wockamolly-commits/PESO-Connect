-- Server-side MIME enforcement for the certificates bucket.
--
-- Context:
--   validateCertificateFile() on the client blocks non-PDF/JPEG/PNG
--   files, but a malicious caller can bypass React and hit the storage
--   API directly. RLS currently only checks folder ownership and size
--   cap — nothing rejects a .exe renamed to foo.pdf.
--
-- Fix: set allowed_mime_types on the bucket itself. Supabase Storage
-- evaluates this server-side on upload and returns a 400 for anything
-- outside the allowlist. Also caps file_size_limit at 5 MB to match
-- the MAX_CERTIFICATE_SIZE constant in certificateUtils.js.
--
-- Idempotent; safe to re-run.

update storage.buckets
set
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ],
  file_size_limit = 5 * 1024 * 1024
where id = 'certificates';
