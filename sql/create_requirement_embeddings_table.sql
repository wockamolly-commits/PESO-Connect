-- ============================================================
-- requirement_embeddings — cross-request cache for requirement
-- and skill phrase embeddings.
--
-- Purpose:
--   match-jobs currently embeds each unique requirement once per
--   request. Different users match against many of the same jobs
--   and requirement strings, so embedding the same text repeatedly
--   across users is pure waste. This table persists embeddings
--   keyed by a content hash so the second user who encounters
--   "3 years React experience" pays zero Cohere cost.
--
-- Schema notes:
--   * content_hash is sha256(normalized_text || '::' || input_type
--     || '::' || embedding_model). Including input_type prevents
--     mixing search_query and search_document vectors — Cohere
--     produces different embeddings per input_type.
--   * normalized_text is the exact string that was embedded
--     (lowercased, whitespace-collapsed). Stored for debugging and
--     potential future re-hydration, not joined on.
--   * embedding is jsonb to match the existing job_embeddings /
--     profile_embeddings convention in this codebase.
--   * No RLS. Service role only — this table is not user-scoped
--     and must never be exposed to clients.
--
-- Idempotent - safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.requirement_embeddings (
  content_hash     text        PRIMARY KEY,
  normalized_text  text        NOT NULL,
  input_type       text        NOT NULL,
  embedding        jsonb       NOT NULL,
  embedding_model  text        NOT NULL,
  embedding_dim    integer     NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Eviction signal: oldest rows first.
-- Not used yet; here so a pruning job (e.g. delete rows older than
-- 90 days with low co-occurrence) can run without an index rebuild.
CREATE INDEX IF NOT EXISTS idx_requirement_embeddings_created_at
  ON public.requirement_embeddings (created_at);

-- Explicit lockdown. RLS is disabled (service role only), but we
-- still revoke anon/authenticated access at the GRANT layer so a
-- mis-scoped supabase client can't accidentally read embeddings.
REVOKE ALL ON public.requirement_embeddings FROM anon, authenticated;
