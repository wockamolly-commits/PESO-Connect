# AI Match Score Sync & Semantic Skill Matching — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify AI match scoring so JobListings and JobDetail produce identical scores, score all jobs (not just 10), and use AI-powered semantic skill matching instead of local word-root matching.

**Architecture:** Remove `batchCalculateMatches`, add `calculateAllJobMatches` that calls `calculateJobMatch` for each job in parallel (concurrency 3). JobDetail drops local `skillMatchesRequirement`/`getSkillGap` and uses AI response fields instead.

**Tech Stack:** React, Groq API (Llama 3.3 70B), existing geminiService cache layer

**Spec:** `docs/superpowers/specs/2026-03-11-ai-match-score-sync-design.md`

---

## Task 1: Add `calculateAllJobMatches` and remove `batchCalculateMatches` in geminiService

**Files:**
- Modify: `src/services/geminiService.js`

- [ ] **Step 1: Fix cache key to sort skills alphabetically**

In `calculateJobMatch` (line 247), change:
```js
const cacheKey = `match_${job.id}_${profile.skills?.join(',')}`
```
to:
```js
const skillsKey = (profile.skills || []).map(s => typeof s === 'string' ? s : s.name).sort().join(',')
const cacheKey = `match_${job.id}_${skillsKey}`
```

- [ ] **Step 2: Add `calculateAllJobMatches` function**

Add after `calculateJobMatch` (after line 309), before `batchCalculateMatches`:

```js
/**
 * Calculate match scores for all jobs using parallel single-job calls.
 * @param {Array} jobs - Array of job objects
 * @param {Object} profile - User profile object
 * @param {Function} onProgress - Callback: (jobId, result, completedCount, totalCount) => void
 * @returns {Object} Map of jobId → full match result
 */
export const calculateAllJobMatches = async (jobs, profile, onProgress) => {
    const results = {}
    const total = jobs.length
    let completed = 0
    let rateLimited = false

    // Process in chunks of 3 for concurrency control
    for (let i = 0; i < jobs.length; i += 3) {
        if (rateLimited) break

        const chunk = jobs.slice(i, i + 3)
        const settled = await Promise.allSettled(
            chunk.map(async (job) => {
                const result = await calculateJobMatch(job, profile)
                return { jobId: job.id, result }
            })
        )

        for (const outcome of settled) {
            completed++
            if (outcome.status === 'fulfilled') {
                const { jobId, result } = outcome.value
                results[jobId] = result
                if (onProgress) onProgress(jobId, result, completed, total)
            } else {
                const errMsg = outcome.reason?.message || ''
                if (errMsg.includes('rate limit') || errMsg.includes('429')) {
                    rateLimited = true
                    console.warn('Rate limited — stopping remaining match calculations')
                    break
                }
                console.warn('Match calculation failed for a job:', errMsg)
                if (onProgress) onProgress(null, null, completed, total)
            }
        }
    }

    return results
}
```

- [ ] **Step 3: Remove `batchCalculateMatches` function**

Delete the entire `batchCalculateMatches` function (lines 314–366).

- [ ] **Step 4: Update exports**

Change the default export (line 388–396) to replace `batchCalculateMatches` with `calculateAllJobMatches`:

```js
export default {
    analyzeResume,
    calculateJobMatch,
    calculateAllJobMatches,
    quickExtractSkills,
    normalizeSkillName,
    deduplicateSkills,
    normalizeEducationLevel
}
```

- [ ] **Step 5: Verify no build errors**

Run: `npm run dev`
Expected: Dev server starts with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/geminiService.js
git commit -m "feat: add calculateAllJobMatches, remove batchCalculateMatches"
```

---

## Task 2: Update JobListings to use `calculateAllJobMatches` with incremental progress

**Files:**
- Modify: `src/pages/JobListings.jsx`

- [ ] **Step 1: Add `useRef` import and progress state**

Update the React import (line 1):
```js
import { useState, useEffect, useRef } from 'react'
```

Add a new state variable after `sortByMatch` (line 29):
```js
const [matchProgress, setMatchProgress] = useState({ completed: 0, total: 0 })
```

Add a mounted ref after `appliedJobIds` state (line 30):
```js
const mountedRef = useRef(true)
useEffect(() => { return () => { mountedRef.current = false } }, [])
```

- [ ] **Step 2: Replace `calculateAiMatches` function**

Replace the existing `calculateAiMatches` function (lines 89-99) with:

```js
const calculateAiMatches = async (jobsList, user) => {
    setCalculatingMatches(true)
    setMatchProgress({ completed: 0, total: jobsList.length })
    try {
        const results = await geminiService.calculateAllJobMatches(
            jobsList,
            user,
            (jobId, result, completed, total) => {
                if (!mountedRef.current) return
                setMatchProgress({ completed, total })
                if (jobId && result) {
                    setMatchScores(prev => ({ ...prev, [jobId]: result }))
                }
            }
        )
        if (mountedRef.current && Object.keys(results).length === 0) {
            console.error('All AI match calculations failed')
        }
    } catch (error) {
        console.error('AI Match error:', error)
    } finally {
        if (mountedRef.current) setCalculatingMatches(false)
    }
}
```

- [ ] **Step 3: Update the "Analyzing..." indicator to show progress**

Find the calculating state UI (lines 192-196):
```jsx
<div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium animate-pulse">
    <Loader2 className="w-3.5 h-3.5 animate-spin" />
    Analyzing...
