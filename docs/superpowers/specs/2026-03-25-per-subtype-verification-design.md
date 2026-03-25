# Per-Subtype Verification Design

## Problem

Homeowners are auto-verified on registration (`is_verified = true`). When they switch to jobseeker via `SubtypeSwitcher`, the verified status carries over — bypassing the admin approval required for all jobseekers. The reverse is also broken: an unverified jobseeker switching to homeowner stays unverified despite homeowners being always auto-verified.

The root cause is that `is_verified`, `registration_complete`, and `registration_step` live only on the `users` table — a single set of flags shared across subtypes.

## Solution

Move verification and registration state into each **profile table** so each subtype owns its own state independently. The `users` table keeps these columns but they become mirrors of the active subtype's profile, synced on every switch and registration write.

## Database Changes

### Add columns to profile tables

**`jobseeker_profiles`:**
- `is_verified BOOLEAN DEFAULT false`
- `registration_complete BOOLEAN DEFAULT false`
- `registration_step INTEGER`

**`homeowner_profiles`:**
- `is_verified BOOLEAN DEFAULT true`
- `registration_complete BOOLEAN DEFAULT false`
- `registration_step INTEGER`

**`employer_profiles`:**
- `is_verified BOOLEAN DEFAULT false`
- `registration_complete BOOLEAN DEFAULT false`
- `registration_step INTEGER`

### Migration

Backfill existing profile rows from the `users` table. Use `COALESCE` to avoid null values on profile rows:

```sql
-- Backfill jobseeker_profiles
UPDATE jobseeker_profiles jp
SET is_verified = COALESCE(u.is_verified, false),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE jp.id = u.id AND u.role = 'user' AND u.subtype = 'jobseeker';

-- Backfill homeowner_profiles
UPDATE homeowner_profiles hp
SET is_verified = COALESCE(u.is_verified, true),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE hp.id = u.id AND u.role = 'user' AND u.subtype = 'homeowner';

-- Backfill employer_profiles
UPDATE employer_profiles ep
SET is_verified = COALESCE(u.is_verified, false),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE ep.id = u.id AND u.role = 'employer';
```

### `handle_new_user()` trigger

The existing trigger sets `is_verified` on `users` only. No changes needed to the trigger itself — profile rows are not created at signup time. Instead, the column defaults handle initial state: `homeowner_profiles.is_verified DEFAULT true`, `jobseeker_profiles.is_verified DEFAULT false`. When the profile row is eventually created (during registration or by SubtypeSwitcher upsert), the correct default applies automatically.

### `users` table

`is_verified`, `registration_complete`, and `registration_step` remain on `users`. They represent the **current active subtype's state** and are synced at write time (switch, registration saves, admin actions). This avoids any changes to read paths (AuthContext, ProtectedRoute).

## SubtypeSwitcher Changes

File: `src/components/SubtypeSwitcher.jsx`

### Visibility constraint

The component only renders when `registration_complete === true` (existing guard on line 15). This means users can only switch after completing their current subtype's registration. If a user switches and abandons the new registration wizard, they won't see the SubtypeSwitcher again — instead, the existing `RegistrationContinue.jsx` redirect handles routing them back to the wizard (it checks `userData.registration_complete` from `users`, which is synced to `false` on switch).

### New `handleSwitch` flow

1. Query the **target profile table** for the user's row.
2. Check `registration_complete` on that row.

**If `registration_complete = true` (previously completed profile):**
- Update `users` with: `subtype = target`, `is_verified = profile.is_verified`, `registration_complete = true`, `registration_step = null`.
- Call `fetchUserData()` to refresh context.
- Navigate to `/dashboard`.

**If `registration_complete = false` or no row exists (first time / abandoned):**
- Create empty profile row if needed (upsert with `ignoreDuplicates`). Column defaults set correct `is_verified`.
- Update `users` with: `subtype = target`, `is_verified = false`, `registration_complete = false`, `registration_step = profile.registration_step || 1`.
- Call `fetchUserData()` to refresh context.
- Navigate to `getRegistrationRoute(ROLES.USER, target)`.

Note: The `loading` state already disables the button during the async operation, preventing double-click issues.

### Updated confirmation dialog

The message adapts based on target state. Before showing the dialog, SubtypeSwitcher queries the target profile to determine which message to show:
- Previously completed: "Switch to {target}? Your {target} profile will be restored."
- First time: "Switch to {target}? You'll need to complete the {target} registration process."

## AuthContext Changes

File: `src/contexts/AuthContext.jsx`

### Implementation note: `splitFields` and `BASE_FIELDS`

The existing `splitFields` function routes `is_verified`, `registration_complete`, and `registration_step` into the `base` bucket (users table only) because they are in `BASE_FIELDS`. Rather than modifying `splitFields`, the mirroring writes are added as **explicit secondary upserts** after the existing split logic. This minimizes disruption to the existing flow.

