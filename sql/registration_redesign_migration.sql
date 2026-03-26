-- ============================================================
-- PESO Registration Redesign Migration
-- Adds PESO NSRP Form 1 fields to public.jobseeker_profiles
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ------------------------------------------------------------
-- Split name fields
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS surname text NOT NULL DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS middle_name text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS suffix text DEFAULT '';

-- ------------------------------------------------------------
-- Personal info
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS sex text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS religion text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS tin text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS height text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS disability text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS disability_other text DEFAULT '';

-- ------------------------------------------------------------
-- Address
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS house_street text DEFAULT '';

-- ------------------------------------------------------------
-- Employment status
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_status text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_type text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS self_employed_type text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS self_employed_other text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_months integer;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_reason text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_reason_other text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS terminated_abroad_country text DEFAULT '';

-- ------------------------------------------------------------
-- OFW / 4Ps
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_ofw text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS ofw_country text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_former_ofw text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS former_ofw_country text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS former_ofw_return_date text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_4ps text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS household_id text DEFAULT '';

-- ------------------------------------------------------------
-- Job preference
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_occupations text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS work_type text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS work_location_type text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_local_locations text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_overseas_locations text[] DEFAULT '{}';

-- ------------------------------------------------------------
-- Education (extended)
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS currently_in_school text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS senior_high_strand text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS currently_enrolled boolean DEFAULT false;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS level_reached text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS year_last_attended text DEFAULT '';

-- ============================================================
-- Data Migration: split existing full_name into surname + first_name
-- Strategy: split on the LAST space so multi-word first names are
-- preserved in first_name and the final word becomes surname.
-- Rows that already have surname/first_name set are left untouched.
-- ============================================================
UPDATE public.jobseeker_profiles
SET
  first_name = TRIM(
    LEFT(full_name, LENGTH(full_name) - LENGTH(SPLIT_PART(full_name, ' ', -1)) - 1)
  ),
  surname = SPLIT_PART(full_name, ' ', -1)
WHERE
  full_name IS NOT NULL
  AND full_name <> ''
  AND surname = ''
  AND first_name = '';

-- Handle single-word full_name edge case: treat it as first_name only
UPDATE public.jobseeker_profiles
SET
  first_name = full_name,
  surname    = ''
WHERE
  full_name IS NOT NULL
  AND full_name <> ''
  AND full_name NOT LIKE '% %'
  AND surname = ''
  AND first_name = '';
