-- Saved/bookmarked jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id      uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own saved jobs
CREATE POLICY "Users can read own saved jobs"
  ON public.saved_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own saved jobs
CREATE POLICY "Users can insert own saved jobs"
  ON public.saved_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own saved jobs
CREATE POLICY "Users can delete own saved jobs"
  ON public.saved_jobs FOR DELETE
  USING (user_id = auth.uid());
