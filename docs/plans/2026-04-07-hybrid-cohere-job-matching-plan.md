# Hybrid Cohere Job Matching Upgrade Plan

**Date:** 2026-04-07
**Scope:** Upgrade the existing deterministic job matcher into a hybrid semantic + rules system using Cohere, without removing the current deterministic logic.
**Current baseline:** `src/services/geminiService.js`

---

## 1. Current State

The current matching flow is implemented client-side in `src/services/geminiService.js` and used directly by:

- `src/pages/JobListings.jsx`
- `src/pages/JobDetail.jsx`
- `src/pages/JobseekerProfileEdit.jsx`

Current behavior:

- Deterministic match score:
  - Skills: 50%
  - Experience: 30%
  - Education: 20%
- Cohere is used for:
  - skill alias generation
  - experience category classification
  - qualitative match explanations
- No embedding-based semantic retrieval is currently used
- Cohere API key is exposed to the frontend through `VITE_COHERE_API_KEY`

This means the system is explainable, but semantic matching quality is limited and the API key placement is unsafe.

---

## 2. Target Architecture

### 2.1 Design goals

- Keep deterministic scoring as an auditable scoring layer
- Add semantic retrieval before deterministic scoring
- Add optional reranking after deterministic scoring
- Move all Cohere API calls to Supabase Edge Functions
- Avoid blocking the React UI with expensive matching work

### 2.2 New end-to-end flow

1. Job created or updated
2. Build canonical job text and requirement texts
3. Generate job embeddings in backend
4. Store embeddings and content hash
5. Profile created or updated
6. Build canonical profile text and skill texts
7. Generate profile embeddings in backend
8. Store embeddings and content hash
9. Job match request arrives
10. Apply hard filters first
11. Compute cosine similarity using precomputed embeddings
12. Keep top semantic candidates only
13. Run deterministic scoring on shortlisted jobs
14. Compute hybrid score
15. Optionally rerank top N jobs with Cohere rerank
16. Generate explanation from finalized evidence only

---

## 3. Proposed Module Layout

### 3.1 Frontend

Add:

- `src/services/matchingService.js`

Responsibilities:

- call backend edge functions
- fetch precomputed hybrid match results
- preserve the current page API shape where possible

Recommended exports:

- `getJobMatchesForUser({ userId, filters, limit, offset })`
- `getSingleJobMatch({ userId, jobId })`
- `refreshProfileEmbedding({ userId })`
- `refreshJobEmbedding({ jobId })`

### 3.2 Shared scoring helpers

Add:

- `src/services/matching/deterministicScore.js`
- `src/services/matching/profileTextBuilder.js`
- `src/services/matching/jobTextBuilder.js`
- `src/services/matching/skillNormalization.js`

Move from `geminiService.js` into `deterministicScore.js`:

- `calculateDeterministicScore`
- synonym map
- hierarchy map
- language and education helpers

Reason:

- deterministic scoring should stay reusable from both frontend and backend during migration

### 3.3 Backend: Supabase Edge Functions

Add:

- `supabase/functions/match-jobs/index.ts`
- `supabase/functions/refresh-job-embedding/index.ts`
- `supabase/functions/refresh-profile-embedding/index.ts`
- `supabase/functions/generate-match-explanation/index.ts`

Optional later:

- `supabase/functions/rerank-jobs/index.ts`
- `supabase/functions/backfill-embeddings/index.ts`

### 3.4 SQL / persistence

Add tables:

- `job_embeddings`
- `profile_embeddings`
- `match_scores_cache`

Optional later:

- `skill_embeddings`
- `job_requirement_embeddings`

---

## 4. Database Design

### 4.1 `job_embeddings`

Suggested columns:

```sql
create table if not exists public.job_embeddings (
  job_id uuid primary key references public.job_postings(id) on delete cascade,
  content_hash text not null,
  embedding jsonb not null,
  embedding_model text not null default 'embed-v4.0',
  embedding_dim integer not null default 512,
  source_text text not null,
  updated_at timestamptz not null default now()
);
```

