-- Hybrid AI job matching support tables
-- Date: 2026-04-07
-- Purpose:
--   1. Store precomputed Cohere embeddings for jobs and jobseeker profiles
--   2. Cache hybrid match scores to reduce repeated scoring work

create table if not exists public.job_embeddings (
  job_id uuid primary key references public.job_postings(id) on delete cascade,
  content_hash text not null,
  embedding jsonb not null,
  embedding_model text not null default 'embed-v4.0',
  embedding_dim integer not null default 512,
  source_text text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_embeddings (
  profile_id uuid primary key references public.jobseeker_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content_hash text not null,
  embedding jsonb not null,
  embedding_model text not null default 'embed-v4.0',
  embedding_dim integer not null default 512,
  source_text text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.match_scores_cache (
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.job_postings(id) on delete cascade,
  profile_hash text not null,
  job_hash text not null,
  semantic_score numeric not null,
  hybrid_skill_score numeric not null,
  deterministic_score numeric not null,
  experience_score numeric not null,
  education_score numeric not null,
  final_score numeric not null,
  match_level text not null,
  explanation jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index if not exists idx_job_embeddings_updated_at
  on public.job_embeddings(updated_at desc);

create index if not exists idx_profile_embeddings_updated_at
  on public.profile_embeddings(updated_at desc);

create index if not exists idx_match_scores_cache_user_score
  on public.match_scores_cache(user_id, final_score desc);
