-- Admin notifications: one-shot repair / setup script
-- Safe to re-run in Supabase SQL Editor.

-- ------------------------------------------------------------
-- Table
-- ------------------------------------------------------------
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

create index if not exists idx_admin_notifications_recipient_created
  on public.admin_notifications(recipient_admin_id, created_at desc);

create index if not exists idx_admin_notifications_unread
  on public.admin_notifications(recipient_admin_id, is_read)
  where is_read = false;

create index if not exists idx_admin_notifications_type_created
  on public.admin_notifications(type, created_at desc);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.admin_notifications enable row level security;

drop policy if exists "Admins can read own admin notifications" on public.admin_notifications;
drop policy if exists "Admins can update own admin notifications" on public.admin_notifications;
drop policy if exists "System can insert admin notifications" on public.admin_notifications;

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

-- ------------------------------------------------------------
-- Utility functions
-- ------------------------------------------------------------
create or replace function public.set_admin_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_admin_notifications_updated_at on public.admin_notifications;

create trigger trg_set_admin_notifications_updated_at
before update on public.admin_notifications
for each row
execute function public.set_admin_notifications_updated_at();

create or replace function public.create_admin_notification(
  p_recipient_admin_id uuid,
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_reference_link text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Direct-call protection is the REVOKE below; no auth.uid() guard here
  -- because SECURITY DEFINER triggers call this during registration where
  -- auth.uid() is the non-admin registering user.
  insert into public.admin_notifications (
    recipient_admin_id, type, priority, title, message, reference_link, metadata
  ) values (
    p_recipient_admin_id, p_type, p_priority, p_title, p_message, p_reference_link, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_admin_notification(uuid, text, text, text, text, text, jsonb) from public;
revoke all on function public.create_admin_notification(uuid, text, text, text, text, text, jsonb) from anon, authenticated;
grant execute on function public.create_admin_notification(uuid, text, text, text, text, text, jsonb) to service_role;

create or replace function public.create_admin_notification_for_all_admins(
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_reference_link text,
  p_metadata jsonb default '{}'::jsonb,
  p_required_permissions text[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (
    recipient_admin_id, type, priority, title, message, reference_link, metadata
  )
  select
    u.id,
    p_type,
    p_priority,
    p_title,
    p_message,
    p_reference_link,
    p_metadata
  from public.users u
  left join public.admin_access aa
    on aa.user_id = u.id
  where u.role = 'admin'
    and (
      aa.admin_level = 'admin'
      or coalesce(array_length(p_required_permissions, 1), 0) = 0
      or (
        aa.admin_level = 'sub-admin'
        and coalesce(aa.permissions, '{}'::text[]) && p_required_permissions
      )
    );
end;
$$;

revoke all on function public.create_admin_notification_for_all_admins(text, text, text, text, text, jsonb, text[]) from public;
revoke all on function public.create_admin_notification_for_all_admins(text, text, text, text, text, jsonb, text[]) from anon, authenticated;
grant execute on function public.create_admin_notification_for_all_admins(text, text, text, text, text, jsonb, text[]) to service_role;

-- ------------------------------------------------------------
-- Business-event triggers
-- ------------------------------------------------------------
create or replace function public.notify_admins_employer_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  if (tg_op = 'INSERT' and (new.employer_status is null or new.employer_status = 'pending'))
     or (tg_op = 'UPDATE'
         and old.employer_status is distinct from 'pending'
         and new.employer_status = 'pending')
  then
    select name, email into v_user
    from public.users
    where id = new.id;

    perform public.create_admin_notification_for_all_admins(
      'user_verification_pending',
      'high',
      'New Employer Pending Verification',
      format(
        'Employer "%s" (%s) is waiting for verification.',
        coalesce(new.company_name, v_user.name, 'Unknown'),
        coalesce(v_user.email, 'No email')
      ),
      format('/admin?section=employers&tab=pending&userId=%s', new.id),
      jsonb_build_object(
        'user_id', new.id,
        'company_name', new.company_name,
        'review_type', 'employer'
      ),
      array['view_employers', 'approve_employers', 'reject_employers']::text[]
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_employer_pending on public.employer_profiles;

create trigger trg_notify_admins_employer_pending
after insert or update of employer_status on public.employer_profiles
for each row
execute function public.notify_admins_employer_pending();

create or replace function public.notify_admins_jobseeker_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_jobseeker_name text;
begin
  if (tg_op = 'INSERT' and (new.jobseeker_status is null or new.jobseeker_status = 'pending'))
     or (tg_op = 'UPDATE'
         and old.jobseeker_status is distinct from 'pending'
         and new.jobseeker_status = 'pending')
  then
    select name, email into v_user
    from public.users
    where id = new.id;

    v_jobseeker_name := coalesce(
      nullif(trim(concat_ws(' ', new.first_name, new.middle_name, new.surname, new.suffix)), ''),
      nullif(new.full_name, ''),
      nullif(v_user.name, ''),
      'Unknown'
    );

    perform public.create_admin_notification_for_all_admins(
      'user_verification_pending',
      'medium',
      'New Jobseeker Pending Verification',
      format(
        'Jobseeker "%s" (%s) is waiting for verification.',
        v_jobseeker_name,
        coalesce(v_user.email, 'No email')
      ),
      format('/admin?section=jobseekers&tab=pending&userId=%s', new.id),
      jsonb_build_object(
        'user_id', new.id,
        'jobseeker_name', v_jobseeker_name,
        'review_type', 'jobseeker'
      ),
      array['view_jobseekers', 'approve_jobseekers', 'reject_jobseekers']::text[]
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_jobseeker_pending on public.jobseeker_profiles;

create trigger trg_notify_admins_jobseeker_pending
after insert or update of jobseeker_status on public.jobseeker_profiles
for each row
execute function public.notify_admins_jobseeker_pending();

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.admin_notifications;
exception
  when duplicate_object then
    null;
end $$;

-- ------------------------------------------------------------
-- Quick verification helpers
-- ------------------------------------------------------------
-- 1. Check the table exists:
-- select to_regclass('public.admin_notifications');
--
-- 2. Check triggers exist:
-- select trigger_name, event_object_table
-- from information_schema.triggers
-- where event_object_table in ('employer_profiles', 'jobseeker_profiles');
--
-- 3. Check rows are being created:
-- select id, recipient_admin_id, type, title, created_at
-- from public.admin_notifications
-- order by created_at desc
-- limit 20;
