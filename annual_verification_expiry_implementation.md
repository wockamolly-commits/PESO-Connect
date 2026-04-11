# Annual Verification Expiry Implementation Plan

## Goal

Expire user verification annually after December 31 so employer and jobseeker accounts must be re-verified each new year.

## Current State

- Active verification is tracked through `users.is_verified`.
- Per-subtype verification also exists on profile tables based on the implemented per-subtype design:
  - `jobseeker_profiles.is_verified`
  - `employer_profiles.is_verified`
  - `homeowner_profiles.is_verified`
- `ProtectedRoute` uses `isVerified()` from `src/contexts/AuthContext.jsx`.
- Jobseekers need verification to apply for jobs, and employers need verification to post jobs.
- Homeowners are intentionally auto-verified and should not be part of annual PESO re-verification.

## Recommended Business Rules

- Expiry applies to:
  - employers
  - jobseekers
- Expiry does not apply to:
  - homeowners
  - admins
- Verification expires at the start of each new year, meaning on January 1 the previous year's approvals are no longer valid.
- Reverification should preserve historical status data while clearly marking the current account as expired.

## Step-by-Step Breakdown

### Phase 1: Add expiry metadata

1. Add fields to store the last successful verification year and expiration timestamp.
2. Backfill existing verified jobseekers and employers with a reasonable baseline year.
3. Keep the current `is_verified` boolean for compatibility with the existing auth and route flow.

### Phase 2: Make expiry explicit in admin-managed verification writes

1. Update admin approval logic so new approvals write:
   - `is_verified = true`
   - `verified_for_year = current_year`
   - `verification_expires_at = January 1 of next year`
2. Update rejection logic so rejected users remain unverified and clear the active-year markers if appropriate.

### Phase 3: Add an annual reset mechanism

1. Create a scheduled process that runs every January 1 in Asia/Manila time.
2. Reset eligible verified users to unverified when their verification year is now stale.
3. Mirror the same reset into the active profile table so subtype switching cannot restore expired verification.

### Phase 4: Surface expiry state in the UI

1. Add an `expired` or `needs_reverification` indicator for admin queues.
2. Show a clear dashboard message to expired employers and jobseekers explaining why access was removed.
3. Keep homeowners unchanged.

### Phase 5: Update verification queues and filters

1. Treat expired users as pending re-verification in the admin dashboard.
2. Add filters for:
   - pending first-time verification
   - expired and awaiting renewal
   - currently verified for the active year

### Phase 6: Testing

1. Verify a verified jobseeker can apply on December 31 but not on January 1 after the reset.
2. Verify a verified employer can post on December 31 but not on January 1 after the reset.
3. Verify homeowners keep normal access.
4. Verify re-approval restores access for the new year.

## Database Schema Changes

### Users table

Add the following fields to `public.users`:

```sql
alter table public.users
  add column if not exists verified_for_year integer,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_expired_at timestamptz;
```

### Profile tables

Add mirrored fields to:

- `public.jobseeker_profiles`
- `public.employer_profiles`

Optional mirror fields:

```sql
alter table public.jobseeker_profiles
  add column if not exists verified_for_year integer,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_expired_at timestamptz;

alter table public.employer_profiles
  add column if not exists verified_for_year integer,
  add column if not exists verification_expires_at timestamptz,
  add column if not exists verification_expired_at timestamptz;
```

### Optional status field refinement

- Reuse existing `jobseeker_status` and `employer_status`.
- Do not overload them with too many meanings unless the team wants explicit states such as `expired`.
- Preferred pattern:
  - keep status values for approval workflow
  - use the new expiry fields to determine whether a previously approved user still counts as currently verified

## Suggested Reset Logic

### Scheduled SQL or edge function behavior

On January 1 each year:

1. Find all verified employers and jobseekers where `verified_for_year < current_year`.
2. Set `is_verified = false`.
3. Set `verification_expired_at = now()`.
4. Update the corresponding profile table row to `is_verified = false`.
5. Optionally set workflow status back to `pending` if PESO wants re-verification to enter the same queue immediately.

## Code Changes Required

### SQL and automation

- Create `sql/annual_verification_expiry.sql` for schema additions and helper SQL.
- Add either:
  - a Supabase scheduled edge function, or
  - a cron-triggered SQL job

Preferred implementation: a scheduled edge function so time-zone handling and logging are clearer.

### Auth and guards

- Update `src/contexts/AuthContext.jsx` so fetched user data includes the new expiry fields.
- Keep `isVerified()` compatible by continuing to rely on `is_verified`, which the annual reset will flip off.

### Admin dashboard

- Update `src/pages/admin/Dashboard.jsx`:
  - `handleApprove` should write new annual verification metadata.
  - filters and counts should distinguish active-year verified users from expired users.
- Update verification section components so expired accounts can be labeled clearly.

### Employer and jobseeker UX

- Update `src/components/ProtectedRoute.jsx` messaging for unverified but previously verified users when useful.
- Update `src/pages/Dashboard.jsx` to show an annual re-verification notice for expired accounts.
- Update job application and posting flows only if more contextual error text is needed.

## Suggested File Deliverables

- `sql/annual_verification_expiry.sql`
- `supabase/functions/annual-verification-reset/index.ts`
- `src/pages/admin/Dashboard.jsx`
- `src/contexts/AuthContext.jsx`
- `src/components/admin/JobseekerVerificationSection.jsx`
- `src/components/admin/EmployerVerificationSection.jsx`
- `src/pages/Dashboard.jsx`
- `src/components/ProtectedRoute.jsx`

## Risks and Notes

- A pure client-side date check is not enough. The source of truth must be updated on the backend or in scheduled SQL.
- Homeowners should be excluded deliberately, otherwise the current auto-verified homeowner flow will regress.
- If the admin dashboard continues using only `is_verified`, expired users will disappear from the verified list correctly, but the UI still needs a way to tell first-time pending and annual renewal apart.
