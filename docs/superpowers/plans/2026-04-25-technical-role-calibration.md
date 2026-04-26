# Technical Role Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate "False Fair" matches where candidates with zero required technical skills score >50 by rebalancing weights, adding kill-switch caps, and shaping embedding text — all scoped to detected technical roles.

**Architecture:** A new `isTechnicalJob` helper (three-signal: category → title → skill content) gates two changes: (1) a reweighted blend (60% skill / 25% deterministic / 15% semantic) with hard score caps when skill match is zero, and (2) field-of-study and adjacent-category penalties inside `computeEducationScore`/`computeExperienceScore`. Embedding text is reshaped symmetrically for all jobs by repeating high-signal fields. The client mirrors every server change so local preview scores stay consistent. Cache invalidation happens automatically via a MATCHER_VERSION bump.

**Tech Stack:** TypeScript (Deno, Supabase Edge Functions), JavaScript (Vitest, React), Supabase Postgres match_scores_cache

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/functions/_shared/technicalRole.ts` | **Create** | `isTechnicalJob` — category + title + skill-content detection |
| `src/services/matching/technicalRole.js` | **Create** | Client mirror of `technicalRole.ts` |
| `src/services/matching/technicalRole.test.js` | **Create** | Vitest tests for client `isTechnicalJob` |
| `supabase/functions/_shared/deterministicScore.ts` | **Modify** | Export `HIGH_TIER_SKILL_PATTERNS`; field-of-study penalty; `computeExperienceScore` opts; `calculateDeterministicScore` passes opts internally |
| `src/services/matching/deterministicScore.js` | **Modify** | Mirror all server changes above |
| `src/services/matching/deterministicScore.test.js` | **Modify** | Add education + experience scoring tests |
| `supabase/functions/_shared/matchingText.ts` | **Modify** | `buildJobText` and `buildProfileText` repetition shaping |
| `supabase/functions/match-jobs/index.ts` | **Modify** | Import `isTechnicalJob`; new blend + kill-switch; bump `MATCHER_VERSION` |

---

## Task 1: Export HIGH_TIER_SKILL_PATTERNS and create client technicalRole module

**Files:**
- Modify: `src/services/matching/deterministicScore.js:465`
- Create: `src/services/matching/technicalRole.js`
- Create: `src/services/matching/technicalRole.test.js`

### Step 1.1 — Write failing tests for `isTechnicalJob`

Create `src/services/matching/technicalRole.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { isTechnicalJob } from './technicalRole'

describe('isTechnicalJob', () => {
  // --- Category check (A) ---
  it('returns true for exact category match (Information Technology)', () => {
    expect(isTechnicalJob({ category: 'Information Technology', title: '', required_skills: [] })).toBe(true)
  })

  it('returns true for exact category match (Software Development)', () => {
    expect(isTechnicalJob({ category: 'Software Development', title: 'Anything', required_skills: [] })).toBe(true)
  })

  it('returns false for non-technical category with no title/skill signal', () => {
    expect(isTechnicalJob({ category: 'Sales', title: 'Account Manager', required_skills: [] })).toBe(false)
  })

  // --- Title check (B) ---
  it('returns true for "React Developer" title', () => {
    expect(isTechnicalJob({ category: '', title: 'React Developer', required_skills: [] })).toBe(true)
  })

  it('returns true for "IT Support Specialist" title', () => {
    expect(isTechnicalJob({ category: '', title: 'IT Support Specialist', required_skills: [] })).toBe(true)
  })

  it('returns true for "Technical Support Representative" title', () => {
    expect(isTechnicalJob({ category: '', title: 'Technical Support Representative', required_skills: [] })).toBe(true)
  })

  it('returns true for "Software Engineer" (compound form)', () => {
    expect(isTechnicalJob({ category: '', title: 'Software Engineer', required_skills: [] })).toBe(true)
  })

  it('returns true for "Data Scientist" title', () => {
    expect(isTechnicalJob({ category: '', title: 'Data Scientist', required_skills: [] })).toBe(true)
  })

  it('returns true for "UX Designer" title', () => {
    expect(isTechnicalJob({ category: '', title: 'UX Designer', required_skills: [] })).toBe(true)
  })

  // --- Negative title cases (compound-only rule) ---
  it('returns false for "Sales Engineer" (bare engineer is NOT a trigger)', () => {
    expect(isTechnicalJob({ category: '', title: 'Sales Engineer', required_skills: [] })).toBe(false)
  })

  it('returns false for "Landscape Architect"', () => {
    expect(isTechnicalJob({ category: '', title: 'Landscape Architect', required_skills: [] })).toBe(false)
  })

  it('returns false for "Sales Representative"', () => {
    expect(isTechnicalJob({ category: '', title: 'Sales Representative', required_skills: [] })).toBe(false)
  })

  // --- Skill-content fallback (C) ---
  it('returns true when required_skills contains a programming keyword', () => {
    expect(isTechnicalJob({ category: '', title: 'Specialist', required_skills: ['Python programming', 'Git'] })).toBe(true)
  })

  it('returns true when required_skills contains "web development"', () => {
    expect(isTechnicalJob({ category: '', title: 'Specialist', required_skills: ['web development experience'] })).toBe(true)
  })

  it('returns false when only non-technical skills are listed', () => {
    expect(isTechnicalJob({ category: '', title: 'Cashier', required_skills: ['customer service', 'cash handling'] })).toBe(false)
  })

  // --- All-miss ---
  it('returns false when category, title, and skills give no signal', () => {
    expect(isTechnicalJob({ category: 'Food and Beverage', title: 'Barista', required_skills: ['coffee preparation'] })).toBe(false)
  })

  // --- Null safety ---
  it('returns false for empty job object', () => {
    expect(isTechnicalJob({})).toBe(false)
  })
})
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```bash
npx vitest run src/services/matching/technicalRole.test.js
```

