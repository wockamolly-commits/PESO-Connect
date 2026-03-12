# Hybrid Deterministic Match Scoring — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual-AI-call scoring system with a deterministic scoring function that guarantees consistent match scores across job listings and job detail pages.

**Architecture:** AI expands user skills into semantic aliases at profile save time (stored in DB). A pure JS function scores all jobs instantly using those aliases — same function on both pages. AI is still used on-demand for qualitative detail text only.

**Tech Stack:** React, Supabase (PostgreSQL), Cohere API (Command R+), Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-hybrid-match-scoring-design.md`

---

## Chunk 0: Fix Stale Tests (Prerequisite)

### Task 0: Update existing test file for current Cohere API

The existing `src/services/geminiService.test.js` was written for the old Gemini API and references a non-existent `batchCalculateMatches` export. Fix this first so the test suite is green before adding new tests.

**Files:**
- Modify: `src/services/geminiService.test.js`

- [ ] **Step 1: Update mock helper and imports for Cohere API**

The test file's `mockGeminiResponse` returns Gemini's response shape (`candidates[0].content.parts[0].text`), but the service now uses Cohere (`message.content[0].text`). Also, `batchCalculateMatches` no longer exists — the current export is `scoreAllJobs`.

In `src/services/geminiService.test.js`:

1. Update the `beforeAll` import (line 8-18) — replace `batchCalculateMatches` with `scoreAllJobs`:
```js
  let analyzeResume, calculateJobMatch, scoreAllJobs, quickExtractSkills
  beforeAll(async () => {
    vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    vi.resetModules()
    const mod = await import('./geminiService')
    analyzeResume = mod.analyzeResume
    calculateJobMatch = mod.calculateJobMatch
    scoreAllJobs = mod.scoreAllJobs
    quickExtractSkills = mod.quickExtractSkills
  })
```

2. Replace `mockGeminiResponse` (lines 25-36) with a Cohere-compatible mock:
```js
  function mockCohereResponse(text) {
    return {
      ok: true,
      json: () => Promise.resolve({
        message: { content: [{ text }] }
      })
    }
  }
