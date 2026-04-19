-- Admin directory query for dashboard filtering, sorting, and pagination.
-- Returns the full verification payload needed by the admin cards so newly
-- registered jobseekers and employers show all submitted registration data.

drop function if exists public.admin_search_users(text, text, text, text, integer, integer);

create or replace function public.admin_search_users(
  p_role text default null,
  p_verification_status text default null,
  p_search text default null,
  p_sort_order text default 'desc',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  role text,
  subtype text,
  role_label text,
  name text,
  display_name text,
  full_name text,
  surname text,
  first_name text,
  middle_name text,
  suffix text,
  representative_name text,
  company_name text,
  trade_name text,
  acronym text,
  office_type text,
  employer_sector text,
  employer_type_specific text,
  owner_name text,
  same_as_owner boolean,
  representative_position text,
  contact_email text,
  contact_number text,
  telephone_number text,
  preferred_contact_method text,
  employer_status text,
  jobseeker_status text,
  verification_status text,
  is_verified boolean,
  profile_modified_since_verification boolean,
  verified_snapshot jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  date_of_birth text,
  sex text,
  civil_status text,
  religion text,
  height_cm smallint,
  is_pwd boolean,
  disability_type text[],
  disability_type_specify text,
  pwd_id_number text,
  street_address text,
  barangay text,
  city text,
  province text,
  street text,
  mobile_number text,
  employment_status text,
  employment_type text,
  self_employment_type text,
  unemployment_reason text,
  months_looking_for_work integer,
  currently_in_school boolean,
  highest_education text,
  school_name text,
  course_or_field text,
  year_graduated text,
  did_not_graduate boolean,
  education_level_reached text,
  year_last_attended text,
  vocational_training jsonb,
  preferred_job_type text[],
  preferred_occupations text[],
  preferred_local_locations text[],
  preferred_overseas_locations text[],
  expected_salary_min text,
  expected_salary_max text,
  willing_to_relocate text,
  languages jsonb,
  predefined_skills text[],
  skills text[],
  professional_licenses jsonb,
  civil_service_eligibility text,
  civil_service_date date,
  civil_service_cert_path text,
  work_experiences jsonb,
  certifications text[],
  portfolio_url text,
  resume_url text,
  certificate_urls jsonb,
  terms_accepted boolean,
  data_processing_consent boolean,
  peso_verification_consent boolean,
  info_accuracy_confirmation boolean,
  dole_authorization boolean,
  total_work_force text,
  tin text,
  business_reg_number text,
  business_address text,
  nature_of_business text,
  gov_id_url text,
  business_permit_url text,
  peso_consent boolean,
  labor_compliance boolean,
  rejection_reason text,
  verified_for_year integer,
  verification_expires_at timestamptz,
  verification_expired_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Authorization guard: only authenticated admins (super-admin or sub-admin)
  -- may call this RPC. Without this check, SECURITY DEFINER + a grant to
  -- `authenticated` would expose every user's PII to any logged-in account.
  if public.get_admin_level(auth.uid()) is null then
    raise exception 'insufficient_privilege: admin role required'
      using errcode = '42501';
  end if;

  return query
  with base as (
    select
      u.id,
      u.email,
      u.role,
      u.subtype,
      case
        when u.role = 'employer' then 'employer'
        when u.role = 'user' and u.subtype = 'jobseeker' then 'jobseeker'
        when u.role = 'admin' then 'admin'
        else coalesce(u.subtype, u.role)
      end as role_label,
      u.name,
      coalesce(
        nullif(concat_ws(' ', nullif(js.first_name, ''), nullif(js.middle_name, ''), nullif(js.surname, ''), nullif(js.suffix, '')), ''),
        nullif(js.full_name, ''),
        nullif(u.name, '')
      ) as display_name,
      js.full_name,
      coalesce(nullif(js.surname, ''), nullif(u.surname, '')) as surname,
      coalesce(nullif(js.first_name, ''), nullif(u.first_name, '')) as first_name,
      coalesce(nullif(js.middle_name, ''), nullif(u.middle_name, '')) as middle_name,
      coalesce(nullif(js.suffix, ''), nullif(u.suffix, '')) as suffix,
      ep.representative_name,
      ep.company_name,
      ep.trade_name,
      ep.acronym,
      ep.office_type,
      ep.employer_sector,
      ep.employer_type_specific,
      ep.owner_name,
      ep.same_as_owner,
      ep.representative_position,
      ep.contact_email,
      ep.contact_number,
      ep.telephone_number,
      coalesce(nullif(ep.preferred_contact_method, ''), nullif(js.preferred_contact_method, '')) as preferred_contact_method,
      nullif(ep.employer_status, '') as employer_status,
      nullif(js.jobseeker_status, '') as jobseeker_status,
      case
        when u.role = 'employer' then coalesce(nullif(ep.employer_status, ''), 'pending')
        when u.role = 'user' and u.subtype = 'jobseeker' then
          case coalesce(nullif(js.jobseeker_status, ''), 'pending')
            when 'verified' then 'approved'
            else coalesce(nullif(js.jobseeker_status, ''), 'pending')
          end
        else
          case when coalesce(u.is_verified, false) then 'approved' else 'pending' end
      end as verification_status,
      coalesce(u.is_verified, false) as is_verified,
      coalesce(js.profile_modified_since_verification, false) as profile_modified_since_verification,
      coalesce(js.verified_snapshot, ep.verified_snapshot, '{}'::jsonb) as verified_snapshot,
      u.created_at,
      coalesce(js.updated_at, ep.updated_at, u.updated_at) as updated_at,
      js.date_of_birth,
      js.sex,
      js.civil_status,
      js.religion,
      js.height_cm,
      js.is_pwd,
      js.disability_type,
      js.disability_type_specify,
      js.pwd_id_number,
      js.street_address,
      coalesce(js.barangay, ep.barangay) as barangay,
      coalesce(js.city, ep.city) as city,
      coalesce(js.province, ep.province) as province,
      ep.street,
      js.mobile_number,
      js.employment_status,
      js.employment_type,
      js.self_employment_type,
      js.unemployment_reason,
      js.months_looking_for_work,
      js.currently_in_school,
      js.highest_education,
      js.school_name,
      js.course_or_field,
      js.year_graduated,
      js.did_not_graduate,
      js.education_level_reached,
      js.year_last_attended,
      js.vocational_training,
      js.preferred_job_type,
      js.preferred_occupations,
      js.preferred_local_locations,
      js.preferred_overseas_locations,
      js.expected_salary_min,
      js.expected_salary_max,
      js.willing_to_relocate,
      js.languages,
      js.predefined_skills,
      js.skills,
      js.professional_licenses,
      js.civil_service_eligibility,
      js.civil_service_date,
      js.civil_service_cert_path,
      js.work_experiences,
      js.certifications,
      js.portfolio_url,
      js.resume_url,
      js.certificate_urls,
      js.terms_accepted,
      js.data_processing_consent,
      js.peso_verification_consent,
      js.info_accuracy_confirmation,
      js.dole_authorization,
      ep.total_work_force,
      ep.tin,
      ep.business_reg_number,
      ep.business_address,
      ep.nature_of_business,
      ep.gov_id_url,
      ep.business_permit_url,
      ep.terms_accepted as employer_terms_accepted,
      ep.peso_consent,
      ep.labor_compliance,
      coalesce(nullif(js.rejection_reason, ''), nullif(ep.rejection_reason, '')) as rejection_reason,
      coalesce(js.verified_for_year, ep.verified_for_year, u.verified_for_year) as verified_for_year,
      coalesce(js.verification_expires_at, ep.verification_expires_at, u.verification_expires_at) as verification_expires_at,
      coalesce(js.verification_expired_at, ep.verification_expired_at, u.verification_expired_at) as verification_expired_at
    from public.users u
    left join public.employer_profiles ep on ep.id = u.id
    left join public.jobseeker_profiles js on js.id = u.id
  ),
  filtered as (
    select
      base.*,
      count(*) over () as total_count
    from base
    where
      (
        p_role is null
        or p_role = ''
        or base.role_label = p_role
      )
      and (
        p_verification_status is null
        or p_verification_status = ''
        or base.verification_status = p_verification_status
      )
      and (
        p_search is null
        or p_search = ''
        or coalesce(base.name, '') ilike '%' || p_search || '%'
        or coalesce(base.display_name, '') ilike '%' || p_search || '%'
        or coalesce(base.full_name, '') ilike '%' || p_search || '%'
        or coalesce(base.email, '') ilike '%' || p_search || '%'
        or coalesce(base.company_name, '') ilike '%' || p_search || '%'
        or coalesce(base.trade_name, '') ilike '%' || p_search || '%'
        or coalesce(base.representative_name, '') ilike '%' || p_search || '%'
      )
  )
  select
    filtered.id,
    filtered.email,
    filtered.role,
    filtered.subtype,
    filtered.role_label,
    filtered.name,
    filtered.display_name,
    filtered.full_name,
    filtered.surname,
    filtered.first_name,
    filtered.middle_name,
    filtered.suffix,
    filtered.representative_name,
    filtered.company_name,
    filtered.trade_name,
    filtered.acronym,
    filtered.office_type,
    filtered.employer_sector,
    filtered.employer_type_specific,
    filtered.owner_name,
    filtered.same_as_owner,
    filtered.representative_position,
    filtered.contact_email,
    filtered.contact_number,
    filtered.telephone_number,
    filtered.preferred_contact_method,
    filtered.employer_status,
    filtered.jobseeker_status,
    filtered.verification_status,
    filtered.is_verified,
    filtered.profile_modified_since_verification,
    filtered.verified_snapshot,
    filtered.created_at,
    filtered.updated_at,
    filtered.date_of_birth,
    filtered.sex,
    filtered.civil_status,
    filtered.religion,
    filtered.height_cm,
    filtered.is_pwd,
    filtered.disability_type,
    filtered.disability_type_specify,
    filtered.pwd_id_number,
    filtered.street_address,
    filtered.barangay,
    filtered.city,
    filtered.province,
    filtered.street,
    filtered.mobile_number,
    filtered.employment_status,
    filtered.employment_type,
    filtered.self_employment_type,
    filtered.unemployment_reason,
    filtered.months_looking_for_work,
    filtered.currently_in_school,
    filtered.highest_education,
    filtered.school_name,
    filtered.course_or_field,
    filtered.year_graduated,
    filtered.did_not_graduate,
    filtered.education_level_reached,
    filtered.year_last_attended,
    filtered.vocational_training,
    filtered.preferred_job_type,
    filtered.preferred_occupations,
    filtered.preferred_local_locations,
    filtered.preferred_overseas_locations,
    filtered.expected_salary_min,
    filtered.expected_salary_max,
    filtered.willing_to_relocate,
    filtered.languages,
    filtered.predefined_skills,
    filtered.skills,
    filtered.professional_licenses,
    filtered.civil_service_eligibility,
    filtered.civil_service_date,
    filtered.civil_service_cert_path,
    filtered.work_experiences,
    filtered.certifications,
    filtered.portfolio_url,
    filtered.resume_url,
    filtered.certificate_urls,
    case
      when filtered.role_label = 'employer' then filtered.employer_terms_accepted
      else filtered.terms_accepted
    end as terms_accepted,
    filtered.data_processing_consent,
    filtered.peso_verification_consent,
    filtered.info_accuracy_confirmation,
    filtered.dole_authorization,
    filtered.total_work_force,
    filtered.tin,
    filtered.business_reg_number,
    filtered.business_address,
    filtered.nature_of_business,
    filtered.gov_id_url,
    filtered.business_permit_url,
    filtered.peso_consent,
    filtered.labor_compliance,
    filtered.rejection_reason,
    filtered.verified_for_year,
    filtered.verification_expires_at,
    filtered.verification_expired_at,
    filtered.total_count
  from filtered
  order by
    case when lower(coalesce(p_sort_order, 'desc')) = 'asc' then filtered.created_at end asc,
    case when lower(coalesce(p_sort_order, 'desc')) <> 'asc' then filtered.created_at end desc,
    filtered.id asc
  -- Clamp the page size server-side. Clients currently send 20, but the
  -- RPC is callable directly with arbitrary values. 100 keeps the admin
  -- directory responsive and caps the PII blast radius if the service
  -- ever leaks (e.g. to a sub-admin scraping via a misbehaving client).
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_search_users(text, text, text, text, integer, integer) to authenticated;
