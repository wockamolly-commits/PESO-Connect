-- ============================================================
-- DB trigger: auto-create public.users row on signup
-- Run this in the Supabase SQL Editor AFTER running create_profile_tables.sql
-- ============================================================

-- Function called by the trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
begin
  -- role is passed via signUp({ options: { data: { role } } })
  user_role := coalesce(new.raw_user_meta_data->>'role', 'jobseeker');

  insert into public.users (
    id,
    email,
    role,
    name,
    is_verified,
    registration_complete,
    registration_step,
    skills,
    credentials_url,
    created_at,
    updated_at
  ) values (
    new.id,
    new.email,
    user_role,
    '',
    -- individuals are auto-verified; employers/jobseekers require admin approval
    (user_role = 'individual'),
    false,
    1,
    '{}',
    '',
    now(),
    now()
  );

  return new;
end;
$$;

-- Attach the trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
