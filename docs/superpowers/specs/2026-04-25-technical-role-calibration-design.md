# Technical Role Calibration — Match Scoring Design

**Date:** 2026-04-25
**Status:** Approved
**Scope:** Eliminate "False Fair" matches where candidates with zero required technical skills score >50 solely on education and general IT background.

---

## Problem

The current blend (`deterministicScore × 0.50 + hybridSkillScore × 0.30 + semanticScore × 0.20`) over-weights education and baseline experience for technical jobs. A candidate with "Hardware Troubleshooting" skills can reach a "Fair" match score against a React Developer role by accruing education and semantic context points even with zero relevant skill overlap.

**Success metric:** A candidate with only "Hardware Troubleshooting" should score <30 for a "React Developer" role and >70 for a "Technical Support" role.

---

## Design

### 1. Technical Role Detection (`isTechnicalJob`)

New module: `supabase/functions/_shared/technicalRole.ts` (mirrored at `src/services/matching/technicalRole.js`).

A job is classified as technical if **any** of three checks pass, evaluated in order:

**Check A — Category allowlist**
```
TECHNICAL_CATEGORIES = [
  'Information Technology', 'IT Support', 'Software Development',
  'Engineering', 'Data', 'Cybersecurity', 'DevOps', 'Design',
  'Network', 'Systems Administration',
]
```
Exact string match against `job.category` (case-insensitive normalized).

**Check B — Title keyword patterns**
Compound-form patterns only — prevents "Sales Engineer" and "Landscape Architect" from false-triggering:
```
/\b(?:software|data|systems?|network|cloud|security|devops|qa|test|hardware|firmware|embedded|backend|frontend|full[\s-]?stack|mobile|ios|android|web|machine\s*learning|ml|ai)\s+engineer\b/i
/\b(?:software|systems?|cloud|solutions?|data|enterprise|security)\s+architect\b/i
/\bdeveloper\b/i, /\bprogrammer\b/i, /\bcoder\b/i
/\bit\s*support\b/i, /\btechnical\s*support\b/i, /\bhelp\s*desk\b/i
/\bsysadmin\b/i, /\bsystem\s*administrator\b/i, /\bnetwork\s*admin/i
/\bdevops\b/i, /\bsre\b/i, /\bqa\b/i, /\btester\b/i
/\bdata\s*(scientist|analyst|engineer)\b/i
/\b(?:cyber)?security\b/i
/\b(?:web|frontend|backend|full[\s-]?stack|mobile|ios|android)\s*(?:dev|developer|engineer)?\b/i
/\b(?:ui|ux)\s+designer\b/i, /\b(?:product|web|graphic)\s+designer\b/i
```

**Check C — Required-skill content**
Reuses the exported `HIGH_TIER_SKILL_PATTERNS` from `deterministicScore.ts/.js`. Any `required_skill` that matches any pattern → technical.

`HIGH_TIER_SKILL_PATTERNS` is **exported** from `deterministicScore.ts` and `.js` (currently private) so both `isTechnicalJob` implementations share a single source of truth.

---

### 2. Reweighted Blend + Technical Kill-Switch

**Location:** `supabase/functions/match-jobs/index.ts` (blend block ~line 1004) and `src/services/matchingService.js`.

```
isTechnical = isTechnicalJob(job)

weights = isTechnical
  ? { deterministic: 0.25, hybrid: 0.60, semantic: 0.15 }
  : { deterministic: 0.50, hybrid: 0.30, semantic: 0.20 }

blendedScore = clamp(
  round(deterministicScore * weights.deterministic
      + hybridSkillScore   * weights.hybrid
      + semanticScore      * weights.semantic)
  + preferredBonus,
  0, 100
)

// Kill-switch: technical roles only (agreed Q2)
if (isTechnical) {
  if (hybridSkillScore === 0)     blendedScore = min(blendedScore, 25)
  else if (hybridSkillScore < 30) blendedScore = min(blendedScore, 40)
}
```

Existing low-density and low-confidence dampers apply after this, unchanged.

---

### 2b. Field-of-Study Penalty

**Location:** `computeEducationScore` in `_shared/deterministicScore.ts` and `src/services/matching/deterministicScore.js`.

For technical jobs where education requirement is met (score ≥ 90), apply a 0.70 multiplier unless the candidate's `course_or_field` matches a technical degree pattern:

```
TECHNICAL_FIELD_PATTERNS = [
  /\bcomputer\s*(science|engineering|studies)\b/i,
  /\binformation\s*(technology|systems?|management)\b/i,
  /\bsoftware\s*engineering\b/i,
  /\bdata\s*science\b/i,
  /\belectronics?\s*(?:and\s*communications?\s*)?engineering\b/i,
  /\bcomputer\s*technology\b/i,
  /\bcybersecurity\b|\binformation\s*security\b/i,
  /\b(?:bs|bachelor)\s*(?:in|of)?\s*(?:it|cs|ict|cpe|ece)\b/i,
  /\bgame\s*development\b/i,
  /\bdigital\s*(arts?|design|media)\b/i,
]

if (isTechnicalJob(job) && educationScore >= 90) {
  const field = String(userData.course_or_field || '')
  const fieldIsTechnical = field && TECHNICAL_FIELD_PATTERNS.some(p => p.test(field))
  if (!fieldIsTechnical) {
    educationScore = round(educationScore * 0.70)  // 100 → 70
  }
}
```