Expected: FAIL — `Cannot find module './technicalRole'`

- [ ] **Step 1.3 — Export HIGH_TIER_SKILL_PATTERNS from deterministicScore.js**

In `src/services/matching/deterministicScore.js`, change line 465 from:

```js
const HIGH_TIER_SKILL_PATTERNS = [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\bphotoshop\b/i, /\billustrator\b/i, /\bfigma\b/i]
```

to:

```js
export const HIGH_TIER_SKILL_PATTERNS = [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\bphotoshop\b/i, /\billustrator\b/i, /\bfigma\b/i]
```

- [ ] **Step 1.4 — Create src/services/matching/technicalRole.js**

```js
import { HIGH_TIER_SKILL_PATTERNS } from './deterministicScore'

const TECHNICAL_CATEGORIES = new Set([
  'information technology',
  'it support',
  'software development',
  'engineering',
  'data',
  'cybersecurity',
  'devops',
  'design',
  'network',
  'systems administration',
])

const TITLE_PATTERNS = [
  /\b(?:software|data|systems?|network|cloud|security|devops|qa|test|hardware|firmware|embedded|backend|frontend|full[\s-]?stack|mobile|ios|android|web|machine\s*learning|ml|ai)\s+engineer\b/i,
  /\b(?:software|systems?|cloud|solutions?|data|enterprise|security)\s+architect\b/i,
  /\bdeveloper\b/i,
  /\bprogrammer\b/i,
  /\bcoder\b/i,
  /\bit\s*support\b/i,
  /\btechnical\s*support\b/i,
  /\bhelp\s*desk\b/i,
  /\bsysadmin\b/i,
  /\bsystem\s*administrator\b/i,
  /\bnetwork\s*admin/i,
  /\bdevops\b/i,
  /\bsre\b/i,
  /\bqa\b/i,
  /\btester\b/i,
  /\bdata\s*(scientist|analyst|engineer)\b/i,
  /\b(?:cyber)?security\b/i,
  /\b(?:web|frontend|backend|full[\s-]?stack|mobile|ios|android)\s*(?:dev|developer|engineer)?\b/i,
  /\b(?:ui|ux)\s+designer\b/i,
  /\b(?:product|web|graphic)\s+designer\b/i,
]

export const isTechnicalJob = (job = {}) => {
  // Check A: category allowlist
  const category = String(job.category || '').toLowerCase().trim()
  if (category && TECHNICAL_CATEGORIES.has(category)) return true

  // Check B: title keyword patterns
  const title = String(job.title || '').trim()
  if (title && TITLE_PATTERNS.some((p) => p.test(title))) return true

  // Check C: required_skills content against HIGH_TIER_SKILL_PATTERNS
  const skills = Array.isArray(job.required_skills) ? job.required_skills : []
  if (skills.some((s) => typeof s === 'string' && HIGH_TIER_SKILL_PATTERNS.some((p) => p.test(s)))) return true

  return false
}
```

- [ ] **Step 1.5 — Run tests to confirm they pass**

```bash
npx vitest run src/services/matching/technicalRole.test.js
```

Expected: All PASS

- [ ] **Step 1.6 — Commit**

```bash
git add src/services/matching/deterministicScore.js src/services/matching/technicalRole.js src/services/matching/technicalRole.test.js
git commit -m "feat: isTechnicalJob client module + export HIGH_TIER_SKILL_PATTERNS"
```

---

## Task 2: Create server-side technicalRole.ts

**Files:**
- Create: `supabase/functions/_shared/technicalRole.ts`
- Modify: `supabase/functions/_shared/deterministicScore.ts:440`

- [ ] **Step 2.1 — Export HIGH_TIER_SKILL_PATTERNS from server deterministicScore.ts**

In `supabase/functions/_shared/deterministicScore.ts`, change line 440 from:

```ts
const HIGH_TIER_SKILL_PATTERNS = [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\bphotoshop\b/i, /\billustrator\b/i, /\bfigma\b/i]
```

to:

