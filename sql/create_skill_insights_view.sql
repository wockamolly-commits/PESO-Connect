-- ============================================================
-- Phase 5: Skill Gap & Telemetry Insights
--
-- Two SECURITY DEFINER RPCs for the admin Skill Insights page:
--
--   get_skill_gap_insights(p_limit)
--     Combines employer demand (skill_demand_by_category materialized view)
--     with verified jobseeker profile skills (jobseeker_profiles) to surface
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
  WITH
  -- Expand requirement_aliases JSONB from open job postings into flat
  -- (canonical_lower, alias_lower) pairs so the supply JOIN can recognise
  -- jobseekers whose skill names differ only by alias (e.g. "Microsoft Excel"
  -- matching a job that lists "MS Excel" with that alias).
  req_alias_pairs AS (
    SELECT DISTINCT
      lower(trim(ra_key.key))          AS canonical_lower,
      lower(trim(alias_val.alias_val)) AS alias_lower
    FROM public.job_postings jp
    CROSS JOIN LATERAL jsonb_each(coalesce(jp.requirement_aliases, '{}')) AS ra_key
    CROSS JOIN LATERAL jsonb_array_elements_text(ra_key.value) AS alias_val(alias_val)
    WHERE jp.status = 'open'
      AND trim(alias_val.alias_val) <> ''
  ),
  -- Distinct (profile_id, skill_name_lower) pairs for verified jobseekers
  verified_profile_skills AS (
    SELECT DISTINCT
      jp.id                            AS profile_id,
      lower(trim(skill_name))          AS skill_name_lower
    FROM public.jobseeker_profiles jp,
      LATERAL unnest(
        coalesce(jp.predefined_skills, '{}'::text[])
        || coalesce(jp.skills, '{}'::text[])
      ) AS skill_name
    WHERE coalesce(jp.jobseeker_status, 'pending') = 'verified'
      AND trim(skill_name) <> ''
  ),
  -- For each canonical requirement lower-case name, count distinct verified
  -- profiles that supply it either by exact name or by an accepted alias.
  profile_skill_supply AS (
    SELECT
      target_req_lower,
      count(DISTINCT profile_id)::bigint AS supply_count
    FROM (
      -- Direct match: jobseeker skill == canonical requirement
      SELECT profile_id, skill_name_lower AS target_req_lower
      FROM verified_profile_skills
      UNION
      -- Alias match: jobseeker skill is a known alias of a canonical requirement
      SELECT vps.profile_id, rap.canonical_lower AS target_req_lower
      FROM verified_profile_skills vps
      JOIN req_alias_pairs rap ON vps.skill_name_lower = rap.alias_lower
    ) matches
    GROUP BY target_req_lower
  )
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
  LEFT JOIN profile_skill_supply s
    ON lower(trim(d.requirement)) = s.target_req_lower
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
