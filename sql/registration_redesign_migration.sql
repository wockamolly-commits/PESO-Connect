-- PESO Registration Redesign Migration
-- Adds NSRP-aligned fields, splits full_name into components, migrates existing data

-- ============================================
-- 1. ADD NEW COLUMNS TO public.users
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS surname TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS middle_name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suffix TEXT DEFAULT '';

-- ============================================
-- 2. ADD NEW COLUMNS TO public.jobseeker_profiles
-- ============================================
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS surname TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS middle_name TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS suffix TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS disability_type TEXT[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS street_address TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS self_employment_type TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_reason TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS months_looking_for_work INTEGER;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS currently_in_school BOOLEAN DEFAULT false;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS education_level_reached TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS year_last_attended TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS vocational_training JSONB DEFAULT '[]';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS predefined_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS professional_licenses JSONB DEFAULT '[]';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS civil_service_eligibility TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS civil_service_date DATE;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_occupations TEXT[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_local_locations TEXT[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_overseas_locations TEXT[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS dole_authorization BOOLEAN DEFAULT false;

-- Rename gender to sex (only if gender exists AND sex does not)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobseeker_profiles' AND column_name = 'gender')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobseeker_profiles' AND column_name = 'sex') THEN
    ALTER TABLE public.jobseeker_profiles RENAME COLUMN gender TO sex;
  END IF;
END $$;

-- ============================================
-- 3. MIGRATE EXISTING DATA
-- ============================================

-- 3a. Parse full_name into split fields for public.users
UPDATE public.users
SET
  first_name = CASE
    WHEN full_name IS NULL OR full_name = '' THEN ''
    WHEN array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) = 1 THEN trim(full_name)
    ELSE (regexp_split_to_array(trim(full_name), '\s+'))[1]
  END,
  surname = CASE
    WHEN full_name IS NULL OR full_name = '' THEN ''
    WHEN array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) = 1 THEN ''
    ELSE (regexp_split_to_array(trim(full_name), '\s+'))[array_length(regexp_split_to_array(trim(full_name), '\s+'), 1)]
  END,
  middle_name = CASE
    WHEN full_name IS NULL OR full_name = '' THEN ''
    WHEN array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) <= 2 THEN ''
    ELSE array_to_string((regexp_split_to_array(trim(full_name), '\s+'))[2:array_length(regexp_split_to_array(trim(full_name), '\s+'), 1)-1], ' ')
  END
WHERE full_name IS NOT NULL AND full_name != ''
  AND (first_name IS NULL OR first_name = '');

-- 3b. Same for jobseeker_profiles
UPDATE public.jobseeker_profiles
SET
  first_name = CASE
    WHEN full_name IS NULL OR full_name = '' THEN ''
    WHEN array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) = 1 THEN trim(full_name)
    ELSE (regexp_split_to_array(trim(full_name), '\s+'))[1]
  END,
  surname = CASE
    WHEN full_name IS NULL OR full_name = '' THEN ''
    WHEN array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) = 1 THEN ''
    ELSE (regexp_split_to_array(trim(full_name), '\s+'))[array_length(regexp_split_to_array(trim(full_name), '\s+'), 1)]
  END,
  middle_name = CASE
    WHEN full_name IS NULL OR full_name = '' THEN ''
    WHEN array_length(regexp_split_to_array(trim(full_name), '\s+'), 1) <= 2 THEN ''
    ELSE array_to_string((regexp_split_to_array(trim(full_name), '\s+'))[2:array_length(regexp_split_to_array(trim(full_name), '\s+'), 1)-1], ' ')
  END
WHERE full_name IS NOT NULL AND full_name != ''
  AND (first_name IS NULL OR first_name = '');

-- 3c. Migrate preferred_job_location to preferred_local_locations array
UPDATE public.jobseeker_profiles
SET preferred_local_locations = ARRAY[preferred_job_location]
WHERE preferred_job_location IS NOT NULL
  AND preferred_job_location != ''
  AND (preferred_local_locations IS NULL OR preferred_local_locations = '{}');

-- 3d. Migrate certifications to vocational_training
UPDATE public.jobseeker_profiles
SET vocational_training = (
  SELECT jsonb_agg(jsonb_build_object(
    'course', cert,
    'institution', '',
    'hours', null,
    'skills_acquired', '',
    'certificate_level', ''
  ))
  FROM unnest(certifications) AS cert
)
WHERE certifications IS NOT NULL
  AND array_length(certifications, 1) > 0
  AND (vocational_training IS NULL OR vocational_training = '[]'::jsonb);

-- ============================================
-- 4. KEEP full_name COLUMN FOR NOW (fallback)
-- ============================================
-- Do NOT drop full_name yet.

-- ============================================
-- 5. RLS — no changes needed (new columns inherit existing policies)
-- ============================================
