-- Add flag to track if a verified jobseeker modified critical profile fields.
-- Admins see a "Profile Modified" badge so they know to re-check.

ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS profile_modified_since_verification boolean DEFAULT false;
