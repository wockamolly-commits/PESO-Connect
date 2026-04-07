-- Add database-level CHECK constraints as a safety net against client bypass.
-- Run once in Supabase SQL Editor.
-- NOTE: This file is compatible with the two-level role system
--       (role + subtype) from migration_two_level_roles.sql.

-- ============================================
-- Users table constraints
-- ============================================
-- The core role/subtype constraints (chk_valid_role, chk_valid_subtype,
-- chk_role_subtype_integrity) already exist from migration_two_level_roles.sql.
-- We only add constraints that don't yet exist.

-- Users: non-empty email
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_email_nonempty,
  ADD CONSTRAINT users_email_nonempty
    CHECK (char_length(email) > 0);

-- ============================================
-- Jobseeker profiles constraints
-- ============================================
-- Jobseeker profiles: valid status enum
ALTER TABLE public.jobseeker_profiles
  DROP CONSTRAINT IF EXISTS jobseeker_status_check,
  ADD CONSTRAINT jobseeker_status_check
    CHECK (jobseeker_status IN ('pending', 'verified', 'rejected'));

-- ============================================
-- Employer profiles constraints
-- ============================================
-- Employer profiles: valid status enum
ALTER TABLE public.employer_profiles
  DROP CONSTRAINT IF EXISTS employer_status_check,
  ADD CONSTRAINT employer_status_check
    CHECK (employer_status IN ('pending', 'approved', 'rejected'));

-- ============================================
-- Applications constraints
-- ============================================
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check,
  ADD CONSTRAINT applications_status_check
    CHECK (status IN ('pending', 'shortlisted', 'hired', 'rejected', 'withdrawn'));

-- ============================================
-- Job postings constraints
-- ============================================
ALTER TABLE public.job_postings
  DROP CONSTRAINT IF EXISTS job_postings_status_check,
  ADD CONSTRAINT job_postings_status_check
    CHECK (status IN ('open', 'closed', 'draft', 'filled'));