```ts
export const HIGH_TIER_SKILL_PATTERNS = [/\bprogramming\b/i, /\bcoding\b/i, /\bsoftware\b/i, /\bweb development\b/i, /\bfrontend\b/i, /\bbackend\b/i, /\bfull stack\b/i, /\bgraphic design\b/i, /\bvisual design\b/i, /\bui\b/i, /\bux\b/i, /\bphotoshop\b/i, /\billustrator\b/i, /\bfigma\b/i]
```

- [ ] **Step 2.2 — Create supabase/functions/_shared/technicalRole.ts**

```ts
import { HIGH_TIER_SKILL_PATTERNS } from './deterministicScore.ts'

const TECHNICAL_CATEGORIES = new Set([
  'information technology',
  'it support',
  'software development',
  'engineering',
  'data',
  'cybersecurity',
  'devops',
  'design',
  'network',
  'systems administration',
])

const TITLE_PATTERNS = [
  /\b(?:software|data|systems?|network|cloud|security|devops|qa|test|hardware|firmware|embedded|backend|frontend|full[\s-]?stack|mobile|ios|android|web|machine\s*learning|ml|ai)\s+engineer\b/i,
  /\b(?:software|systems?|cloud|solutions?|data|enterprise|security)\s+architect\b/i,
  /\bdeveloper\b/i,
  /\bprogrammer\b/i,
  /\bcoder\b/i,
  /\bit\s*support\b/i,
  /\btechnical\s*support\b/i,
  /\bhelp\s*desk\b/i,
  /\bsysadmin\b/i,
  /\bsystem\s*administrator\b/i,
  /\bnetwork\s*admin/i,
  /\bdevops\b/i,
  /\bsre\b/i,
  /\bqa\b/i,
  /\btester\b/i,
  /\bdata\s*(scientist|analyst|engineer)\b/i,
  /\b(?:cyber)?security\b/i,
  /\b(?:web|frontend|backend|full[\s-]?stack|mobile|ios|android)\s*(?:dev|developer|engineer)?\b/i,
  /\b(?:ui|ux)\s+designer\b/i,
  /\b(?:product|web|graphic)\s+designer\b/i,
]

export const isTechnicalJob = (job: Record<string, unknown>): boolean => {
  // Check A: category allowlist
  const category = String(job.category ?? '').toLowerCase().trim()
  if (category && TECHNICAL_CATEGORIES.has(category)) return true

  // Check B: title keyword patterns
  const title = String(job.title ?? '').trim()
  if (title && TITLE_PATTERNS.some((p) => p.test(title))) return true

  // Check C: required_skills content against HIGH_TIER_SKILL_PATTERNS
  const skills = Array.isArray(job.required_skills) ? job.required_skills : []
  if (skills.some((s) => typeof s === 'string' && HIGH_TIER_SKILL_PATTERNS.some((p) => p.test(s)))) return true

  return false
}
```

- [ ] **Step 2.3 — Commit**

```bash
git add supabase/functions/_shared/technicalRole.ts supabase/functions/_shared/deterministicScore.ts
git commit -m "feat: isTechnicalJob server module + export HIGH_TIER_SKILL_PATTERNS"
```

---

## Task 3: Field-of-study penalty — tests first

**Files:**
- Modify: `src/services/matching/deterministicScore.test.js`

- [ ] **Step 3.1 — Add failing tests for field-of-study penalty**

Append to `src/services/matching/deterministicScore.test.js`:

```js
import { computeEducationScore } from './deterministicScore'

describe('computeEducationScore — field-of-study penalty', () => {
  const technicalJob = { title: 'React Developer', category: '', required_skills: [], education_level: 'College Graduate' }
  const nonTechnicalJob = { title: 'Cashier', category: '', required_skills: [], education_level: 'College Graduate' }

  const userWithTechField = {
    highest_education: 'College Graduate',
    course_or_field: 'Bachelor of Science in Computer Science',
  }
  const userWithUnrelatedField = {
    highest_education: 'College Graduate',
    course_or_field: 'Bachelor of Science in Tourism Management',
  }
  const userWithEmptyField = {
    highest_education: 'College Graduate',
    course_or_field: '',
  }
  const userWithNullField = {
    highest_education: 'College Graduate',
    course_or_field: null,
  }

  it('grants full education score (100) for technical job + technical degree field', () => {
    expect(computeEducationScore(technicalJob, userWithTechField)).toBe(100)
  })

  it('applies 0.7x penalty (→70) for technical job + unrelated degree field', () => {
    expect(computeEducationScore(technicalJob, userWithUnrelatedField)).toBe(70)
  })

  it('applies 0.7x penalty (→70) for technical job + empty course_or_field', () => {
    expect(computeEducationScore(technicalJob, userWithEmptyField)).toBe(70)
  })

  it('applies 0.7x penalty (→70) for technical job + null course_or_field', () => {
    expect(computeEducationScore(technicalJob, userWithNullField)).toBe(70)
  })

  it('does NOT apply penalty for non-technical job + unrelated field', () => {
    expect(computeEducationScore(nonTechnicalJob, userWithUnrelatedField)).toBe(100)
  })

  it('does NOT apply penalty for non-technical job + empty field', () => {
    expect(computeEducationScore(nonTechnicalJob, userWithEmptyField)).toBe(100)
  })
})
```

