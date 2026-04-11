-- ============================================================
-- Job Posting Form Redesign: add structured fields to
-- public.job_postings to support the new 5-step posting wizard
-- and improve AI-matching context.
-- Idempotent - safe to re-run.
-- ============================================================

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS work_arrangement       text,          -- on-site | remote | hybrid
  ADD COLUMN IF NOT EXISTS job_summary            text,
  ADD COLUMN IF NOT EXISTS key_responsibilities   text,
  ADD COLUMN IF NOT EXISTS benefits               text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS course_strand          text,
  ADD COLUMN IF NOT EXISTS preferred_skills       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_languages     text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS licenses_certifications text,
  ADD COLUMN IF NOT EXISTS accepts_pwd            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pwd_disabilities       text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepts_ofw            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_qualifications   text;

-- Notes:
--   * description column is retained for legacy reads; the wizard writes
--     summary + responsibilities into it as a single formatted string.
--   * experience_level now carries values: entry | 1-3 | 3-5 | 5+
--   * type now carries values: permanent | part-time | contractual | project-based | internship
--   * education_level adds a 'postgraduate' option on the client side.
