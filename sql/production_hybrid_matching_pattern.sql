-- Production hybrid retrieval pattern for PESO Connect.
-- This file is intentionally a blueprint: review before applying in Supabase.

alter table public.job_postings
  add column if not exists search_document tsvector;

-- Requires pgvector extension and a real vector column size matching your embedding model.
-- alter table public.job_postings
--   add column if not exists embedding vector(512);

create index if not exists job_postings_search_gin
  on public.job_postings
  using gin (search_document);

-- Uncomment after pgvector is enabled.
-- create index if not exists job_postings_embedding_ivfflat
--   on public.job_postings
--   using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);

update public.job_postings
set search_document =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(required_skills, '{}'), ' ')), 'A') ||
  setweight(to_tsvector('simple', array_to_string(coalesce(preferred_skills, '{}'), ' ')), 'B') ||
  setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(location, '')), 'C');

-- Retrieval shortlist:
with profile as (
  select
    p.user_id,
    p.search_query_text,
    p.embedding
  from public.jobseeker_profiles p
  where p.user_id = :user_id
),
fts_candidates as (
  select
    j.id,
    ts_rank_cd(j.search_document, plainto_tsquery('simple', profile.search_query_text)) as fts_score
  from public.job_postings j
  cross join profile
  where j.status = 'open'
    and j.search_document @@ plainto_tsquery('simple', profile.search_query_text)
  order by fts_score desc
  limit 200
),
vector_candidates as (
  select
    j.id,
    1 - (j.embedding <=> profile.embedding) as vector_score
  from public.job_postings j
  cross join profile
  where j.status = 'open'
    and j.embedding is not null
  order by j.embedding <=> profile.embedding
  limit 200
),
unioned as (
  select
    id,
    max(fts_score) as fts_score,
    max(vector_score) as vector_score
  from (
    select id, fts_score, null::float as vector_score from fts_candidates
    union all
    select id, null::float, vector_score from vector_candidates
  ) ranked
  group by id
)
select *
from unioned
order by greatest(coalesce(fts_score, 0), coalesce(vector_score, 0)) desc
limit 150;
