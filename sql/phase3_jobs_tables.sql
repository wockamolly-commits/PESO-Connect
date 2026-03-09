-- ============================================================
-- Phase 3: job_postings and applications tables + RLS
-- ============================================================

-- 1. job_postings table
CREATE TABLE IF NOT EXISTS public.job_postings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_name  text,
  title          text NOT NULL,
  description    text,
  category       text,
  type           text,              -- full-time | part-time | contract | temporary
  location       text,
  salary_min     numeric,
  salary_max     numeric,
  requirements   text[]  DEFAULT '{}',
  education_level text,
  filter_mode    text    DEFAULT 'flexible',  -- strict | flexible
  deadline       date,
  status         text    DEFAULT 'open',      -- open | filled | closed
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read job postings
-- (app layer filters by status='open' on public pages)
CREATE POLICY "Anyone can read job postings"
  ON public.job_postings FOR SELECT
  USING (true);

-- Only the owning employer can insert
CREATE POLICY "Employers can insert their own job postings"
  ON public.job_postings FOR INSERT
  WITH CHECK (employer_id = auth.uid());

-- Only the owning employer can update
CREATE POLICY "Employers can update their own job postings"
  ON public.job_postings FOR UPDATE
  USING (employer_id = auth.uid());

-- Only the owning employer can delete
CREATE POLICY "Employers can delete their own job postings"
  ON public.job_postings FOR DELETE
  USING (employer_id = auth.uid());

-- 2. applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  job_title        text,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name   text,
  applicant_email  text,
  applicant_skills text[]  DEFAULT '{}',
  justification_text text,
  resume_url       text,
  status           text    DEFAULT 'pending',  -- pending | shortlisted | hired | rejected
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own applications
CREATE POLICY "Applicants can read their own applications"
  ON public.applications FOR SELECT
  USING (user_id = auth.uid());

-- Employers can read applications for their own job postings
CREATE POLICY "Employers can read applications for their jobs"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE id = applications.job_id
        AND employer_id = auth.uid()
    )
  );

-- Applicants can insert their own applications
CREATE POLICY "Applicants can insert their own applications"
  ON public.applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Employers can update status on applications for their jobs
CREATE POLICY "Employers can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE id = applications.job_id
        AND employer_id = auth.uid()
    )
  );