- [ ] **Step 3.2 — Run to confirm failure**

```bash
npx vitest run src/services/matching/deterministicScore.test.js
```

Expected: FAIL — new tests fail because penalty logic doesn't exist yet

---

## Task 4: Field-of-study penalty — client implementation

**Files:**
- Modify: `src/services/matching/deterministicScore.js:1062-1075`

- [ ] **Step 4.1 — Add import at top of deterministicScore.js**

Add at the very top of `src/services/matching/deterministicScore.js` (before existing imports or as first line):

```js
import { isTechnicalJob } from './technicalRole'
```

- [ ] **Step 4.2 — Add TECHNICAL_FIELD_PATTERNS constant**

Add after the existing `HIGH_TIER_SKILL_PATTERNS` line (after line 465):

```js
const TECHNICAL_FIELD_PATTERNS = [
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
```

- [ ] **Step 4.3 — Update computeEducationScore**

Replace `src/services/matching/deterministicScore.js:1062-1075`:

```js
export const computeEducationScore = (job, userData) => {
    const jobOrdinal = getJobEducationOrdinal(job.education_level)
    const userOrdinal = getUserEducationOrdinal(userData)
    let educationScore = 100
    if (jobOrdinal >= 0) {
        const diff = jobOrdinal - userOrdinal
        if (diff <= 0) educationScore = 100
        else if (diff <= 0.5) educationScore = 80
        else if (diff <= 1) educationScore = 60
        else if (diff <= 2) educationScore = 35
        else educationScore = 15
    }

    // Field-of-study penalty: technical jobs only grant full education credit
    // when the candidate's degree is in a relevant technical field.
    // Empty or null course_or_field is treated as unrelated (no positive evidence).
    if (isTechnicalJob(job) && educationScore >= 90) {
        const field = String(userData.course_or_field || '')
        const fieldIsTechnical = field.length > 0 && TECHNICAL_FIELD_PATTERNS.some((p) => p.test(field))
        if (!fieldIsTechnical) {
            educationScore = Math.round(educationScore * 0.7)
        }
    }

    return educationScore
}
```

- [ ] **Step 4.4 — Run tests to confirm they pass**

```bash
npx vitest run src/services/matching/deterministicScore.test.js
```

Expected: All PASS

- [ ] **Step 4.5 — Commit**

```bash
git add src/services/matching/deterministicScore.js src/services/matching/deterministicScore.test.js
git commit -m "feat: field-of-study penalty for technical jobs in computeEducationScore (client)"
```

---

## Task 5: Field-of-study penalty — server implementation

**Files:**
- Modify: `supabase/functions/_shared/deterministicScore.ts`

- [ ] **Step 5.1 — Add import at top of deterministicScore.ts**

Add after existing imports at the top of `supabase/functions/_shared/deterministicScore.ts`:

```ts
import { isTechnicalJob } from './technicalRole.ts'
```

- [ ] **Step 5.2 — Add TECHNICAL_FIELD_PATTERNS constant**

Add after the `HIGH_TIER_SKILL_PATTERNS` line (after line 440) in `supabase/functions/_shared/deterministicScore.ts`:

```ts
const TECHNICAL_FIELD_PATTERNS = [
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
```

- [ ] **Step 5.3 — Update server computeEducationScore**

Locate `export const computeEducationScore` in `supabase/functions/_shared/deterministicScore.ts` and replace the full function body:

```ts
export const computeEducationScore = (job, userData) => {
  const jobOrdinal = getJobEducationOrdinal(job.education_level)
  const userOrdinal = getUserEducationOrdinal(userData)
  let educationScore = 100
  if (jobOrdinal >= 0) {
    const diff = jobOrdinal - userOrdinal
    if (diff <= 0) educationScore = 100
    else if (diff <= 0.5) educationScore = 80
    else if (diff <= 1) educationScore = 60
    else if (diff <= 2) educationScore = 35
    else educationScore = 15
  }

  if (isTechnicalJob(job) && educationScore >= 90) {
    const field = String(userData.course_or_field ?? '')
    const fieldIsTechnical = field.length > 0 && TECHNICAL_FIELD_PATTERNS.some((p) => p.test(field))
    if (!fieldIsTechnical) {
      educationScore = Math.round(educationScore * 0.7)
    }
  }

  return educationScore
}
```

- [ ] **Step 5.4 — Commit**

```bash
git add supabase/functions/_shared/deterministicScore.ts
git commit -m "feat: field-of-study penalty for technical jobs in computeEducationScore (server)"
```

---

## Task 6: Tiered experience scoring — tests first

**Files:**
- Modify: `src/services/matching/deterministicScore.test.js`

- [ ] **Step 6.1 — Add failing tests for tiered experience scoring**

