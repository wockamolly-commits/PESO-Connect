-- Add database-level CHECK constraints as a safety net against client bypass.
-- Run once in Supabase SQL Editor.

-- Users: valid role enum
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('jobseeker', 'employer', 'individual', 'admin'));

-- Users: non-empty email
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_email_nonempty,
  ADD CONSTRAINT users_email_nonempty
    CHECK (char_length(email) > 0);

-- Jobseeker profiles: at least one skill (only enforced when registration is complete)
-- Note: This is skipped because skills are added during registration step 5,
-- and the row may exist before skills are added. Enforce at application time instead.

-- Jobseeker profiles: valid status enum
ALTER TABLE public.jobseeker_profiles
  DROP CONSTRAINT IF EXISTS jobseeker_status_check,
  ADD CONSTRAINT jobseeker_status_check
    CHECK (jobseeker_status IN ('pending', 'verified', 'rejected'));

-- Employer profiles: valid status enum (employers use 'approved' not 'verified')
ALTER TABLE public.employer_profiles
  DROP CONSTRAINT IF EXISTS employer_status_check,
  ADD CONSTRAINT employer_status_check
    CHECK (employer_status IN ('pending', 'approved', 'rejected'));

-- Applications: valid status enum
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check,
  ADD CONSTRAINT applications_status_check
    CHECK (status IN ('pending', 'shortlisted', 'hired', 'rejected', 'withdrawn'));

-- Job postings: valid status enum
ALTER TABLE public.job_postings
  DROP CONSTRAINT IF EXISTS job_postings_status_check,
  ADD CONSTRAINT job_postings_status_check
    CHECK (status IN ('open', 'closed', 'draft', 'filled'));
