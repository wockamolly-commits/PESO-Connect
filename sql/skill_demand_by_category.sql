-- ============================================================
-- Phase 3 (AI skill recommender): demand-side skill signal
--
-- Aggregates `requirements[]` across open job postings by `category`
-- so the registration wizard can surface "skills employers currently
-- request in your field" during Step 5.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Materialized view for cheap reads.
--    Jobs change infrequently relative to profile reads, so we refresh
--    on demand (see refresh function below) instead of aggregating live.
DROP MATERIALIZED VIEW IF EXISTS public.skill_demand_by_category;

CREATE MATERIALIZED VIEW public.skill_demand_by_category AS
SELECT
  lower(coalesce(jp.category, 'uncategorized')) AS category,
  trim(requirement) AS requirement,
  count(*)::integer AS demand_count
FROM public.job_postings jp,
  LATERAL unnest(jp.requirements) AS requirement
WHERE jp.status = 'open'
  AND jp.requirements IS NOT NULL
  AND array_length(jp.requirements, 1) > 0
  AND trim(requirement) <> ''
GROUP BY lower(coalesce(jp.category, 'uncategorized')), trim(requirement);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_demand_category_req
  ON public.skill_demand_by_category (category, requirement);

CREATE INDEX IF NOT EXISTS idx_skill_demand_category_count
  ON public.skill_demand_by_category (category, demand_count DESC);

-- 2. RPC: top N skills for a given category.
--    SECURITY DEFINER so anon/authenticated users can read without
--    needing direct SELECT on the view.
CREATE OR REPLACE FUNCTION public.get_top_demand_skills(
  p_category text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  requirement text,
  demand_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT requirement, demand_count
  FROM public.skill_demand_by_category
  WHERE category = lower(coalesce(p_category, ''))
  ORDER BY demand_count DESC, requirement ASC
  LIMIT greatest(1, least(coalesce(p_limit, 10), 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_top_demand_skills(text, integer) TO anon, authenticated;

-- 3. Refresh helper — call from a scheduled job (pg_cron) or after
--    large batches of job postings change. Concurrent refresh keeps
--    reads non-blocking.
CREATE OR REPLACE FUNCTION public.refresh_skill_demand_by_category()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.skill_demand_by_category;
EXCEPTION
  WHEN feature_not_supported THEN
    -- Fallback when the view has never been populated (no unique index yet)
    REFRESH MATERIALIZED VIEW public.skill_demand_by_category;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_skill_demand_by_category() TO authenticated;

-- Seed the view once on install so the RPC returns data immediately.
SELECT public.refresh_skill_demand_by_category();
