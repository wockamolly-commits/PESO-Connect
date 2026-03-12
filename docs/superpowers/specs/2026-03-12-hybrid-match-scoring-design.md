# Hybrid Deterministic Match Scoring

**Date:** 2026-03-12
**Status:** Draft
**Problem:** Match scores between job listings and job detail pages are inconsistent because two separate AI calls (batch vs single-job) produce different scores for the same job/candidate pair. Scores feel random across similar jobs.

## Architecture

Two-phase system replacing the current dual-AI-call approach:

### Phase 1: AI Profile Enrichment (on profile save)

When a jobseeker saves their profile, a single AI call expands their skills and work history into structured matching data:

**Input:** User's skills array, work experiences, education
**Output (stored on `jobseeker_profiles`):**

```json
{
  "skillAliases": {
    "Welding": ["Metal Fabrication", "Arc Welding", "Metalwork", "SMAW", "MIG Welding"],
    "Driving": ["Logistics", "Delivery", "Vehicle Operation", "Transportation"]
  },
  "experienceCategories": ["trades", "energy"]
}
```

**New columns on `jobseeker_profiles`:**

| Column | Type | Description |
|--------|------|-------------|
| `skill_aliases` | `jsonb` | Map of each skill to its semantic aliases |
| `experience_categories` | `text[]` | Job categories derived from work history |

Note: A separate `normalized_education` column is **not** needed. The existing `highest_education` column on `jobseeker_profiles` already stores values from the `VALID_EDUCATION_LEVELS` array (the profile edit dropdown constrains input to these exact values). We use `highest_education` directly for education scoring.

**AI prompt design:** The prompt asks the AI to:
- Generate 4-6 semantic aliases per skill (related terms, abbreviations, broader/narrower terms relevant to Philippine blue-collar and service jobs)
- Classify the user's work history into the app's exact job category **database keys**: `agriculture`, `energy`, `retail`, `it`, `trades`, `hospitality` (must use these exact lowercase strings — these are what `job_postings.category` stores, not the display names)

**When to regenerate:** Only when the user saves profile changes (skills or work experiences). The alias expansion is cached in the database — no TTL needed since it only changes when the source data changes.

### Phase 2: Deterministic Scoring (on page load)

A pure JavaScript function calculates scores instantly with zero API calls:

```
finalScore = (skillScore × 0.50) + (experienceScore × 0.30) + (educationScore × 0.20)
```

#### Skills Component (50% weight)

For each job requirement, check if it matches any user skill or any of that skill's aliases using **normalized token matching** (not raw substring):

```
skillScore = (matchedRequirements / totalRequirements) × 100
```

**Matching algorithm:**
1. Normalize both the requirement and each skill/alias to lowercase, trimmed
2. A match occurs when:
   - Exact match (after normalization), OR
   - One string is a full word within the other (word-boundary matching, e.g., "Welding" matches "Arc Welding" but "IT" does not match "Hospitality")
3. Minimum token length of 3 characters to participate in partial matching (prevents "IT", "AC", etc. from false-positive matching)

**Edge cases:**
- If the job has 0 requirements → `skillScore = 100`
- Also tracks which specific skills matched and which are missing (for UI display)
- When `skill_aliases` is null (pre-migration user), build a trivial alias map where each skill maps to an empty array — scoring still works with exact matching only

#### Experience Component (30% weight)

Compare the job's `category` field against the user's pre-computed `experience_categories` array (exact string match — both use the same lowercase database keys):

- Job category found in user's `experience_categories` → `experienceScore = 100`
- No match → `experienceScore = 20` (baseline — not zero, since partial transferable skills always exist)
- Job has no category → `experienceScore = 100`

#### Education Component (20% weight)

Jobs have an `education_level` column with short slug values. Jobseeker profiles have a `highest_education` column with full label values. We use a mapping table to compare them on a common ordinal scale:

**Job education_level mapping:**

| Job `education_level` | Ordinal |
|----------------------|---------|
| `none` or null/empty | -1 (no requirement) |
| `elementary` | 0 |
| `high-school` | 1 |
| `vocational` | 2 |
| `college` | 3 |

**Jobseeker `highest_education` mapping:**