### 4.2 `profile_embeddings`

```sql
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
```

### 4.3 `match_scores_cache`

This is optional but strongly recommended to avoid repeated recomputation when the same user opens job pages repeatedly.

```sql
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
```

### 4.4 Recommended indexes

```sql
create index if not exists idx_job_embeddings_updated_at on public.job_embeddings(updated_at desc);
create index if not exists idx_profile_embeddings_updated_at on public.profile_embeddings(updated_at desc);
create index if not exists idx_match_scores_cache_user_score on public.match_scores_cache(user_id, final_score desc);
```

---

## 5. Canonical Text Builders

### 5.1 Job text

Create a single stable text representation for semantic comparison.

Example:

```js
export function buildJobText(job) {
  return [
    `Job title: ${job.title || ""}`,
    `Category: ${job.category || ""}`,
    `Description: ${job.description || ""}`,
    `Requirements: ${(job.requirements || job.required_skills || []).join(", ")}`,
    `Experience level: ${job.experience_level || ""}`,
    `Education level: ${job.education_level || ""}`,
    `Type: ${job.type || ""}`,
    `Location: ${job.location || ""}`
  ].join("\n");
}
```

### 5.2 Profile text

```js
export function buildProfileText(profile) {
  return [
    `Preferred occupations: ${(profile.preferred_occupations || []).join(", ")}`,
    `Skills: ${[...(profile.predefined_skills || []), ...(profile.skills || [])].join(", ")}`,
    `Work experience: ${(profile.work_experiences || []).map(
      (exp) => `${exp.position || exp.title || ""} at ${exp.company || ""}`
    ).join("; ")}`,
    `Education: ${profile.highest_education || ""}`,
    `Course: ${profile.course_or_field || ""}`,
    `Experience categories: ${(profile.experience_categories || []).join(", ")}`,
    `Preferred locations: ${(profile.preferred_local_locations || []).join(", ")}`
  ].join("\n");
}
```

### 5.3 Why canonical text matters

- stable embeddings depend on stable text formatting
- avoids repeated drift from formatting changes
- allows reliable `content_hash` invalidation

---

## 6. Embedding Strategy

### 6.1 Cohere usage

Use Cohere embeddings for:

- full job text
- full profile text
- optionally requirement texts and user skill texts later

Recommended settings:

- model: `embed-v4.0`
- output dimension: `512`
- job/profile stored docs: `input_type = "search_document"`
- live search text: `input_type = "search_query"`

### 6.2 Content hashing

Only regenerate an embedding if the canonical text changed.

Example:

```js
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map(x => x.toString(16).padStart(2, "0")).join("");
}
```

### 6.3 Storage format

Store vectors as `jsonb` arrays in Supabase first for simplicity.

Later, if scale grows:

- move to `vector` column type if pgvector is enabled
- or use a dedicated vector store

---

## 7. Scoring Design

### 7.1 Keep deterministic scoring intact

The existing function remains a core subsystem:

- exact skill overlap
- synonyms
- aliases
- hierarchy
- category and years-based experience scoring
- ordinal education scoring

This should remain the explainable policy layer.

### 7.2 Add semantic profile-to-job score

Compute cosine similarity between:

- profile embedding
- job embedding

Then normalize:

```js
export function normalizeCosineScore(cosine) {
  const min = 0.45;
  const max = 0.85;
  const normalized = (cosine - min) / (max - min);
  return Math.max(0, Math.min(1, normalized)) * 100;
}
```

### 7.3 New hybrid skill score

For each job requirement:

1. compare it to each user skill using embeddings
2. take the best semantic match
3. add deterministic boost if exact/synonym/alias/hierarchy matched

Suggested formula per requirement:

```txt
semantic_requirement_score = clamp((max_cosine - 0.55) / 0.30, 0, 1)

rule_boost =
  0.20 if exact
  0.12 if synonym or alias
  0.08 if hierarchy

requirement_score = min(
  1,
  0.75 * semantic_requirement_score + 0.25 * min(1, rule_boost)
)
```