Append to `src/services/matching/deterministicScore.test.js`:

```js
import { computeExperienceScore } from './deterministicScore'

describe('computeExperienceScore — tiered adjacent bonus', () => {
  // "Software Development" is adjacent to "Information Technology" in ADJACENT_CATEGORIES
  const technicalJob = { title: 'React Developer', category: 'Software Development', required_skills: [], experience_level: '' }
  const nonTechnicalJob = { title: 'Store Clerk', category: 'Retail', required_skills: [], experience_level: '' }

  const userAdjacentCategory = { experience_categories: ['Information Technology'], work_experiences: [] }
  const userExactCategory = { experience_categories: ['Software Development'], work_experiences: [] }
  const userNoCategory = { experience_categories: [], work_experiences: [] }

  it('grants 100 for exact category match (any job type)', () => {
    expect(computeExperienceScore(technicalJob, userExactCategory, { isTechnical: true, hasCoreTechnicalSkill: false })).toBe(100)
  })

  it('grants 50 for adjacent + technical + has core skill rule-hit', () => {
    expect(computeExperienceScore(technicalJob, userAdjacentCategory, { isTechnical: true, hasCoreTechnicalSkill: true })).toBe(50)
  })

  it('grants 25 for adjacent + technical + NO core skill rule-hit', () => {
    expect(computeExperienceScore(technicalJob, userAdjacentCategory, { isTechnical: true, hasCoreTechnicalSkill: false })).toBe(25)
  })

  it('grants 50 for adjacent + non-technical (unchanged behavior)', () => {
    expect(computeExperienceScore(nonTechnicalJob, userAdjacentCategory, { isTechnical: false, hasCoreTechnicalSkill: false })).toBe(50)
  })

  it('grants 20 for no category match (any job type)', () => {
    expect(computeExperienceScore(technicalJob, userNoCategory, { isTechnical: true, hasCoreTechnicalSkill: false })).toBe(20)
  })

  it('accepts no opts argument (backward compatible — defaults to non-technical behavior)', () => {
    // Without opts, must not crash and returns a number
    const score = computeExperienceScore(nonTechnicalJob, userAdjacentCategory)
    expect(typeof score).toBe('number')
    expect(score).toBe(50)
  })
})
```

- [ ] **Step 6.2 — Run to confirm failure**

```bash
npx vitest run src/services/matching/deterministicScore.test.js
```

Expected: FAIL — new tests fail because `opts` param doesn't exist yet and adjacent-technical cap is not implemented

---

## Task 7: Tiered experience scoring — client implementation

**Files:**
- Modify: `src/services/matching/deterministicScore.js:1024-1060`

- [ ] **Step 7.1 — Update computeExperienceScore signature and adjacent logic**

Replace `src/services/matching/deterministicScore.js:1024-1060`:

```js
export const computeExperienceScore = (job, userData, opts = {}) => {
    const { isTechnical = false, hasCoreTechnicalSkill = false } = opts
    const userCategories = (userData.experience_categories || []).map(c => normalizeCategoryKey(c))
    const jobCategory = normalizeCategoryKey(job.category || '')

    let experienceScore = 100
    if (jobCategory) {
        if (userCategories.includes(jobCategory)) {
            experienceScore = 100
        } else {
            const adjacent = ADJACENT_CATEGORIES[jobCategory] || []
            const hasAdjacent = userCategories.some(c => adjacent.includes(c))
            if (hasAdjacent) {
                if (isTechnical) {
                    // Adjacent bonus halved when no rule-level technical skill hit exists.
                    // Prevents "IT background" from masking a hard skill mismatch.
                    experienceScore = hasCoreTechnicalSkill ? 50 : 25
                } else {
                    experienceScore = 50
                }
            } else {
                experienceScore = 20
            }
        }
    }

    const jobExpLevel = (job.experience_level || '').toLowerCase()
    if (jobExpLevel && userData.work_experiences?.length > 0) {
        const totalYears = userData.work_experiences.reduce((sum, w) => {
            const dur = (w.duration || w.years || '').toString().toLowerCase()
            const yearMatch = dur.match(/(\d+)\s*(?:year|yr|y)/i)
            const monthMatch = dur.match(/(\d+)\s*(?:month|mo|m)/i)
            return sum + (yearMatch ? parseInt(yearMatch[1]) : 0) + (monthMatch ? parseInt(monthMatch[1]) / 12 : 0)
        }, 0)

        const requiredYears = jobExpLevel === 'entry' ? 0
            : jobExpLevel === 'mid' ? 2
            : jobExpLevel === 'senior' ? 5
            : 0

        if (requiredYears > 0 && totalYears > 0) {
            const yearRatio = Math.min(1, totalYears / requiredYears)
            experienceScore = Math.round(experienceScore * 0.6 + yearRatio * 100 * 0.4)
        }
    }

    return experienceScore
}
```

- [ ] **Step 7.2 — Update calculateDeterministicScore to pass opts to sub-functions**