**Rule:** Empty `course_or_field` receives the penalty. The bonus is only granted on positive evidence of a relevant degree.

---

### 3. Tiered Experience Scoring

**Location:** `computeExperienceScore` in `_shared/deterministicScore.ts` and `src/services/matching/deterministicScore.js`.

Signature change: `computeExperienceScore(job, userData, opts = {})` where `opts` carries:
- `isTechnical: boolean` — whether the job is a technical role
- `hasCoreTechnicalSkill: boolean` — whether any required skill scored a rule-level hit (getRuleSignal ≥ 1) before semantic scoring

Adjacent-category score matrix:

| Scenario | Adjacent bonus |
|---|---|
| Non-technical job, adjacent category | 50 (unchanged) |
| Technical job, adjacent, has core skill rule-hit | 50 |
| Technical job, adjacent, no core skill rule-hit | 25 |
| No match (any job type) | 20 (unchanged) |
| Exact category match (any job type) | 100 (unchanged) |

`hasCoreTechnicalSkill` is computed in `match-jobs/index.ts` (and `matchingService.js`) as:
```
hasCoreTechnicalSkill = requiredSkills.some(
  skill => getRuleSignal(skill, userSkills, aliasMap) >= 1
)
```

This gate ensures only an explicit rule-level match (exact/partial/related from `matchRequirementToSkillSet`) satisfies the condition — semantic overlap does not.

---

### 4. Semantic Narrowing via Embedding Text Shaping

**Location:** `_shared/matchingText.ts` (and its client equivalent if one exists; client does not embed locally so the profile-text builder is the relevant half).

**Job text** (`buildJobText`) — repeat high-signal fields:
```
[title × 3, category, required_skills × 2, preferred_skills, description]
.filter(Boolean).join('\n')
```

**Profile text** (`buildProfileText`) — apply symmetric shaping:
```
[skills × 2, predefined_skills × 2, course_or_field × 2,
 work_experience_titles × 2, experience_categories,
 highest_education, certifications, bio/summary]
.filter(Boolean).join('\n')
```

`course_or_field` is over-weighted (×2) so degree-field similarity pulls the profile vector toward that domain — symmetrically addressing the same IT-context noise from the profile side.

**Implication:** Every `content_hash` changes on next request. `job_embeddings` and `profile_embeddings` re-embed lazily through `ensureJobEmbeddings` / `ensureProfileEmbedding`. One-time cost per entity.

---

### 5. Cache Invalidation + Version Bump

`MATCHER_VERSION`: `inferential-v9` → `inferential-v10`

This invalidates all `match_scores_cache` rows (the `versionedProfileHash` / `versionedJobHash` checks fail). Combined with embedding re-hash from Section 4, all scores recompute correctly on next request. No SQL migration required.

---

### 6. Tests

| File | Coverage |
|---|---|
| `src/services/matching/technicalRole.test.js` (new) | Category hits, title hits (positive + negative: "Sales Engineer", "Landscape Architect"), skill-content hits, all-miss case |
| `src/services/matching/deterministicScore.test.js` (extend) | `computeEducationScore`: technical + matching field → 100; technical + unrelated → 70; technical + empty → 70; non-technical + unrelated → 100 |
| `src/services/matching/deterministicScore.test.js` (extend) | `computeExperienceScore`: adjacent + technical + no core skill → 25; adjacent + technical + core skill → 50; adjacent + non-technical → 50 |
| New integration test | Synthetic profile ("Hardware Troubleshooting" only) vs. "React Developer" job → finalScore < 30; vs. "Technical Support" job → finalScore > 70 |

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/_shared/technicalRole.ts` | **New** — `isTechnicalJob`, `TECHNICAL_CATEGORIES`, `TITLE_PATTERNS` |
| `supabase/functions/_shared/deterministicScore.ts` | Export `HIGH_TIER_SKILL_PATTERNS`; field-of-study penalty in `computeEducationScore`; `opts` param in `computeExperienceScore` |
| `supabase/functions/_shared/matchingText.ts` | `buildJobText` and `buildProfileText` repetition shaping |
| `supabase/functions/match-jobs/index.ts` | Import `isTechnicalJob`; new blend + kill-switch; compute `hasCoreTechnicalSkill`; pass `opts` to `computeExperienceScore`; bump `MATCHER_VERSION` |
| `src/services/matching/technicalRole.js` | **New** — client mirror of `technicalRole.ts` |
| `src/services/matching/deterministicScore.js` | Mirror all server changes |
| `src/services/matchingService.js` | Mirror blend + kill-switch if local preview score is computed |
| `src/services/matching/technicalRole.test.js` | **New** — tests per Section 6 |
