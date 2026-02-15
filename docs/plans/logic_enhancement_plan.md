# Job Matching & Diagnostic Flow — Logic Enhancement Plan

**Date:** 2026-02-15
**Scope:** `diagnosticService.js`, `geminiService.js`, `Diagnostic.jsx`, Individual/Homeowner flow consistency
**Method:** Systems audit with specific, high-impact improvements

---

## 1. Logical Audit: Happy-Path Assumptions & Edge Cases

### 1.1 `geminiService.js` — Critical Issues

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| G1 | **`parseAIJSON` throws on malformed JSON with no recovery** | HIGH | `geminiService.js:70-81` | `JSON.parse()` throws a raw `SyntaxError` if the AI returns invalid JSON. The error message ("Unexpected token...") is unhelpful. Every caller must wrap this in try/catch or the app crashes. |
| G2 | **`callAI` returns empty string silently** | MEDIUM | `geminiService.js:64` | If `data.choices` is undefined or empty, `callAI` returns `''`. Downstream, `parseAIJSON('')` throws `SyntaxError`. This is a silent failure that manifests as a confusing crash. |
| G3 | **No timeout on `fetch` call** | MEDIUM | `geminiService.js:35-51` | If Groq API hangs, the user waits forever. No `AbortController` or timeout. The UI shows "Analyzing with AI..." indefinitely. |
| G4 | **Rate-limit (429) handling is throw-only** | LOW | `geminiService.js:56-58` | Throws an error but doesn't implement retry-with-backoff. The user sees an error and must manually retry. |
| G5 | **Cache key collision risk in `batchCalculateMatches`** | LOW | `geminiService.js:288` | Cache key uses `skills?.join(',')` which produces identical keys for `['A,B', 'C']` and `['A', 'B,C']`. Edge case but real. |
| G6 | **`analyzeResume` has no caching** | LOW | `geminiService.js:132-210` | Every call makes a fresh API request even for the same resume text. Other functions use caching. |
| G7 | **`response.json()` in error path can fail** | LOW | `geminiService.js:54` | If the error response isn't JSON (e.g., HTML 502 from a proxy), `.json()` throws inside the `.catch(() => ({}))` — handled, but the error message becomes generic. |

### 1.2 `diagnosticService.js` — Critical Issues

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| D1 | **`analyzeWithAI` silently swallows all errors** | HIGH | `diagnosticService.js:203-206` | On ANY failure (network, malformed JSON, API key missing), it falls back to keyword matching with only a `console.error`. The user has no idea they're getting degraded results. |
| D2 | **AI prompt has unescaped user input** | MEDIUM | `diagnosticService.js:141` | `problemText` is injected directly into the prompt string. If the user types text with quotes or backticks, it could malform the prompt (not a security issue since it's server-side AI, but causes unexpected results). |
| D3 | **Secondary trade confidence is arbitrary** | LOW | `diagnosticService.js:185` | Secondary trades get `confidence - 20` which is meaningless — the AI didn't provide a confidence for secondaries, we're fabricating a number. |
| D4 | **`analyzeWithAI` doesn't validate AI response shape** | MEDIUM | `diagnosticService.js:163-202` | If the AI returns `{"primaryTradeId": "painting"}` (a trade we don't support), it silently produces an empty trades array. No warning. |
| D5 | **Keyword matching has ambiguous multi-trade words** | LOW | `diagnosticService.js:89,104,114` | "door" matches both welding and carpentry. "frame" matches both welding and carpentry. This is correct behavior for the fallback, but the confidence scores can be misleading. |

### 1.3 `Diagnostic.jsx` — Critical Issues

| # | Issue | Severity | Location | Description |
|---|-------|----------|----------|-------------|
| P1 | **No error state displayed to user** | HIGH | `Diagnostic.jsx:225-237` | `handleAnalyze` catches errors with `console.error` only. If analysis fails, the user sees nothing — no error message, no feedback. The button just stops spinning. |
| P2 | **QuickContactModal uses removed `registerIndividual`** | CRITICAL | `Diagnostic.jsx:35` | `const { registerIndividual } = useAuth()` — this method was removed from AuthContext in Task 7 (commit `98c81e9`). **This is a runtime crash.** |
| P3 | **`fetchMatchingWorkers` fetches ALL verified jobseekers** | MEDIUM | `Diagnostic.jsx:246-251` | Queries every verified jobseeker from Firestore, then filters client-side. With many users, this is expensive and slow. Firestore `array-contains` could narrow the query. |
| P4 | **No loading/error boundary around worker messaging** | LOW | `Diagnostic.jsx:296-310` | If `getOrCreateConversation` fails, it silently falls back to query params. No user feedback. |
| P5 | **State is a loose collection of `useState` hooks** | MEDIUM | `Diagnostic.jsx:208-216` | 6 independent state variables with implicit dependencies (e.g., `results` must be set before `workers` is meaningful). Easy to get into inconsistent states. |

---

## 2. State Management Review: `Diagnostic.jsx`

### Current State (6 independent useState hooks)
```
problemText    → string
analyzing      → boolean
results        → null | DiagnosticResult
workers        → Worker[]
loadingWorkers → boolean
contactModal   → { open, worker }
messagingWorker → string | null
```

### Problem
- `results` and `workers` are implicitly linked but independently managed
- No representation of "error" state — failures are swallowed
- `analyzing` and `loadingWorkers` are separate booleans that could conflict
- After a failed analysis, previous `results` stay visible (stale data)

### Proposed: `useReducer` State Machine

