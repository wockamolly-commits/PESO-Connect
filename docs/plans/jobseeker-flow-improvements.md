# Jobseeker Flow Improvements — Implementation Plan

**Created**: 2026-03-17
**Status**: Planned
**Context**: Analysis of the full jobseeker user-side flow identified 19 issues across registration, profile editing, dashboard, job browsing, application tracking, auth logic, and admin verification.

---

## HIGH Priority

### 1. Dashboard verification banner uses `employer_status` for jobseekers

**Files**: `src/pages/Dashboard.jsx` (lines 87–124)

**Change**: The rejection/pending banner currently checks `userData?.employer_status === 'rejected'` for all non-individual roles. This is wrong for jobseekers — they use `jobseeker_status`.

- Add role-aware status resolution: if `isJobseeker()`, read `userData?.jobseeker_status`; if `isEmployer()`, read `userData?.employer_status`.
- Apply this to all four places `employer_status` appears in the banner block: the conditional class (line 87), the icon (line 92–95), the heading text (line 100–105), the body text (lines 107–113), and the rejection reason display (line 114).
- Extract a local variable like `const verificationStatus = isJobseeker() ? userData?.jobseeker_status : userData?.employer_status` at the top of the banner block and use it throughout.

### 2. No path for rejected jobseekers to reapply

**Files**: `src/pages/Dashboard.jsx`, `src/contexts/AuthContext.jsx`

**Change**: When a jobseeker is rejected (status banner shows rejection reason), there is currently no action they can take.

- In `Dashboard.jsx`: Inside the rejection banner (where `rejection_reason` is shown), add a "Update Profile & Request Re-Review" button that links to `/profile/edit`.
- In `Dashboard.jsx`: Add a second button or make the first button trigger a function `requestReReview` that:
  1. Updates `jobseeker_profiles.jobseeker_status` to `'pending'` and clears `rejection_reason`.
  2. Updates `users.is_verified` to `false` (should already be false).
  3. Refreshes `userData` via `fetchUserData`.
- In `AuthContext.jsx`: Add a `requestReVerification()` function that does the two Supabase updates above (update `users` set `is_verified = false`, update `jobseeker_profiles` set `jobseeker_status = 'pending', rejection_reason = ''`).
- Alternatively, keep it simpler: the "Request Re-Review" button just resets `jobseeker_status` to `pending` in `jobseeker_profiles` directly from Dashboard (no new AuthContext method needed — just a direct Supabase call).

### 3. Resume storage inconsistency between registration and profile edit

**Files**: `src/pages/JobseekerRegistration.jsx` (lines 396–409, 443–453), `src/components/registration/Step5SkillsExperience.jsx`

**Change**: Registration stores resumes as Base64 via `compressAndEncode`. Profile edit uses `ResumeUpload` component which uploads to Supabase Storage and stores a URL. The field `resume_url` can hold either format, causing downstream confusion.

- Replace the Base64 resume handling in registration Step 5 with the same `ResumeUpload` component used in profile edit.
- In `JobseekerRegistration.jsx` `nextStep()` (line 396–409): Instead of calling `compressAndEncode(resumeFile)`, upload the file to Supabase Storage bucket `resumes` with path `{userId}/{filename}` and store the public URL.
- The `ResumeUpload` component already handles this — wire it into Step 5 the same way `JobseekerProfileEdit.jsx` does, passing `resumeUrl`/`setResumeUrl` state.
- For certificate files: keep Base64 for now (certificates are smaller and viewed inline by admin), or migrate those too if straightforward.
- Update `handleSubmit` (line 443–453) to not re-encode the resume if it's already a URL.

### 4. Base64 documents bloating the database

**Files**: `src/pages/JobseekerRegistration.jsx`, `src/contexts/AuthContext.jsx` (`compressAndEncode`), potentially a new migration script in `sql/`.

**Change**: This is largely solved by issue #3 above (switching registration to Supabase Storage). Additionally:

- Create a one-time migration script `sql/migrate_base64_resumes.sql` or a Node script that:
  1. Queries all `jobseeker_profiles` where `resume_url` starts with `data:` (Base64).
  2. Decodes the Base64, uploads to Supabase Storage `resumes/{user_id}/resume.*`.
  3. Updates `resume_url` to the storage URL.