In `src/services/matching/deterministicScore.js`, locate `calculateDeterministicScore` (around line 1084) and update the calls inside it:

```js
export const calculateDeterministicScore = (job, userData) => {
    const skills = toSkillList(userData)
    const aliases = userData.skill_aliases || {}
    const requirements = (job.requirements || job.required_skills || []).filter(Boolean)

    const classified = classifyRequirements(requirements, skills, aliases, userData, job)

    // Derive opts for sub-functions: isTechnicalJob detects the role type;
    // hasCoreTechnicalSkill is true when any required skill has a rule-level hit.
    const isTechnical = isTechnicalJob(job)
    const hasCoreTechnicalSkill = classified.matchingSkills.length > 0

    const experienceScore = computeExperienceScore(job, userData, { isTechnical, hasCoreTechnicalSkill })
    const educationScore = computeEducationScore(job, userData)
    // ... rest of the function unchanged from here ...
```

> Note: Only the first ~5 lines change (add the two consts, update `computeExperienceScore` call). Everything after `const educationScore` stays identical to the current code.

- [ ] **Step 7.3 — Run tests to confirm they all pass**

```bash
npx vitest run src/services/matching/deterministicScore.test.js
```

Expected: All PASS

- [ ] **Step 7.4 — Commit**

```bash
git add src/services/matching/deterministicScore.js src/services/matching/deterministicScore.test.js
git commit -m "feat: tiered experience adjacent bonus for technical roles (client)"
```

---

## Task 8: Tiered experience scoring — server implementation

**Files:**
- Modify: `supabase/functions/_shared/deterministicScore.ts:998-1034` (computeExperienceScore)
- Modify: `supabase/functions/_shared/deterministicScore.ts` (calculateDeterministicScore)

- [ ] **Step 8.1 — Update server computeExperienceScore**

Locate `export const computeExperienceScore` in `supabase/functions/_shared/deterministicScore.ts` and replace in full:

```ts
export const computeExperienceScore = (job, userData, opts: { isTechnical?: boolean; hasCoreTechnicalSkill?: boolean } = {}) => {
  const { isTechnical = false, hasCoreTechnicalSkill = false } = opts
  const userCategories = (userData.experience_categories || []).map((c) => normalizeCategoryKey(c))
  const jobCategory = normalizeCategoryKey(job.category || '')

  let experienceScore = 100
  if (jobCategory) {
    if (userCategories.includes(jobCategory)) {
      experienceScore = 100
    } else {
      const adjacent = ADJACENT_CATEGORIES[jobCategory] || []
      const hasAdjacent = userCategories.some((c) => adjacent.includes(c))
      if (hasAdjacent) {
        if (isTechnical) {
          experienceScore = hasCoreTechnicalSkill ? 50 : 25
        } else {
          experienceScore = 50
        }
      } else {
        experienceScore = 20
      }
    }
  }

  const jobExpLevel = (job.experience_level || '').toLowerCase()
  if (jobExpLevel && userData.work_experiences?.length > 0) {
    const totalYears = userData.work_experiences.reduce((sum, experience) => {
      const duration = (experience.duration || experience.years || '').toString().toLowerCase()
      const yearMatch = duration.match(/(\d+)\s*(?:year|yr|y)/i)
      const monthMatch = duration.match(/(\d+)\s*(?:month|mo|m)/i)
      return sum + (yearMatch ? parseInt(yearMatch[1]) : 0) + (monthMatch ? parseInt(monthMatch[1]) / 12 : 0)
    }, 0)

    const requiredYears = jobExpLevel === 'entry' ? 0
      : jobExpLevel === 'mid' ? 2
      : jobExpLevel === 'senior' ? 5
      : 0

    if (requiredYears > 0 && totalYears > 0) {
      const yearRatio = Math.min(1, totalYears / requiredYears)
      experienceScore = Math.round(experienceScore * 0.6 + yearRatio * 100 * 0.4)
    }
  }

  return experienceScore
}
```

- [ ] **Step 8.2 — Update server calculateDeterministicScore**

Locate `calculateDeterministicScore` in `supabase/functions/_shared/deterministicScore.ts` (around line 1064) and update the first section to compute opts and pass them:

```ts
export const calculateDeterministicScore = (job, userData) => {
  // ...existing classified/requirements setup unchanged...
  const isTechnical = isTechnicalJob(job)
  const hasCoreTechnicalSkill = classified.matchingSkills.length > 0

  const experienceScore = computeExperienceScore(job, userData, { isTechnical, hasCoreTechnicalSkill })
  const educationScore = computeEducationScore(job, userData)
  // ...rest unchanged...
```

- [ ] **Step 8.3 — Commit**

```bash
git add supabase/functions/_shared/deterministicScore.ts
git commit -m "feat: tiered experience adjacent bonus for technical roles (server)"
```

---

## Task 9: Semantic narrowing — reshape buildJobText and buildProfileText

**Files:**
- Modify: `supabase/functions/_shared/matchingText.ts:147-200`

