# Per-Subtype Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move verification and registration state into each profile table so subtype switching preserves per-subtype verification correctly.

**Architecture:** Each profile table (`jobseeker_profiles`, `homeowner_profiles`, `employer_profiles`) gets its own `is_verified`, `registration_complete`, and `registration_step` columns. The `users` table keeps these columns as mirrors of the active subtype, synced at write time. Read paths are unchanged.

**Tech Stack:** Supabase (PostgreSQL), React, Supabase JS client

**Spec:** `docs/superpowers/specs/2026-03-25-per-subtype-verification-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `sql/migration_per_subtype_verification.sql` | Create | SQL migration: add columns to profile tables, backfill existing data |
| `src/contexts/AuthContext.jsx` | Modify | Add secondary profile upserts in `completeRegistration` and `saveRegistrationStep` |
| `src/components/SubtypeSwitcher.jsx` | Modify | New switch logic: query target profile, sync users, conditional redirect |
| `src/pages/admin/Dashboard.jsx` | Modify | Add `is_verified` to profile updates in `handleApprove`/`handleReject` |
| `scripts/seed-users.js` | Modify | Add `is_verified`, `registration_complete` to profile seed data |

---

### Task 1: SQL Migration

**Files:**
- Create: `sql/migration_per_subtype_verification.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Per-Subtype Verification Migration
-- Adds is_verified, registration_complete, registration_step to each profile table
-- so each subtype owns its own verification/registration state independently.

-- === Add columns ===

ALTER TABLE jobseeker_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step INTEGER;

ALTER TABLE homeowner_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step INTEGER;

ALTER TABLE employer_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step INTEGER;

-- === Backfill from users table ===

UPDATE jobseeker_profiles jp
SET is_verified = COALESCE(u.is_verified, false),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE jp.id = u.id AND u.role = 'user' AND u.subtype = 'jobseeker';

UPDATE homeowner_profiles hp
SET is_verified = COALESCE(u.is_verified, true),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE hp.id = u.id AND u.role = 'user' AND u.subtype = 'homeowner';

UPDATE employer_profiles ep
SET is_verified = COALESCE(u.is_verified, false),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE ep.id = u.id AND u.role = 'employer';
```

**Note:** The `handle_new_user()` trigger in `sql/migration_two_level_roles.sql` does NOT need changes. It sets `is_verified` on `users` only. Profile rows are created later during registration, and the column defaults (`homeowner_profiles.is_verified DEFAULT true`, `jobseeker_profiles.is_verified DEFAULT false`) handle initial state correctly.

- [ ] **Step 2: Run the migration against Supabase**

Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New Query). Paste the contents of `sql/migration_per_subtype_verification.sql` and execute.

Expected: All three ALTER TABLE statements succeed. Backfill UPDATE statements report rows affected matching existing profile counts.

- [ ] **Step 3: Verify the migration**

Run in Supabase SQL Editor:
```sql
SELECT id, is_verified, registration_complete, registration_step
FROM jobseeker_profiles LIMIT 5;

SELECT id, is_verified, registration_complete, registration_step
FROM homeowner_profiles LIMIT 5;

SELECT id, is_verified, registration_complete, registration_step
FROM employer_profiles LIMIT 5;
```

Expected: All rows have non-null `is_verified` and `registration_complete` values matching the corresponding `users` row.

- [ ] **Step 4: Commit**

```bash
git add sql/migration_per_subtype_verification.sql
git commit -m "feat: add per-subtype verification columns to profile tables"
```

---

### Task 2: AuthContext — Mirror Writes to Profile Tables

**Files:**
- Modify: `src/contexts/AuthContext.jsx:105-160` (`saveRegistrationStep` and `completeRegistration`)

The key constraint: `splitFields` routes `is_verified`, `registration_complete`, and `registration_step` to the `base` bucket (users table only) because they are in `BASE_FIELDS`. Rather than modifying `splitFields`, add explicit secondary upserts after the existing profile write.

- [ ] **Step 1: Modify `saveRegistrationStep` to mirror `registration_step` to profile table**

In `src/contexts/AuthContext.jsx`, find the `saveRegistrationStep` function (line 105). After the existing profile upsert block (lines 118-124), add a secondary upsert that always writes `registration_step` to the profile table:

Replace lines 105-131:
```javascript
    // Save registration step data to Supabase
    const saveRegistrationStep = async (stepData, stepNumber) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { base, profile } = splitFields(stepData)

        const now = new Date().toISOString()
        const { error } = await supabase
            .from('users')
            .update({ ...base, registration_step: stepNumber, updated_at: now })
            .eq('id', currentUser.uid)
        if (error) throw error

        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype
        const profileTable = getProfileTable(role, subtype)
        if (profileTable) {
            // Write profile-specific fields + mirror registration_step in a single upsert
            const { error: profileError } = await supabase
                .from(profileTable)
                .upsert({
                    id: currentUser.uid,
                    ...profile,
                    registration_step: stepNumber,
                    updated_at: now,
                }, { onConflict: 'id' })
            if (profileError) throw profileError
        }

        setUserData(prev => {
            const next = { ...prev, ...stepData, registration_step: stepNumber }
            try { localStorage.setItem(`peso-profile-${currentUser.uid}`, JSON.stringify(next)) } catch {}
            return next
        })
    }
