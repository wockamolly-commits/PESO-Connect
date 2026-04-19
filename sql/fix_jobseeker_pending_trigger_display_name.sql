-- Fix jobseeker pending verification trigger to avoid referencing
-- a non-existent jobseeker_profiles.display_name column.

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
