drop function if exists public.admin_search_users(text, text, text, text, integer, integer);

create or replace function public.admin_search_users(
  p_role text default null,
  p_verification_status text default null,
  p_search text default null,
  p_sort_order text default 'desc',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  id uuid,
  email text,
  name text,
  role text,
  subtype text,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  verified_for_year integer,
  verification_expired_at timestamptz,
  profile_modified_since_verification boolean,
  total_count bigint,

  company_name text,
  representative_name text,
  employer_status text,
  trade_name text,
  acronym text,
  office_type text,
  employer_sector text,
  employer_type_specific text,
  employer_type text,
  total_work_force text,
  business_reg_number text,
  tin text,
  nature_of_business text,
  business_address text,
  street text,
  barangay text,
  city text,
  province text,
  owner_name text,
  same_as_owner boolean,
  representative_position text,
  contact_email text,
  contact_number text,
  telephone_number text,
  preferred_contact_method text,
  gov_id_url text,
  business_permit_url text,
  terms_accepted boolean,
  peso_consent boolean,
  labor_compliance boolean,
  employer_rejection_reason text,

  display_name text,
  full_name text,
  jobseeker_status text,
  date_of_birth date,
  mobile_number text,
  preferred_job_type text[],
  preferred_local_locations text[],
  expected_salary_min numeric,
  expected_salary_max numeric,
  willing_to_relocate text,
  highest_education text,
  school_name text,
  course_or_field text,
  year_graduated text,
  predefined_skills text[],
  skills text[],
  professional_licenses jsonb,
  civil_service_eligibility text,
  civil_service_date date,
  civil_service_cert_path text,
  vocational_training jsonb,
  portfolio_url text,
  work_experiences jsonb,
  resume_url text,
  certificate_urls jsonb,
  jobseeker_rejection_reason text,
  rejection_reason text
)
language sql
security definer
stable
set search_path = public
as '
  with caller as (
    select admin_level, coalesce(permissions, ''{}''::text[]) as permissions
    from public.admin_access
    where user_id = auth.uid()
  ),
  directory as (
    select
      u.id,
      u.email,
      u.name,
      u.role,
      u.subtype,
      coalesce(u.is_verified, false) as is_verified,
      u.created_at,
      u.updated_at,
      u.verified_for_year,
      u.verification_expires_at as verification_expired_at,
      case
        when u.role = ''employer'' then coalesce(ep.profile_modified_since_verification, false)
        when u.role = ''user'' and u.subtype = ''jobseeker'' then coalesce(js.profile_modified_since_verification, false)
        else false
      end as profile_modified_since_verification,
      case
        when u.role = ''employer'' then ''employer''
        when u.role = ''user'' and u.subtype = ''jobseeker'' then ''jobseeker''
        when u.role = ''user'' and u.subtype = ''homeowner'' then ''homeowner''
        when u.role = ''admin'' then ''admin''
        else u.role
      end as directory_role,

      ep.company_name,
      ep.representative_name,
      coalesce(ep.employer_status, ''pending'') as employer_status,
      ep.trade_name,
      ep.acronym,
      ep.office_type,
      ep.employer_sector,
      ep.employer_type_specific,
      ep.employer_type,
      ep.total_work_force,
      ep.business_reg_number,
      ep.tin,
      ep.nature_of_business,
      ep.business_address,
      ep.street,
      ep.barangay,
      ep.city,
      ep.province,
      ep.owner_name,
      ep.same_as_owner,
      ep.representative_position,
      ep.contact_email,
      ep.contact_number,
      ep.telephone_number,
      ep.preferred_contact_method,
      ep.gov_id_url,
      ep.business_permit_url,
      ep.terms_accepted,
      ep.peso_consent,
      ep.labor_compliance,
      ep.rejection_reason as employer_rejection_reason,

      coalesce(nullif(js.display_name, ''''), nullif(js.full_name, ''''), nullif(u.name, '''')) as display_name,
      js.full_name,
      coalesce(js.jobseeker_status, ''pending'') as jobseeker_status,
      js.date_of_birth,
      js.mobile_number,
      js.preferred_job_type,
      js.preferred_local_locations,
      js.expected_salary_min,
      js.expected_salary_max,
      js.willing_to_relocate,
      js.highest_education,
      js.school_name,
      js.course_or_field,
      js.year_graduated,
      js.predefined_skills,
      js.skills,
      js.professional_licenses,
      js.civil_service_eligibility,
      js.civil_service_date,
      js.civil_service_cert_path,
      js.vocational_training,
      js.portfolio_url,
      js.work_experiences,
      js.resume_url,
      js.certificate_urls,
      js.rejection_reason as jobseeker_rejection_reason
    from public.users u
    left join public.employer_profiles ep on ep.id = u.id
    left join public.jobseeker_profiles js on js.id = u.id
  ),
  scoped as (
    select d.*
    from directory d
    cross join caller c
    where
      c.admin_level = ''admin''
      or (d.directory_role = ''employer'' and (''view_employers'' = any(c.permissions) or ''view_employer_overview'' = any(c.permissions)))
      or (d.directory_role = ''jobseeker'' and (''view_jobseekers'' = any(c.permissions) or ''view_jobseeker_overview'' = any(c.permissions)))
      or (d.directory_role = ''homeowner'' and ''view_users'' = any(c.permissions))
  ),
  filtered as (
    select s.*
    from scoped s
    where
      (nullif(lower(coalesce(p_role, '''')), ''all'') is null or nullif(lower(coalesce(p_role, '''')), ''all'') = s.directory_role)
      and (
        nullif(lower(coalesce(p_verification_status, '''')), '''') is null
        or (s.directory_role = ''employer'' and lower(s.employer_status) = lower(p_verification_status))
        or (s.directory_role = ''jobseeker'' and lower(s.jobseeker_status) in (
          lower(p_verification_status),
          case lower(p_verification_status) when ''approved'' then ''verified'' when ''verified'' then ''approved'' end
        ))
        or (s.directory_role not in (''employer'', ''jobseeker'') and (
          (lower(p_verification_status) in (''verified'', ''approved'') and s.is_verified)
          or (lower(p_verification_status) = ''pending'' and not s.is_verified)
        ))
      )
      and (
        nullif(trim(coalesce(p_search, '''')), '''') is null
        or s.email ilike ''%'' || trim(p_search) || ''%''
        or s.name ilike ''%'' || trim(p_search) || ''%''
        or s.company_name ilike ''%'' || trim(p_search) || ''%''
        or s.representative_name ilike ''%'' || trim(p_search) || ''%''
        or s.display_name ilike ''%'' || trim(p_search) || ''%''
        or s.full_name ilike ''%'' || trim(p_search) || ''%''
      )
  )
  select
    f.id,
    f.email,
    f.name,
    f.role,
    f.subtype,
    f.is_verified,
    f.created_at,
    f.updated_at,
    f.verified_for_year,
    f.verification_expired_at,
    f.profile_modified_since_verification,
    count(*) over() as total_count,

    f.company_name,
    f.representative_name,
    f.employer_status,
    f.trade_name,
    f.acronym,
    f.office_type,
    f.employer_sector,
    f.employer_type_specific,
    f.employer_type,
    f.total_work_force,
    f.business_reg_number,
    f.tin,
    f.nature_of_business,
    f.business_address,
    f.street,
    f.barangay,
    f.city,
    f.province,
    f.owner_name,
    f.same_as_owner,
    f.representative_position,
    f.contact_email,
    f.contact_number,
    f.telephone_number,
    f.preferred_contact_method,
    f.gov_id_url,
    f.business_permit_url,
    f.terms_accepted,
    f.peso_consent,
    f.labor_compliance,
    f.employer_rejection_reason,

    f.display_name,
    f.full_name,
    f.jobseeker_status,
    f.date_of_birth,
    f.mobile_number,
    f.preferred_job_type,
    f.preferred_local_locations,
    f.expected_salary_min,
    f.expected_salary_max,
    f.willing_to_relocate,
    f.highest_education,
    f.school_name,
    f.course_or_field,
    f.year_graduated,
    f.predefined_skills,
    f.skills,
    f.professional_licenses,
    f.civil_service_eligibility,
    f.civil_service_date,
    f.civil_service_cert_path,
    f.vocational_training,
    f.portfolio_url,
    f.work_experiences,
    f.resume_url,
    f.certificate_urls,
    f.jobseeker_rejection_reason,
    coalesce(f.employer_rejection_reason, f.jobseeker_rejection_reason) as rejection_reason
  from filtered f
  order by
    case when lower(coalesce(p_sort_order, ''desc'')) <> ''asc'' then f.created_at end desc nulls last,
    case when lower(coalesce(p_sort_order, ''desc'')) = ''asc'' then f.created_at end asc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
';

revoke all on function public.admin_search_users(text, text, text, text, integer, integer) from public;
grant execute on function public.admin_search_users(text, text, text, text, integer, integer) to authenticated;