```

- [ ] **Step 2: Modify `completeRegistration` to mirror state to profile table**

In `src/contexts/AuthContext.jsx`, find `completeRegistration` (line 133). After the existing profile upsert, add a secondary upsert for `registration_complete`, `registration_step`, and conditionally `is_verified` for homeowners.

Replace lines 133-160:
```javascript
    // Mark registration as complete
    const completeRegistration = async (finalData = {}) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { base, profile } = splitFields(finalData)

        const now = new Date().toISOString()
        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype

        // Build users update — homeowners get is_verified synced to true
        const usersUpdate = { ...base, registration_complete: true, registration_step: null, updated_at: now }
        if (subtype === SUBTYPES.HOMEOWNER) {
            usersUpdate.is_verified = true
        }
        const { error } = await supabase
            .from('users')
            .update(usersUpdate)
            .eq('id', currentUser.uid)
        if (error) throw error

        const profileTable = getProfileTable(role, subtype)
        if (profileTable) {
            // Write profile-specific fields + mirror registration state in a single upsert
            const profileUpsert = {
                id: currentUser.uid,
                ...profile,
                registration_complete: true,
                registration_step: null,
                updated_at: now,
            }
            // Homeowners are always auto-verified on registration completion
            if (subtype === SUBTYPES.HOMEOWNER) {
                profileUpsert.is_verified = true
            }
            const { error: profileError } = await supabase
                .from(profileTable)
                .upsert(profileUpsert, { onConflict: 'id' })
            if (profileError) throw profileError
        }

        setUserData(prev => {
            const next = { ...prev, ...finalData, registration_complete: true, registration_step: null }
            try { localStorage.setItem(`peso-profile-${currentUser.uid}`, JSON.stringify(next)) } catch {}
            return next
        })
    }
```

- [ ] **Step 3: Test manually**

1. Log in as an existing homeowner test account
2. Check the homeowner_profiles row in Supabase — should have `registration_complete: true`
3. Create a new jobseeker account, go through step 1 of registration
4. Check jobseeker_profiles — should have `registration_step: 1`
5. Complete registration — should have `registration_complete: true, registration_step: null`

- [ ] **Step 4: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: mirror registration state to profile tables in AuthContext"
```

---

### Task 3: SubtypeSwitcher — Smart Switch Logic

**Files:**
- Modify: `src/components/SubtypeSwitcher.jsx` (full rewrite of `handleSwitch` + confirmation dialog)

**Reference:** `src/utils/roles.js` for `getProfileTable`, `getRegistrationRoute`, `ROLES`

- [ ] **Step 1: Add state for target profile status**

At the top of the component, add state to track whether the target profile is complete. Also import `getProfileTable`, `getRegistrationRoute`, and `ROLES` from roles.js.

