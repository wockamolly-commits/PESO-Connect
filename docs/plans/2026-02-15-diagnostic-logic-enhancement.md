# Diagnostic & Matching Logic Enhancement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix a critical runtime crash, add error visibility, timeouts, graceful degradation, and a useReducer state machine to the Job Matching & Diagnostic flow.

**Architecture:** Fix the broken `QuickContactModal` first (P0 crash), then harden `geminiService.js` with timeout + safe JSON parsing, add a `degraded` flag to `diagnosticService.js`, refactor `Diagnostic.jsx` state to a `useReducer` with explicit `idle|analyzing|loadingWorkers|complete|error` states, and surface errors/degradation to users.

**Tech Stack:** React 18, Vitest, Groq/Llama API, Firebase Firestore, Tailwind CSS, Lucide React

---

### Task 1: Fix critical QuickContactModal crash (P0)

**Files:**
- Modify: `src/pages/Diagnostic.jsx:34-70`

**Context:** The `QuickContactModal` component destructures `registerIndividual` from `useAuth()`, but this method was removed from AuthContext in commit `98c81e9`. Any unauthenticated user clicking "Message Worker" will crash.

**Step 1: Update the auth hook in QuickContactModal**

In `src/pages/Diagnostic.jsx`, find line 35:
```jsx
const { registerIndividual } = useAuth()
```

Replace with:
```jsx
const { createAccount, completeRegistration } = useAuth()
```

**Step 2: Replace the `handleSubmit` function body**

Find the current `handleSubmit` in `QuickContactModal` (around lines 46-69) and replace the try block:

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required.')
    if (!form.phone.trim()) return setError('Phone number is required.')
    if (!form.email.trim()) return setError('Email is required.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')

    setLoading(true)
    try {
        const result = await createAccount(
            form.email.trim().toLowerCase(),
            form.password,
            'individual'
        )
        await completeRegistration({
            full_name: form.name.trim(),
            name: form.name.trim(),
            contact_number: form.phone.trim(),
            individual_status: 'active',
        })
        onAccountCreated(result)
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            setError('This email already has an account. Please sign in instead.')
        } else {
            setError(err.message || 'Something went wrong. Please try again.')
        }
        setLoading(false)
    }
}
```

**Step 3: Commit**

```bash
git add src/pages/Diagnostic.jsx
git commit -m "fix: replace removed registerIndividual with createAccount in QuickContactModal"
```

---

### Task 2: Add timeout and safe JSON parsing to geminiService

**Files:**
- Modify: `src/services/geminiService.js:30-81`

**Step 1: Add AbortController timeout to `callAI`**

In `src/services/geminiService.js`, replace the `callAI` function (lines 30-65) with:

```jsx
export const callAI = async (prompt, timeoutMs = 15000) => {
    if (!GROQ_API_KEY) {
        throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that always responds with valid JSON only. No markdown, no explanation, no code blocks — just raw JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))

            if (response.status === 429) {
                throw new Error('AI rate limit reached. Please wait a moment and try again.')
            }

            throw new Error(error.error?.message || `AI API request failed (${response.status})`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            throw new Error('AI returned an empty response.')
        }

        return content
    } catch (err) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
            throw new Error('AI request timed out. Please try again.')
        }
        throw err
    }
}
```

**Step 2: Add `safeParseAIJSON` alongside existing `parseAIJSON`**

After the existing `parseAIJSON` function (after line 81), add:

```jsx
/**
 * Safe wrapper around parseAIJSON — returns a Result object instead of throwing
 */
export const safeParseAIJSON = (text) => {
    try {
        return { ok: true, data: parseAIJSON(text) }
    } catch (e) {
        return { ok: false, error: e.message, raw: text }
    }
}
```

**Step 3: Commit**

```bash
git add src/services/geminiService.js
git commit -m "feat: add 15s timeout to callAI and safe JSON parser"
```

---

### Task 3: Add degraded flag and response validation to diagnosticService

**Files:**
- Modify: `src/services/diagnosticService.js:127-261`

**Step 1: Update `analyzeWithAI` to return a `source` and `degraded` flag, and validate AI response**

Replace the `analyzeWithAI` function (lines 127-207) with:

```jsx
/**
 * Perform deep AI analysis on a household problem.
 * Returns results with a `source` field ('ai' or 'keyword_fallback')
 * and a `degraded` flag indicating whether AI was unavailable.
 */
