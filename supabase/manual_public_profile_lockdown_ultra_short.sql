-- Ultra-short dashboard fallback for public profile lockdown.
-- Purpose: get the PII-safe RPC installed when Supabase SQL Editor truncates
-- longer function bodies. This returns the same columns as the app expects,
-- but only fills safe public-card basics.

drop policy if exists "Authenticated users can read all user rows" on public.users;
drop policy if exists "Authenticated users can read all jobseeker profiles" on public.jobseeker_profiles;
drop policy if exists "Authenticated users can read all employer profiles" on public.employer_profiles;
drop policy if exists "Anyone can read user rows" on public.users;
drop policy if exists "Anyone can read jobseeker profiles" on public.jobseeker_profiles;
drop policy if exists "Anyone can read employer profiles" on public.employer_profiles;
drop policy if exists "Anyone can read homeowner profiles" on public.homeowner_profiles;

create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  id uuid, role text, subtype text, display_name text, profile_photo text,
  is_verified boolean, profile_modified_since_verification boolean,
  is_restricted boolean, city text, province text, company_name text,
  nature_of_business text, company_description text, company_size text,
  year_established text, employer_type text, company_website text,
  facebook_url text, linkedin_url text, bio text, skills text[],
  highest_education text, school_name text, course_or_field text,
  year_graduated text, work_experiences jsonb, certifications text[],
  languages jsonb, portfolio_url text, service_preferences text[]
)
language sql
security definer
stable
set search_path = public
as '
  select
    u.id,
    u.role,
    u.subtype,
    case
      when r.blocked then null::text
      when u.role = ''employer'' then nullif(ep.company_name, '''')
      else nullif(u.name, '''')
    end,
    case when r.blocked then null::text else nullif(u.profile_photo, '''') end,
    coalesce(u.is_verified, false),
    false,
    r.blocked,
    null::text,
    null::text,
    case when r.blocked then null::text else nullif(ep.company_name, '''') end,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    null::text,
    ''{}''::text[],
    null::text,
    null::text,
    null::text,
    null::text,
    ''[]''::jsonb,
    ''{}''::text[],
    ''[]''::jsonb,
    null::text,
    ''{}''::text[]
  from public.users u
  left join public.employer_profiles ep on ep.id = u.id
  cross join lateral (
    select
      coalesce(u.privacy_settings->>''profile_visibility'', ''public'') = ''verified_only''
      and coalesce(auth.uid(), ''00000000-0000-0000-0000-000000000000''::uuid) <> u.id
      and not coalesce((select is_verified from public.users where id = auth.uid()), false)
      and public.get_admin_level(auth.uid()) is null as blocked
  ) r
  where u.id = p_user_id
';

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;
