-- Migration: Add religion, height_cm, disability_type_specify to jobseeker_profiles
-- Date: 2026-04-06

-- New fields for Step 2: Personal Details
ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS height_cm SMALLINT,
  ADD COLUMN IF NOT EXISTS disability_type_specify TEXT DEFAULT '';

-- Optional: remove preferred_contact_method from jobseeker_profiles if it exists
-- (no longer collected during jobseeker registration)
-- Uncomment the line below once you've confirmed no other code reads this column:
-- ALTER TABLE public.jobseeker_profiles DROP COLUMN IF EXISTS preferred_contact_method;
