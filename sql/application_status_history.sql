-- Application status history table for tracking timeline
CREATE TABLE IF NOT EXISTS public.application_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status          text NOT NULL,
  changed_at      timestamptz DEFAULT now(),
  changed_by      uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- Applicants can read history for their own applications
CREATE POLICY "Applicants can read own application history"
  ON public.application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = application_status_history.application_id
        AND user_id = auth.uid()
    )
  );

-- Employers can read history for applications to their jobs
CREATE POLICY "Employers can read application history for their jobs"
  ON public.application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.job_postings j ON j.id = a.job_id
      WHERE a.id = application_status_history.application_id
        AND j.employer_id = auth.uid()
    )
  );

-- Authenticated users can insert history rows
CREATE POLICY "Authenticated users can insert history"
  ON public.application_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
