# AI Match Score Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stuck batch scoring, add auto-score on page load, persist scores in sessionStorage, and improve matching accuracy — all within Groq free-tier limits using a single API call.

**Architecture:** Replace multi-call batch scoring with a single-call `scoreAllJobs` that uses index-based job references (not UUIDs). Add sessionStorage cache layer so scores persist across navigation. JobDetail reads cached scores instantly; full breakdown is user-initiated.

**Tech Stack:** React, Groq API (Llama 3.3 70B), sessionStorage, existing geminiService cache layer

**Spec:** `docs/superpowers/specs/2026-03-12-ai-match-improvements-design.md`

---

## Task 1: Add sessionStorage cache helpers and `scoreAllJobs` to geminiService

**Files:**
- Modify: `src/services/geminiService.js`

- [ ] **Step 1: Add sessionStorage cache helpers**

Add after the in-memory cache helpers (after line 25):

```js
// --- sessionStorage cache for match scores ---
const SESSION_KEY_PREFIX = 'peso-match-scores-'
const SESSION_TTL = 10 * 60 * 1000 // 10 minutes

export const getSessionScores = (userId, skillsHash) => {
    try {
        const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${userId}`)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (parsed.skillsHash !== skillsHash) return null
        if (Date.now() - parsed.timestamp > SESSION_TTL) {
            sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${userId}`)
            return null
        }
        return parsed.scores
    } catch {
        return null
    }
}

export const setSessionScores = (userId, skillsHash, newScores) => {
    try {
        const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${userId}`)
        let existing = {}
        if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.skillsHash === skillsHash && Date.now() - parsed.timestamp < SESSION_TTL) {
                existing = parsed.scores || {}
            }
        }
        sessionStorage.setItem(`${SESSION_KEY_PREFIX}${userId}`, JSON.stringify({
            timestamp: Date.now(),
            skillsHash,
            scores: { ...existing, ...newScores }
        }))
    } catch {
        // sessionStorage full or unavailable — ignore
    }
}

