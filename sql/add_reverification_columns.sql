-- sql/add_reverification_columns.sql
-- Adds the verified_snapshot column to both profile tables.
-- Also adds profile_modified_since_verification to employer_profiles
-- (jobseeker_profiles already has it from add_profile_modified_flag.sql).

ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false NOT NULL;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;
