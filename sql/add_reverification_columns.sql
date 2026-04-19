-- Adds the re-verification tracking columns required by the
-- Profile Integrity & Re-verification System.

ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS verified_snapshot jsonb DEFAULT '{}'::jsonb;
