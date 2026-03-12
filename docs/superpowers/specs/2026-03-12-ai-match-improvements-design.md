# AI Match Score Improvements — Design Spec

## Problem

1. **Stuck analyzing** — Batch scoring on JobListings hangs because Groq mangles long UUIDs in JSON keys, and `max_tokens: 2048` truncates responses for 10+ jobs.
2. **Requires manual trigger** — User must click "AI Match Scores" button; scores don't appear automatically.
3. **Slow** — Free-tier Groq rate limits (30 req/min, 6K tokens/min) make multi-call approaches unreliable.
4. **Score mismatch** — Batch and single-job prompts produce different scores for the same job.
5. **No persistence** — Scores lost on page navigation; user must re-trigger every time.

## Decisions

- **Single API call** — Score all jobs (up to 30) in one request via Groq (Llama 3.3 70B). Eliminates rate limit issues entirely.
- **Index-based matching** — Prompt lists jobs as `JOB_0`, `JOB_1`, etc. Response uses indices as keys. Avoids UUID mismatch.
- **Auto-score on load** — No button click needed. Scores appear automatically for jobseekers with skills.
- **sessionStorage cache** — Scores persist across page navigation. 10-min TTL with skills-hash invalidation.
- **Two-tier detail** — Listings get lightweight scores (one API call). Detail page shows cached score instantly; full breakdown is user-initiated.

## Design

### geminiService.js

**Provider:** Groq API with Llama 3.3 70B (unchanged).

**Remove:** `batchScoreChunk`, `calculateAllJobMatches`

**Add:** `scoreAllJobs(jobs, profile)`

- Accepts all jobs in a single call
- If more than 30 jobs, only score the first 30 (log a warning for the rest)
- Prompt format lists jobs by index:
  ```
  JOB_0: title="Welder" | required_skills="Welding, Metal Fabrication"
  JOB_1: title="Driver" | required_skills="Driving, Navigation"
  ```
- Response format uses matching indices:
  ```json
  {
    "0": {"matchScore": 75, "matchLevel": "Good", "matchingSkills": ["Welding"], "missingSkills": ["CNC"], "explanation": "Strong fit."},
    "1": {"matchScore": 40, "matchLevel": "Low", "matchingSkills": [], "missingSkills": ["CDL"], "explanation": "Limited match."}
  }
  ```
- After parsing with `safeParseAIJSON`, maps indices back to `jobs[i].id`
- If `safeParseAIJSON` returns `{ ok: false }`, return empty `{}` (treated as failure)
- Caches each result per-job in in-memory cache (keyed by `match_${jobId}_${skillsKey}`)
- Also writes all scores to sessionStorage (see Cache Strategy)
- `callAI` options: `{ timeoutMs: 45000, maxTokens: 4096 }`
- Prompt instructs: "Keep explanation under 15 words per job" to control token usage
- Returns `{ [jobId]: matchResult }`

**Keep:** `calculateJobMatch` — unchanged, used by JobDetail for full detailed breakdown. Already has semantic matching instruction.

**Prompt improvements (batch):**
- Explicit semantic matching: "Recognize related skills even if names differ (e.g. 'Welding' ↔ 'Metal Fabrication', 'Driving' ↔ 'Logistics')"
- Philippine blue-collar context: weight practical/vocational skills and TESDA certifications
- Clear rubric: 80-100 Excellent, 60-79 Good, 40-59 Fair, 0-39 Low
- Concise output: one-sentence explanation per job (max 15 words)

### Cache Strategy

**sessionStorage structure:**
- Key: `peso-match-scores-{userId}`
- Value: `{ timestamp, skillsHash, scores: { [jobId]: matchResult } }`
- `skillsHash` = `profile.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')`

**Invalidation rules:**
- TTL: 10 minutes
- Skills change: `skillsHash` mismatch → discard and re-score
- Manual: small refresh icon next to "Sort by Match" button

**Multi-tab:** New scores are merged into existing cache (not replaced), so two tabs don't clobber each other.

**Cache helpers** (in geminiService.js):
- `getSessionScores(userId, skillsHash)` — returns cached scores or null
- `setSessionScores(userId, skillsHash, scores)` — merges scores into sessionStorage

**Cache flow:**
1. JobListings loads → check sessionStorage → fresh + same skills? → use cached (zero API calls)
2. Cache miss/stale → call `scoreAllJobs` → store in sessionStorage + in-memory
3. JobDetail loads → read from sessionStorage → instant score display
4. "Detailed Breakdown" click → `calculateJobMatch` → in-memory cache only (too large for sessionStorage)

### JobListings.jsx

- **Remove:** "AI Match Scores" button, `matchProgress` state, `mountedRef`
- **Auto-trigger:** `useEffect` calls `scoreAllJobs` when jobs load + user is jobseeker with skills
- **No skills:** If jobseeker has no skills, don't trigger scoring. The existing profile completeness nudge already covers this.
- **Check sessionStorage first** — if fresh cache exists, use it immediately (no API call)
- **Loading state:** "Analyzing matches..." with spinner (single call, no progress counter)
- **Error state:** Dismissible banner "Match scores unavailable right now" — doesn't block page
- **Sort behavior:** Do NOT auto-enable sort by match (avoids jarring reorder while user is browsing). Instead, show the "Sort by Match" toggle once scores are available. User opts in.
- **Refresh button:** Small icon button to re-trigger scoring manually (clears sessionStorage cache for this user, re-calls `scoreAllJobs`)
- **Match badges:** Unchanged — color-coded score on each job card

### JobDetail.jsx

- **On load:** Check sessionStorage for this job's cached score
- **If cached:** Display score badge + skill gap (matchingSkills/missingSkills) immediately. Requirement tags colored by cached matchingSkills. No spinner, no button.
- **"Detailed Breakdown" button:** Shown when cached score exists. Calls `calculateJobMatch` for full response (skillBreakdown, actionItems, improvementTips).
- **No cache (direct navigation):** Show "Analyze Match" button → calls `calculateJobMatch` for full result. This gives more data than the cached path, but the trade-off is acceptable: direct navigation is rare, and the user explicitly requests it.
- **Skill gap section:** Uses `matchData.matchingSkills` / `matchData.missingSkills` whether from cache or fresh API call (same field names in both).

### Error Handling

- `scoreAllJobs` failure: show dismissible banner, page remains usable without scores
- JSON parse failure: `safeParseAIJSON` returns `{ ok: false }`, treated as API failure (return `{}`)
- Truncated JSON (partial response): `safeParseAIJSON` catches the parse error, treated as full failure. No partial recovery — simpler and more predictable.
- 429 rate limit: single retry after 2s backoff (existing `callAI` logic)
- Timeout (45s): show error banner, user can retry via refresh icon

### Cleanup

- Remove `batchScoreChunk` function
- Remove `calculateAllJobMatches` function
- Remove both from the default export object
- Remove `matchProgress` state and `mountedRef` from JobListings
- Remove "AI Match Scores" button from JobListings