export const clearSessionScores = (userId) => {
    try {
        sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${userId}`)
    } catch {
        // ignore
    }
}
```

- [ ] **Step 2: Add `scoreAllJobs` function**

Add after `calculateJobMatch` (after the closing `}` of that function), replacing the existing `batchScoreChunk` and `calculateAllJobMatches`:

```js
/**
 * Score all jobs in a single API call using index-based matching.
 * Returns { [jobId]: { matchScore, matchLevel, matchingSkills, missingSkills, explanation } }
 */
export const scoreAllJobs = async (jobs, profile) => {
    if (!jobs.length || !profile.skills?.length) return {}

    const jobsToScore = jobs.slice(0, 30)
    if (jobs.length > 30) {
        console.warn(`scoreAllJobs: scoring first 30 of ${jobs.length} jobs`)
    }

    const skillsList = profile.skills.map(s => typeof s === 'string' ? s : s.name).join(', ')
    const skillsKey = profile.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')
    const expList = profile.work_experiences?.map(w => `${w.position} at ${w.company}`).join('; ') || profile.experience || 'Not specified'
    const eduLevel = profile.highest_education || profile.education || 'Not specified'

    const jobLines = jobsToScore.map((job, i) => {
        const reqs = job.requirements?.join(', ') || job.required_skills?.join(', ') || 'Not specified'
        return `JOB_${i}: title="${job.title}" | required_skills="${reqs}"`
    }).join('\n')

    const prompt = `You are a job matching assistant for PESO (Public Employment Service Office) in the Philippines. Score how well this candidate matches EACH job below.

RULES:
- Use semantic skill matching: recognize related skills even if names differ (e.g. "Welding" ↔ "Metal Fabrication", "Driving" ↔ "Logistics", "Cooking" ↔ "Food Preparation")
- Weight practical/vocational skills and TESDA certifications appropriately
- Scoring rubric: 80-100 Excellent (strong match), 60-79 Good (relevant skills), 40-59 Fair (some transferable), 0-39 Low (weak match)
- Keep each explanation under 15 words

CANDIDATE:
Skills: ${skillsList}
Experience: ${expList}
Education: ${eduLevel}

JOBS:
${jobLines}

Return valid JSON with numeric index keys matching each JOB_N:
{
  "0": {"matchScore": 75, "matchLevel": "Good", "matchingSkills": ["skill1"], "missingSkills": ["skill1"], "explanation": "Brief reason."},
  "1": {"matchScore": 40, "matchLevel": "Low", "matchingSkills": [], "missingSkills": ["skill1"], "explanation": "Brief reason."}
}`

    const response = await callAI(prompt, { timeoutMs: 45000, maxTokens: 4096 })
    const parsed = safeParseAIJSON(response)

    if (!parsed.ok) {
        console.error('scoreAllJobs: failed to parse AI response')
        return {}
    }

    const results = {}
    for (const [index, data] of Object.entries(parsed.data)) {
        const i = parseInt(index)
        if (isNaN(i) || i < 0 || i >= jobsToScore.length) continue
        const job = jobsToScore[i]
        const normalized = {
            matchScore: Math.min(100, Math.max(0, parseInt(data.matchScore) || 0)),
            matchLevel: data.matchLevel || 'Unknown',
            matchingSkills: data.matchingSkills || [],
            missingSkills: data.missingSkills || [],
            explanation: data.explanation || '',
            skillBreakdown: [],
            actionItems: [],
            improvementTips: []
        }
        results[job.id] = normalized
        // Cache per-job for calculateJobMatch cache hits on JobDetail
        setCache(`match_${job.id}_${skillsKey}`, normalized)
    }

    return results
}
```

- [ ] **Step 3: Remove `batchScoreChunk` and `calculateAllJobMatches`**

Delete the entire `batchScoreChunk` function (starts with `const batchScoreChunk = async`).
Delete the entire `calculateAllJobMatches` function (starts with `export const calculateAllJobMatches = async`).

- [ ] **Step 4: Update exports**

Replace the default export object with:

```js
export default {
    analyzeResume,
    calculateJobMatch,
    scoreAllJobs,
    quickExtractSkills,
    normalizeSkillName,
    deduplicateSkills,
    normalizeEducationLevel
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/geminiService.js
git commit -m "feat: add scoreAllJobs with index-based matching and sessionStorage cache"
```

---

## Task 2: Update JobListings to auto-score on load with sessionStorage

**Files:**
- Modify: `src/pages/JobListings.jsx`

- [ ] **Step 1: Update imports**

Replace the React import:
```js
import { useState, useEffect } from 'react'
```
(Remove `useRef` — no longer needed.)

Add `RefreshCw` to the lucide-react import:
```js
import {
    Search,
    MapPin,
    Briefcase,
    Clock,
    Filter,
    Loader2,
    Sparkles,
    ArrowUpDown,
    AlertCircle,
    RefreshCw
} from 'lucide-react'
```

Update geminiService import to include session helpers:
```js
import geminiService, { getSessionScores, setSessionScores, clearSessionScores } from '../services/geminiService'
```

- [ ] **Step 2: Replace state declarations**

Remove these lines:
```js
const [matchProgress, setMatchProgress] = useState({ completed: 0, total: 0 })
const mountedRef = useRef(true)
useEffect(() => { return () => { mountedRef.current = false } }, [])
```

Add after `sortByMatch` state:
```js
const [matchError, setMatchError] = useState(false)
```

- [ ] **Step 3: Replace `calculateAiMatches` with auto-scoring useEffect**

Remove the entire `calculateAiMatches` function.

Add this `useEffect` after the `fetchAppliedJobs` useEffect:

```js
// Auto-score jobs when they load
useEffect(() => {
    if (!jobs.length || !currentUser || !isJobseeker() || !userData?.skills?.length) return

    const skillsHash = userData.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')

    // Check sessionStorage cache first
    const cached = getSessionScores(currentUser.uid, skillsHash)
    if (cached && Object.keys(cached).length > 0) {
        setMatchScores(cached)
        return
    }

    // No cache — call API
    let cancelled = false
    const runScoring = async () => {
        setCalculatingMatches(true)
        setMatchError(false)
        try {
            const results = await geminiService.scoreAllJobs(jobs, userData)
            if (cancelled) return
            if (Object.keys(results).length > 0) {
                setMatchScores(results)
                setSessionScores(currentUser.uid, skillsHash, results)
            } else {
                setMatchError(true)
            }
        } catch (err) {
            console.error('AI Match error:', err)
            if (!cancelled) setMatchError(true)
        } finally {
            if (!cancelled) setCalculatingMatches(false)
        }
    }
    runScoring()
    return () => { cancelled = true }
}, [jobs, currentUser, userData])
```

- [ ] **Step 4: Add refresh handler**

Add after the new useEffect:

```js
const handleRefreshScores = async () => {
    if (!currentUser || !userData?.skills?.length) return
    clearSessionScores(currentUser.uid)
    setMatchScores({})
    setCalculatingMatches(true)
    setMatchError(false)
    try {
        const skillsHash = userData.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')
        const results = await geminiService.scoreAllJobs(jobs, userData)
        if (Object.keys(results).length > 0) {
            setMatchScores(results)
            setSessionScores(currentUser.uid, skillsHash, results)
        } else {
            setMatchError(true)
        }
    } catch (err) {
        console.error('AI Match refresh error:', err)
        setMatchError(true)
    } finally {
        setCalculatingMatches(false)
    }
}
```

- [ ] **Step 5: Replace the Results Count & Sort UI section**

Replace the entire `{currentUser && isJobseeker() && userData?.skills?.length > 0 && (...)}` block (the button/analyzing/sort toggle area) with:

```jsx
{currentUser && isJobseeker() && userData?.skills?.length > 0 && (
    <div className="flex items-center gap-2">
        {calculatingMatches ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing matches...
            </div>
        ) : Object.keys(matchScores).length > 0 ? (
            <>
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
                <button
                    onClick={handleRefreshScores}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    aria-label="Refresh match scores"
                    title="Refresh match scores"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </>
        ) : null}
    </div>
)}
```

- [ ] **Step 6: Add error banner**

Add right after the `{/* Profile Completeness Nudge */}` section (before `{/* Job Cards */}`):

```jsx
{/* Match Score Error Banner */}
{matchError && !calculatingMatches && (
    <div className="flex items-center justify-between p-3 mb-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-sm text-red-700">Match scores unavailable right now.</p>
        <button
            onClick={() => setMatchError(false)}
            className="text-red-400 hover:text-red-600 text-xs font-medium ml-4"
        >
            Dismiss
        </button>
    </div>
)}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/JobListings.jsx
git commit -m "feat: auto-score jobs on load with sessionStorage cache and refresh button"
```

---

## Task 3: Update JobDetail to use cached scores and two-tier breakdown

**Files:**
- Modify: `src/pages/JobDetail.jsx`

- [ ] **Step 1: Add sessionStorage import**

Add to the geminiService import line:
```js
import geminiService, { getSessionScores } from '../services/geminiService'
```

- [ ] **Step 2: Load cached score on mount**

Find the existing `useEffect` that calls `fetchJob()` (around line 49-54). Add a new `useEffect` after it:

```js
// Load cached match score from sessionStorage
useEffect(() => {
    if (!job || !currentUser || !isJobseeker() || !userData?.skills?.length) return
    if (matchData) return // already have data

    const skillsHash = userData.skills.map(s => typeof s === 'string' ? s : s.name).sort().join(',')
    const cached = getSessionScores(currentUser.uid, skillsHash)
    if (cached && cached[job.id]) {
        setMatchData(cached[job.id])
    }
}, [job, currentUser, userData])
```

- [ ] **Step 3: Update the Analyze Match button in the ternary chain**

The AI Match Analysis card has a ternary chain in `<div className="px-5 pb-5">` (around line 347-374):
```
{!matchData && !calculatingMatch ? ( ... Analyze Match button ... )
 : calculatingMatch ? ( ... loading skeleton ... )
 : matchData && !matchData.error ? ( ... full results ... )
 : ...}
```

Replace ONLY the first branch (`!matchData && !calculatingMatch`) with a branch that handles both "no data" and "cached lightweight data" states:

```jsx
{!matchData && !calculatingMatch ? (
    <div className="text-center py-4">
        <p className="text-xs text-gray-500 mb-3">See how well your profile matches this job</p>
        <button
            onClick={calculateMatch}
            disabled={!job || !userData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
            <Sparkles className="w-4 h-4" />
            Analyze Match
        </button>
    </div>
) : matchData && !matchData.error && matchData.skillBreakdown?.length === 0 && !calculatingMatch ? (
    <div className="text-center py-4">
        <p className="text-xs text-gray-500 mb-3">Cached score loaded — get the full analysis</p>
        <button
            onClick={calculateMatch}
            disabled={!job || !userData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
            <Sparkles className="w-4 h-4" />
            Detailed Breakdown
        </button>
    </div>
) : calculatingMatch ? (
```

This inserts a new branch between the "no data" and "loading" branches. The rest of the ternary chain (`calculatingMatch`, `matchData && !matchData.error`, error) stays unchanged.

Note: The existing `calculateMatch` function calls `calculateJobMatch` which returns full data including `skillBreakdown`. It will overwrite the cached lightweight data in `matchData` state. No changes needed to that function.

- [ ] **Step 4: Ensure requirement tags use matchData for coloring**

The requirement tags already use `matchData?.matchingSkills` for coloring (from our earlier changes). Verify the existing code in the Requirements section has:
```jsx
className={`px-3 py-1 rounded-full text-sm font-medium ${matchData?.matchingSkills?.some(ms =>
    ms.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(ms.toLowerCase())
)
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-700'
    }`}
```
If it does, no change needed. If it still uses the old `skillMatchesRequirement`, update it to the above.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 6: Verify in browser**

1. Log in as a jobseeker with skills
2. Go to Job Listings — scores should appear automatically (no button click)
3. Click a job — JobDetail should show the cached score immediately
4. Click "Detailed Breakdown" — should fetch full analysis
5. Navigate back to listings — scores still there (from sessionStorage)
6. Click refresh icon — scores re-calculate

- [ ] **Step 7: Commit**

```bash
git add src/pages/JobDetail.jsx
git commit -m "feat: load cached match scores on JobDetail and add detailed breakdown button"
```
