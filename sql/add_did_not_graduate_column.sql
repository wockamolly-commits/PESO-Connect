-- Add missing did_not_graduate column to jobseeker_profiles
-- This field tracks whether a jobseeker did not complete their education level

ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS did_not_graduate BOOLEAN DEFAULT false;
