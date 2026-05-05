drop function if exists public.admin_search_users(text, text, text, text, integer, integer);

create or replace function public.admin_search_users(
  p_role text default null, p_verification_status text default null,
  p_search text default null, p_sort_order text default 'desc',
  p_limit integer default 20, p_offset integer default 0
)
returns table(
  id uuid, email text, name text, role text, subtype text,
  is_verified boolean, created_at timestamptz, company_name text,
  representative_name text, employer_status text, display_name text,
  full_name text, jobseeker_status text,
  profile_modified_since_verification boolean, total_count bigint
)
language sql security definer stable set search_path = public as $function$
select u.id,u.email,u.name,u.role,u.subtype,coalesce(u.is_verified,false),u.created_at,
ep.company_name,ep.representative_name,coalesce(ep.employer_status,'pending'),
coalesce(
  nullif(js.full_name, ''),
  nullif(concat_ws(' ', nullif(js.first_name, ''), nullif(js.middle_name, ''), nullif(js.surname, '')), ''),
  nullif(concat_ws(' ', nullif(u.first_name, ''), nullif(u.middle_name, ''), nullif(u.surname, '')), ''),
  nullif(u.name, '')
),
coalesce(
  nullif(js.full_name, ''),
  nullif(concat_ws(' ', nullif(js.first_name, ''), nullif(js.middle_name, ''), nullif(js.surname, '')), ''),
  nullif(concat_ws(' ', nullif(u.first_name, ''), nullif(u.middle_name, ''), nullif(u.surname, '')), ''),
  nullif(u.name, '')
),
coalesce(js.jobseeker_status,'pending'),
case when u.role='employer' then coalesce(ep.profile_modified_since_verification,false)
when u.role='user' and u.subtype='jobseeker' then coalesce(js.profile_modified_since_verification,false)
else false end,count(*) over()
from public.users u
join public.admin_access aa on aa.user_id=auth.uid()
left join public.employer_profiles ep on ep.id=u.id
left join public.jobseeker_profiles js on js.id=u.id
where (
  aa.admin_level='admin'
  or (u.role='employer' and ('view_employers'=any(coalesce(aa.permissions,'{}')) or 'view_employer_overview'=any(coalesce(aa.permissions,'{}'))))
  or (u.role='user' and u.subtype='jobseeker' and ('view_jobseekers'=any(coalesce(aa.permissions,'{}')) or 'view_jobseeker_overview'=any(coalesce(aa.permissions,'{}'))))
  or (u.role='user' and u.subtype='homeowner' and 'view_users'=any(coalesce(aa.permissions,'{}')))
)
and (nullif(lower(coalesce(p_role,'')),'all') is null
  or nullif(lower(coalesce(p_role,'')),'all')=case when u.role='employer' then 'employer' when u.role='user' and u.subtype='jobseeker' then 'jobseeker' when u.role='user' and u.subtype='homeowner' then 'homeowner' when u.role='admin' then 'admin' else u.role end)
and (nullif(lower(coalesce(p_verification_status,'')),'') is null
  or (u.role='employer' and lower(coalesce(ep.employer_status,'pending'))=lower(p_verification_status))
  or (u.role='user' and u.subtype='jobseeker' and lower(coalesce(js.jobseeker_status,'pending')) in (lower(p_verification_status),case lower(p_verification_status) when 'approved' then 'verified' when 'verified' then 'approved' end))
  or (u.role<>'employer' and coalesce(u.subtype,'')<>'jobseeker' and ((lower(p_verification_status) in ('verified','approved') and coalesce(u.is_verified,false)) or (lower(p_verification_status)='pending' and not coalesce(u.is_verified,false)))))
and (nullif(trim(coalesce(p_search,'')),'') is null
  or u.email ilike '%'||trim(p_search)||'%' or u.name ilike '%'||trim(p_search)||'%'
  or ep.company_name ilike '%'||trim(p_search)||'%' or ep.representative_name ilike '%'||trim(p_search)||'%'
  or js.full_name ilike '%'||trim(p_search)||'%'
  or concat_ws(' ',js.first_name,js.surname) ilike '%'||trim(p_search)||'%'
  or concat_ws(' ',u.first_name,u.surname) ilike '%'||trim(p_search)||'%')
order by case when lower(coalesce(p_sort_order,'desc'))<>'asc' then u.created_at end desc nulls last,
case when lower(coalesce(p_sort_order,'desc'))='asc' then u.created_at end asc nulls last
limit least(greatest(coalesce(p_limit,20),1),100) offset greatest(coalesce(p_offset,0),0)
$function$;
revoke all on function public.admin_search_users(text, text, text, text, integer, integer) from public;
grant execute on function public.admin_search_users(text, text, text, text, integer, integer) to authenticated;
