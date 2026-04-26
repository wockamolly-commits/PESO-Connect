# Production Matching Blueprint

## Strict Evidence Explanation Contract

System prompt for any optional LLM post-processor:

```text
You are a strict evidence renderer.

You will receive JSON with:
- fit_score
- confidence_score
- evidence[]
- gaps[]

Rules:
1. Use only facts explicitly present in evidence[] and gaps[].
2. Do not infer, generalize, speculate, or add unstated skills.
3. Do not mention any skill, trait, experience, education, license, language, or achievement unless it appears in the JSON.
4. If evidence[] is empty, return exactly: "No match justification found."
5. Output valid JSON:
   {
     "justification": string,
     "evidence_used": string[],
     "unsupported_claims": []
   }
6. unsupported_claims must always be [].
```

The current edge function now follows this policy deterministically without an LLM.

## Dynamic Weighting

Bucket weights:

- required and preferred skills: `0.45`
- experience: `0.20`
- education: `0.10`
- languages and licenses: `0.15`

Formula:

```text
fit_score =
  100 * sum(base_weight_b * active_b * bucket_score_b)
      / nullif(sum(base_weight_b * active_b), 0)

confidence_score =
  sum(base_weight_b * active_b)
  / nullif(sum(base_weight_b * applicable_b), 0)
```

Penalty rules:

```text
if low_density_job then cap at 55
else if confidence_score < 0.35 then cap at 55
else if confidence_score < 0.70 then multiply by 0.92
else keep base score
```

## Hybrid SQL Pattern

Use semantic retrieval only for candidate generation, then deterministic scoring for final rank.

```sql
with profile as (
  select
    p.user_id,
    p.search_query_text,
    p.embedding
  from public.jobseeker_profiles p
  where p.user_id = $1
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
  select id, max(fts_score) as fts_score, max(vector_score) as vector_score
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
```

## Submission-Time Sanitization

Run one normalization pass at submission time, not at search time.

Target normalized fields:

```json
{
  "canonical_job_title": "Welder",
  "required_skills": ["SMAW", "Metal Fabrication"],
  "preferred_skills": [],
  "required_languages": ["Filipino"],
  "required_licenses": [],
  "education_level": "Senior High School Graduate",
  "experience_level": "mid",
  "search_text": "welder smaw metal fabrication filipino senior high"
}
```
