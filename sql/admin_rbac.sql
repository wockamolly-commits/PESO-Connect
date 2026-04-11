-- Admin RBAC: admin_access table, RLS policies, and backfill
-- Run this migration after the base tables are in place.
-- This file does NOT change public.users.role — both super-admins
-- and sub-admins keep role = 'admin'.

-- ----------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------
create table if not exists public.admin_access (
  user_id    uuid primary key references public.users(id) on delete cascade,
  admin_level text not null check (admin_level in ('admin', 'sub-admin')),
  permissions text[] not null default '{}',
  created_by  uuid references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Backfill: existing admin users become super-admins with all
-- permissions so current access is entirely preserved.
-- ----------------------------------------------------------------
insert into public.admin_access (user_id, admin_level, permissions)
select
  id,
  'admin',
  array[
    'view_overview',
    'view_employers',
    'approve_employers',
    'reject_employers',
    'view_jobseekers',
    'approve_jobseekers',
    'reject_jobseekers',
    'view_users',
    'export_jobseekers',
    'manage_admins',
    'manage_system_settings',
    'delete_users'
  ]
from public.users
where role = 'admin'
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------
alter table public.admin_access enable row level security;

-- Drop existing policies so this script is re-runnable.
drop policy if exists "admin_access_self_read" on public.admin_access;
drop policy if exists "admin_access_superadmin_read_all" on public.admin_access;
drop policy if exists "admin_access_superadmin_insert" on public.admin_access;
drop policy if exists "admin_access_superadmin_update" on public.admin_access;
drop policy if exists "admin_access_superadmin_delete" on public.admin_access;

-- SECURITY DEFINER helper that bypasses RLS to check admin_level.
-- This breaks the infinite-recursion loop that occurs when RLS policies
-- on admin_access query admin_access themselves.
create or replace function public.get_admin_level(uid uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select admin_level from public.admin_access where user_id = uid limit 1
$$;

-- Any admin can read their own row (needed at login before we know
-- whether they are a super-admin or sub-admin).
create policy "admin_access_self_read"
  on public.admin_access
  for select
  using (user_id = auth.uid());

-- Super-admins can read all rows (for the management panel).
-- Uses SECURITY DEFINER function to avoid recursive RLS evaluation.
create policy "admin_access_superadmin_read_all"
  on public.admin_access
  for select
  using (public.get_admin_level(auth.uid()) = 'admin');

-- Only super-admins can insert new admin_access records.
create policy "admin_access_superadmin_insert"
  on public.admin_access
  for insert
  with check (public.get_admin_level(auth.uid()) = 'admin');

-- Only super-admins can update existing records.
create policy "admin_access_superadmin_update"
  on public.admin_access
  for update
  using (public.get_admin_level(auth.uid()) = 'admin');

-- Only super-admins can delete records.
create policy "admin_access_superadmin_delete"
  on public.admin_access
  for delete
  using (public.get_admin_level(auth.uid()) = 'admin');

-- ----------------------------------------------------------------
-- updated_at trigger (mirrors the pattern used elsewhere)
-- ----------------------------------------------------------------
create or replace function public.set_admin_access_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_access_updated_at on public.admin_access;
create trigger trg_admin_access_updated_at
  before update on public.admin_access
  for each row execute function public.set_admin_access_updated_at();
