-- Fix: remove the erroneous admin-role guard from the notification helper functions.
--
-- The guard (`if auth.uid() is not null and get_admin_level(...) is null then raise...`)
-- was intended to block direct calls from non-admin users, but it also fires when the
-- function is called from a SECURITY DEFINER trigger on jobseeker_profiles / employer_profiles.
-- In that context auth.uid() returns the registering user's UID (not an admin), so the
-- guard raises 42501 and the whole upsert rolls back.
--
-- The EXECUTE grant (service_role only, revoked from anon/authenticated) already prevents
-- direct calls from client code.  No application-level guard is needed.
--
-- Run this once in the Supabase SQL Editor.

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
