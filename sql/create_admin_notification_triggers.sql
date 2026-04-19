-- Admin notification triggers for business events
-- Run in Supabase Dashboard > SQL Editor AFTER create_admin_notification_functions.sql

-- 1. Employer verification pending
--    Fires when an employer profile is inserted with pending status,
--    or when employer_status transitions to 'pending'.
create or replace function public.notify_admins_employer_pending()
returns trigger as $$
declare
  v_user record;
begin
  -- Only fire on insert-with-pending or update-into-pending
  if (tg_op = 'INSERT' and (new.employer_status is null or new.employer_status = 'pending'))
     or (tg_op = 'UPDATE'
         and (old.employer_status is distinct from 'pending')
         and (new.employer_status = 'pending'))
  then
    select name, email into v_user
      from public.users
      where id = new.id;

    perform public.create_admin_notification_for_all_admins(
      'user_verification_pending',
      'high',
      'New Employer Pending Verification',
      format('Employer "%s" (%s) is waiting for verification.',
             coalesce(new.company_name, v_user.name, 'Unknown'), v_user.email),
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
$$ language plpgsql security definer;

drop trigger if exists trg_notify_admins_employer_pending on public.employer_profiles;

create trigger trg_notify_admins_employer_pending
after insert or update of employer_status on public.employer_profiles
for each row
execute function public.notify_admins_employer_pending();

-- 2. Jobseeker verification pending
--    Fires when a jobseeker profile is inserted with pending status,
--    or when jobseeker_status transitions to 'pending'.
create or replace function public.notify_admins_jobseeker_pending()
returns trigger as $$
declare
  v_user record;
  v_jobseeker_name text;
begin
  if (tg_op = 'INSERT' and (new.jobseeker_status is null or new.jobseeker_status = 'pending'))
     or (tg_op = 'UPDATE'
         and (old.jobseeker_status is distinct from 'pending')
         and (new.jobseeker_status = 'pending'))
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
      format('Jobseeker "%s" (%s) is waiting for verification.',
             v_jobseeker_name, coalesce(v_user.email, 'No email')),
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
$$ language plpgsql security definer;

drop trigger if exists trg_notify_admins_jobseeker_pending on public.jobseeker_profiles;

create trigger trg_notify_admins_jobseeker_pending
after insert or update of jobseeker_status on public.jobseeker_profiles
for each row
execute function public.notify_admins_jobseeker_pending();
