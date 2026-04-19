-- Server-authoritative read_at timestamp for admin_notifications.
--
-- Context:
--   adminNotificationService.js previously sent `read_at = new Date().toISOString()`
--   from the browser when marking rows read. A skewed client clock (wrong
--   timezone, drifted NTP, deliberate devtools tampering) ends up in
--   read_at and corrupts any time-based audit / reporting downstream.
--
-- Fix:
--   Fill read_at from a BEFORE UPDATE trigger whenever is_read flips from
--   false to true. The client can stop sending read_at entirely (and the
--   app has been updated to do so). The trigger also clears read_at if
--   is_read is ever flipped back to false — keeps the column honest.
--
-- Idempotent; safe to re-run.

create or replace function public.set_admin_notification_read_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_read = true and coalesce(old.is_read, false) = false then
    new.read_at := now();
  elsif new.is_read = false then
    new.read_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_admin_notifications_set_read_at on public.admin_notifications;
create trigger trg_admin_notifications_set_read_at
  before update of is_read on public.admin_notifications
  for each row
  execute function public.set_admin_notification_read_at();