export const analyzeWithAI = async (problemText) => {
    if (!problemText || problemText.trim().length === 0) {
        return { trades: [], confidence: 0, source: 'none', degraded: false }
    }

    const tradeContext = Object.entries(tradeKeywords).map(([id, data]) => ({
        id,
        name: data.name
    }))

    const validTradeIds = Object.keys(tradeKeywords)

    const prompt = `You are an AI diagnostic assistant for PESO-Connect, a job matching platform in San Carlos City, Philippines.
Analyse this household problem and determine the most appropriate trade service needed.

PROBLEM DESCRIPTION:
"${problemText.replace(/"/g, '\\"')}"

AVAILABLE SERVICES:
${JSON.stringify(tradeContext, null, 2)}

Identify the primary trade and any secondary trades. Also provide safety advice and a summary of the diagnostic.

Return valid JSON in this exact format:
{
    "primaryTradeId": "plumbing|electrical|masonry|welding|carpentry",
    "secondaryTradeIds": [],
    "confidence": 0,
    "severity": "Low|Medium|High|Emergency",
    "diagnosticSummary": "One sentence summary of what the AI thinks is wrong",
    "safetyAdvice": ["Advice 1", "Advice 2"],
    "matchedKeywords": ["keyword1", "keyword2"],
    "requiresFollowUp": false,
    "followUpQuestion": "A question to clarify the problem if confidence is low"
}`

    try {
        const response = await callAI(prompt)
        const result = parseAIJSON(response)

        // Validate primaryTradeId is one we support
        if (result.primaryTradeId && !validTradeIds.includes(result.primaryTradeId)) {
            console.warn(`AI returned unknown trade "${result.primaryTradeId}", falling back to keywords`)
            const fallback = analyzeText(problemText)
            return { ...fallback, source: 'keyword_fallback', degraded: true }
        }

        // Enhance result with trade data (icons, colors, etc.)
        const trades = []

        if (result.primaryTradeId && tradeKeywords[result.primaryTradeId]) {
            const trade = tradeKeywords[result.primaryTradeId]
            trades.push({
                ...trade,
                id: result.primaryTradeId,
                confidence: Math.min(100, Math.max(0, parseInt(result.confidence) || 0)),
                matchedKeywords: result.matchedKeywords || [],
                isPrimary: true
            })
        }

        if (result.secondaryTradeIds && Array.isArray(result.secondaryTradeIds)) {
            result.secondaryTradeIds.forEach(id => {
                if (id !== result.primaryTradeId && validTradeIds.includes(id)) {
                    trades.push({
                        ...tradeKeywords[id],
                        id,
                        confidence: Math.max(0, (parseInt(result.confidence) || 0) - 20),
                        matchedKeywords: [],
                        isPrimary: false
                    })
                }
            })
        }

        return {
            trades,
            primaryTrade: trades[0] || null,
            severity: result.severity || 'Medium',
            diagnosticSummary: result.diagnosticSummary || '',
            safetyAdvice: Array.isArray(result.safetyAdvice) ? result.safetyAdvice : [],
            requiresFollowUp: result.requiresFollowUp || false,
            followUpQuestion: result.followUpQuestion || '',
            confidence: Math.min(100, Math.max(0, parseInt(result.confidence) || 0)),
            source: 'ai',
            degraded: false
        }
    } catch (error) {
        console.error('AI Analysis failed, falling back to keyword matching:', error)
        const fallback = analyzeText(problemText)
        return { ...fallback, source: 'keyword_fallback', degraded: true }
    }
}
```

**Step 2: Update `analyzeText` to include `source` and `degraded` fields**

In the `analyzeText` function return (around line 252), update to:

```jsx
return {
    trades: sortedTrades,
    primaryTrade: sortedTrades[0] || null,
    confidence: sortedTrades[0]?.confidence || 0,
    severity: 'Medium',
    diagnosticSummary: sortedTrades[0] ? `Issue identified as potentially ${sortedTrades[0].name} related.` : 'Could not identify issue.',
    safetyAdvice: [],
    requiresFollowUp: false,
    source: 'keyword',
    degraded: false
}
```

**Step 3: Commit**

```bash
git add src/services/diagnosticService.js
git commit -m "feat: add degraded flag, response validation, and escaped input to diagnosticService"
```

---

### Task 4: Refactor Diagnostic.jsx state to useReducer

**Files:**
- Modify: `src/pages/Diagnostic.jsx:204-316`

**Step 1: Add reducer and initial state**

At the top of `Diagnostic.jsx` (after imports, before `QuickContactModal`), add:

```jsx
import { useState, useReducer } from 'react'
```

Remove `useState` usage for: `analyzing`, `results`, `workers`, `loadingWorkers`. Keep `useState` for `problemText`, `contactModal`, `messagingWorker`.

Before the `Diagnostic` component (after QuickContactModal, before `const Diagnostic`), add:

```jsx
const initialDiagnosticState = {
    status: 'idle', // 'idle' | 'analyzing' | 'loadingWorkers' | 'complete' | 'error'
    results: null,
    workers: [],
    error: null,
    degraded: false,
}