Replace the full file `src/components/SubtypeSwitcher.jsx`:
```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { SUBTYPES, ROLES, getProfileTable, getRegistrationRoute } from '../utils/roles'
import { RefreshCw, Search, Home, AlertCircle } from 'lucide-react'

const SubtypeSwitcher = () => {
    const { currentUser, userData, isUser, fetchUserData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [targetProfileComplete, setTargetProfileComplete] = useState(null)

    // Only render for user role with completed registration
    if (!isUser() || !userData?.registration_complete) return null

    const currentSubtype = userData.subtype
    const targetSubtype = currentSubtype === SUBTYPES.JOBSEEKER
        ? SUBTYPES.HOMEOWNER
        : SUBTYPES.JOBSEEKER

    const targetLabel = targetSubtype === SUBTYPES.JOBSEEKER ? 'Jobseeker' : 'Homeowner'
    const TargetIcon = targetSubtype === SUBTYPES.JOBSEEKER ? Search : Home

    // Check target profile state before showing confirm dialog
    const handleShowConfirm = async () => {
        const targetTable = getProfileTable(ROLES.USER, targetSubtype)
        const { data } = await supabase
            .from(targetTable)
            .select('registration_complete')
            .eq('id', currentUser.uid)
            .maybeSingle()
        setTargetProfileComplete(data?.registration_complete === true)
        setShowConfirm(true)
    }

    const handleSwitch = async () => {
        setLoading(true)
        try {
            const now = new Date().toISOString()
            const targetTable = getProfileTable(ROLES.USER, targetSubtype)

            // Read target profile to determine state
            const { data: targetProfile } = await supabase
                .from(targetTable)
                .select('is_verified, registration_complete, registration_step')
                .eq('id', currentUser.uid)
                .maybeSingle()

            const isComplete = targetProfile?.registration_complete === true

            if (isComplete) {
                // Restore previously completed profile
                await supabase
                    .from('users')
                    .update({
                        subtype: targetSubtype,
                        is_verified: targetProfile.is_verified,
                        registration_complete: true,
                        registration_step: null,
                        updated_at: now,
                    })
                    .eq('id', currentUser.uid)
            } else {
                // First time or abandoned — create profile row if needed
                await supabase
                    .from(targetTable)
                    .upsert({ id: currentUser.uid }, { onConflict: 'id', ignoreDuplicates: true })

                await supabase
                    .from('users')
                    .update({
                        subtype: targetSubtype,
                        is_verified: false,
                        registration_complete: false,
                        registration_step: targetProfile?.registration_step || 1,
                        updated_at: now,
                    })
                    .eq('id', currentUser.uid)
            }

            // Refresh auth context
            await fetchUserData(currentUser.uid)

            setShowConfirm(false)
            if (isComplete) {
                navigate('/dashboard')
            } else {
                navigate(getRegistrationRoute(ROLES.USER, targetSubtype))
            }
        } catch (err) {
            console.error('Subtype switch failed:', err)
        } finally {
            setLoading(false)
        }
    }

    const confirmMessage = targetProfileComplete
        ? `Your ${targetLabel.toLowerCase()} profile will be restored.`
        : `You'll need to complete the ${targetLabel.toLowerCase()} registration process.`

    return (
        <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Account Type</h3>
            <p className="text-sm text-gray-600 mb-4">
                You are currently registered as a <strong className="capitalize">{currentSubtype}</strong>.
                You can switch to {targetLabel} to access different features.
            </p>

            {!showConfirm ? (
                <button
                    onClick={handleShowConfirm}
                    className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
                >
                    <TargetIcon className="w-4 h-4" />
                    Switch to {targetLabel}
                </button>
            ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-yellow-800">
                                Switch to {targetLabel}?
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                                {confirmMessage} Your {currentSubtype} profile data will be preserved.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSwitch}
                            disabled={loading}
                            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Switching...' : 'Confirm Switch'}
                        </button>
                        <button
                            onClick={() => { setShowConfirm(false); setTargetProfileComplete(null) }}
                            disabled={loading}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SubtypeSwitcher
```

- [ ] **Step 2: Test manually — switch with previously completed profile**

1. Log in as a homeowner who has completed registration
2. Go to the page where SubtypeSwitcher appears (dashboard/settings)
3. Click "Switch to Jobseeker"
4. Confirm dialog should say "You'll need to complete the jobseeker registration process."
5. Click Confirm — should redirect to `/register/jobseeker`
6. Check `users` table: `subtype = 'jobseeker'`, `is_verified = false`, `registration_complete = false`

- [ ] **Step 3: Test manually — switch back to restored profile**

1. After completing jobseeker registration from step 2, switch back to homeowner
2. Confirm dialog should say "Your homeowner profile will be restored."
3. Click Confirm — should redirect to `/dashboard`
4. Check `users` table: `subtype = 'homeowner'`, `is_verified = true`, `registration_complete = true`

- [ ] **Step 4: Commit**

```bash
git add src/components/SubtypeSwitcher.jsx
git commit -m "feat: SubtypeSwitcher checks target profile state before switching"
```

---

### Task 4: Admin Dashboard — Persist Verification to Profile Table

**Files:**
- Modify: `src/pages/admin/Dashboard.jsx:92-144` (`handleApprove`) and `src/pages/admin/Dashboard.jsx:146-202` (`handleReject`)

- [ ] **Step 1: Add `is_verified` to the profile update in `handleApprove`**

In `src/pages/admin/Dashboard.jsx`, find `handleApprove` (line 92). In the profile update block (line 107), add `is_verified: true` to `profileUpdate`:

Replace lines 107-109:
```javascript
                const profileUpdate = { rejection_reason: '', updated_at: now, is_verified: true }
                if (userRole === 'employer') profileUpdate.employer_status = 'approved'
                else if (userRole === 'jobseeker') profileUpdate.jobseeker_status = 'verified'
```

- [ ] **Step 2: Add `is_verified` to the profile update in `handleReject`**

In `src/pages/admin/Dashboard.jsx`, find `handleReject` (line 146). In the profile update block (line 161), add `is_verified: false` to `profileUpdate`:

Replace lines 161-163:
```javascript
                const profileUpdate = { rejection_reason: rejectReason, updated_at: now, is_verified: false }
                if (userRole === 'employer') profileUpdate.employer_status = 'rejected'
                else if (userRole === 'jobseeker') profileUpdate.jobseeker_status = 'rejected'
```

- [ ] **Step 3: Test manually**

1. Log in as admin
2. Approve a pending jobseeker
3. Check `jobseeker_profiles` row in Supabase — should have `is_verified: true`
4. Reject a pending employer
5. Check `employer_profiles` row — should have `is_verified: false`

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Dashboard.jsx
git commit -m "feat: admin approve/reject persists is_verified to profile table"
```

---

### Task 5: Seed Script — Add Verification Fields to Profile Data

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Add `is_verified` and `registration_complete` to profile objects in seed data**

In `scripts/seed-users.js`, find each seed user's `profile` object. Add `is_verified` and `registration_complete` to match the `base` object's values.

For each **jobseeker** profile object, add:
```javascript
is_verified: true, // matches base.is_verified
registration_complete: true, // matches base.registration_complete
```

For each **employer** profile object, add:
```javascript
is_verified: true, // matches base.is_verified (seeded as verified)
registration_complete: true,
```

For each **homeowner** profile object, add:
```javascript
is_verified: true, // homeowners always verified
registration_complete: true,
```

The exact locations depend on how many seed users exist. Search for each `profile: {` block within the `jobseekers`, `employers`, and `homeowners` arrays and add the two fields at the top of each profile object.

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-users.js
git commit -m "feat: seed verification fields on profile rows"
```

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Test full homeowner → jobseeker → homeowner cycle**

1. Create a new homeowner account (or use a seeded one)
2. Complete homeowner registration
3. Verify in DB: `users.is_verified = true`, `homeowner_profiles.is_verified = true`, `homeowner_profiles.registration_complete = true`
4. Switch to jobseeker via SubtypeSwitcher
5. Verify in DB: `users.is_verified = false`, `users.registration_complete = false`, `users.subtype = 'jobseeker'`
6. Complete jobseeker 6-step registration
7. Verify in DB: `jobseeker_profiles.registration_complete = true`, `jobseeker_profiles.is_verified = false` (pending admin)
8. Admin approves the jobseeker
9. Verify in DB: `users.is_verified = true`, `jobseeker_profiles.is_verified = true`
10. Switch back to homeowner
11. Verify in DB: `users.is_verified = true`, `users.registration_complete = true` (restored from homeowner_profiles)

- [ ] **Step 2: Test that verified status doesn't leak across subtypes**

1. Start as an admin-verified jobseeker
2. Switch to homeowner (first time) — should redirect to homeowner registration
3. Verify `users.is_verified = false` during registration (not carried from jobseeker)
4. Complete homeowner registration
5. Verify `users.is_verified = true` (homeowner auto-verified)
6. Switch back to jobseeker — should restore verified state from profile

- [ ] **Step 3: Test rejected jobseeker round-trip**

1. Start as a jobseeker with `is_verified = false` and `jobseeker_status = 'rejected'` (admin-rejected)
2. Switch to homeowner — should redirect to homeowner registration
3. Complete homeowner registration
4. Verify `users.is_verified = true` (homeowner auto-verified)
5. Switch back to jobseeker — should restore from jobseeker profile
6. Verify `users.is_verified = false`, `jobseeker_status = 'rejected'` (rejection preserved)

- [ ] **Step 4: Test abandoned registration after switch**

1. As a completed homeowner, switch to jobseeker
2. Complete steps 1-3 of jobseeker registration, then close the browser
3. Log back in — should be redirected to jobseeker registration at step 4
4. Verify `jobseeker_profiles.registration_step = 4`

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification testing"
```
