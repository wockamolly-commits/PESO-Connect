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
- **Keep** existing `calculateJobMatch` with 10-minute cache (key: `job.id + profile.skills`)

### JobListings.jsx

- Replace `geminiService.batchCalculateMatches(jobs, userData)` with `geminiService.calculateAllJobMatches(jobs, userData, onProgress)`
- `onProgress` updates `matchScores` state incrementally — badges appear one by one
- Button text shows progress: "Analyzing 3/15..."
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

- Individual job failures: skip silently (`console.warn`), no badge shown
- All calls fail: show brief error message on JobListings
- JobDetail: existing error handling unchanged
