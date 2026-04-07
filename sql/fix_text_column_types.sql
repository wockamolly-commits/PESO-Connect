-- Fix column types for employment-related fields
-- These MUST be TEXT (not TEXT[]) to match front-end expectations.
-- Run in Supabase SQL Editor if the profile edit or Step 3 → Step 4
-- transition returns a 400 Bad Request.

-- Fix employment_type from TEXT[] to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobseeker_profiles'
      AND column_name = 'employment_type'
      AND udt_name = '_text'
  ) THEN
    ALTER TABLE public.jobseeker_profiles
      ALTER COLUMN employment_type TYPE TEXT USING COALESCE(employment_type[1], '');
    ALTER TABLE public.jobseeker_profiles
      ALTER COLUMN employment_type SET DEFAULT '';
    RAISE NOTICE 'Fixed employment_type from TEXT[] to TEXT';
  END IF;
END $$;

-- Fix self_employment_type from TEXT[] to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobseeker_profiles'
      AND column_name = 'self_employment_type'
      AND udt_name = '_text'
  ) THEN
    ALTER TABLE public.jobseeker_profiles
      ALTER COLUMN self_employment_type TYPE TEXT USING COALESCE(self_employment_type[1], '');
    ALTER TABLE public.jobseeker_profiles
      ALTER COLUMN self_employment_type SET DEFAULT '';
    RAISE NOTICE 'Fixed self_employment_type from TEXT[] to TEXT';
  END IF;
END $$;

-- Fix unemployment_reason from TEXT[] to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobseeker_profiles'
      AND column_name = 'unemployment_reason'
      AND udt_name = '_text'
  ) THEN
    ALTER TABLE public.jobseeker_profiles
      ALTER COLUMN unemployment_reason TYPE TEXT USING COALESCE(unemployment_reason[1], '');
    ALTER TABLE public.jobseeker_profiles
      ALTER COLUMN unemployment_reason SET DEFAULT '';
    RAISE NOTICE 'Fixed unemployment_reason from TEXT[] to TEXT';
  END IF;
END $$;

-- Ensure all required columns exist (idempotent)
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS street_address TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS self_employment_type TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_reason TEXT DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS months_looking_for_work INTEGER;
