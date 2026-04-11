# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server on :5173 (opens browser)
npm run build            # Production build to dist/
npm run preview          # Preview built output
npm run lint             # ESLint across the repo
npm test                 # Vitest (run once)
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Vitest with v8 coverage
```

Run a single test file: `npx vitest run src/pages/Login.test.jsx`
Run tests by name: `npx vitest run -t "renders login"`

Vitest uses `jsdom` and `src/test/setup.js`. The `.worktrees/**` folder is excluded from test discovery.

## Stack

React 18 + Vite + React Router 6 + TailwindCSS, Supabase (`@supabase/supabase-js`) for auth/DB/storage/realtime, Supabase Edge Functions (Deno/TypeScript) for matching and notification email. Gemini (`@google/genai`) and Cohere (server-side) are used for AI-assisted matching/explanations.

## Architecture

### Auth + user data flow (central)
`src/contexts/AuthContext.jsx` is the single source of truth for the logged-in user. It:
- Wraps the app in `AuthProvider` (see `src/App.jsx`).
- On login/session restore, calls `fetchUserData(userId)` which **merges** `public.users` (base record) with the appropriate role profile table (`jobseeker_profiles`, `employer_profiles`, or `individual_profiles` — "homeowner" in UI maps to `individual` in the DB). The merged object is what the rest of the app consumes as `userData`.
- Caches the merged profile in `localStorage` under `peso-profile-${userId}` so the navbar/dashboard render immediately on reload without a "User" flash. `createAccount`, `saveRegistrationStep`, and `completeRegistration` all keep this cache in sync.
- Exposes `fetchUserData` in the context value — pages that mutate profile data (e.g. `JobseekerProfileEdit`) must call it after saving so the merged cache refreshes.
- Uses `signOut({ scope: 'local' })` for instant logout (no server round-trip).
- `onAuthStateChange` hydrates from the localStorage cache first, then replaces with the fresh merged fetch.

When adding a new profile field, it must be added to (a) the role profile table migration in `sql/`, (b) the registration page that writes it, (c) the profile-edit page, and (d) anywhere `fetchUserData`'s merge consumers read it. The base `public.users` row is auto-created on signup by the DB trigger `handle_new_user()` (see `sql/create_trigger_new_user.sql`).

### Roles and routing
Three end-user roles: `jobseeker`, `employer`, `homeowner` (DB: `individual`), plus `admin`. Role gating is done in `src/App.jsx` via `<ProtectedRoute allowedRoles={[...]} requireVerified>`. Admin routes live under `/admin/*` and the navbar/footer are hidden for them (`AppContent` in `App.jsx`).

Registration is a multi-step wizard with resumable state — `users.registration_step` + `registration_complete` drive `RegistrationContinue.jsx`. Separate registration pages per role (`JobseekerRegistration`, `EmployerRegistration`, `HomeownerRegistration`) and matching profile-edit pages share form components under `src/components/registration` and `src/components/forms`.

Employer `PostJob` is reused in edit mode via the `/edit-job/:id` route (detects an `:id` param and switches between insert and update). `MyListings` surfaces per-job Edit/View/Delete actions.

### Database
Supabase Postgres. Key tables (see `sql/` for migrations — applied in roughly numeric/phase order):
- `public.users` — base user (id, email, role, registration state, verification)
- `public.jobseeker_profiles` / `employer_profiles` / `individual_profiles` — role-specific fields (skills, work_experiences, company info, etc.)
- `public.job_postings` + `public.applications` (UNIQUE on `(job_id, user_id)`) — `sql/phase3_jobs_tables.sql`
- `public.conversations` (text PK formed from sorted `uid1_uid2`, `text[]` participants) + `public.messages` — `sql/phase5_messaging_tables.sql`, with Supabase Realtime publication enabled
- Embeddings/matching tables — `sql/create_hybrid_matching_tables.sql`, `sql/add_match_scoring_columns.sql`

RLS policies are spread across the migration files; check `phase2_public_read_policies.sql`, `add_applicant_update_policy.sql` etc. when touching read/write access.

### Messaging
`src/services/messagingService.js` wraps conversations/messages and subscribes to Supabase Realtime (`postgres_changes`). Messaging UI components in `src/components/messaging` use **snake_case** field names that mirror the DB (`participant_info`, `unread_count`, …) — do not camelCase them at the component boundary.

### Matching / AI
Two-layer system:
1. **Client**: `src/services/matchingService.js` orchestrates job-matching requests; `src/services/matching/deterministicScore.js` mirrors the scoring logic used server-side for local/preview scoring; `src/services/geminiService.js` calls Gemini for explanations.
2. **Server (Supabase Edge Functions, `supabase/functions/`)**:
   - `match-jobs` — main matcher. Combines a deterministic rule score (`_shared/deterministicScore.ts`) with Cohere embeddings (`_shared/cohere.ts`, `_shared/embeddingStore.ts`, `_shared/similarity.ts`). Current matcher version string is `inferential-v1`.
   - `refresh-job-embedding` / `refresh-profile-embedding` — regenerate stored embeddings when underlying text changes. Use `_shared/matchingText.ts` + `_shared/hash.ts` for text canonicalization and change detection.
   - `generate-match-explanation` — LLM-generated rationale for a specific match.
   - `send-notification-email` — transactional email (see `EMAIL_NOTIFICATIONS_SETUP.md`).

If you change how profile or job text is built for embeddings, update `_shared/matchingText.ts` and trigger an embedding refresh; the hash in `_shared/hash.ts` is what detects staleness.

### Tests
Test files live next to source (`*.test.jsx`/`*.test.js`). `src/test/setup.js` wires up `@testing-library/jest-dom`. Shared mocks in `src/test/mocks/` — prefer extending those over re-mocking Supabase per file. `src/test/test-utils.jsx` provides a render helper that wraps with providers.

## Conventions specific to this repo

- **"Homeowner" vs "individual"**: UI/routes say `homeowner`; DB role + table say `individual`. `/register/individual` is redirected to `/register/homeowner`. Don't "fix" one to match the other.
- Firebase migration is complete. `src/config/firebase.js` may still exist but nothing should import it — always use `src/config/supabase.js`.
- Every route in `App.jsx` is individually wrapped in `<ErrorBoundary>` — keep that pattern when adding new routes.
- After any mutation of a user's own profile, call `fetchUserData(user.id)` from `AuthContext` so the merged cache + localStorage stay current.