```

3. Update all `mockFetch.mockResolvedValue(mockGeminiResponse(...))` calls to use `mockCohereResponse(...)`.

4. Update error expectation messages if they changed (e.g., the API key env var is now `VITE_COHERE_API_KEY`).

5. Rename the `batchCalculateMatches` describe block (lines 131-170) to `scoreAllJobs` and update the function reference.

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: All existing tests PASS with updated mocks

- [ ] **Step 3: Commit**

```bash
git add src/services/geminiService.test.js
git commit -m "fix: update geminiService tests for Cohere API"
```

---

## Chunk 1: Deterministic Scoring Function + Tests

### Task 1: Add `calculateDeterministicScore` to geminiService

**Files:**
- Modify: `src/services/geminiService.js` (add new exported function and helpers after line 206)
- Test: `src/services/geminiService.test.js`

- [ ] **Step 1: Write failing tests for the deterministic scoring function**

Add a new `describe('calculateDeterministicScore')` block at the end of `src/services/geminiService.test.js`:

```js
describe('calculateDeterministicScore', () => {
  let calculateDeterministicScore

  beforeAll(async () => {
    vi.resetModules()
    const mod = await import('./geminiService')
    calculateDeterministicScore = mod.calculateDeterministicScore
  })

  it('scores 100% when all requirements match exactly', () => {
    const job = {
      requirements: ['Plumbing', 'Pipe Fitting'],
      category: 'trades',
      education_level: 'vocational',
    }
    const userData = {
      skills: [{ name: 'Plumbing' }, { name: 'Pipe Fitting' }],
      skill_aliases: { 'Plumbing': ['Pipe Work'], 'Pipe Fitting': ['Pipe Installation'] },
      experience_categories: ['trades'],
      highest_education: 'Vocational/Technical Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    expect(result.matchScore).toBe(100)
    expect(result.matchLevel).toBe('Excellent')
    expect(result.matchingSkills).toEqual(['Plumbing', 'Pipe Fitting'])
    expect(result.missingSkills).toEqual([])
  })

  it('matches via aliases (semantic matching)', () => {
    const job = {
      requirements: ['Metal Fabrication'],
      category: 'trades',
      education_level: null,
    }
    const userData = {
      skills: [{ name: 'Welding' }],
      skill_aliases: { 'Welding': ['Metal Fabrication', 'Arc Welding', 'SMAW'] },
      experience_categories: ['trades'],
      highest_education: 'High School Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    expect(result.matchScore).toBeGreaterThanOrEqual(80)
    expect(result.matchingSkills).toContain('Metal Fabrication')
  })

  it('uses word-boundary matching not raw substring', () => {
    const job = {
      requirements: ['Hospitality Management'],
      category: 'hospitality',
      education_level: null,
    }
    const userData = {
      skills: [{ name: 'IT Support' }],
      skill_aliases: { 'IT Support': ['IT', 'Technical Support'] },
      experience_categories: ['it'],
      highest_education: 'College Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // IT should NOT match Hospitality Management
    expect(result.matchingSkills).not.toContain('Hospitality Management')
  })

  it('returns skillScore=100 when job has no requirements', () => {
    const job = { requirements: [], category: 'trades', education_level: null }
    const userData = {
      skills: [{ name: 'Welding' }],
      skill_aliases: {},
      experience_categories: ['trades'],
      highest_education: 'High School Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // skills=100, exp=100, edu=100 → 100
    expect(result.matchScore).toBe(100)
  })

  it('gives experienceScore=20 when category does not match', () => {
    const job = {
      requirements: ['Cooking'],
      category: 'hospitality',
      education_level: null,
    }
    const userData = {
      skills: [{ name: 'Cooking' }],
      skill_aliases: { 'Cooking': ['Food Preparation'] },
      experience_categories: ['trades'],
      highest_education: 'College Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // skills=100, exp=20, edu=100 → 50+6+20=76
    expect(result.matchScore).toBe(76)
    expect(result.matchLevel).toBe('Good')
  })

  it('scores education correctly when user is below requirement', () => {
    const job = {
      requirements: ['Plumbing'],
      category: 'trades',
      education_level: 'college',
    }
    const userData = {
      skills: [{ name: 'Plumbing' }],
      skill_aliases: {},
      experience_categories: ['trades'],
      highest_education: 'High School Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // skills=100, exp=100, edu=30 (2+ levels below) → 50+30+6=86
    expect(result.matchScore).toBe(86)
  })

  it('scores education=60 when user is one level below', () => {
    const job = {
      requirements: ['Plumbing'],
      category: 'trades',
      education_level: 'college',
    }
    const userData = {
      skills: [{ name: 'Plumbing' }],
      skill_aliases: {},
      experience_categories: ['trades'],
      highest_education: 'College Undergraduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // skills=100, exp=100, edu=60 → 50+30+12=92
    expect(result.matchScore).toBe(92)
  })

  it('handles null skill_aliases gracefully (pre-migration user)', () => {
    const job = {
      requirements: ['Plumbing', 'Electrical'],
      category: 'trades',
      education_level: null,
    }
    const userData = {
      skills: [{ name: 'Plumbing' }],
      skill_aliases: null,
      experience_categories: null,
      highest_education: 'High School Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // skills: 1/2=50, exp: null categories → 20, edu: no req → 100
    // 25 + 6 + 20 = 51
    expect(result.matchScore).toBe(51)
    expect(result.matchLevel).toBe('Fair')
  })

  it('handles string skills (not objects)', () => {
    const job = { requirements: ['Welding'], category: 'trades', education_level: null }
    const userData = {
      skills: ['Welding', 'Plumbing'],
      skill_aliases: null,
      experience_categories: ['trades'],
      highest_education: 'High School Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    expect(result.matchingSkills).toContain('Welding')
  })

  it('handles null requirements gracefully', () => {
    const job = { requirements: null, category: 'trades', education_level: null }
    const userData = {
      skills: [{ name: 'Welding' }],
      skill_aliases: {},
      experience_categories: ['trades'],
      highest_education: 'High School Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    expect(result.matchScore).toBe(100)
  })

  it('defaults to ordinal 0 for unknown highest_education', () => {
    const job = {
      requirements: ['Plumbing'],
      category: 'trades',
      education_level: 'college',
    }
    const userData = {
      skills: [{ name: 'Plumbing' }],
      skill_aliases: {},
      experience_categories: ['trades'],
      highest_education: 'Some Unknown Value',
    }
    const result = calculateDeterministicScore(job, userData)
    // edu ordinal 0 vs college ordinal 3 → diff=3 → edu=30
    // skills=100, exp=100, edu=30 → 50+30+6=86
    expect(result.matchScore).toBe(86)
  })

  it('returns 0 score when user has no matching skills and wrong category', () => {
    const job = {
      requirements: ['Cooking', 'Baking', 'Food Prep'],
      category: 'hospitality',
      education_level: 'college',
    }
    const userData = {
      skills: [{ name: 'Welding' }],
      skill_aliases: { 'Welding': ['Metal Work'] },
      experience_categories: ['trades'],
      highest_education: 'Elementary Graduate',
    }
    const result = calculateDeterministicScore(job, userData)
    // skills=0, exp=20, edu=30 → 0+6+6=12
    expect(result.matchScore).toBe(12)
    expect(result.matchLevel).toBe('Low')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: FAIL — `calculateDeterministicScore` is not exported

- [ ] **Step 3: Implement `calculateDeterministicScore` in geminiService.js**

Add after the `normalizeEducationLevel` function (after line 206) in `src/services/geminiService.js`:

```js
// --- Education ordinal maps for deterministic scoring ---
const JOB_EDUCATION_ORDINAL = {
    'none': -1,
    'elementary': 0,
    'high-school': 1,
    'vocational': 2,
    'college': 3,
}

const USER_EDUCATION_ORDINAL = {
    'Elementary Graduate': 0,
    'High School Graduate': 1,
    'Senior High School Graduate': 1.5,
    'Vocational/Technical Graduate': 2,
    'College Undergraduate': 2.5,
    'College Graduate': 3,
    'Masteral Degree': 4,
    'Doctoral Degree': 5,
}

/**
 * Check if two skill strings match using word-boundary logic.
 * Returns true if they are an exact match (case-insensitive) or
 * one is a full word within the other (min 3 chars for partial).
 */
const skillMatches = (a, b) => {
    const la = a.toLowerCase().trim()
    const lb = b.toLowerCase().trim()
    if (la === lb) return true
    // For partial matching, both must be >= 3 chars
    if (la.length < 3 || lb.length < 3) return false
    // Word-boundary match: check if shorter is a full word in longer
    const [shorter, longer] = la.length <= lb.length ? [la, lb] : [lb, la]
    const regex = new RegExp(`\\b${shorter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    return regex.test(longer)
}

/**
 * Pure deterministic match score. No AI, no randomness.
 * Same function used on both JobListings and JobDetail pages.
 *
 * @param {Object} job - job_postings row
 * @param {Object} userData - merged user data (includes skill_aliases, experience_categories, highest_education)
 * @returns {{ matchScore, matchLevel, matchingSkills, missingSkills }}
 */
export const calculateDeterministicScore = (job, userData) => {
    const skills = (userData.skills || []).map(s => typeof s === 'string' ? s : s.name)
    const aliases = userData.skill_aliases || {}
    const requirements = (job.requirements || job.required_skills || []).filter(Boolean)

    // --- Skills (50%) ---
    let skillScore = 100
    const matchingSkills = []
    const missingSkills = []

    if (requirements.length > 0) {
        for (const req of requirements) {
            let matched = false
            for (const skill of skills) {
                // Check skill name directly
                if (skillMatches(req, skill)) { matched = true; break }
                // Check aliases for this skill
                const skillAliases = aliases[skill] || []
                for (const alias of skillAliases) {
                    if (skillMatches(req, alias)) { matched = true; break }
                }
                if (matched) break
            }
            if (matched) matchingSkills.push(req)
            else missingSkills.push(req)
        }
        skillScore = (matchingSkills.length / requirements.length) * 100
    }

    // --- Experience (30%) ---
    const userCategories = (userData.experience_categories || []).map(c => c.toLowerCase())
    const jobCategory = (job.category || '').toLowerCase()
    let experienceScore = 100
    if (jobCategory) {
        experienceScore = userCategories.includes(jobCategory) ? 100 : 20
    }

    // --- Education (20%) ---
    const jobEduLevel = (job.education_level || '').toLowerCase()
    const jobOrdinal = JOB_EDUCATION_ORDINAL[jobEduLevel] ?? -1
    const userOrdinal = USER_EDUCATION_ORDINAL[userData.highest_education] ?? 0
    let educationScore = 100
    if (jobOrdinal >= 0) {
        const diff = jobOrdinal - userOrdinal
        if (diff <= 0) educationScore = 100
        else if (diff <= 1) educationScore = 60
        else educationScore = 30
    }

    // --- Final ---
    const matchScore = Math.round(skillScore * 0.5 + experienceScore * 0.3 + educationScore * 0.2)
    const matchLevel = matchScore >= 80 ? 'Excellent' :
                       matchScore >= 60 ? 'Good' :
                       matchScore >= 40 ? 'Fair' : 'Low'

    return { matchScore, matchLevel, matchingSkills, missingSkills }
}
```

Also add `calculateDeterministicScore` to the default export object and the named exports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: All new tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/geminiService.js src/services/geminiService.test.js
git commit -m "feat: add deterministic match scoring function with tests"
```

---

## Chunk 2: AI Alias Expansion Function

### Task 2: Add `expandProfileAliases` to geminiService

**Files:**
- Modify: `src/services/geminiService.js` (add new exported function)
- Test: `src/services/geminiService.test.js`

- [ ] **Step 1: Write failing test for expandProfileAliases**

Add to `src/services/geminiService.test.js`:

```js
describe('expandProfileAliases', () => {
  let expandProfileAliases

  beforeAll(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    vi.stubGlobal('fetch', mockFetch)
    const mod = await import('./geminiService')
    expandProfileAliases = mod.expandProfileAliases
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  function mockCohereResponse(text) {
    return {
      ok: true,
      json: () => Promise.resolve({
        message: { content: [{ text }] }
      })
    }
  }

  it('returns skill aliases and experience categories', async () => {
    const mockResult = {
      skillAliases: {
        'Welding': ['Metal Fabrication', 'Arc Welding', 'SMAW'],
      },
      experienceCategories: ['trades'],
    }
    mockFetch.mockResolvedValue(mockCohereResponse(JSON.stringify(mockResult)))

    const result = await expandProfileAliases(
      [{ name: 'Welding' }],
      [{ position: 'Welder', company: 'ABC Corp' }]
    )
    expect(result.skillAliases).toBeDefined()
    expect(result.skillAliases['Welding']).toContain('Metal Fabrication')
    expect(result.experienceCategories).toContain('trades')
  })

  it('returns empty fallback on API error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await expandProfileAliases(
      [{ name: 'Welding' }],
      []
    )
    expect(result.skillAliases).toEqual({})
    expect(result.experienceCategories).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: FAIL — `expandProfileAliases` is not exported

- [ ] **Step 3: Implement `expandProfileAliases`**

Add to `src/services/geminiService.js` after `calculateDeterministicScore`:

```js
/**
 * AI-powered profile enrichment — call once at profile save time.
 * Generates semantic skill aliases and maps work history to job categories.
 *
 * @param {Array} skills - user's skills array
 * @param {Array} workExperiences - user's work_experiences array
 * @returns {{ skillAliases: Object, experienceCategories: string[] }}
 */
export const expandProfileAliases = async (skills, workExperiences) => {
    const FALLBACK = { skillAliases: {}, experienceCategories: [] }

    const skillNames = (skills || []).map(s => typeof s === 'string' ? s : s.name).filter(Boolean)
    if (skillNames.length === 0) return FALLBACK

    const expList = (workExperiences || []).map(w => `${w.position || w.title || ''} at ${w.company || ''}`).filter(s => s.trim() !== 'at')

    const prompt = `You are a career matching assistant for PESO (Public Employment Service Office) in the Philippines. Analyze this jobseeker's profile and generate matching data.

SKILLS: ${skillNames.join(', ')}
WORK EXPERIENCE: ${expList.length > 0 ? expList.join('; ') : 'None provided'}

Generate:
1. For each skill, provide 4-6 semantic aliases (related terms, abbreviations, broader/narrower terms relevant to Philippine blue-collar, service, and technical jobs)
2. Based on the work experience, classify into the applicable job categories. ONLY use these exact values: agriculture, energy, retail, it, trades, hospitality

Return JSON:
{"skillAliases":{"Skill Name":["alias1","alias2"]},"experienceCategories":["trades","energy"]}`

    try {
        const response = await callAI(prompt, { timeoutMs: 15000, maxTokens: 1024 })
        const parsed = parseAIJSON(response)

        // Validate structure
        const result = { skillAliases: {}, experienceCategories: [] }
        const validCategories = ['agriculture', 'energy', 'retail', 'it', 'trades', 'hospitality']

        if (parsed.skillAliases && typeof parsed.skillAliases === 'object') {
            for (const [skill, aliases] of Object.entries(parsed.skillAliases)) {
                if (Array.isArray(aliases)) {
                    result.skillAliases[skill] = aliases.map(a => String(a).trim()).filter(Boolean)
                }
            }
        }

        if (Array.isArray(parsed.experienceCategories)) {
            result.experienceCategories = parsed.experienceCategories
                .map(c => String(c).toLowerCase().trim())
                .filter(c => validCategories.includes(c))
        }

        return result
    } catch (err) {
        console.warn('expandProfileAliases failed:', err.message)
        return FALLBACK
    }
}
```

Add `expandProfileAliases` to the named and default exports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/geminiService.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/geminiService.js src/services/geminiService.test.js
git commit -m "feat: add AI profile alias expansion function"
```

---

## Chunk 3: SQL Migration + Profile Save Integration

### Task 3: Create SQL migration for new columns

**Files:**
- Create: `sql/add_match_scoring_columns.sql`

- [ ] **Step 1: Write the SQL migration**

Create `sql/add_match_scoring_columns.sql`:

```sql
-- Add columns for deterministic match scoring
-- skill_aliases: maps each user skill to semantic aliases (generated by AI at profile save)
-- experience_categories: job categories derived from work history (generated by AI at profile save)

ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS skill_aliases jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS experience_categories text[] DEFAULT NULL;

COMMENT ON COLUMN public.jobseeker_profiles.skill_aliases IS 'AI-generated semantic skill aliases, e.g. {"Welding": ["Metal Fabrication", "Arc Welding"]}';
COMMENT ON COLUMN public.jobseeker_profiles.experience_categories IS 'AI-derived job categories from work history, e.g. {"trades", "energy"}';
```

- [ ] **Step 2: Run the migration against Supabase**

Run this SQL in the Supabase dashboard SQL editor or via CLI:
```bash
supabase db push
```

Verify: Check that `jobseeker_profiles` table now has `skill_aliases` and `experience_categories` columns.

- [ ] **Step 3: Commit**

```bash
git add sql/add_match_scoring_columns.sql
git commit -m "feat: add skill_aliases and experience_categories columns to jobseeker_profiles"
```

### Task 4: Integrate alias expansion into profile save

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx:256-329` (the `handleSubmit` function)

- [ ] **Step 1: Import `expandProfileAliases` and `clearSessionScores`**

At the top of `src/pages/JobseekerProfileEdit.jsx`, update the geminiService import:

```js
import { expandProfileAliases, clearSessionScores } from '../services/geminiService'
```

- [ ] **Step 2: Add alias expansion to `handleSubmit`**

In the `handleSubmit` function of `src/pages/JobseekerProfileEdit.jsx`, after the `jobseeker_profiles` upsert succeeds (after line 315 `if (profileErr) throw profileErr`), add:

```js
            // Expand skill aliases for deterministic match scoring (non-blocking)
            try {
                const aliasData = await expandProfileAliases(updateData.skills, updateData.work_experiences)
                if (aliasData.skillAliases && Object.keys(aliasData.skillAliases).length > 0) {
                    await supabase
                        .from('jobseeker_profiles')
                        .update({
                            skill_aliases: aliasData.skillAliases,
                            experience_categories: aliasData.experienceCategories,
                        })
                        .eq('id', currentUser.uid)
                }
            } catch (aliasErr) {
                console.warn('Alias expansion failed (non-blocking):', aliasErr.message)
                // Don't fail the save — aliases are a nice-to-have enhancement
            }

            // Clear cached match scores so they recalculate with new data
            clearSessionScores(currentUser.uid)
```

This goes right before the `await fetchUserData(currentUser.uid)` call on line 318.

- [ ] **Step 3: Verify manually**

1. Open the app, log in as a jobseeker
2. Go to Edit Profile, save without changes
3. Check Supabase dashboard: `jobseeker_profiles` row should now have `skill_aliases` populated
4. Check browser console for any errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: expand skill aliases on profile save"
```

---

## Chunk 4: Update JobListings to Use Deterministic Scoring

### Task 5: Replace AI batch scoring with deterministic scoring on JobListings

**Files:**
- Modify: `src/pages/JobListings.jsx:1-170` (imports, state, scoring logic)

- [ ] **Step 1: Update imports**

In `src/pages/JobListings.jsx`, replace the geminiService import (line 19):

```js
// Before:
import geminiService, { getSessionScores, setSessionScores, clearSessionScores } from '../services/geminiService'

// After:
import { calculateDeterministicScore } from '../services/geminiService'
```

- [ ] **Step 2: Replace the auto-scoring useEffect**

Replace the entire auto-scoring useEffect (lines 86-133) with:

```js
    // Calculate deterministic scores instantly when jobs load
    useEffect(() => {
        if (!jobs.length || !currentUser || !isJobseeker() || !userData?.skills?.length) return

        const scores = {}
        for (const job of jobs) {
            scores[job.id] = calculateDeterministicScore(job, userData)
        }
        setMatchScores(scores)
    }, [jobs, currentUser, userData])
```

- [ ] **Step 3: Remove `calculatingMatches` state and related UI**

Since scoring is now instant, remove:
- The `calculatingMatches` state variable (line 26): `const [calculatingMatches, setCalculatingMatches] = useState(false)`
- The `matchError` state variable (line 33): `const [matchError, setMatchError] = useState(false)`
- The `handleRefreshScores` function (lines 135-156) — no longer needed since scores are deterministic and instant
- The "Analyzing matches..." spinner in the sort controls (lines 240-244)
- The refresh button (lines 260-267)
- The match error banner (lines 299-309)
- The per-card "Matching..." loading state (lines 350-354)

Replace the sort controls section (lines 238-271) with:

```jsx
                    {currentUser && isJobseeker() && userData?.skills?.length > 0 && Object.keys(matchScores).length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSortByMatch(!sortByMatch)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    sortByMatch
                                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                                }`}
                                aria-label={sortByMatch ? 'Disable sort by match score' : 'Sort jobs by match score'}
                                aria-pressed={sortByMatch}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {sortByMatch ? 'Sorted by Match' : 'Sort by Match'}
                            </button>
                        </div>
                    )}
```

Replace the per-card AI match badge (lines 347-366) with:

```jsx
                                            {/* AI Match Badge */}
                                            {isJobseeker() && matchScores[job.id] && (
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ml-auto md:ml-0 ${matchScores[job.id].matchScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                                                        matchScores[job.id].matchScore >= 60 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            matchScores[job.id].matchScore >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`} title={`Skills: ${matchScores[job.id].matchingSkills.join(', ') || 'None'}`}>
                                                    <Sparkles className="w-3 h-3" />
                                                    {matchScores[job.id].matchScore}% Match
                                                </div>
                                            )}
```

- [ ] **Step 4: Clean up unused imports**

Remove from imports (lines 2-15): `Loader2`, `AlertCircle`, `RefreshCw`, `ArrowUpDown` — none are used after removing the loading/error/refresh UI. Keep only what's still referenced.

- [ ] **Step 5: Verify manually**

1. Open Job Listings page as a jobseeker
2. Scores should appear instantly (no loading spinner)
3. Sort by match should work
4. Scores should be consistent (same number every page load)

- [ ] **Step 6: Commit**

```bash
git add src/pages/JobListings.jsx
git commit -m "feat: replace AI batch scoring with instant deterministic scoring on JobListings"
```

---

## Chunk 5: Update JobDetail to Use Deterministic Scoring

### Task 6: Use deterministic score on JobDetail, keep AI for detail text

**Files:**
- Modify: `src/pages/JobDetail.jsx:25-84, 348-562`

- [ ] **Step 1: Update imports**

In `src/pages/JobDetail.jsx`, update the geminiService import (line 25):

```js
// Before:
import geminiService, { getSessionScores } from '../services/geminiService'

// After:
import geminiService, { calculateDeterministicScore } from '../services/geminiService'
```

- [ ] **Step 2: Replace cached score loading with deterministic scoring**

Replace the cached-score useEffect (lines 57-66) with:

```js
    // Calculate deterministic score instantly
    useEffect(() => {
        if (!job || !currentUser || !isJobseeker() || !userData?.skills?.length) return
        const score = calculateDeterministicScore(job, userData)
        setMatchData(prev => prev ? { ...prev, ...score } : score)
    }, [job, currentUser, userData])
```

- [ ] **Step 3: Update `calculateMatch` to only fetch qualitative data**

Replace the `calculateMatch` function (lines 68-84) with:

```js
    const calculateMatch = async () => {
        if (!job || !userData) return
        setCalculatingMatch(true)
        try {
            const aiDetail = await geminiService.calculateJobMatch(job, userData)
            // Keep deterministic score, overlay AI qualitative data only
            setMatchData(prev => ({
                ...prev,
                explanation: aiDetail.explanation,
                skillBreakdown: aiDetail.skillBreakdown,
                actionItems: aiDetail.actionItems,
                improvementTips: aiDetail.improvementTips,
            }))
        } catch {
            // Score is still shown from deterministic calc, just no detail text
            setMatchData(prev => ({ ...prev, detailError: true }))
        } finally {
            setCalculatingMatch(false)
        }
    }
```

- [ ] **Step 4: Update the AI Match Analysis card UI**

In the match analysis card (around lines 364-561), update the flow to:
- If `matchData` exists (it always will after step 2), show the score ring immediately
- The "Detailed Breakdown" button appears when `skillBreakdown` is empty (no AI detail yet)
- Remove the initial "Analyze Match" button state since score is always available

Replace the conditional rendering inside `<div className="px-5 pb-5">` (lines 364-560):

```jsx
                                <div className="px-5 pb-5">
                                    {!matchData ? (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-gray-500">Log in as a jobseeker with skills to see your match score</p>
                                        </div>
                                    ) : calculatingMatch ? (
                                        <div className="space-y-4 animate-pulse py-2">
                                            <div className="flex justify-center">
                                                <div className="w-20 h-20 bg-gray-200 rounded-full" />
                                            </div>
                                            <div className="h-3 bg-gray-200 rounded w-full" />
                                            <div className="h-3 bg-gray-200 rounded w-5/6" />
                                            <div className="space-y-2">
                                                <div className="h-2 bg-gray-200 rounded w-full" />
                                                <div className="h-2 bg-gray-200 rounded w-4/5" />
                                                <div className="h-2 bg-gray-200 rounded w-3/5" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Score Ring — always from deterministic function */}
                                            <div className="flex flex-col items-center py-2">
                                                {/* ... keep existing score ring SVG code unchanged ... */}
                                            </div>

                                            {/* Explanation — only if AI detail loaded */}
                                            {matchData.explanation && (
                                                <p className="text-xs text-gray-600 leading-relaxed text-center">
                                                    {matchData.explanation}
                                                </p>
                                            )}

                                            {/* Detailed Breakdown button — show when no AI detail yet */}
                                            {(!matchData.skillBreakdown || matchData.skillBreakdown.length === 0) && !matchData.detailError && (
                                                <div className="text-center pt-2">
                                                    <button
                                                        onClick={calculateMatch}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                        Detailed Breakdown
                                                    </button>
                                                </div>
                                            )}

                                            {/* Keep all existing breakdown sections unchanged:
                                                - Skill Breakdown Progress Bars
                                                - Matching Skills (Your Strengths)
                                                - Missing Skills (Skill Gaps)
                                                - Career Action Items
                                            */}
                                        </div>
                                    )}
                                </div>
```

The key change: the score ring and match level badge always render from `matchData.matchScore`/`matchData.matchLevel` (deterministic). The skill breakdown, explanation, action items only render after the AI detail call.

- [ ] **Step 5: Remove error state referencing Gemini API**

Replace the error fallback (lines 548-559) — remove the "Gemini API quota exceeded" text since we use Cohere now, and the score itself never fails:

```jsx
                                    {matchData.detailError && (
                                        <div className="text-center pt-2">
                                            <p className="text-xs text-gray-400 mb-2">Detailed analysis unavailable right now</p>
                                            <button
                                                onClick={calculateMatch}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
```

- [ ] **Step 6: Verify manually**

1. Open any job detail page as a jobseeker
2. Score ring should appear immediately (no "Analyze Match" button needed)
3. Click "Detailed Breakdown" to get AI explanation and tips
4. Compare the score with the same job on the listings page — they should match exactly

- [ ] **Step 7: Commit**

```bash
git add src/pages/JobDetail.jsx
git commit -m "feat: use deterministic scoring on JobDetail, AI for detail text only"
```

---

## Chunk 6: Cleanup and Final Verification

### Task 7: Remove dead code from geminiService

**Files:**
- Modify: `src/services/geminiService.js`

- [ ] **Step 1: Remove `scoreAllJobs` and `scoreBatch`**

These functions (lines 372-451) are no longer called by any page. Remove:
- `scoreBatch` function (lines 375-395)
- `scoreAllJobs` function (lines 401-451)
- Remove `scoreAllJobs` from the default export object

Keep: `calculateJobMatch` (still used by JobDetail for qualitative AI detail), `clearSessionScores` (used by profile save). Remove `getSessionScores`/`setSessionScores` if no longer referenced after JobListings and JobDetail changes.

**Note on AuthContext:** No changes needed to `src/contexts/AuthContext.jsx`. The `fetchUserData` function already uses `select('*')` on the profile table (line 102), so the new `skill_aliases` and `experience_categories` columns are automatically included in `userData` without code changes.

- [ ] **Step 2: Update the existing test file**

In `src/services/geminiService.test.js`, remove or update tests that reference removed functions:
- Remove the `batchCalculateMatches` describe block (lines 131-170) — function no longer exists
- Update the `beforeAll` import (line 8) to not import `batchCalculateMatches`

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/geminiService.js src/services/geminiService.test.js
git commit -m "refactor: remove unused batch scoring functions"
```

### Task 8: End-to-end verification

- [ ] **Step 1: Full manual test**

1. Log in as a jobseeker with skills
2. Go to Edit Profile → Save (triggers alias expansion)
3. Check Supabase: `skill_aliases` and `experience_categories` columns populated
4. Go to Job Listings → scores appear instantly, no spinner
5. Click into a job → score ring shows same number as listing badge
6. Click "Detailed Breakdown" → AI explanation + tips load
7. Navigate back to listings → scores still match
8. Log out and log back in → scores still consistent

- [ ] **Step 2: Run full test suite one final time**

Run: `npx vitest run`
Expected: All tests PASS, no regressions

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup for hybrid match scoring"
```
