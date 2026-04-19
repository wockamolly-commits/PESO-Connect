-- Annual Verification Expiry Schema
-- Adds fields to track verification year and expiration for jobseekers and employers.
-- Homeowners and admins are excluded from annual verification.

-- 1. Add expiry columns to public.users
alter table public.users
  add column if not exists verified_for_year integer,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_expired_at timestamptz;

-- 2. Mirror columns on jobseeker_profiles
alter table public.jobseeker_profiles
  add column if not exists verified_for_year integer,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_expired_at timestamptz;

-- 3. Mirror columns on employer_profiles
alter table public.employer_profiles
  add column if not exists verified_for_year integer,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_expired_at timestamptz;

-- 4. Backfill existing verified jobseekers and employers with the current year.
--    This assumes all currently verified users were verified for the current calendar year.
--    The expiration is set to January 1 of the following year in Asia/Manila time.
do $$
declare
  current_yr integer := extract(year from now() at time zone 'Asia/Manila')::integer;
  expiry_ts timestamptz := (current_yr + 1)::text || '-01-01T00:00:00+08:00';
begin
  -- Backfill users table (jobseekers)
  update public.users
  set verified_for_year = current_yr,
      verification_expires_at = expiry_ts,
      verification_expired_at = null
  where is_verified = true
    and role = 'user'
    and subtype = 'jobseeker'
    and verified_for_year is null;

  -- Backfill users table (employers)
  update public.users
  set verified_for_year = current_yr,
      verification_expires_at = expiry_ts,
      verification_expired_at = null
  where is_verified = true
    and role = 'employer'
    and verified_for_year is null;

  -- Backfill jobseeker_profiles
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

  -- Backfill employer_profiles
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

-- 5. Helper function: reset_expired_verifications()
--    Called by the annual-verification-reset edge function or a pg_cron job.
--    Finds all verified jobseekers and employers whose verified_for_year
--    is earlier than the current year in Asia/Manila time and resets them.
create or replace function public.reset_expired_verifications()
returns integer
language plpgsql
security definer
as $$
declare
  current_yr integer := extract(year from now() at time zone 'Asia/Manila')::integer;
  affected integer := 0;
  uid uuid;
begin
  -- Reset users table
  for uid in
    select id from public.users
    where is_verified = true
      and verified_for_year is not null
      and verified_for_year < current_yr
      and (
        (role = 'user' and subtype = 'jobseeker')
        or role = 'employer'
      )
  loop
    -- Update users table
    update public.users
    set is_verified = false,
        verification_expired_at = now(),
        updated_at = now()
    where id = uid;

    -- Update jobseeker_profiles if applicable
    update public.jobseeker_profiles
    set is_verified = false,
        verification_expired_at = now(),
        jobseeker_status = 'expired',
        updated_at = now()
    where id = uid;

    -- Update employer_profiles if applicable
    update public.employer_profiles
    set is_verified = false,
        verification_expired_at = now(),
        employer_status = 'expired',
        updated_at = now()
    where id = uid;

    affected := affected + 1;
  end loop;

  return affected;
end $$;
