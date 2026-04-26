-- ============================================================
-- Add preferred_score to match_scores_cache
--
-- Scoring now separates required-skill coverage (hybrid_skill_score,
-- aggregated with weakest-link) from preferred-skill coverage
-- (preferred_score, contributes a capped bonus). Both use the same
-- rule-union-semantic scoring, so preferred needs its own cached
-- column — otherwise every cache hit would still require embedding
-- preferred skills, defeating the caching optimization.
--
-- Column is numeric in [0, 1]; callers multiply by the bonus cap
-- (currently 10) to turn it into preferredBonus. Storing the
-- normalized coverage (not the bonus integer) keeps the cap
-- adjustable without a re-cache.
--
-- Idempotent - safe to re-run.
-- ============================================================

ALTER TABLE public.match_scores_cache
  ADD COLUMN IF NOT EXISTS preferred_score numeric NOT NULL DEFAULT 0;
