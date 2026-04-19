-- Admin Notifications table
-- Run in Supabase Dashboard > SQL Editor
--
-- Stores notifications targeted at admin users. Kept separate from
-- public.notifications to avoid mixing admin workflows with end-user messaging.

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_admin_id uuid references public.users(id) on delete cascade,
  type text not null check (
    type in (
      'user_verification_pending',
      'job_posting_approval',
      'system_alert',
      'user_report',
      'application_flagged',
      'admin_account_event'
    )
  ),
  priority text not null default 'medium' check (
    priority in ('low', 'medium', 'high', 'critical')
  ),
  title text not null,
  message text not null,
  reference_link text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_admin_notifications_recipient_created
  on public.admin_notifications(recipient_admin_id, created_at desc);

create index if not exists idx_admin_notifications_unread
  on public.admin_notifications(recipient_admin_id, is_read)
  where is_read = false;

create index if not exists idx_admin_notifications_type_created
  on public.admin_notifications(type, created_at desc);

-- Row Level Security
alter table public.admin_notifications enable row level security;

create policy "Admins can read own admin notifications"
on public.admin_notifications
for select
to authenticated
using (
  recipient_admin_id = auth.uid()
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
);

create policy "Admins can update own admin notifications"
on public.admin_notifications
for update
to authenticated
using (
  recipient_admin_id = auth.uid()
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
)
with check (
  recipient_admin_id = auth.uid()
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
);

create policy "System can insert admin notifications"
on public.admin_notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
);

-- Enable Realtime
alter publication supabase_realtime add table public.admin_notifications;
