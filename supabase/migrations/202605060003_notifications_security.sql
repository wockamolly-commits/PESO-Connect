-- Lock notification creation to trusted server paths.
-- Clients must call the create-notification Edge Function, which validates
-- actor, recipient, event type, and related job/application ownership before
-- inserting with the service role.

alter table if exists public.notifications enable row level security;

drop policy if exists "Authenticated users can insert notifications" on public.notifications;
drop policy if exists "Users can insert own notifications" on public.notifications;
drop policy if exists "Users can create own notifications" on public.notifications;
drop policy if exists "Trusted server can insert notifications" on public.notifications;

-- No authenticated insert policy is recreated here. The service role bypasses
-- RLS after Edge Function validation; regular users retain read/update-only
-- policies for their own rows.