const diagnosticReducer = (state, action) => {
    switch (action.type) {
        case 'ANALYZE_START':
            return { ...initialDiagnosticState, status: 'analyzing' }
        case 'ANALYZE_SUCCESS':
            return { ...state, status: 'loadingWorkers', results: action.payload, degraded: action.payload.degraded || false }
        case 'ANALYZE_FAIL':
            return { ...state, status: 'error', error: action.payload }
        case 'WORKERS_LOADED':
            return { ...state, status: 'complete', workers: action.payload }
        case 'WORKERS_FAILED':
            return { ...state, status: 'complete', workers: [] }
        case 'RESET':
            return { ...initialDiagnosticState }
        default:
            return state
    }
}
```

**Step 2: Replace state variables in the Diagnostic component**

Inside `const Diagnostic = () => {`, replace:
```jsx
const [analyzing, setAnalyzing] = useState(false)
const [results, setResults] = useState(null)
const [workers, setWorkers] = useState([])
const [loadingWorkers, setLoadingWorkers] = useState(false)
```

With:
```jsx
const [state, dispatch] = useReducer(diagnosticReducer, initialDiagnosticState)
const { status, results, workers, error: diagError, degraded } = state
```

**Step 3: Rewrite `handleAnalyze`**

Replace the existing `handleAnalyze` with:
```jsx
const handleAnalyze = async () => {
    if (!problemText.trim()) return

    dispatch({ type: 'ANALYZE_START' })

    try {
        const analysisResults = await analyzeWithAI(problemText)
        dispatch({ type: 'ANALYZE_SUCCESS', payload: analysisResults })

        if (analysisResults.primaryTrade) {
            try {
                const matchingWorkers = await fetchMatchingWorkers(analysisResults.primaryTrade.id)
                dispatch({ type: 'WORKERS_LOADED', payload: matchingWorkers })
            } catch {
                dispatch({ type: 'WORKERS_FAILED' })
            }
        } else {
            dispatch({ type: 'WORKERS_LOADED', payload: [] })
        }
    } catch (error) {
        console.error('Analysis failed:', error)
        dispatch({ type: 'ANALYZE_FAIL', payload: error.message || 'Analysis failed. Please try again.' })
    }
}
```

**Step 4: Refactor `fetchMatchingWorkers` to return data instead of setting state**

Replace the existing `fetchMatchingWorkers` with:
```jsx
const fetchMatchingWorkers = async (tradeId) => {
    const requiredSkills = getTradeSkills(tradeId)

    const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'jobseeker'),
        where('is_verified', '==', true)
    )
    const snapshot = await getDocs(usersQuery)

    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => {
            if (!user.skills || user.skills.length === 0) return false
            const userSkillsLower = user.skills.map(s => s.toLowerCase())
            return requiredSkills.some(reqSkill =>
                userSkillsLower.some(userSkill =>
                    userSkill.includes(reqSkill.toLowerCase()) ||
                    reqSkill.toLowerCase().includes(userSkill)
                )
            )
        })
}
```

**Step 5: Update `clearResults`**

Replace:
```jsx
const clearResults = () => {
    setProblemText('')
    setResults(null)
    setWorkers([])
}
```
With:
```jsx
const clearResults = () => {
    setProblemText('')
    dispatch({ type: 'RESET' })
}
```

**Step 6: Update JSX references**

Throughout the JSX, replace:
- `analyzing` → `status === 'analyzing'`
- `loadingWorkers` → `status === 'loadingWorkers'`
- `results && (` → `results && status !== 'analyzing' && (`
- `!results && !analyzing` → `status === 'idle'`
- `disabled={analyzing || !problemText.trim()}` → `disabled={status === 'analyzing' || !problemText.trim()}`

**Step 7: Commit**

```bash
git add src/pages/Diagnostic.jsx
git commit -m "refactor: replace useState with useReducer state machine in Diagnostic"
```

---

### Task 5: Add error and degradation UI to Diagnostic.jsx

**Files:**
- Modify: `src/pages/Diagnostic.jsx` (JSX section)

**Step 1: Add error state display**

After the input section card (`</div>` around line 419) and before `{results && (`, add:

```jsx
{/* Error State */}
{status === 'error' && (
    <div className="card border-red-200 bg-red-50 animate-fade-in">
        <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">Analysis Failed</h3>
                <p className="text-red-700 text-sm mb-3">{diagError || 'Something went wrong. Please check your connection and try again.'}</p>
                <button onClick={handleAnalyze} className="btn-primary text-sm py-2 px-4">
                    Try Again
                </button>
            </div>
        </div>
    </div>
)}
```

**Step 2: Add degradation banner**

Inside the results section, right after the opening `<div className="space-y-6 animate-fade-in">`, add:

```jsx
{/* Degradation Warning */}
{degraded && (
    <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <Info className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <p className="text-sm text-yellow-800">
            <span className="font-semibold">AI analysis was unavailable.</span> Showing keyword-based results which may be less accurate.
        </p>
    </div>
)}
```

**Step 3: Commit**

```bash
git add src/pages/Diagnostic.jsx
git commit -m "feat: add error state display and degradation warning banner"
```

---

### Task 6: Update diagnosticService tests

**Files:**
- Modify: `src/services/diagnosticService.test.js`

**Step 1: Add tests for new `source` and `degraded` fields**

Add these tests to the existing `analyzeText` describe block:

```jsx
it('includes source field set to keyword', () => {
    const result = analyzeText('leaking pipe')
    expect(result.source).toBe('keyword')
    expect(result.degraded).toBe(false)
})

it('returns source=keyword and degraded=false for keyword analysis', () => {
    const result = analyzeText('I need electrical wiring help')
    expect(result.source).toBe('keyword')
    expect(result.degraded).toBe(false)
})
```

Add a new describe block for `analyzeWithAI` edge cases:

```jsx
describe('analyzeWithAI', () => {
    it('returns empty trades for empty input', async () => {
        const { analyzeWithAI } = await import('./diagnosticService')
        const result = await analyzeWithAI('')
        expect(result.trades).toEqual([])
        expect(result.source).toBe('none')
    })

    it('returns empty trades for null input', async () => {
        const { analyzeWithAI } = await import('./diagnosticService')
        const result = await analyzeWithAI(null)
        expect(result.trades).toEqual([])
    })
})
```

**Step 2: Run tests**

```bash
npx vitest run src/services/diagnosticService.test.js
```

Expected: All existing tests pass + new tests pass.

**Step 3: Commit**

```bash
git add src/services/diagnosticService.test.js
git commit -m "test: add tests for source/degraded fields and analyzeWithAI edge cases"
```

---

### Task 7: Add geminiService safe parse tests

**Files:**
- Modify: `src/services/geminiService.test.js`

**Step 1: Add tests for `safeParseAIJSON`**

The existing geminiService tests are all failing (pre-existing). Add a new describe block that tests `parseAIJSON` and `safeParseAIJSON` directly (no API mocking needed):

```jsx
import { parseAIJSON, safeParseAIJSON } from './geminiService'

describe('parseAIJSON', () => {
    it('parses valid JSON', () => {
        expect(parseAIJSON('{"key": "value"}')).toEqual({ key: 'value' })
    })

    it('strips markdown code blocks', () => {
        expect(parseAIJSON('```json\n{"key": "value"}\n```')).toEqual({ key: 'value' })
    })

    it('strips generic code blocks', () => {
        expect(parseAIJSON('```\n{"key": "value"}\n```')).toEqual({ key: 'value' })
    })

    it('throws on invalid JSON', () => {
        expect(() => parseAIJSON('not json')).toThrow()
    })
})

describe('safeParseAIJSON', () => {
    it('returns ok:true for valid JSON', () => {
        const result = safeParseAIJSON('{"key": "value"}')
        expect(result.ok).toBe(true)
        expect(result.data).toEqual({ key: 'value' })
    })

    it('returns ok:false for invalid JSON', () => {
        const result = safeParseAIJSON('not json')
        expect(result.ok).toBe(false)
        expect(result.error).toBeTruthy()
        expect(result.raw).toBe('not json')
    })

    it('returns ok:false for empty string', () => {
        const result = safeParseAIJSON('')
        expect(result.ok).toBe(false)
    })
})
```

**Note:** Add these as a SEPARATE describe block. Do NOT modify or fix the pre-existing failing tests.

**Step 2: Run only the new tests**

```bash
npx vitest run src/services/geminiService.test.js
```

The pre-existing 10 tests will still fail. Our new tests should pass.

**Step 3: Commit**

```bash
git add src/services/geminiService.test.js
git commit -m "test: add parseAIJSON and safeParseAIJSON unit tests"
```

---

### Task 8: Verify build and full test suite

**Files:** None (verification only)

**Step 1: Run build**

```bash
npx vite build
```

Expected: Build succeeds with no errors.

**Step 2: Run tests**

```bash
npx vitest run
```

Expected: Same pre-existing failures only (geminiService API tests, MyApplications). All new tests pass.

**Step 3: Verify git log**

```bash
git log --oneline -8
```

Should show all our commits in order.
