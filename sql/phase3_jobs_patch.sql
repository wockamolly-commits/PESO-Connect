-- Phase 3 patch: add missing job_postings columns found in PostJob.jsx
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS salary_range text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS vacancies integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ai_matching_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS applications_count integer DEFAULT 0;
