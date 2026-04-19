-- Tighten the certificates bucket upload policy so rejected / expired
-- users cannot swap their submitted files without PESO re-opening
-- their verification.
--
-- Context:
--   create_certificates_bucket.sql originally allowed any authenticated
--   user to upload under their own folder. Registration requires this
--   (users upload BEFORE they are verified), so we cannot simply require
--   is_verified=true — that would break the happy path.
--
--   What we can safely block: users who have already been rejected or
--   whose annual verification has expired. Both are states that require
--   admin re-activation; allowing mid-stream file swaps would invalidate
--   whatever PESO previously reviewed.
--
-- Approach: replace the three write policies (INSERT/UPDATE/DELETE) with
-- versions that additionally exclude 'rejected' and 'expired' status in
-- both jobseeker_profiles and employer_profiles.
--
-- Idempotent; safe to re-run.

drop policy if exists "Users can upload own certificates" on storage.objects;
drop policy if exists "Users can update own certificates" on storage.objects;
drop policy if exists "Users can delete own certificates" on storage.objects;

-- Helper: is this user blocked from mutating their certificates?
-- Returns true when either role profile marks them as rejected/expired.
create or replace function public.certificate_writes_blocked(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.jobseeker_profiles
    where id = uid and jobseeker_status in ('rejected', 'expired')
  )
  or exists (
    select 1 from public.employer_profiles
    where id = uid and employer_status in ('rejected', 'expired')
  )
$$;

revoke all on function public.certificate_writes_blocked(uuid) from public;
grant execute on function public.certificate_writes_blocked(uuid)
  to authenticated, service_role;

create policy "Users can upload own certificates"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.certificate_writes_blocked(auth.uid())
);

create policy "Users can update own certificates"
on storage.objects for update
to authenticated
using (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.certificate_writes_blocked(auth.uid())
)
with check (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.certificate_writes_blocked(auth.uid())
);

create policy "Users can delete own certificates"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'certificates'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.certificate_writes_blocked(auth.uid())
);
