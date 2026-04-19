-- Admin export audit log
-- Tracks every jobseeker CSV download so personal-data exports are accountable.
-- Depends on: admin_rbac.sql (get_admin_level function must already exist)

-- ----------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------
create table if not exists public.admin_export_logs (
  id           bigint generated always as identity primary key,
  admin_id     uuid references public.users(id) on delete set null,
  exported_at  timestamptz not null default now(),
  filter_state jsonb not null default '{}',
  row_count    integer not null default 0
);

-- ----------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------
alter table public.admin_export_logs enable row level security;

-- Drop existing policies so this migration is safe to re-run.
drop policy if exists "export_logs_admin_insert" on public.admin_export_logs;
drop policy if exists "export_logs_superadmin_select" on public.admin_export_logs;

-- Any admin can insert their own log entry.
create policy "export_logs_admin_insert"
  on public.admin_export_logs
  for insert
  with check (
    admin_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Only super-admins can read the full log.
-- Defense-in-depth: require BOTH the SECURITY DEFINER helper AND an inline
-- role check on public.users. If get_admin_level is ever broken or
-- mis-seeded (e.g. stale row after role change), the users-table check
-- still gates access.
create policy "export_logs_superadmin_select"
  on public.admin_export_logs
  for select
  using (
    public.get_admin_level(auth.uid()) = 'admin'
    and exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