Then:

```txt
hybrid_skill_score = average(requirement_score across all requirements) * 100
```

### 7.4 Final score

Recommended formula:

```txt
final_score =
  0.20 * semantic_profile_job_score +
  0.30 * hybrid_skill_score +
  0.30 * experience_score +
  0.20 * education_score
```

Recommended match levels:

- `Excellent`: 80-100
- `Good`: 60-79
- `Fair`: 40-59
- `Low`: 0-39

### 7.5 Why this weighting

- semantic score improves role-level understanding
- hybrid skill score remains the most direct capability signal
- experience still matters heavily for employability
- education remains important and auditable

---

## 8. Edge Function Contracts

### 8.1 `refresh-job-embedding`

Input:

```json
{ "jobId": "uuid" }
```

Behavior:

- fetch job from `job_postings`
- build canonical job text
- hash content
- reuse existing embedding if hash unchanged
- otherwise call Cohere embed
- upsert into `job_embeddings`

Output:

```json
{
  "jobId": "uuid",
  "updated": true,
  "contentHash": "sha256",
  "embeddingDim": 512
}
```

### 8.2 `refresh-profile-embedding`

Input:

```json
{ "userId": "uuid" }
```

Behavior:

- fetch `jobseeker_profiles`
- build canonical profile text
- hash content
- embed if changed
- upsert into `profile_embeddings`

### 8.3 `match-jobs`

Input:

```json
{
  "userId": "uuid",
  "filters": {
    "category": "",
    "location": "",
    "type": "",
    "salaryMin": null,
    "salaryMax": null
  },
  "limit": 20,
  "offset": 0,
  "rerank": false
}
```

Behavior:

1. fetch profile
2. ensure profile embedding exists
3. fetch candidate jobs using hard filters
4. ensure missing job embeddings are lazily refreshed
5. compute cosine similarity against candidate jobs
6. keep top K, for example `topK = 50`
7. run deterministic scorer on top K
8. compute hybrid score
9. if rerank enabled, rerank top 20 only
10. return compact results for UI

Output:

```json
{
  "results": [
    {
      "jobId": "uuid",
      "semanticScore": 78,
      "hybridSkillScore": 82,
      "experienceScore": 70,
      "educationScore": 100,
      "finalScore": 81,
      "matchLevel": "Excellent",
      "matchingSkills": ["Plumbing", "Pipe Fitting"],
      "missingSkills": ["Welding"]
    }
  ],
  "meta": {
    "candidateCount": 240,
    "semanticShortlistCount": 50,
    "reranked": false
  }
}
```

### 8.4 `generate-match-explanation`

Input:

```json
{
  "userId": "uuid",
  "jobId": "uuid",
  "scores": {
    "semanticScore": 78,
    "hybridSkillScore": 82,
    "experienceScore": 70,
    "educationScore": 100,
    "finalScore": 81,
    "matchLevel": "Excellent"
  },
  "matchingSkills": ["Plumbing", "Pipe Fitting"],
  "missingSkills": ["Welding"]
}
```

Behavior:

- uses finalized scores only
- explanation cannot overwrite the score
- explanation remains qualitative, not authoritative

---

## 9. Frontend Migration

### 9.1 `JobListings.jsx`

Current:

- fetch jobs directly
- compute `calculateDeterministicScore` in a `useEffect`

Target:

- keep fetching jobs
- replace local score loop with backend `match-jobs`
- map response into the current `matchScores` shape

Temporary compatibility adapter:

```js
function toLegacyMatchShape(item) {
  return {
    matchScore: item.finalScore,
    matchLevel: item.matchLevel,
    matchingSkills: item.matchingSkills || [],
    missingSkills: item.missingSkills || [],
    semanticScore: item.semanticScore,
    hybridSkillScore: item.hybridSkillScore
  };
}
```

### 9.2 `JobDetail.jsx`

Current:

- instant deterministic score
- AI explanation loaded on demand

Target:

- request `getSingleJobMatch({ userId, jobId })`
- show deterministic-style badge using `finalScore`
- show explanation via `generate-match-explanation`

### 9.3 `JobseekerProfileEdit.jsx`

Current:

- profile edits trigger alias expansion only

Target:

- after profile save:
  - refresh aliases
  - refresh profile embedding
  - clear stale cached match scores

---

## 10. Security Changes

### 10.1 Move Cohere key out of frontend

Current risk:

- `VITE_COHERE_API_KEY` exposes the API key to every client

Required change:

- remove frontend Cohere API usage
- store `COHERE_API_KEY` in Supabase Edge Function secrets

### 10.2 Authorization

Each edge function should:

- verify the caller identity from Supabase JWT when user-scoped
- use service role only for internal reads/writes when needed
- restrict profile embedding refresh to the owning user or admin

---

## 11. Performance Plan

### 11.1 Hard filters before semantic scoring

Always filter by:

- status = open
- deadline >= today
- category if selected
- type if selected
- location if selected
- salary band if selected

This reduces embedding comparisons dramatically.

### 11.2 Candidate limits

Recommended production defaults:

- filtered candidates: up to 500
- semantic shortlist: top 50
- rerank set: top 20
- visible results: top 20

### 11.3 Caching

Cache layers:

- embedding tables in database
- optional in-memory edge cache for hot job embeddings
- `match_scores_cache` keyed by `user_id + job_id + hashes`

### 11.4 Safe operating range

With precomputed embeddings and backend cosine scan:

- 500 to 3,000 active jobs: comfortable
- 3,000 to 20,000: likely still workable with shortlist optimization
- beyond that: strongly consider pgvector or ANN search

---

## 12. Rollout Plan

### Phase 1: Safe extraction

1. Extract deterministic scoring from `geminiService.js` into a dedicated shared module
2. Keep old exports to avoid breaking imports
3. Move Cohere explanation and alias calls behind backend wrappers

### Phase 2: Embedding infrastructure

4. Add SQL tables
5. Add `refresh-job-embedding`
6. Add `refresh-profile-embedding`
7. Trigger embedding refresh after job/profile save

### Phase 3: Hybrid matching

8. Add `match-jobs`
9. Update `JobListings.jsx` to use backend match results
10. Update `JobDetail.jsx` to use backend single-job match

### Phase 4: Explanation and rerank

11. Add `generate-match-explanation`
12. Add optional rerank on top 20 only
13. Cache explanation payloads

### Phase 5: Cleanup

14. Remove direct frontend Cohere calls
15. Remove `VITE_COHERE_API_KEY`
16. Update methodology docs to reflect Cohere + hybrid matching

---

## 13. Minimum Viable Build

If time is tight, build only this first:

1. backend profile/job embeddings
2. backend `match-jobs`
3. final score using:
   - semantic profile-job score
   - existing deterministic experience
   - existing deterministic education
   - hybrid skill score with rules as boost
4. frontend `JobListings.jsx` integration

That alone upgrades the system from deterministic-only to a practical hybrid recommender.

---

## 14. Recommended Next Files To Implement

1. `src/services/matching/deterministicScore.js`
2. `src/services/matchingService.js`
3. `supabase/functions/refresh-job-embedding/index.ts`
4. `supabase/functions/refresh-profile-embedding/index.ts`
5. `supabase/functions/match-jobs/index.ts`
6. `sql/create_hybrid_matching_tables.sql`

---

## 15. Notes For This Repository

- Existing deterministic logic in `src/services/geminiService.js` is good enough to preserve as-is initially
- `JobListings.jsx` currently computes scores client-side for every loaded job, which will not scale well once embeddings are introduced
- `JobDetail.jsx` already separates score computation from explanation generation, which is a good migration boundary
- `JobseekerProfileEdit.jsx` is the correct place to trigger profile embedding refresh after save
- `docs/methodology.md` still references Groq and should be updated after the migration

