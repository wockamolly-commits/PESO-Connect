-- Phase 7: add 'ai_deep_scan' as a valid telemetry source.
--
-- Postgres requires dropping and recreating a CHECK constraint to alter it.
-- The constraint name was set implicitly by Postgres when the table was created;
-- this migration finds it by column content and drops it safely.
--
-- Idempotent — the DO block skips if the new constraint already exists.

DO $$
DECLARE
  v_constraint text;
BEGIN
  -- Find the existing source check constraint on the telemetry table
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.skill_recommendation_telemetry'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%source%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.skill_recommendation_telemetry DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

-- Recreate with the expanded allowed set
ALTER TABLE public.skill_recommendation_telemetry
  ADD CONSTRAINT skill_telemetry_source_check
  CHECK (source IN ('deterministic', 'ai_enrichment', 'demand_side', 'ai_deep_scan'));
