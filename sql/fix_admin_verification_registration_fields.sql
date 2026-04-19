-- =============================================================================
-- Comprehensive schema patch for admin verification & registration completeness.
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS).
--
-- Run this FIRST, then run admin_search_users_rpc.sql to update the RPC.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. JOBSEEKER PROFILES — registration wizard fields
-- ---------------------------------------------------------------------------
alter table public.jobseeker_profiles add column if not exists surname text default '';
alter table public.jobseeker_profiles add column if not exists first_name text default '';
alter table public.jobseeker_profiles add column if not exists middle_name text default '';
alter table public.jobseeker_profiles add column if not exists suffix text default '';
alter table public.jobseeker_profiles add column if not exists sex text default '';
alter table public.jobseeker_profiles add column if not exists religion text default '';
alter table public.jobseeker_profiles add column if not exists height_cm smallint;
alter table public.jobseeker_profiles add column if not exists disability_type text[] default '{}';
alter table public.jobseeker_profiles add column if not exists disability_type_specify text default '';
alter table public.jobseeker_profiles add column if not exists pwd_id_number text default '';
alter table public.jobseeker_profiles add column if not exists street_address text default '';
alter table public.jobseeker_profiles add column if not exists employment_status text default '';
alter table public.jobseeker_profiles add column if not exists employment_type text default '';
alter table public.jobseeker_profiles add column if not exists self_employment_type text default '';
alter table public.jobseeker_profiles add column if not exists unemployment_reason text default '';
alter table public.jobseeker_profiles add column if not exists months_looking_for_work integer;
alter table public.jobseeker_profiles add column if not exists currently_in_school boolean default false;
alter table public.jobseeker_profiles add column if not exists did_not_graduate boolean default false;
alter table public.jobseeker_profiles add column if not exists education_level_reached text default '';
alter table public.jobseeker_profiles add column if not exists year_last_attended text default '';
alter table public.jobseeker_profiles add column if not exists vocational_training jsonb default '[]';
alter table public.jobseeker_profiles add column if not exists predefined_skills text[] default '{}';
alter table public.jobseeker_profiles add column if not exists professional_licenses jsonb default '[]';
alter table public.jobseeker_profiles add column if not exists civil_service_eligibility text default '';
alter table public.jobseeker_profiles add column if not exists civil_service_date date;
alter table public.jobseeker_profiles add column if not exists preferred_occupations text[] default '{}';
alter table public.jobseeker_profiles add column if not exists preferred_local_locations text[] default '{}';
alter table public.jobseeker_profiles add column if not exists preferred_overseas_locations text[] default '{}';
alter table public.jobseeker_profiles add column if not exists dole_authorization boolean default false;
alter table public.jobseeker_profiles add column if not exists rejection_reason text default '';

-- Verification & registration state on jobseeker_profiles
alter table public.jobseeker_profiles add column if not exists is_verified boolean default false;
alter table public.jobseeker_profiles add column if not exists registration_complete boolean default false;
alter table public.jobseeker_profiles add column if not exists registration_step integer;
alter table public.jobseeker_profiles add column if not exists profile_modified_since_verification boolean default false;

-- Annual verification year tracking on jobseeker_profiles
alter table public.jobseeker_profiles add column if not exists verified_for_year integer;
alter table public.jobseeker_profiles add column if not exists verification_expires_at timestamptz;
alter table public.jobseeker_profiles add column if not exists verification_expired_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. EMPLOYER PROFILES — registration wizard fields
-- ---------------------------------------------------------------------------
alter table public.employer_profiles add column if not exists trade_name text default '';
alter table public.employer_profiles add column if not exists acronym text default '';
alter table public.employer_profiles add column if not exists office_type text default '';
alter table public.employer_profiles add column if not exists employer_sector text default '';
alter table public.employer_profiles add column if not exists employer_type_specific text default '';
alter table public.employer_profiles add column if not exists total_work_force text default '';
alter table public.employer_profiles add column if not exists tin text default '';
alter table public.employer_profiles add column if not exists province text default '';
alter table public.employer_profiles add column if not exists city text default '';
alter table public.employer_profiles add column if not exists barangay text default '';
alter table public.employer_profiles add column if not exists street text default '';
alter table public.employer_profiles add column if not exists owner_name text default '';
alter table public.employer_profiles add column if not exists same_as_owner boolean default false;
alter table public.employer_profiles add column if not exists telephone_number text default '';

-- Verification & registration state on employer_profiles
alter table public.employer_profiles add column if not exists is_verified boolean default false;
alter table public.employer_profiles add column if not exists registration_complete boolean default false;
alter table public.employer_profiles add column if not exists registration_step integer;

-- Annual verification year tracking on employer_profiles
alter table public.employer_profiles add column if not exists verified_for_year integer;
alter table public.employer_profiles add column if not exists verification_expires_at timestamptz;
alter table public.employer_profiles add column if not exists verification_expired_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. USERS TABLE — annual verification year tracking
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists verified_for_year integer;
alter table public.users add column if not exists verification_expires_at timestamptz;
alter table public.users add column if not exists verification_expired_at timestamptz;

-- ---------------------------------------------------------------------------
-- 4. BACKFILL — sync is_verified / registration state from users to profiles
--    for any rows that existed before migration_per_subtype_verification.sql ran.
-- ---------------------------------------------------------------------------
update public.jobseeker_profiles jp
set
    is_verified          = coalesce(u.is_verified, false),
    registration_complete = coalesce(u.registration_complete, false),
    registration_step    = u.registration_step
from public.users u
where jp.id = u.id
  and u.role = 'user'
  and u.subtype = 'jobseeker'
  and (jp.is_verified is null or jp.registration_complete is null);

update public.employer_profiles ep
set
    is_verified          = coalesce(u.is_verified, false),
    registration_complete = coalesce(u.registration_complete, false),
    registration_step    = u.registration_step
from public.users u
where ep.id = u.id
  and u.role = 'employer'
  and (ep.is_verified is null or ep.registration_complete is null);

-- ---------------------------------------------------------------------------
-- 5. BACKFILL — verified_for_year / verification_expires_at for already-
--    verified users who were approved before annual_verification_expiry.sql ran.
-- ---------------------------------------------------------------------------
do $$
declare
  current_yr integer := extract(year from now() at time zone 'Asia/Manila')::integer;
  expiry_ts  timestamptz := (current_yr + 1)::text || '-01-01T00:00:00+08:00';
begin
  -- users table (jobseekers + employers)
  update public.users
  set verified_for_year = current_yr,
      verification_expires_at = expiry_ts,
      verification_expired_at = null
  where is_verified = true
    and verified_for_year is null
    and (
      (role = 'user' and subtype = 'jobseeker')
      or role = 'employer'
    );

  -- jobseeker_profiles
  update public.jobseeker_profiles jp
  set verified_for_year = current_yr,
      verification_expires_at = expiry_ts,
      verification_expired_at = null
  from public.users u
  where jp.id = u.id
    and u.role = 'user'
    and u.subtype = 'jobseeker'
    and jp.is_verified = true
    and jp.verified_for_year is null;

  -- employer_profiles
  update public.employer_profiles ep
  set verified_for_year = current_yr,
      verification_expires_at = expiry_ts,
      verification_expired_at = null
  from public.users u
  where ep.id = u.id
    and u.role = 'employer'
    and ep.is_verified = true
    and ep.verified_for_year is null;
end $$;

-- ---------------------------------------------------------------------------
-- After running this file, run admin_search_users_rpc.sql to refresh the RPC.
-- ---------------------------------------------------------------------------
