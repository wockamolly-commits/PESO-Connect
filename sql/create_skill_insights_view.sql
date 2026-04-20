-- ============================================================
-- Phase 5: Skill Gap & Telemetry Insights
--
-- Two SECURITY DEFINER RPCs for the admin Skill Insights page:
--
--   get_skill_gap_insights(p_limit)
--     Combines employer demand (skill_demand_by_category materialized view)
--     with jobseeker supply (skill_recommendation_telemetry) to surface
--     the city-wide skill gap.
--
--   get_telemetry_source_stats()
--     Counts accepted skill clicks per suggestion source so admins can
--     see which recommendation layer (deterministic / ai_enrichment /
--     demand_side) is most effective.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Skill gap: demand vs supply per skill
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_skill_gap_insights(
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  skill_name        text,
  category          text,
  demand_count      integer,
  supply_count      bigint,
  gap_ratio         numeric   -- supply / demand * 100  (lower = bigger gap)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.requirement                                   AS skill_name,
    d.category,
    d.demand_count,
    coalesce(s.supply_count, 0)                     AS supply_count,
    CASE
      WHEN d.demand_count = 0 THEN 0
      ELSE round(coalesce(s.supply_count, 0)::numeric / d.demand_count * 100, 1)
    END                                             AS gap_ratio
  FROM public.skill_demand_by_category d
  LEFT JOIN (
    SELECT
      lower(trim(skill_name)) AS skill_name_lower,
      count(*)                AS supply_count
    FROM public.skill_recommendation_telemetry
    GROUP BY lower(trim(skill_name))
  ) s ON lower(trim(d.requirement)) = s.skill_name_lower
  ORDER BY d.demand_count DESC, gap_ratio ASC
  LIMIT greatest(1, least(coalesce(p_limit, 30), 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_skill_gap_insights(integer) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. Telemetry source performance breakdown
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_telemetry_source_stats()
RETURNS TABLE (
  source          text,
  total_accepted  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    source,
    count(*) AS total_accepted
  FROM public.skill_recommendation_telemetry
  GROUP BY source
  ORDER BY total_accepted DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_telemetry_source_stats() TO authenticated;