- For certificates: assess if they should also move to Storage. If yes, create `certificate_files` bucket and store URLs instead of `{name, data, type}` objects. The admin document viewer would need to handle URL-based certificates.
- This can be done incrementally — fix registration first (issue #3), then migrate existing data.

### 5. No email verification enforced

**Files**: `src/pages/JobseekerRegistration.jsx`, `src/contexts/AuthContext.jsx`, Supabase dashboard config

**Change**: Supabase Auth supports email confirmation but the app doesn't gate on it.

- In Supabase dashboard: Enable "Confirm email" under Authentication > Settings (if not already enabled).
- In `JobseekerRegistration.jsx`: After `createAccount` succeeds on Step 1, show an interstitial message: "We sent a verification email to {email}. Please click the link in that email to continue." Don't advance to Step 2 until the email is confirmed.
- In `AuthContext.jsx` `createAccount`: After `signUp`, check `data.user.email_confirmed_at`. If null, return a status indicating email confirmation is pending.
- Add a polling mechanism or listener: check `supabase.auth.getUser()` periodically (every 5 seconds) to see if `email_confirmed_at` is now set, then auto-advance to Step 2.
- Alternative simpler approach: Let the user proceed but show a persistent banner on dashboard saying "Please verify your email" and block job applications until email is verified (check `currentUser.email_confirmed_at`).

---

## MEDIUM Priority

### 6. Auto-navigate after profile save is too fast

**Files**: `src/pages/JobseekerProfileEdit.jsx` (lines 339–342)

**Change**: Replace `setTimeout(() => navigate('/dashboard'), 2000)` with a persistent success message and a manual "Back to Dashboard" button. Remove the auto-navigate entirely. Show the success message at the top of the form, and add a `<Link to="/dashboard">` button next to it.

### 7. No unsaved changes warning on route navigation

**Files**: `src/pages/JobseekerProfileEdit.jsx`

**Change**: Add React Router navigation blocking when `isDirty` is true.

- Import `useBlocker` from `react-router-dom`.
- Add `useBlocker(isDirty)` and render a confirmation dialog when blocked: "You have unsaved changes. Leave anyway?"
- The existing `beforeunload` handler (lines 99–107) stays for browser close/refresh.

### 8. Incomplete registration "Continue" link verification

**Files**: `src/App.jsx` (routes), `src/pages/Dashboard.jsx` (line 77)

**Change**: Verify that `/register/continue` is a defined route in `App.jsx`. If it doesn't exist:

- Either add a route `/register/continue` that redirects to `/register/jobseeker` (which already has restore-from-saved logic).
- Or change the Dashboard link from `/register/continue` to `/register/jobseeker`.
- Test: create an account, abandon at step 3, log in, click the banner — should resume at step 4.

### 9. Employer dashboard stats are hardcoded zeros

**Files**: `src/pages/Dashboard.jsx` (lines 226–243)

**Change**: For employer users, fetch actual counts:

- Add a `useEffect` that runs when `isEmployer() && currentUser`:
  - Query `supabase.from('job_postings').select('id', { count: 'exact' }).eq('employer_id', currentUser.uid).eq('status', 'open')` for active jobs count.
  - Query `supabase.from('applications').select('id', { count: 'exact' }).in('job_id', [array of employer's job IDs])` for total applications count. Or use an RPC/view for efficiency.
- Replace the hardcoded `0` values with the fetched counts.
- Show a loading skeleton while fetching.

### 10. Profile editing doesn't flag re-verification

**Files**: `src/pages/JobseekerProfileEdit.jsx` (handleSubmit), admin `JobseekerCard.jsx`

**Change**: When a verified jobseeker saves profile changes to "critical" fields, flag the profile for admin review.

- Define critical fields: `full_name`, `highest_education`, `school_name`, `resume_url`, `certifications`.
- In `handleSubmit`: Compare the saved values against `initialFormDataRef.current`. If any critical field changed AND user is currently verified, set a new field `profile_modified_since_verification = true` on `jobseeker_profiles`.
- In `JobseekerCard.jsx`: If `jobseeker.profile_modified_since_verification === true` and status is `verified`, show a yellow "Profile Modified" badge so admin knows to re-check.
- Do NOT automatically un-verify — that would be too disruptive. Just flag it.

### 11. MyApplications doesn't show closed/deleted jobs

**Files**: `src/pages/MyApplications.jsx` (lines 30–45)

**Change**: Join applications with job_postings to get current job status.

- Change the query from `.select('*')` to `.select('*, job_postings(status, location)')` — this uses Supabase's foreign key join syntax (requires FK from `applications.job_id` to `job_postings.id`).
- In the application card rendering: if `app.job_postings?.status !== 'open'`, show a "Job Closed" or "Job No Longer Available" badge next to the job title.
- If the join doesn't work (FK not set), use a separate query to fetch job statuses for all `job_id`s in the applications list.

### 12. Skill normalization missing at registration time

**Files**: `src/pages/JobseekerRegistration.jsx` (lines 176–188, 327–364), or `src/components/registration/Step5SkillsExperience.jsx`

**Change**: Registration's `addSkill` function just does `skillInput.trim()`. Profile edit uses `normalizeSkillName` and `deduplicateSkills` from geminiService.

- Import `normalizeSkillName` from `../services/geminiService` in `JobseekerRegistration.jsx`.
- In `addSkill()` (line 176): change `skillInput.trim()` to `normalizeSkillName(skillInput.trim())`.
- In `getStepData(5)` (line 356–361): wrap `formData.skills` with `deduplicateSkills(formData.skills)` before saving.
- This ensures consistent skill representation from the start.

### 13. Password policy too weak

**Files**: `src/pages/JobseekerRegistration.jsx` (line 276), `src/utils/validation.js`

**Change**: Increase minimum from 6 to 8 characters and require mixed character types.

- In `validateStep` case 1: change `formData.password.length < 6` to `formData.password.length < 8`.
- In `validation.js`: update the `minLength` check for passwords and add a `passwordComplexity` validator that requires at least one letter and one number.
- Update the password strength indicator to reflect the new requirements.
- Update error message: "Password must be at least 8 characters with at least one letter and one number."

### 14. No server-side validation

**Files**: Supabase SQL migrations (new file `sql/add_check_constraints.sql`)

**Change**: Add database-level CHECK constraints as a safety net:

- `jobseeker_profiles`: `CHECK (array_length(skills, 1) >= 1)` — at least one skill.
- `users`: `CHECK (char_length(email) > 0)` — non-empty email.
- `users`: `CHECK (role IN ('jobseeker', 'employer', 'individual', 'admin'))` — valid role enum.
- `jobseeker_profiles`: `CHECK (jobseeker_status IN ('pending', 'verified', 'rejected'))`.
- `applications`: `CHECK (status IN ('pending', 'shortlisted', 'hired', 'rejected', 'withdrawn'))`.
- These constraints protect against client bypass without needing Edge Functions.

### 15. Portfolio URL not sanitized

**Files**: `src/components/admin/JobseekerCard.jsx` (lines 162–176), `src/pages/JobseekerProfileEdit.jsx` (portfolio_url input)

**Change**: Validate portfolio URL before rendering as a clickable link.

- In `JobseekerCard.jsx`: Before rendering the `<a href={jobseeker.portfolio_url}>`, check that it starts with `https://` or `http://`. If not, render it as plain text.
- In `JobseekerProfileEdit.jsx`: Add client-side validation on the portfolio_url input — on blur, check URL format. Show a field error if it doesn't start with `https://`.
- Optionally: use `new URL(value)` in a try/catch to validate URL format.

---

## LOW Priority

### 16. No pagination on job listings

**Files**: `src/pages/JobListings.jsx` (lines 63–77)

**Change**: Add cursor-based pagination.

- Change `fetchJobs` to accept a `page` parameter. Use `.range(from, to)` on the Supabase query (e.g., 20 per page).
- Add state: `page`, `hasMore`.
- Add a "Load More" button at the bottom of the job list that increments `page` and appends results.
- Alternative: use intersection observer for infinite scroll.
- Update `filteredJobs` count display to show "Showing X of Y jobs".

### 17. `compressAndEncode` duplicated in two files

**Files**: `src/contexts/AuthContext.jsx` (lines 16–65), `src/pages/JobseekerProfileEdit.jsx` (lines 204–254)

**Change**: Extract to `src/utils/fileUtils.js`:

- Create `src/utils/fileUtils.js` with `export const compressAndEncode = (file) => { ... }`.
- Import from both `AuthContext.jsx` and `JobseekerProfileEdit.jsx`.
- Delete the duplicate function bodies from both files.
- Note: If issue #3 (Supabase Storage migration) is done first, the registration path no longer needs this function, reducing the scope.

### 18. Application denormalization can go stale

**Files**: No changes needed — document as intentional.

**Change**: This is a conscious trade-off. The copied `job_title`, `applicant_name`, `applicant_email`, `applicant_skills` in the `applications` table are snapshots at application time, which is actually correct behavior (the application was made with that data).

- Add a comment in `JobDetail.jsx` near the insert (line 149) explaining this is intentional denormalization for historical accuracy.
- In the admin applications view (if it exists), consider joining with `users`/`job_postings` to show current data alongside the snapshot.

### 19. AI match analysis text too small on mobile

**Files**: `src/pages/JobDetail.jsx` (lines 348–548 approximately)

**Change**: Replace all instances of `text-[9px]`, `text-[10px]`, and `text-[11px]` with `text-xs` (12px) as the minimum.

- Search for `text-[9px]` → replace with `text-xs`.
- Search for `text-[10px]` → replace with `text-xs`.
- Search for `text-[11px]` → replace with `text-xs`.
- Test that the AI match card still looks good with the slightly larger text. May need to reduce padding or make the card scrollable if it gets too tall.

---

## Execution Order Recommendation

1. **Issue #1** (Dashboard status bug) — 5 min fix, highest impact
2. **Issue #2** (Rejected reapply path) — pairs with #1
3. **Issue #3 + #4** (Resume storage migration) — do together
4. **Issue #5** (Email verification) — standalone
5. **Issues #6, #7, #8** (UX polish group) — quick wins, do in one session
6. **Issues #9, #11** (Dashboard stats + MyApplications join) — data display fixes
7. **Issues #12, #13, #14, #15** (Validation hardening group) — do in one session
8. **Issue #10** (Re-verification flag) — requires admin coordination
9. **Issues #16–19** (Low priority) — backlog, do when convenient
