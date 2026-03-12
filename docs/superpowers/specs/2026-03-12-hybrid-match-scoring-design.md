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
  "experienceCategories": ["Skilled Trades", "Construction", "Manufacturing"],
  "normalizedEducation": "College Graduate"
}
```

**New columns on `jobseeker_profiles`:**

| Column | Type | Description |
|--------|------|-------------|
| `skill_aliases` | `jsonb` | Map of each skill to its semantic aliases |
| `experience_categories` | `text[]` | Job categories derived from work history |
| `normalized_education` | `text` | Standardized education level string |

**AI prompt design:** The prompt asks the AI to generate 4-6 semantic aliases per skill (related terms, abbreviations, broader/narrower terms) and to classify the user's work history into the app's job categories (Agriculture, Energy & Utilities, Retail & Service, Information Technology, Skilled Trades, Hospitality). The normalized education level maps to the existing `VALID_EDUCATION_LEVELS` array.

**When to regenerate:** Only when the user saves profile changes (skills, work experiences, or education). The alias expansion is cached in the database — no TTL needed since it only changes when the source data changes.

### Phase 2: Deterministic Scoring (on page load)

A pure JavaScript function calculates scores instantly with zero API calls:

```
finalScore = (skillScore × 0.50) + (experienceScore × 0.30) + (educationScore × 0.20)
```

#### Skills Component (50% weight)

For each job requirement, check if it matches any user skill or any of that skill's aliases (case-insensitive substring matching):

```
skillScore = (matchedRequirements / totalRequirements) × 100
```

- A requirement is "matched" if any user skill OR any alias of that skill contains the requirement term, or vice versa
- If the job has 0 requirements → `skillScore = 100`
- Also tracks which specific skills matched and which are missing (for UI display)

#### Experience Component (30% weight)

Compare the job's `category` field against the user's pre-computed `experience_categories` array:

- Job category found in user's `experience_categories` → `experienceScore = 100`
- No match → `experienceScore = 20` (baseline — not zero, since partial transferable skills always exist)
- Job has no category → `experienceScore = 100`

#### Education Component (20% weight)

Compare using the ordered `VALID_EDUCATION_LEVELS` array (index-based comparison):

- User's level >= job's required level → `educationScore = 100`
- User is one level below → `educationScore = 60`
- User is two+ levels below → `educationScore = 30`
- Job doesn't specify education requirement → `educationScore = 100`

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

Both pages call the same `calculateDeterministicScore(job, userAliases)` function. Since the function is pure (no randomness, no AI) and the inputs are identical, scores are guaranteed to match.

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

1. **`src/services/geminiService.js`** — Add `expandProfileAliases()` function, add `calculateDeterministicScore()` function, keep `calculateJobMatch()` but modify to use deterministic score
2. **`src/pages/JobListings.jsx`** — Replace `scoreAllJobs` call with local `calculateDeterministicScore` loop
3. **`src/pages/JobDetail.jsx`** — Use `calculateDeterministicScore` for score display, keep AI call for detail text only
4. **`src/pages/JobseekerProfileEdit.jsx`** — Call `expandProfileAliases()` on profile save, store results
5. **`src/contexts/AuthContext.jsx`** — Ensure `fetchUserData` includes the new columns from `jobseeker_profiles`
6. **SQL migration** — Add `skill_aliases`, `experience_categories`, `normalized_education` columns to `jobseeker_profiles`

## Edge Cases

- **User has no skills:** No alias expansion, no scoring — same as current behavior
- **Job has no requirements:** `skillScore = 100` — don't penalize for incomplete job data
- **Alias expansion fails:** Graceful fallback — use exact skill names only (no aliases), scoring still works
- **User hasn't saved profile since this feature launched:** Aliases will be null — trigger expansion on next profile view or score attempt, or fall back to exact matching only

## Education Level Mapping for Jobs

Jobs currently have an `experience_level` field (not education). We'll map job education requirements from the `requirements` array or `description` if explicitly mentioned. If no education requirement is found, `educationScore = 100`.

## Migration Strategy

- New columns are nullable — existing users work fine without aliases
- First time a user with null aliases views job listings, show a brief "Analyzing your profile..." state and trigger alias expansion
- After expansion completes, scores appear instantly on all subsequent visits