- [ ] **Step 9.1 — Update buildJobText with repetition shaping**

Replace `export const buildJobText` in `supabase/functions/_shared/matchingText.ts`:

```ts
export const buildJobText = (job: Record<string, unknown>) => {
  const str = (key: string, fallback = 'Not specified') => {
    const v = job[key]
    return typeof v === 'string' && v.trim() ? v.trim() : fallback
  }

  const title = str('title', '')
  const category = str('category')
  const requiredSkillsText = normalizeRequirements(job).join(', ') || 'None specified'
  const preferredSkillsText = stringifyList(job.preferred_skills, 'None')

  // Title × 3 and required skills × 2: repetition shifts the pooled
  // embedding toward high-signal fields, suppressing IT-context noise
  // from descriptions that mention computers without being technical roles.
  return [
    title && `Job title: ${title}`,
    title && `Job title: ${title}`,
    title && `Job title: ${title}`,
    `Category: ${category}`,
    `Requirements: ${requiredSkillsText}`,
    `Requirements: ${requiredSkillsText}`,
    `Preferred skills: ${preferredSkillsText}`,
    `Job summary: ${str('job_summary', str('description', 'Not provided'))}`,
    `Key responsibilities: ${str('key_responsibilities', 'Not specified')}`,
    `Required languages: ${stringifyList(job.required_languages, 'Not specified')}`,
    `Licenses & certifications: ${str('licenses_certifications', 'None')}`,
    `Experience level: ${str('experience_level', 'Any')}`,
    `Education level: ${str('education_level', 'None')}`,
    `Employment type: ${str('type')}`,
    `Work arrangement: ${str('work_arrangement')}`,
    `Location: ${str('location')}`,
  ].filter(Boolean).join('\n')
}
```

- [ ] **Step 9.2 — Update buildProfileText with symmetric repetition shaping**

Replace `export const buildProfileText` in `supabase/functions/_shared/matchingText.ts`:

```ts
export const buildProfileText = (profile: Record<string, unknown>) => {
  const predefinedSkills = Array.isArray(profile.predefined_skills) ? profile.predefined_skills : []
  const customSkills = Array.isArray(profile.skills) ? profile.skills : []
  const mergedSkills = [...predefinedSkills, ...customSkills]
  const skillsText = stringifyList(mergedSkills, 'Not specified')

  // Mirror the job-side shaping: skills × 2 and course_or_field × 2
  // ensure the profile vector is pulled toward domain-specific features,
  // not diluted by location/salary metadata.
  const courseField = typeof profile.course_or_field === 'string' && profile.course_or_field.trim()
    ? profile.course_or_field.trim()
    : null

  const experienceTitles = stringifyExperiences(profile.work_experiences)

  return [
    `Skills: ${skillsText}`,
    `Skills: ${skillsText}`,
    `Work experience: ${experienceTitles}`,
    `Work experience: ${experienceTitles}`,
    courseField && `Course or field: ${courseField}`,
    courseField && `Course or field: ${courseField}`,
    `Preferred occupations: ${stringifyList(profile.preferred_occupations, 'Not specified')}`,
    `Preferred job types: ${stringifyList(profile.preferred_job_type, 'Not specified')}`,
    `Experience categories: ${stringifyList(profile.experience_categories, 'Not specified')}`,
    `Employment status: ${typeof profile.employment_status === 'string' ? profile.employment_status.trim() : 'Not specified'}`,
    `Education: ${typeof profile.highest_education === 'string' ? profile.highest_education.trim() : 'Not specified'}`,
    `Languages: ${stringifyLanguages(profile.languages)}`,
    `Certifications: ${stringifyList(profile.certifications, 'None')}`,
    `Professional licenses: ${stringifyLicenses(profile.professional_licenses)}`,
    `Vocational training: ${stringifyTraining(profile.vocational_training)}`,
    `Portfolio: ${typeof profile.portfolio_url === 'string' && profile.portfolio_url.trim() ? profile.portfolio_url.trim() : 'None'}`,
  ].filter(Boolean).join('\n')
}
```

- [ ] **Step 9.3 — Commit**

```bash
git add supabase/functions/_shared/matchingText.ts
git commit -m "feat: buildJobText/buildProfileText repetition shaping for semantic narrowing"
```

---

## Task 10: New blend + kill-switch + MATCHER_VERSION bump in match-jobs/index.ts

**Files:**
- Modify: `supabase/functions/match-jobs/index.ts`

- [ ] **Step 10.1 — Add import for isTechnicalJob**

At the top of `supabase/functions/match-jobs/index.ts`, add to the import block:

```ts
import { isTechnicalJob } from '../_shared/technicalRole.ts'
```

- [ ] **Step 10.2 — Bump MATCHER_VERSION**

Change line 30:

```ts
const MATCHER_VERSION = 'inferential-v10'
```

- [ ] **Step 10.3 — Replace the blend block**

Locate the blend block starting at line 1004 (`const blendedScore = Math.min(...`). Replace lines 1004–1014 with:

```ts
      const isTechnical = isTechnicalJob(item.job)

      const weights = isTechnical
        ? { deterministic: 0.25, hybrid: 0.60, semantic: 0.15 }
        : { deterministic: 0.50, hybrid: 0.30, semantic: 0.20 }

      let blendedScore = Math.min(
        100,
        Math.round(
          deterministicScore * weights.deterministic +
          hybridSkillScore   * weights.hybrid +
          semanticScore      * weights.semantic,
        ) + preferredBonus,
      )

      // Technical kill-switch: prevent "False Fair" matches where a candidate
      // has zero relevant skills but high education/semantic scores.
      if (isTechnical) {
        if (hybridSkillScore === 0)       blendedScore = Math.min(blendedScore, 25)
        else if (hybridSkillScore < 30)   blendedScore = Math.min(blendedScore, 40)
      }

      const baseFinalScore = isLowDensityJob
        ? Math.min(blendedScore, 55)
        : confidenceScore < 0.35
          ? Math.min(blendedScore, 55)
          : confidenceScore < 0.7
            ? Math.round(blendedScore * 0.92)
            : blendedScore
```

- [ ] **Step 10.4 — Commit**

```bash
git add supabase/functions/match-jobs/index.ts
git commit -m "feat: technical role blend (60/25/15), kill-switch caps, MATCHER_VERSION v10"
```

---

## Task 11: Integration test — headline success metric

**Files:**
- Create: `src/services/matching/technicalRoleIntegration.test.js`

This test exercises the full client-side deterministic scoring pipeline using a synthetic profile with only hardware skills.

- [ ] **Step 11.1 — Create integration test**

Create `src/services/matching/technicalRoleIntegration.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { calculateDeterministicScore } from './deterministicScore'

// Synthetic profile: only "Hardware Troubleshooting" — zero software skills
const hardwareProfile = {
  predefined_skills: ['Hardware Troubleshooting'],
  skills: [],
  skill_aliases: {},
  work_experiences: [],
  experience_categories: ['IT Support'],
  highest_education: 'College Graduate',
  course_or_field: '',
  languages: [],
  date_of_birth: null,
}

const reactDeveloperJob = {
  title: 'React Developer',
  category: 'Software Development',
  requirements: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'],
  required_skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git'],
  preferred_skills: ['TypeScript', 'Node.js'],
  experience_level: 'mid',
  education_level: 'College Graduate',
}

const technicalSupportJob = {
  title: 'Technical Support Representative',
  category: 'IT Support',
  requirements: ['Hardware Troubleshooting', 'Customer Service', 'Computer Literacy'],
  required_skills: ['Hardware Troubleshooting', 'Customer Service', 'Computer Literacy'],
  preferred_skills: [],
  experience_level: 'entry',
  education_level: 'College Graduate',
}

describe('headline success metric — Hardware candidate vs technical roles', () => {
  it('scores < 40 against React Developer (deterministic layer only)', () => {
    // Note: The full final_score includes semantic and hybridSkill components
    // which are computed server-side. This tests the deterministic baseline
    // (deterministicScore) which is the local-preview signal.
    // The full server-side score is capped at 25 via the kill-switch when
    // hybridSkillScore === 0 (React, JS, etc. have zero rule-level match).
    const result = calculateDeterministicScore(reactDeveloperJob, hardwareProfile)
    expect(result.matchScore).toBeLessThan(40)
  })

  it('scores > 50 against Technical Support (deterministic layer only)', () => {
    const result = calculateDeterministicScore(technicalSupportJob, hardwareProfile)
    expect(result.matchScore).toBeGreaterThan(50)
  })

  it('React Developer match has Hardware Troubleshooting in missingSkills', () => {
    const result = calculateDeterministicScore(reactDeveloperJob, hardwareProfile)
    // React, JavaScript, CSS, HTML, Git should all be missing
    expect(result.missingSkills.some((s) => /react/i.test(s))).toBe(true)
    expect(result.missingSkills.some((s) => /javascript/i.test(s))).toBe(true)
  })

  it('Technical Support match has Hardware Troubleshooting in matchingSkills', () => {
    const result = calculateDeterministicScore(technicalSupportJob, hardwareProfile)
    expect(result.matchingSkills.some((s) => /hardware/i.test(s))).toBe(true)
  })
})
```

- [ ] **Step 11.2 — Run integration tests**

```bash
npx vitest run src/services/matching/technicalRoleIntegration.test.js
```

Expected: All PASS

- [ ] **Step 11.3 — Run the full test suite to check for regressions**

```bash
npx vitest run src/services/matching/
```

Expected: All PASS, no regressions in `deterministicScore.test.js`, `technicalRole.test.js`, `uiMatcher.test.js`, `jobDetailMatch.test.js`

- [ ] **Step 11.4 — Final commit**

```bash
git add src/services/matching/technicalRoleIntegration.test.js
git commit -m "test: headline success-metric integration test for technical role calibration"
```