```
State shape:
{
  status: 'idle' | 'analyzing' | 'loadingWorkers' | 'complete' | 'error',
  problemText: string,
  results: DiagnosticResult | null,
  workers: Worker[],
  error: string | null,
  degraded: boolean,  // true if using keyword fallback
}

Actions:
- ANALYZE_START      → { status: 'analyzing', results: null, workers: [], error: null, degraded: false }
- ANALYZE_SUCCESS    → { status: 'loadingWorkers', results: payload }
- ANALYZE_DEGRADED   → { status: 'loadingWorkers', results: payload, degraded: true }
- ANALYZE_FAIL       → { status: 'error', error: payload }
- WORKERS_LOADED     → { status: 'complete', workers: payload }
- WORKERS_FAILED     → { status: 'complete', workers: [] }  // non-fatal
- RESET              → back to idle
```

**Benefits:**
- Impossible to be in `analyzing` and `complete` at the same time
- Error state is explicit and renderable
- `degraded` flag tells the UI to show "Results may be less accurate (AI unavailable)"
- Single dispatch replaces multiple `setState` calls

---

## 3. Consistency Check: Individual/Homeowner Flow

### Issue P2 (CRITICAL): `QuickContactModal` is broken

The `QuickContactModal` in `Diagnostic.jsx:35` destructures `registerIndividual` from `useAuth()`, but this method was removed from AuthContext in the cleanup task. **This will crash at runtime when an unauthenticated user clicks "Message Worker".**

**Fix:** Replace `registerIndividual` with the new `createAccount` + `completeRegistration` flow:
```jsx
const { createAccount, completeRegistration } = useAuth()

// In handleSubmit:
await createAccount(form.email, form.password, 'individual')
await completeRegistration({
    full_name: form.name,
    name: form.name,
    contact_number: form.phone,
    individual_status: 'active',
})
```

### Schema Consistency

The Individual/Homeowner Firestore document created by `createAccount` has:
- `registration_complete: false` initially
- `is_verified: true` (auto-verified)

After `completeRegistration`, it gains:
- `registration_complete: true`
- `full_name`, `name`, `contact_number`

This aligns with the schema expected by:
- `PublicProfile.jsx` — reads `full_name`, `name`, `role`, `bio`, `service_preferences` ✅
- `IndividualProfileEdit.jsx` — reads/writes the same fields ✅
- `Navbar.jsx` — reads `name`, `role`, `profile_photo` ✅
- `profileCompletion.js` — individual checks reference `full_name`, `contact_number`, `city`, `province`, `bio`, `service_preferences` ✅

**No schema debt identified** aside from the broken `registerIndividual` reference.

---

## 4. Resiliency: Error Boundaries & Graceful Degradation

### Current Failure Modes

| Scenario | Current Behavior | User Experience |
|----------|-----------------|-----------------|
| AI API key missing | `callAI` throws → `analyzeWithAI` catches → keyword fallback | Silent degradation, no indicator |
| AI returns malformed JSON | `parseAIJSON` throws → `analyzeWithAI` catches → keyword fallback | Silent degradation |
| AI API timeout (hangs) | Infinite loading spinner | User stuck forever |
| AI rate limited (429) | Error thrown → keyword fallback | Silent degradation |
| Firestore query fails | `console.error` only | Empty workers list, no explanation |
| Network offline | fetch throws → keyword fallback | Silent degradation |

### Proposed Resiliency Improvements

**R1. Wrap `callAI` with timeout (15s):**
```js
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 15000)
const response = await fetch(url, { ...options, signal: controller.signal })
clearTimeout(timeout)
```

**R2. Make `parseAIJSON` return a Result type instead of throwing:**
```js
export const safeParseAIJSON = (text) => {
    try {
        return { ok: true, data: parseAIJSON(text) }
    } catch (e) {
        return { ok: false, error: e.message, raw: text }
    }
}
```

**R3. Add `degraded` flag to `analyzeWithAI` return:**
```js
return {
    ...result,
    source: 'ai',       // or 'keyword_fallback'
    degraded: false,     // or true
}
```

**R4. Show degradation banner in UI:**
When `results.degraded === true`, show:
> "AI analysis was unavailable. Showing keyword-based results which may be less accurate."

**R5. Add error state to Diagnostic.jsx:**
When analysis fails completely (no fallback possible), show an error card:
> "Something went wrong. Please check your connection and try again."

---

## 5. Prioritized Implementation Tasks

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| **P0** | Fix `QuickContactModal` broken `registerIndividual` call | Runtime crash | Small |
| **P1** | Add error state to `Diagnostic.jsx` (user sees nothing on failure) | UX | Small |
| **P2** | Add 15s timeout to `callAI` via `AbortController` | Prevents infinite hang | Small |
| **P3** | Refactor Diagnostic state to `useReducer` with explicit states | Architecture | Medium |
| **P4** | Add `degraded` flag to `analyzeWithAI` + show banner in UI | UX | Small |
| **P5** | Make `parseAIJSON` safer (Result type or logged fallback) | Resiliency | Small |
| **P6** | Validate AI response shape in `analyzeWithAI` (unknown trade IDs) | Correctness | Small |
| **P7** | Add `analyzeResume` caching (parity with other functions) | Performance | Small |
| **P8** | Improve `fetchMatchingWorkers` Firestore query efficiency | Performance | Medium |
| **P9** | Add retry-with-backoff for 429 rate limits | Resiliency | Medium |

---

## Summary

The diagnostic flow works on the happy path but has **1 critical runtime bug** (P2 — removed `registerIndividual`) and **several silent failure modes** that leave users confused. The highest-impact improvements are:

1. Fix the broken QuickContactModal (P0 — crash)
2. Surface errors to the user instead of swallowing them (P1)
3. Add a timeout so the UI can't hang forever (P2)
4. Use a reducer to make state transitions explicit and safe (P3)
5. Tell users when they're getting degraded keyword-only results (P4)
