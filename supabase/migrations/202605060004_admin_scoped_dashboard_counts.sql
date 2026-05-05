-- Server-scoped admin dashboard aggregates. This keeps overview analytics from
-- requiring broad users/profile SELECTs in the browser.

create or replace function public.has_admin_permission(uid uuid, perm text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_access
    where user_id = uid
      and (
        admin_level = 'admin'
        or perm = any(permissions)
      )
  )
$$;

revoke all on function public.has_admin_permission(uuid, text) from public;
grant execute on function public.has_admin_permission(uuid, text) to authenticated, service_role;

create or replace function public.admin_dashboard_counts()
returns table(metric text, total bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin_level text;
  v_can_overall boolean;
  v_can_employers boolean;
  v_can_jobseekers boolean;
begin
  v_admin_level := public.get_admin_level(v_uid);
  if v_admin_level is null then
    raise exception 'insufficient_privilege: admin role required'
      using errcode = '42501';
  end if;

  v_can_overall := public.has_admin_permission(v_uid, 'view_overall_overview');
  v_can_employers := v_can_overall
    or public.has_admin_permission(v_uid, 'view_employer_overview')
    or public.has_admin_permission(v_uid, 'view_employers');
  v_can_jobseekers := v_can_overall
    or public.has_admin_permission(v_uid, 'view_jobseeker_overview')
    or public.has_admin_permission(v_uid, 'view_jobseekers');

  if v_can_overall then
    return query select 'users.total', count(*) from public.users;
    return query select 'users.admins', count(*) from public.users where role = 'admin';
    return query select 'users.homeowners', count(*) from public.users where role = 'user' and subtype = 'homeowner';
  end if;

  if v_can_employers then
    return query select 'employers.total', count(*) from public.employer_profiles;
    return query select 'employers.pending', count(*) from public.employer_profiles where coalesce(employer_status, 'pending') = 'pending';
    return query select 'employers.approved', count(*) from public.employer_profiles where employer_status = 'approved';
    return query select 'employers.rejected', count(*) from public.employer_profiles where employer_status = 'rejected';
    return query select 'employers.expired', count(*) from public.employer_profiles where employer_status = 'expired';
  end if;

  if v_can_jobseekers then
    return query select 'jobseekers.total', count(*) from public.jobseeker_profiles;
    return query select 'jobseekers.pending', count(*) from public.jobseeker_profiles where coalesce(jobseeker_status, 'pending') = 'pending';
    return query select 'jobseekers.verified', count(*) from public.jobseeker_profiles where jobseeker_status = 'verified';
    return query select 'jobseekers.rejected', count(*) from public.jobseeker_profiles where jobseeker_status = 'rejected';
    return query select 'jobseekers.expired', count(*) from public.jobseeker_profiles where jobseeker_status = 'expired';
  end if;
end;
$$;

revoke all on function public.admin_dashboard_counts() from public;
grant execute on function public.admin_dashboard_counts() to authenticated;
