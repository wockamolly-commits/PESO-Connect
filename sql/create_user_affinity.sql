-- ============================================================
-- user_affinity — per-user behavioral affinity for personalization v1
--
-- Purpose:
--   Summarize each jobseeker's observed interests (so far:
--   applications + saved_jobs by job category) into a compact
--   [0, 1] weight per (dimension, key). match-jobs reads this to
--   apply a small, capped boost on matching jobs.
--
-- Schema:
--   dimension  - namespacing key. 'category' for v1. Extensible to
--                'title_ngram', 'employer', etc. later without
--                schema change.
--   key        - the actual value inside the dimension.
--   weight     - normalized to [0, 1] across all keys in a dimension
--                for that user. Sum per (user, dimension) = 1.0 when
--                any signals exist.
--   signal_count - raw count of underlying events. Lets callers
--                apply cold-start guards without re-querying sources.
--   A special (dimension='meta', key='_refreshed_at') row is inserted
--   on every refresh so we can detect stale caches cheaply.
--
-- Storage:
--   Single user's rows are small (≤20 categories typically). Primary
--   key covers the full natural key; separate index on updated_at
--   helps staleness checks.
--
-- Idempotent - safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_affinity (
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  dimension    text        NOT NULL,
  key          text        NOT NULL,
  weight       numeric     NOT NULL DEFAULT 0,
  signal_count integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dimension, key)
);

CREATE INDEX IF NOT EXISTS idx_user_affinity_user_updated
  ON public.user_affinity (user_id, updated_at DESC);

ALTER TABLE public.user_affinity ENABLE ROW LEVEL SECURITY;

-- Users see their own rows (enables a future "Your interests" page
-- without a round-trip through the edge function). Writes go through
-- the SECURITY DEFINER refresh function, so no insert/update/delete
-- policies are granted — attempts from anon/authenticated will fail.
DROP POLICY IF EXISTS "users_read_own_affinity" ON public.user_affinity;
CREATE POLICY "users_read_own_affinity"
  ON public.user_affinity FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- refresh_user_affinity(p_user_id)
--
-- Recomputes affinity rows for one user from applications (weight
-- 3.0 per event) and saved_jobs (weight 1.5 per event), grouped by
-- job_postings.category. Normalizes weights to sum to 1.0 across
-- categories for the user.
--
-- Ratios chosen pragmatically:
--   application   = explicit intent + effort -> 3.0
--   saved_job     = bookmark, low friction   -> 1.5
--
-- Called on demand from the edge function (lazy, TTL-gated). A
-- future nightly cron can call it for all active users if the
-- per-request refresh cost becomes meaningful.
--
-- SECURITY DEFINER because the function reads applications +
-- saved_jobs — which are RLS-protected to the owning user — on
-- behalf of the caller. search_path pinned to defeat injection.
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_user_affinity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grand_total numeric;
BEGIN
  -- Clear existing rows for this user (including the meta sentinel).
  DELETE FROM public.user_affinity
  WHERE user_id = p_user_id;

  -- Compute total weighted signal volume for normalization.
  SELECT COALESCE(SUM(weight_sum), 0) INTO v_grand_total
  FROM (
    SELECT 3.0 * COUNT(*) AS weight_sum
    FROM public.applications a
    JOIN public.job_postings jp ON jp.id = a.job_id
    WHERE a.user_id = p_user_id AND jp.category IS NOT NULL
    UNION ALL
    SELECT 1.5 * COUNT(*) AS weight_sum
    FROM public.saved_jobs s
    JOIN public.job_postings jp ON jp.id = s.job_id
    WHERE s.user_id = p_user_id AND jp.category IS NOT NULL
  ) totals;

  -- Always write a refresh sentinel (even for zero-signal users) so
  -- callers can cache-skip within the TTL instead of re-running this.
  INSERT INTO public.user_affinity (user_id, dimension, key, weight, signal_count, updated_at)
  VALUES (p_user_id, 'meta', '_refreshed_at', 0, 0, now());

  IF v_grand_total = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.user_affinity (user_id, dimension, key, weight, signal_count, updated_at)
  SELECT
    p_user_id,
    'category',
    category,
    SUM(weight_sum) / v_grand_total,
    SUM(count_sum)::integer,
    now()
  FROM (
    SELECT jp.category AS category,
           3.0 * COUNT(*) AS weight_sum,
           COUNT(*)       AS count_sum
    FROM public.applications a
    JOIN public.job_postings jp ON jp.id = a.job_id
    WHERE a.user_id = p_user_id AND jp.category IS NOT NULL
    GROUP BY jp.category
    UNION ALL
    SELECT jp.category,
           1.5 * COUNT(*),
           COUNT(*)
    FROM public.saved_jobs s
    JOIN public.job_postings jp ON jp.id = s.job_id
    WHERE s.user_id = p_user_id AND jp.category IS NOT NULL
    GROUP BY jp.category
  ) sources
  GROUP BY category;
END;
$$;

-- Allow authenticated + service_role to invoke. The function is
-- SECURITY DEFINER so the caller's RLS context doesn't matter — but
-- EXECUTE must still be granted.
REVOKE ALL ON FUNCTION public.refresh_user_affinity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_user_affinity(uuid) TO authenticated, service_role;