### Write-path changes (mirror to active profile table)

**`createAccount()`:** Currently does NOT insert a profile row — it only creates localStorage state. The actual profile row is created later during registration (by `saveRegistrationStep`/`completeRegistration` upserts) or by SubtypeSwitcher's upsert. No change needed here — the column defaults on profile tables handle initial `is_verified` correctly when the row is eventually created.

**`completeRegistration()`:** After the existing `users` update and profile upsert, add a secondary upsert to the active profile table explicitly setting `registration_complete = true` and `registration_step = null`. For homeowners, also set `is_verified = true` in this upsert (making it explicit rather than relying solely on the column default). The calling page (`HomeownerRegistration.jsx`) does not need to change — `completeRegistration()` determines the subtype from `userData` and conditionally includes `is_verified = true` for homeowners.

**`saveRegistrationStep()`:** After the existing `users` update, add a secondary upsert to the active profile table setting `registration_step = stepNumber`. This is added after the existing profile upsert (which handles profile-specific fields), as an explicit write for the mirrored field.

### No read-path changes

- `fetchUserData()` — unchanged. Reads `users` + active profile, merges them. Note: the merge logic overlays non-empty profile values onto base data. Since `is_verified = false` is a boolean (not empty/null), it correctly overrides stale `users` values. With `COALESCE` in the migration backfill, no null `is_verified` values should exist.
- `isVerified()` — unchanged. Reads `userData.is_verified`.
- `ProtectedRoute` — unchanged. Calls `isVerified()`.

## Admin Dashboard Changes

File: `src/pages/admin/Dashboard.jsx`

**`handleApprove()` and `handleReject()`:** In addition to updating `users.is_verified`, also update the corresponding profile table's `is_verified` field. This ensures the verification state persists if the user switches away and back.

No changes to admin UI, filtering, or tabs. Homeowners continue to never appear in the verification queue.

Note: When a user switches subtypes, their `users.subtype` changes, so they appear/disappear from the correct admin lists automatically. A verified jobseeker who switches to homeowner disappears from the jobseeker verified list; if they switch back, they reappear.

## Edge Cases

### Jobseeker switches to homeowner for the first time
Goes through 2-step homeowner wizard. On `completeRegistration()`, homeowner profile gets `is_verified = true` (set explicitly by `completeRegistration` for homeowners). `users.is_verified` is synced to `true`.

### Admin-rejected jobseeker switches to homeowner and back
Jobseeker profile retains `is_verified = false` and `jobseeker_status = 'rejected'`. On switch back, rejected state is restored. Rejection cannot be escaped by switching subtypes.

### Admin-verified jobseeker switches to homeowner and back
Jobseeker profile retains `is_verified = true` and `jobseeker_status = 'verified'`. On switch back, verified state is restored instantly.

### User abandons registration mid-wizard after switching
`registration_step` is preserved on the profile table. `users.registration_complete` is `false`, so `RegistrationContinue.jsx` redirects them back to the wizard. The SubtypeSwitcher is not visible (guarded by `registration_complete`). Next time they complete or switch again, the state resolves correctly.

### Mid-session switch
After SubtypeSwitcher updates `users` and calls `fetchUserData()`, all auth helpers (`isVerified()`, `isJobseeker()`, etc.) reflect the new state before navigation occurs. No stale state in ProtectedRoute guards.

## Files Changed

| File | Change |
|------|--------|
| `sql/migration_per_subtype_verification.sql` | New migration: add columns, backfill data with COALESCE |
| `src/components/SubtypeSwitcher.jsx` | New switch logic: check target profile, sync users, conditional redirect |
| `src/contexts/AuthContext.jsx` | Add secondary profile upserts in `completeRegistration` and `saveRegistrationStep` for mirrored fields |
| `src/pages/admin/Dashboard.jsx` | `handleApprove`/`handleReject` also update profile table `is_verified` |
| `scripts/seed-users.js` | Seed `is_verified`, `registration_complete` on profile rows |

### No changes needed (verified)

| File | Reason |
|------|--------|
| `src/utils/roles.js` | Role/subtype helpers unaffected |
| `src/components/ProtectedRoute.jsx` | Reads `isVerified()` from users — sync approach keeps this working |
| `src/pages/Dashboard.jsx` | Verification banners read from `users` via `isVerified()` — unaffected by sync |
| `src/pages/RegistrationContinue.jsx` | Reads `userData.registration_complete` from `users` — correctly routes post-switch incomplete users |
| `src/pages/HomeownerRegistration.jsx` | No changes — `completeRegistration()` handles homeowner `is_verified` internally |
| `sql/create_trigger_new_user.sql` / `sql/migration_two_level_roles.sql` | Trigger unchanged — column defaults handle profile row initial state |
