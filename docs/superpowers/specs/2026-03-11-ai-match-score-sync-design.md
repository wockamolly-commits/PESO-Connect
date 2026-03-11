# AI Match Score Synchronization & Semantic Skill Matching

## Problem

1. **Score mismatch** — JobListings uses `batchCalculateMatches()` (batch prompt) while JobDetail uses `calculateJobMatch()` (single-job prompt). Different prompts produce different scores for the same job.
2. **Incomplete coverage** — `batchCalculateMatches()` caps at 10 jobs per call. Jobs beyond 10 get no score.
3. **No semantic skill matching** — JobDetail's local `skillMatchesRequirement()` uses word-root fuzzy matching only. Misses semantic relationships like "React" ↔ "Frontend Development".

## Decisions

- **Unified prompt** — Both pages call `calculateJobMatch` independently. Same prompt guarantees consistent scores.
- **Paginate via parallel single calls** — Replace batch endpoint with parallel `calculateJobMatch` calls for all jobs (concurrency limit of 3).
- **AI-only skill matching** — Remove local `skillMatchesRequirement`/`getSkillGap`. Use AI's `matchingSkills`/`missingSkills` from the match response.

## Design

### geminiService.js

- **Remove** `batchCalculateMatches()`
- **Add** `calculateAllJobMatches(jobs, profile, onProgress)`:
  - Loops through all jobs, calls `calculateJobMatch` for each
  - 3 concurrent calls max (avoid Groq rate limits)
  - `onProgress(jobId, result, completedCount, totalCount)` callback fires after each job resolves
  - Returns `{ [jobId]: fullMatchResult }`
  - Individual failures: `console.warn`, skip (no badge for that job)
- **Keep** existing `calculateJobMatch` with 10-minute cache (key: `job.id + sorted skills`)
  - Sort skills alphabetically in cache key so order doesn't matter
  - Known limitation: job content edits within TTL window return stale scores

### Concurrency

- Use manual chunking: split jobs into groups of 3, `Promise.allSettled` each group sequentially
- On HTTP 429 (rate limit): abort all remaining calls, return whatever scores completed so far
- No external dependencies needed

### JobListings.jsx

- Replace `geminiService.batchCalculateMatches(jobs, userData)` with `geminiService.calculateAllJobMatches(jobs, userData, onProgress)`
- `onProgress` updates `matchScores` state incrementally — badges appear one by one
- Use a mounted ref to guard `onProgress` calls (prevent setState on unmounted component)
- Initial state after click: "Analyzing 0/{total}..." before first result arrives
- Button text updates: "Analyzing 3/15..." as results come in
- If `calculateAllJobMatches` returns empty object (all failed), show brief error message
- All other display logic (color-coded badges, sort by match) unchanged

### JobDetail.jsx

- Keep calling `calculateJobMatch` directly (unchanged)
- **Remove** `skillMatchesRequirement()` function
- **Remove** `getSkillGap()` function
- Skill gap display reads `matchData.matchingSkills` and `matchData.missingSkills`
- Requirement tags coloring uses AI matching/missing skills instead of local fuzzy logic

### Caching & Sync

- `calculateJobMatch` cache (10-min TTL, keyed by job.id + skills) ensures:
  - JobListings scores all jobs → cached
  - JobDetail for any scored job → cache hit → same score instantly
- No new shared state or context needed — cache is internal to geminiService

### Error Handling

- Individual job failures: `console.warn`, skip (no badge for that job), `Promise.allSettled` ensures others continue
- HTTP 429: abort remaining calls, return partial results
- All calls fail: `calculateAllJobMatches` returns `{}`, JobListings checks `Object.keys(result).length === 0` to show error
- JobDetail: existing error handling unchanged

### Cleanup

- Remove `batchCalculateMatches` from function body and module exports
- No test file exists for geminiService, so no test updates needed
