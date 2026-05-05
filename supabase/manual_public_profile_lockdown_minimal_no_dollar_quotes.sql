-- Minimal dashboard-safe public profile lockdown.
-- Use this if Supabase SQL Editor truncates dollar-quoted function bodies.
-- This version uses LANGUAGE sql with a single-quoted body, not $$ or named
-- dollar quotes.

drop policy if exists "Authenticated users can read all user rows" on public.users;
drop policy if exists "Authenticated users can read all jobseeker profiles" on public.jobseeker_profiles;
drop policy if exists "Authenticated users can read all employer profiles" on public.employer_profiles;
drop policy if exists "Anyone can read user rows" on public.users;
drop policy if exists "Anyone can read jobseeker profiles" on public.jobseeker_profiles;
drop policy if exists "Anyone can read employer profiles" on public.employer_profiles;
drop policy if exists "Anyone can read homeowner profiles" on public.homeowner_profiles;

create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  id uuid,
  role text,
  subtype text,
  display_name text,
  profile_photo text,
  is_verified boolean,
  profile_modified_since_verification boolean,
  is_restricted boolean,
  city text,
  province text,
  company_name text,
  nature_of_business text,
  company_description text,
  company_size text,
  year_established text,
  employer_type text,
  company_website text,
  facebook_url text,
  linkedin_url text,
  bio text,
  skills text[],
  highest_education text,
  school_name text,
  course_or_field text,
  year_graduated text,
  work_experiences jsonb,
  certifications text[],
  languages jsonb,
  portfolio_url text,
  service_preferences text[]
)
language sql
security definer
stable
set search_path = public
as '
  with viewer as (
    select
      auth.uid() as id,
      coalesce((select is_verified from public.users where users.id = auth.uid()), false) as verified,
      public.get_admin_level(auth.uid()) is not null as is_admin
  ),
  target_user as (
    select
      u.*,
      (
        coalesce(u.privacy_settings->>''profile_visibility'', ''public'') = ''verified_only''
        and coalesce((select id from viewer), ''00000000-0000-0000-0000-000000000000''::uuid) <> u.id
        and not coalesce((select verified from viewer), false)
        and not coalesce((select is_admin from viewer), false)
      ) as restricted
    from public.users u
    where u.id = p_user_id
  )
  select
    u.id,
    u.role,
    u.subtype,
    case
      when u.restricted then null::text
      when u.role = ''employer'' then nullif(ep.company_name, '''')
      else coalesce(nullif(js.full_name, ''''), nullif(hp.full_name, ''''), nullif(u.name, ''''))
    end,
    case when u.restricted then null::text else nullif(u.profile_photo, '''') end,
    coalesce(u.is_verified, false),
    case
      when u.role = ''employer'' then coalesce(ep.profile_modified_since_verification, false)
      when u.subtype = ''jobseeker'' then coalesce(js.profile_modified_since_verification, false)
      else false
    end,
    u.restricted,
    case when u.restricted then null::text else coalesce(nullif(js.city, ''''), nullif(hp.city, ''''), nullif(ep.city, '''')) end,
    case when u.restricted then null::text else coalesce(nullif(js.province, ''''), nullif(hp.province, ''''), nullif(ep.province, '''')) end,
    case when u.restricted then null::text else nullif(ep.company_name, '''') end,
    case when u.restricted then null::text else nullif(ep.nature_of_business, '''') end,
    case when u.restricted then null::text else nullif(ep.company_description, '''') end,
    case when u.restricted then null::text else nullif(ep.company_size, '''') end,
    case when u.restricted then null::text else nullif(ep.year_established, '''') end,
    case when u.restricted then null::text else nullif(ep.employer_type, '''') end,
    case when u.restricted then null::text else nullif(ep.company_website, '''') end,
    case when u.restricted then null::text else nullif(ep.facebook_url, '''') end,
    case when u.restricted then null::text else nullif(ep.linkedin_url, '''') end,
    case when u.restricted then null::text else nullif(hp.bio, '''') end,
    case when u.restricted then ''{}''::text[] else coalesce(js.skills, ''{}''::text[]) end,
    case when u.restricted then null::text else nullif(js.highest_education, '''') end,
    case when u.restricted then null::text else nullif(js.school_name, '''') end,
    case when u.restricted then null::text else nullif(js.course_or_field, '''') end,
    case when u.restricted then null::text else nullif(js.year_graduated, '''') end,
    case when u.restricted then ''[]''::jsonb else coalesce(js.work_experiences, ''[]''::jsonb) end,
    case when u.restricted then ''{}''::text[] else coalesce(js.certifications, ''{}''::text[]) end,
    case when u.restricted then ''[]''::jsonb else coalesce(js.languages, ''[]''::jsonb) end,
    case when u.restricted then null::text else nullif(js.portfolio_url, '''') end,
    case when u.restricted then ''{}''::text[] else coalesce(hp.service_preferences, ''{}''::text[]) end
  from target_user u
  left join public.jobseeker_profiles js on js.id = u.id
  left join public.employer_profiles ep on ep.id = u.id
  left join public.homeowner_profiles hp on hp.id = u.id
';

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;
