-- ============================================================
-- Add structured location fields to public.job_postings
-- to support cascading province/city PSGC dropdowns.
-- Idempotent - safe to re-run.
-- ============================================================

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS work_province text,
  ADD COLUMN IF NOT EXISTS work_city     text;

-- Notes:
--   * existing `location` text column is retained for backward compat
--     (AI matching, legacy reads). It will be written as "City, Province".
--   * work_province and work_city hold the canonical PSGC names.