| Jobseeker `highest_education` | Ordinal |
|-------------------------------|---------|
| `Elementary Graduate` | 0 |
| `High School Graduate` | 1 |
| `Senior High School Graduate` | 1.5 |
| `Vocational/Technical Graduate` | 2 |
| `College Undergraduate` | 2.5 |
| `College Graduate` | 3 |
| `Masteral Degree` | 4 |
| `Doctoral Degree` | 5 |

**Scoring:**
- Job has no education requirement (ordinal -1) → `educationScore = 100`
- User's ordinal >= job's ordinal → `educationScore = 100`
- User is within 1 ordinal level below → `educationScore = 60`
- User is 2+ ordinal levels below → `educationScore = 30`

#### Match Levels

| Score Range | Level |
|-------------|-------|
| 80–100 | Excellent |
| 60–79 | Good |
| 40–59 | Fair |
| 0–39 | Low |

### On-Demand AI Detail (unchanged)

The "Detailed Breakdown" button on the job detail page still calls the AI for rich qualitative analysis:
- Explanation (2-3 sentences)
- Skill breakdown with category-level detail text
- Career action items and improvement tips

**Critical change:** The score and match level displayed always come from the deterministic function, never from the AI detail call. The AI provides only the qualitative text.

## Data Flow

```
Profile Save → AI expands aliases → stored in jobseeker_profiles
                                          ↓
Job Listings Page Load → read aliases from userData → deterministic score per job → display badges
                                          ↓
Job Detail Page Load → same deterministic function → display score ring
                                          ↓
"Detailed Breakdown" click → AI call for explanation/tips only → display qualitative text
```

## Consistency Guarantee

Both pages call the same `calculateDeterministicScore(job, userData)` function. Since the function is pure (no randomness, no AI) and the inputs are identical, scores are guaranteed to match.

## What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Listings page scoring | AI batch call (5 jobs/call, 3s delays) | Instant local calculation |
| Detail page scoring | Separate AI call | Same local calculation |
| Score consistency | Two different AI calls → different scores | Single pure function → identical |
| Speed | 3-15 seconds on listings page | Instant |
| API calls on page load | Multiple per session | Zero |
| Rate limit issues | Frequent (batch calls) | Eliminated for scoring |
| Detail breakdown | AI for everything | AI for text only, score is deterministic |
| Profile save | No AI call | One AI call for alias expansion |

## What Stays

- sessionStorage caching for AI detail breakdown text
- Profile completeness nudge on listings page
- Match error banner (repurposed for alias expansion failures)
- Score ring visualization and breakdown bars on detail page
- Career action items and improvement tips from AI

## Files to Modify

1. **`src/services/geminiService.js`** — Add `expandProfileAliases()` function, add `calculateDeterministicScore()` function, modify `calculateJobMatch()` to use deterministic score and only return qualitative data from AI
2. **`src/pages/JobListings.jsx`** — Replace `scoreAllJobs` call with local `calculateDeterministicScore` loop
3. **`src/pages/JobDetail.jsx`** — Use `calculateDeterministicScore` for score display, keep AI call for detail text only
4. **`src/pages/JobseekerProfileEdit.jsx`** — Call `expandProfileAliases()` on profile save, store results to `jobseeker_profiles`
5. **`src/contexts/AuthContext.jsx`** — Ensure `fetchUserData` includes `skill_aliases` and `experience_categories` from `jobseeker_profiles`
6. **SQL migration** — Add `skill_aliases` (jsonb) and `experience_categories` (text[]) columns to `jobseeker_profiles`

## Edge Cases

- **User has no skills:** No alias expansion, no scoring — same as current behavior
- **Job has no requirements:** `skillScore = 100` — don't penalize for incomplete job data
- **Alias expansion fails:** Graceful fallback — use exact skill names only (no aliases), scoring still works with reduced accuracy
- **User has skills but null `skill_aliases` (pre-migration):** Build trivial alias map (each skill → empty array), scoring works with exact matching only. On next profile save, full aliases are generated.
- **Job has no category:** `experienceScore = 100`
- **Job has no education_level:** `educationScore = 100`

## Migration Strategy

- New columns are nullable — existing users work fine without aliases (fall back to exact matching)
- Alias expansion is triggered on the next profile save by the user
- No automatic migration on page load — avoids race conditions and keeps the architecture clean (enrichment only happens during profile save flow)
- Users who never re-save their profile still get scores via exact skill matching, just without semantic alias benefits
