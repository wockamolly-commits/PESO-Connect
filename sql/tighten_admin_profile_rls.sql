-- Tighten admin RLS on profile tables so sub-admin permissions are
-- enforced at the database layer, not just in the React UI.
--
-- Context / attack vector being closed:
--   The "Admins can update all <role> profiles" policies in
--   create_profile_tables.sql allow ANY row in public.users with
--   role='admin' to update every profile. Sub-admins also have
--   role='admin' — their finer-grained approve/reject permissions
--   live only in public.admin_access.permissions and are gated in
--   the React dashboard. A sub-admin without approve_employers could
--   bypass the UI (React DevTools, direct supabase-js call) and
--   still approve or reject anyone.
--
-- This migration:
--   1. Adds a SECURITY DEFINER helper has_admin_permission(uid, perm)
--      that checks admin_access without tripping RLS recursion.
--   2. Replaces the role-only "Admins can update …" policies with
--      policies that require the caller to actually hold an
--      approve_* OR reject_* permission (or be a super-admin).
--
-- Self-update on the profile owner's own row is handled by the
-- pre-existing "Users can update own …" policies and is not touched.
-- Read policies are also untouched — pending users must remain
-- visible to the admin directory.

-- ----------------------------------------------------------------
-- Helper: does user `uid` hold permission `perm`?
-- Super-admins (admin_level='admin') implicitly hold every permission.
-- ----------------------------------------------------------------
create or replace function public.has_admin_permission(uid uuid, perm text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_access
    where user_id = uid
      and (
        admin_level = 'admin'
        or perm = any(permissions)
      )
  )
$$;

revoke all on function public.has_admin_permission(uuid, text) from public;
grant execute on function public.has_admin_permission(uuid, text)
  to authenticated, service_role;

-- ----------------------------------------------------------------
-- Employer profiles — requires approve_employers OR reject_employers
-- ----------------------------------------------------------------
drop policy if exists "Admins can update all employer profiles"
  on public.employer_profiles;

create policy "Admins can update all employer profiles"
  on public.employer_profiles
  for update
  using (
    public.has_admin_permission(auth.uid(), 'approve_employers')
    or public.has_admin_permission(auth.uid(), 'reject_employers')
  )
  with check (
    public.has_admin_permission(auth.uid(), 'approve_employers')
    or public.has_admin_permission(auth.uid(), 'reject_employers')
  );

-- ----------------------------------------------------------------
-- Jobseeker profiles — requires approve_jobseekers OR reject_jobseekers
-- ----------------------------------------------------------------
drop policy if exists "Admins can update all jobseeker profiles"
  on public.jobseeker_profiles;

create policy "Admins can update all jobseeker profiles"
  on public.jobseeker_profiles
  for update
  using (
    public.has_admin_permission(auth.uid(), 'approve_jobseekers')
    or public.has_admin_permission(auth.uid(), 'reject_jobseekers')
  )
  with check (
    public.has_admin_permission(auth.uid(), 'approve_jobseekers')
    or public.has_admin_permission(auth.uid(), 'reject_jobseekers')
  );

-- ----------------------------------------------------------------
-- Individual profiles — no dedicated approve/reject flow today,
-- so require manage_system_settings (super-admin-only). Keeps parity
-- with the UI, which does not expose individual verification to
-- sub-admins.
--
-- Wrapped in a DO block because some environments have not yet
-- applied create_profile_tables.sql's individual_profiles table.
-- ----------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'individual_profiles'
      and c.relkind = 'r'
  ) then
    execute 'drop policy if exists "Admins can update all individual profiles" on public.individual_profiles';
    execute $p$
      create policy "Admins can update all individual profiles"
        on public.individual_profiles
        for update
        using (
          public.has_admin_permission(auth.uid(), 'manage_system_settings')
        )
        with check (
          public.has_admin_permission(auth.uid(), 'manage_system_settings')
        )
    $p$;
  end if;
end
$$;