</div>
```

Replace with:
```jsx
<div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium animate-pulse">
    <Loader2 className="w-3.5 h-3.5 animate-spin" />
    Analyzing {matchProgress.completed}/{matchProgress.total}...
</div>
```

- [ ] **Step 4: Verify in browser**

1. Log in as a jobseeker with skills
2. Go to Job Listings
3. Click "AI Match Scores"
4. Confirm: progress shows "Analyzing 0/N..." then increments
5. Badges appear one by one as scores resolve
6. All jobs get scored (not just first 10)

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobListings.jsx
git commit -m "feat: use calculateAllJobMatches with incremental progress on JobListings"
```

---

## Task 3: Replace local skill matching with AI results in JobDetail

**Files:**
- Modify: `src/pages/JobDetail.jsx`

- [ ] **Step 1: Remove `skillMatchesRequirement` function**

Delete the entire function (lines 100–135):
```js
// Smart skill matching — handles word roots (editing ↔ editor ↔ edit)
const skillMatchesRequirement = (skill, requirement) => {
    ...
}
```

- [ ] **Step 2: Remove `getSkillGap` function**

Delete the entire function (lines ~150–159):
```js
const getSkillGap = () => {
    ...
}
```

- [ ] **Step 3: Update `checkSkillMatch` to use simple includes**

Replace `checkSkillMatch` (lines ~138-143) with:
```js
const checkSkillMatch = () => {
    if (!job?.requirements || !userData?.skills) return false
    const userSkills = userData.skills.map(s => (typeof s === 'string' ? s : s.name).toLowerCase())
    return job.requirements.some(req =>
        userSkills.some(skill => skill.includes(req.toLowerCase()) || req.toLowerCase().includes(skill))
    )
}
```
Note: This is only used for the filter_mode strict/flexible gate check, not for display. The AI handles semantic matching for display.

- [ ] **Step 4: Update requirement tags coloring to use AI matchingSkills**

Find the requirement tags rendering (around line 357):
```jsx
className={`px-3 py-1 rounded-full text-sm font-medium ${userData?.skills?.some(s =>
    skillMatchesRequirement(s, req)
)
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-700'
```

Replace with:
```jsx
className={`px-3 py-1 rounded-full text-sm font-medium ${matchData?.matchingSkills?.some(ms =>
    ms.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(ms.toLowerCase())
)
    ? 'bg-green-100 text-green-700'
    : 'bg-gray-100 text-gray-700'
```

- [ ] **Step 5: Update Skill Gap section to use AI matchingSkills/missingSkills**

Find the Skill Gap Analysis section (around line 587):
```jsx
{currentUser && isJobseeker() && job?.requirements?.length > 0 && userData?.skills?.length > 0 && !hasApplied && (() => {
    const { matched, missing } = getSkillGap()
```

Replace the condition and inner logic to use `matchData` instead:
```jsx
{currentUser && isJobseeker() && matchData && !matchData.error && (matchData.matchingSkills?.length > 0 || matchData.missingSkills?.length > 0) && !hasApplied && (() => {
    const matched = matchData.matchingSkills || []
    const missing = matchData.missingSkills || []
```

The rest of the JSX inside (rendering matched with CheckCircle and missing with XCircle) stays the same — it already maps over `matched` and `missing` arrays.

- [ ] **Step 6: Remove unused XCircle import if no longer needed elsewhere**

Check if `XCircle` is still used. If the only usage was in skill gap (which still uses it), keep it. If `CheckCircle` is still used, keep it too. No change expected here — just verify.

- [ ] **Step 7: Verify in browser**

1. Open a job detail page as a jobseeker
2. Click "Analyze Match"
3. Confirm: skill gap section now shows AI-determined matching/missing skills
4. Requirement tags should color green/gray based on AI matchingSkills
5. Navigate from Job Listings (after scoring) to a Job Detail — score should match

- [ ] **Step 8: Commit**

```bash
git add src/pages/JobDetail.jsx
git commit -m "feat: replace local skill matching with AI semantic matching in JobDetail"
```
