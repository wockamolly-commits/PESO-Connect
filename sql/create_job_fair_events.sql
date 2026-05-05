-- Job Fair Events Module
-- Tables: job_fair_events, job_fair_bookmarks

CREATE TABLE IF NOT EXISTS public.job_fair_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  end_date timestamptz,
  registration_deadline timestamptz,
  location text,
  companies text[] DEFAULT '{}',
  google_form_url text,
  is_registration_open boolean NOT NULL DEFAULT true,
  is_highlighted boolean NOT NULL DEFAULT false,
  banner_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_fair_bookmarks (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.job_fair_events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_fair_events_event_date ON public.job_fair_events(event_date);
CREATE INDEX IF NOT EXISTS idx_job_fair_events_is_highlighted ON public.job_fair_events(is_highlighted);

-- RLS
ALTER TABLE public.job_fair_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_fair_bookmarks ENABLE ROW LEVEL SECURITY;

-- Public read for events (anon + authenticated)
CREATE POLICY "public_read_job_fair_events"
  ON public.job_fair_events
  FOR SELECT
  USING (true);

-- Admin write for events
CREATE POLICY "admin_manage_job_fair_events"
  ON public.job_fair_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User-scoped bookmark read
CREATE POLICY "user_read_own_bookmarks"
  ON public.job_fair_bookmarks
  FOR SELECT
  USING (user_id = auth.uid());

-- User-scoped bookmark insert/delete
CREATE POLICY "user_manage_own_bookmarks"
  ON public.job_fair_bookmarks
  FOR ALL
  USING (user_id = auth.uid());
