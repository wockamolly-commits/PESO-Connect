-- admin_audit_log: immutable record of admin actions (currently: user deletion).
-- All writes go through the service-role Edge Function — no client insert policy needed.

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  actor_id    uuid references public.users(id) on delete set null,
  actor_email text not null,
  target_id   uuid,
  snapshot    jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "super-admins can read audit log"
  on public.admin_audit_log
  for select
  using (
    exists (
      select 1 from public.admin_access
      where user_id = auth.uid() and admin_level = 'admin'
    )
  );
