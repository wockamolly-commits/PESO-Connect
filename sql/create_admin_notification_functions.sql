-- Admin notification helper functions and triggers
-- Run in Supabase Dashboard > SQL Editor AFTER create_admin_notifications_table.sql

-- 1. Auto-update updated_at on row change
create or replace function public.set_admin_notifications_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_admin_notifications_updated_at on public.admin_notifications;

create trigger trg_set_admin_notifications_updated_at
before update on public.admin_notifications
for each row
execute function public.set_admin_notifications_updated_at();

-- 2. Insert a notification for a specific admin
--    SECURITY DEFINER. Must NOT be callable by normal users — it would let
--    anyone craft notifications (and XSS-payloaded titles) for any admin.
--    Intended callers: our own SECURITY DEFINER triggers and service_role.
create or replace function public.create_admin_notification(
  p_recipient_admin_id uuid,
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_reference_link text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid as $$
declare
  v_id uuid;
begin
  -- Direct-call protection is enforced by the REVOKE below; we do NOT add
  -- an auth.uid()-based guard here because this function is invoked from
  -- SECURITY DEFINER triggers on jobseeker_profiles / employer_profiles
  -- where auth.uid() is the registering user (not an admin), which would
  -- otherwise raise 42501 and roll back every new registration.
  insert into public.admin_notifications (
    recipient_admin_id, type, priority, title, message, reference_link, metadata
  ) values (
    p_recipient_admin_id, p_type, p_priority, p_title, p_message, p_reference_link, p_metadata
  )
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

-- Lock down the PostgREST-exposed surface. Triggers (owned by the superuser
-- who created the function) can still invoke it because trigger execution
-- does not require EXECUTE on the callee from the session role.
revoke all on function public.create_admin_notification(uuid, text, text, text, text, text, jsonb) from public;
revoke all on function public.create_admin_notification(uuid, text, text, text, text, text, jsonb) from anon, authenticated;
grant execute on function public.create_admin_notification(uuid, text, text, text, text, text, jsonb) to service_role;

-- 3. Fan-out: insert a notification for every active admin
--    Same authorization model as create_admin_notification above.
create or replace function public.create_admin_notification_for_all_admins(
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_reference_link text,
  p_metadata jsonb default '{}'::jsonb,
  p_required_permissions text[] default null
)
returns void as $$
begin
  -- Same reasoning as create_admin_notification: gate via REVOKE only.
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
$$ language plpgsql security definer;

revoke all on function public.create_admin_notification_for_all_admins(text, text, text, text, text, jsonb, text[]) from public;
revoke all on function public.create_admin_notification_for_all_admins(text, text, text, text, text, jsonb, text[]) from anon, authenticated;
grant execute on function public.create_admin_notification_for_all_admins(text, text, text, text, text, jsonb, text[]) to service_role;
