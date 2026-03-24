# Two-Level Role System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the flat 3-role registration system into a two-level hierarchy (primary role + subtype) for government PESO deployment.

**Architecture:** Add a `subtype` column to `public.users`, rename `individual` to `homeowner` throughout, and update AuthContext/routing to resolve roles via `role` + `subtype`. Migration runs as a single atomic SQL transaction.

**Tech Stack:** React, Supabase (PostgreSQL), React Router, Tailwind CSS, Vercel

**Spec:** `docs/superpowers/specs/2026-03-24-two-level-role-system-design.md`

---

## File Map

### Files to Create
| File | Responsibility |
|------|---------------|
| `src/utils/roles.js` | Centralized role/subtype constants, profile table resolver, status field resolver, registration route resolver |
| `src/components/SubtypeSwitcher.jsx` | UI component for switching between jobseeker/homeowner subtype |
| `sql/migration_two_level_roles.sql` | Atomic migration script (rename table, add column, backfill, constraints, trigger) |
| `sql/rollback_two_level_roles.sql` | Rollback script to reverse the migration |

### Files to Rename
| From | To |
|------|-----|
| `src/pages/IndividualRegistration.jsx` | `src/pages/HomeownerRegistration.jsx` |
| `src/pages/IndividualProfileEdit.jsx` | `src/pages/HomeownerProfileEdit.jsx` |

### Files to Modify
| File | Key Changes |
|------|------------|
| `src/contexts/AuthContext.jsx` | `createAccount` signature + minimalDoc, `fetchUserData` profile table resolution, `BASE_FIELDS`, role helpers |
| `src/components/ProtectedRoute.jsx` | `hasAccess` checks both `role` and `subtype` |
| `src/pages/Register.jsx` | Two-step selection (primary role → subtype) |
| `src/pages/JobseekerRegistration.jsx` | `createAccount` call params |
| `src/pages/RegistrationContinue.jsx` | Route by `subtype` instead of `role` |
| `src/App.jsx` | Routes, imports, redirect |
| `src/components/Navbar.jsx` | Role badge display, destructure `isHomeowner` |
| `src/pages/Dashboard.jsx` | Replace `isIndividual` with `isHomeowner`, fix hardcoded profile table ternaries |
| `src/pages/Settings.jsx` | Add SubtypeSwitcher |
| `src/pages/Profile.jsx` | Update role redirect logic |
| `src/pages/PublicProfile.jsx` | Update profile table map and role checks |
| `src/pages/Diagnostic.jsx` | Update QuickContactModal to use `('user', 'homeowner')` |
| `src/utils/profileCompletion.js` | Rename `individual` key to `homeowner`, update lookup logic for `role='user'` |
| `src/utils/profileCompletion.test.js` | Update test data to use `role: 'user'` + `subtype` |
| `scripts/seed-users.js` | Update `individual` references to `homeowner` |
| `src/pages/admin/Dashboard.jsx` | Update `individual_profiles` → `homeowner_profiles`, update role filters |

---

## Task 1: Create Role Constants Module

**Files:**
- Create: `src/utils/roles.js`

- [ ] **Step 1: Create `src/utils/roles.js`**

```js
// Role constants and helpers for the two-level role system.
//
// PROFILE_TABLES uses mixed keys intentionally:
//   - ROLES.EMPLOYER maps directly (employer has no subtype)
//   - SUBTYPES.JOBSEEKER / SUBTYPES.HOMEOWNER map by subtype value
// This allows getProfileTable() to resolve the correct table using
// role for employers and subtype for users. The key distinction is
// abstracted by the helper functions — consumers should always use
// getProfileTable(role, subtype) rather than accessing the map directly.

export const ROLES = {
  EMPLOYER: 'employer',
  USER: 'user',
  ADMIN: 'admin',
};

export const SUBTYPES = {
  JOBSEEKER: 'jobseeker',
  HOMEOWNER: 'homeowner',
};

export const PROFILE_TABLES = {
  [ROLES.EMPLOYER]: 'employer_profiles',
  [SUBTYPES.JOBSEEKER]: 'jobseeker_profiles',
  [SUBTYPES.HOMEOWNER]: 'homeowner_profiles',
};

export const getProfileTable = (role, subtype) => {
  if (role === ROLES.EMPLOYER) return PROFILE_TABLES[ROLES.EMPLOYER];
  if (role === ROLES.USER) return PROFILE_TABLES[subtype];
  return null;
};

export const STATUS_FIELDS = {
  [ROLES.EMPLOYER]: 'employer_status',
  [SUBTYPES.JOBSEEKER]: 'jobseeker_status',
  [SUBTYPES.HOMEOWNER]: 'homeowner_status',
};

export const getStatusField = (role, subtype) => {
  if (role === ROLES.EMPLOYER) return STATUS_FIELDS[ROLES.EMPLOYER];
  if (role === ROLES.USER) return STATUS_FIELDS[subtype];
  return null;
};

export const getRegistrationRoute = (role, subtype) => {
  if (role === ROLES.EMPLOYER) return '/register/employer';
  if (subtype === SUBTYPES.JOBSEEKER) return '/register/jobseeker';
  if (subtype === SUBTYPES.HOMEOWNER) return '/register/homeowner';
  return '/register';
};
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/roles.js
git commit -m "feat: add centralized role constants module for two-level role system"
```

---

## Task 2: Create Migration SQL Scripts

**Files:**
- Create: `sql/migration_two_level_roles.sql`
- Create: `sql/rollback_two_level_roles.sql`

**Important:** Before running the migration, check if `individual_profiles` has any RLS policies in Supabase Dashboard → Authentication → Policies. If RLS policies reference `individual_profiles` or `individual_status`, add policy updates inside the `BEGIN/COMMIT` block.

- [ ] **Step 1: Create `sql/migration_two_level_roles.sql`**

```sql
-- ============================================
-- PESO Connect: Two-Level Role Migration
-- Run as a single transaction in Supabase SQL Editor
-- ============================================
-- PRE-CHECK: Audit RLS policies on individual_profiles before running.
-- If any exist, add ALTER POLICY statements inside this transaction.

BEGIN;

-- Step 1: Rename table + column
ALTER TABLE individual_profiles RENAME TO homeowner_profiles;
ALTER TABLE homeowner_profiles
  RENAME COLUMN individual_status TO homeowner_status;

-- Step 2: Add subtype column
ALTER TABLE public.users ADD COLUMN subtype text;

-- Step 3: Backfill existing data
UPDATE public.users
  SET role = 'user', subtype = 'jobseeker'
  WHERE role = 'jobseeker';

UPDATE public.users
  SET role = 'user', subtype = 'homeowner'
  WHERE role = 'individual';

-- Step 4: Add constraints
ALTER TABLE public.users
  ADD CONSTRAINT chk_valid_role
  CHECK (role IN ('employer', 'user', 'admin'));

ALTER TABLE public.users
  ADD CONSTRAINT chk_valid_subtype
  CHECK (subtype IN ('jobseeker', 'homeowner') OR subtype IS NULL);

ALTER TABLE public.users
  ADD CONSTRAINT chk_role_subtype_integrity
  CHECK (
    (role = 'user' AND subtype IS NOT NULL) OR
    (role != 'user' AND subtype IS NULL)
  );

-- Step 5: Update trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, subtype, is_verified)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'subtype',
    (new.raw_user_meta_data->>'role' = 'user'
     AND new.raw_user_meta_data->>'subtype' = 'homeowner')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

- [ ] **Step 2: Create `sql/rollback_two_level_roles.sql`**

```sql
-- Rollback: reverses the two-level role migration
BEGIN;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_role_subtype_integrity;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_valid_subtype;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_valid_role;

UPDATE public.users SET role = 'jobseeker', subtype = NULL WHERE subtype = 'jobseeker';
UPDATE public.users SET role = 'individual', subtype = NULL WHERE subtype = 'homeowner';

ALTER TABLE public.users DROP COLUMN subtype;

ALTER TABLE homeowner_profiles RENAME COLUMN homeowner_status TO individual_status;
ALTER TABLE homeowner_profiles RENAME TO individual_profiles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_verified)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    (new.raw_user_meta_data->>'role' = 'individual')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
```

- [ ] **Step 3: Commit**

```bash
git add sql/migration_two_level_roles.sql sql/rollback_two_level_roles.sql
git commit -m "feat: add migration and rollback scripts for two-level role system"
```

---

## Task 3: Update AuthContext.jsx

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

This is the most critical file. Six targeted changes, not a rewrite.

- [ ] **Step 1: Add import for role helpers**

At line 3, add:

```js
import { getProfileTable, getStatusField, ROLES, SUBTYPES } from '../utils/roles'
```

- [ ] **Step 2: Replace `PROFILE_TABLE` constant and update `BASE_FIELDS`**

Replace lines 15-25 (the `PROFILE_TABLE` object and `BASE_FIELDS` set):

```js
    // Profile table mapping is now handled by getProfileTable() from utils/roles.js
    // The old PROFILE_TABLE object is removed.

    const BASE_FIELDS = new Set([
        'id', 'email', 'role', 'subtype', 'name', 'is_verified',
        'registration_complete', 'registration_step', 'profile_photo',
        'created_at', 'updated_at',
    ])
```

Key change: `subtype` added to `BASE_FIELDS` so `splitFields()` routes it to `public.users`, not the profile table.

- [ ] **Step 3: Update `fetchUserData` — profile table resolution**

Replace line 46:

```js
        // OLD: const profileTable = PROFILE_TABLE[baseData.role]
        const profileTable = getProfileTable(baseData.role, baseData.subtype)
```

This is the single most critical line change. Without it, `role='user'` resolves to `undefined` instead of the correct profile table.

- [ ] **Step 4: Update `createAccount` — signature, metadata, and minimalDoc**

Replace the entire `createAccount` function (lines 70-98):

```js
    const createAccount = async (email, password, role, subtype = null) => {
        await supabase.auth.signOut()
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role, subtype } },
        })
        if (error) throw error
        if (!data.user) throw new Error('Account creation failed. Please try again.')

        const user = data.user
        const minimalDoc = {
            id: user.id,
            email,
            role,
            subtype,
            name: '',
            registration_complete: false,
            registration_step: 1,
            is_verified: role === ROLES.USER && subtype === SUBTYPES.HOMEOWNER,
            skills: [],
            credentials_url: '',
        }

        try { localStorage.setItem(`peso-profile-${user.id}`, JSON.stringify(minimalDoc)) } catch {}

        return { user: { ...user, uid: user.id }, userData: minimalDoc }
    }
```

Changes: added `subtype` param, pass `subtype` in metadata, include `subtype` in minimalDoc, update `is_verified` logic.

- [ ] **Step 5: Update `saveRegistrationStep` and `completeRegistration` — profile table resolution**

In `saveRegistrationStep` (line 123-124), replace:

```js
        const role = userData?.role || currentUser?.user_metadata?.role
        const profileTable = PROFILE_TABLE[role]
```

with:

```js
        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype
        const profileTable = getProfileTable(role, subtype)
```

In `completeRegistration` (line 151-152), make the same replacement:

```js
        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype
        const profileTable = getProfileTable(role, subtype)
```

- [ ] **Step 6: Update role helper methods**

Replace lines 237-240:

```js
    const isAdmin = () => userData?.role === ROLES.ADMIN
    const isEmployer = () => userData?.role === ROLES.EMPLOYER
    const isUser = () => userData?.role === ROLES.USER
    const isJobseeker = () => userData?.role === ROLES.USER && userData?.subtype === SUBTYPES.JOBSEEKER
    const isHomeowner = () => userData?.role === ROLES.USER && userData?.subtype === SUBTYPES.HOMEOWNER
```

Delete `isIndividual` completely.

- [ ] **Step 7: Update context value export**

In the `value` object (lines 282-303), replace `isIndividual` with `isHomeowner` and add `isUser`:

```js
        isAdmin,
        isEmployer,
        isUser,
        isJobseeker,
        isHomeowner,
```

Remove `isIndividual` from the value object.

- [ ] **Step 8: Verify the file is correct**

Read back `src/contexts/AuthContext.jsx` and verify:
- No references to `PROFILE_TABLE[` remain (should use `getProfileTable()`)
- No references to `isIndividual` remain
- No references to `'individual'` remain (except in the legacy `register` function which can be left as-is or removed)
- `subtype` is in `BASE_FIELDS`
- `minimalDoc` includes `subtype`

- [ ] **Step 9: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: update AuthContext for two-level role system (role + subtype)"
```

---

## Task 4: Update ProtectedRoute.jsx

**Files:**
- Modify: `src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Update the role check logic**

Replace line 26:

```js
    if (allowedRoles.length > 0 && userData && !allowedRoles.includes(userData.role)) {
```

with:

```js
    // Match against both role and subtype.
    // Use subtype values ('jobseeker', 'homeowner') for subtype-specific routes.
    // Using 'user' grants access to ALL user subtypes.
    if (allowedRoles.length > 0 && userData &&
        !allowedRoles.some(allowed => allowed === userData.role || allowed === userData.subtype)) {
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProtectedRoute.jsx
git commit -m "feat: update ProtectedRoute to match role + subtype for access control"
```

---

## Task 5: Update Registration Flow — Register.jsx

**Files:**
- Modify: `src/pages/Register.jsx`

- [ ] **Step 1: Rewrite Register.jsx with two-step selection**

Replace the entire component with a two-step flow:

1. Replace the `roleOptions` array with `primaryRoles` (Employer, User) and `userSubtypes` (Jobseeker, Homeowner).
2. Add `selectedPrimary` state (null, 'employer', or 'user').
3. When Employer is selected → show Employer info card with "Continue as Employer" → navigates to `/register/employer`.
4. When User is selected → slide in Step 2 with Jobseeker and Homeowner cards.
5. Add a back button to return to Step 1 from Step 2.
6. Jobseeker card → navigates to `/register/jobseeker`.
7. Homeowner card → navigates to `/register/homeowner`.

Key changes to the current code:
- Remove the 3-card grid (`grid-cols-3`).
- Replace `formData.role` state with `selectedPrimary` state.
- Step 1 shows 2 cards in a `grid-cols-2` layout.
- Step 2 conditionally renders when `selectedPrimary === 'user'`.
- Remove the `individual` references entirely.
- Step 1 heading: "How will you use PESO Connect?"
- Step 2 heading: "What are you looking for?"

- [ ] **Step 2: Commit**

```bash
git add src/pages/Register.jsx
git commit -m "feat: redesign registration page with two-step role selection"
```

---

## Task 6: Rename and Update IndividualRegistration → HomeownerRegistration

**Files:**
- Rename: `src/pages/IndividualRegistration.jsx` → `src/pages/HomeownerRegistration.jsx`

- [ ] **Step 1: Rename the file**

```bash
cd /c/Users/Steven/Desktop/PESO-Connect
git mv src/pages/IndividualRegistration.jsx src/pages/HomeownerRegistration.jsx
```

- [ ] **Step 2: Update the component name and createAccount call**

In `src/pages/HomeownerRegistration.jsx`:

1. Rename `const IndividualRegistration` → `const HomeownerRegistration` (line 21)
2. Update `export default IndividualRegistration` → `export default HomeownerRegistration` (line 352)
3. Update `createAccount` call at line 81:

```js
// OLD: await createAccount(formData.email.trim().toLowerCase(), formData.password, 'individual')
await createAccount(formData.email.trim().toLowerCase(), formData.password, 'user', 'homeowner')
```

4. Update the role check at line 42:

```js
// OLD: if (userData && userData.registration_complete === false && userData.role === 'individual') {
if (userData && userData.registration_complete === false && userData.role === 'user' && userData.subtype === 'homeowner') {
```

5. Update `completeRegistration` call at line 107:

```js
// OLD: individual_status: 'active',
homeowner_status: 'active',
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomeownerRegistration.jsx
git commit -m "feat: rename IndividualRegistration to HomeownerRegistration with role+subtype"
```

---

## Task 7: Update JobseekerRegistration.jsx

**Files:**
- Modify: `src/pages/JobseekerRegistration.jsx`

- [ ] **Step 1: Update the `createAccount` call**

At line 382:

```js
// OLD: await createAccount(formData.email, formData.password, 'jobseeker')
await createAccount(formData.email, formData.password, 'user', 'jobseeker')
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/JobseekerRegistration.jsx
git commit -m "feat: update jobseeker registration to use role='user' + subtype='jobseeker'"
```

---

## Task 8: Update RegistrationContinue.jsx

**Files:**
- Modify: `src/pages/RegistrationContinue.jsx`

- [ ] **Step 1: Update the switch statement**

Replace lines 23-35:

```js
        // Route by role for employer, by subtype for user accounts
        if (userData.role === 'employer') {
            navigate('/register/employer', { replace: true })
        } else if (userData.subtype === 'jobseeker') {
            navigate('/register/jobseeker', { replace: true })
        } else if (userData.subtype === 'homeowner') {
            navigate('/register/homeowner', { replace: true })
        } else {
            navigate('/dashboard', { replace: true })
        }
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/RegistrationContinue.jsx
git commit -m "feat: update registration continue to route by subtype"
```

---

## Task 9: Update App.jsx — Routes and Imports

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update imports**

Replace lines 17 and 33:

```js
// OLD: import IndividualRegistration from './pages/IndividualRegistration'
import HomeownerRegistration from './pages/HomeownerRegistration'

// OLD: import IndividualProfileEdit from './pages/IndividualProfileEdit'
import HomeownerProfileEdit from './pages/HomeownerProfileEdit'
```

- [ ] **Step 2: Update routes**

At line 63, replace the individual registration route and add a redirect:

```jsx
<Route path="/register/homeowner" element={<ErrorBoundary><HomeownerRegistration /></ErrorBoundary>} />
{/* Redirect old URL */}
<Route path="/register/individual" element={<Navigate to="/register/homeowner" replace />} />
```

Add `Navigate` to the import from `react-router-dom` (line 1).

At lines 111-117, update the individual profile edit route:

```jsx
<Route
    path="/profile/edit/homeowner"
    element={
        <ProtectedRoute allowedRoles={['homeowner']}>
            <ErrorBoundary><HomeownerProfileEdit /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
```

At lines 142 and 150, update messaging routes — remove the explicit role list since ProtectedRoute with no `allowedRoles` already allows any authenticated user:

```jsx
<ProtectedRoute>
```

Or keep explicit roles but update them:

```jsx
<ProtectedRoute allowedRoles={['jobseeker', 'homeowner', 'employer']}>
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: update routes for homeowner rename and add individual redirect"
```

---

## Task 10: Update Navbar.jsx

**Files:**
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Update the auth destructure**

At line 22, replace:

```js
// OLD: const { currentUser, userData, logout, isAdmin, isEmployer, isJobseeker } = useAuth()
const { currentUser, userData, logout, isAdmin, isEmployer, isJobseeker, isHomeowner } = useAuth()
```

- [ ] **Step 2: Update role badge display**

At line 131, update the role display to show the subtype for user accounts:

```jsx
<p className="text-xs text-gray-500 capitalize flex items-center gap-1">
    {userData?.subtype || userData?.role}
    {userData?.is_verified && (
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Verified"></span>
    )}
</p>
```

This shows "jobseeker" or "homeowner" instead of "user" for user accounts, and "employer"/"admin" for others.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.jsx
git commit -m "feat: update navbar to display subtype for user accounts"
```

---

## Task 11: Update Dashboard.jsx

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Add import and update auth destructure**

At line 2, add:

```js
import { getProfileTable, getStatusField } from '../utils/roles'
```

At line 24, replace the destructure:

```js
// OLD: const { userData, currentUser, fetchUserData, isVerified, isEmailVerified, isEmployer, isJobseeker, isAdmin, isIndividual } = useAuth()
const { userData, currentUser, fetchUserData, isVerified, isEmailVerified, isEmployer, isJobseeker, isAdmin, isHomeowner } = useAuth()
```

- [ ] **Step 2: Rename `individualQuickActions` and update references**

At line 77:

```js
// OLD: const individualQuickActions = [
const homeownerQuickActions = [
```

At lines 82-86:

```js
// OLD: const quickActions = isIndividual()
//     ? individualQuickActions
const quickActions = isHomeowner()
    ? homeownerQuickActions
    : isEmployer()
        ? employerQuickActions
        : jobseekerQuickActions
```

- [ ] **Step 3: Update editPath**

At lines 89-91:

```js
// OLD: const editPath = isEmployer() ? '/profile/edit/employer'
//     : isIndividual() ? '/profile/edit/individual'
const editPath = isEmployer() ? '/profile/edit/employer'
    : isHomeowner() ? '/profile/edit/homeowner'
    : '/profile/edit'
```

- [ ] **Step 4: Update verification status banner**

At line 127:

```js
// OLD: {!isVerified() && !isIndividual() && (() => {
{!isVerified() && !isHomeowner() && (() => {
```

- [ ] **Step 5: Fix hardcoded profile table/status ternaries**

At lines 174-175, replace the hardcoded ternary with the centralized helpers:

```js
// OLD:
// const profileTable = isJobseeker() ? 'jobseeker_profiles' : 'employer_profiles'
// const statusField = isJobseeker() ? 'jobseeker_status' : 'employer_status'
const profileTable = getProfileTable(userData.role, userData.subtype)
const statusField = getStatusField(userData.role, userData.subtype)
```

- [ ] **Step 6: Update status display in Profile Summary**

At line 283:

```js
// OLD: const status = isJobseeker() ? userData?.jobseeker_status : userData?.employer_status;
const sf = getStatusField(userData?.role, userData?.subtype)
const status = sf ? userData?.[sf] : null;
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: update dashboard for two-level role system with centralized helpers"
```

---

## Task 12: Rename and Update IndividualProfileEdit → HomeownerProfileEdit

**Files:**
- Rename: `src/pages/IndividualProfileEdit.jsx` → `src/pages/HomeownerProfileEdit.jsx`

- [ ] **Step 1: Rename the file**

```bash
cd /c/Users/Steven/Desktop/PESO-Connect
git mv src/pages/IndividualProfileEdit.jsx src/pages/HomeownerProfileEdit.jsx
```

- [ ] **Step 2: Update component internals**

In `src/pages/HomeownerProfileEdit.jsx`:

1. Rename `const IndividualProfileEdit` → `const HomeownerProfileEdit` (line 12)
2. Rename `export default IndividualProfileEdit` → `export default HomeownerProfileEdit` (line 285)
3. Replace `individual_profiles` → `homeowner_profiles` (line 99)
4. Replace `editPath="/profile/edit/individual"` → `editPath="/profile/edit/homeowner"` (line 140)

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomeownerProfileEdit.jsx
git commit -m "feat: rename IndividualProfileEdit to HomeownerProfileEdit"
```

---

## Task 13: Update Profile.jsx and PublicProfile.jsx

**Files:**
- Modify: `src/pages/Profile.jsx`
- Modify: `src/pages/PublicProfile.jsx`

- [ ] **Step 1: Update Profile.jsx redirect logic**

At lines 34-40 in `src/pages/Profile.jsx`, replace:

```js
        if (userData?.role === 'jobseeker') {
            navigate('/profile/edit', { replace: true })
        } else if (userData?.role === 'employer') {
            navigate('/profile/edit/employer', { replace: true })
        } else if (userData?.role === 'individual') {
            navigate('/profile/edit/individual', { replace: true })
        }
```

with:

```js
        if (userData?.role === 'employer') {
            navigate('/profile/edit/employer', { replace: true })
        } else if (userData?.subtype === 'homeowner') {
            navigate('/profile/edit/homeowner', { replace: true })
        } else if (userData?.subtype === 'jobseeker') {
            navigate('/profile/edit', { replace: true })
        }
```

Also at lines 73-77, update the inline profile table lookup to handle `role='user'`:

```js
// OLD:
// const profileTable = {
//     jobseeker: 'jobseeker_profiles',
//     employer: 'employer_profiles',
//     individual: 'individual_profiles',
// }[userData?.role]

// NEW: import getProfileTable from utils/roles at top of file
const profileTable = getProfileTable(userData?.role, userData?.subtype)
```

Add the import at the top of Profile.jsx:

```js
import { getProfileTable } from '../utils/roles'
```

- [ ] **Step 2: Update PublicProfile.jsx**

At line 23, update the profile table map:

```js
// OLD: individual: 'individual_profiles',
homeowner: 'homeowner_profiles',
```

At line 146, update the role check:

```js
// OLD: {profile.role === 'individual' && <IndividualProfile profile={profile} />}
{profile.subtype === 'homeowner' && <HomeownerProfile profile={profile} />}
```

Rename the `IndividualProfile` sub-component (line 316) to `HomeownerProfile`. This is an internal component — no export changes needed.

The profile table lookup at line 37 uses `PROFILE_TABLE[baseData.role]` which breaks for `role='user'`. Replace lines 20-24 and 37:

```js
// Add import at top of file:
import { getProfileTable } from '../utils/roles'

// Replace the inline PROFILE_TABLE object (lines 20-24) — delete it entirely.
// Replace line 37:
// OLD: const profileTable = PROFILE_TABLE[baseData.role]
const profileTable = getProfileTable(baseData.role, baseData.subtype)
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Profile.jsx src/pages/PublicProfile.jsx
git commit -m "feat: update Profile and PublicProfile for homeowner rename"
```

---

## Task 14: Update Diagnostic.jsx (QuickContactModal)

**Files:**
- Modify: `src/pages/Diagnostic.jsx`

- [ ] **Step 1: Update the QuickContactModal createAccount call**

At lines 54-57, replace:

```js
            const result = await createAccount(
                form.email.trim().toLowerCase(),
                form.password,
                'individual'
            )
```

with:

```js
            const result = await createAccount(
                form.email.trim().toLowerCase(),
                form.password,
                'user',
                'homeowner'
            )
```

At lines 62-63, replace:

```js
// OLD: individual_status: 'active',
homeowner_status: 'active',
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Diagnostic.jsx
git commit -m "feat: update QuickContactModal to use role='user' + subtype='homeowner'"
```

---

## Task 15: Update profileCompletion.js and Tests

**Files:**
- Modify: `src/utils/profileCompletion.js`
- Modify: `src/utils/profileCompletion.test.js`

- [ ] **Step 1: Update profileCompletion.js**

Rename the variable and update the lookup logic. Replace lines 26-44:

```js
const homeownerChecks = [
    { key: 'personal_info', label: 'Complete your name', weight: 25, test: (d) => !!d.full_name },
    { key: 'contact_info', label: 'Add contact number', weight: 20, test: (d) => !!d.contact_number },
    { key: 'profile_photo', label: 'Add a profile photo', weight: 15, test: (d) => !!d.profile_photo },
    { key: 'address', label: 'Add your address', weight: 15, test: (d) => !!(d.city && d.province) },
    { key: 'bio', label: 'Write a short bio', weight: 15, test: (d) => !!d.bio },
    { key: 'service_preferences', label: 'Add service preferences', weight: 10, test: (d) => d.service_preferences?.length > 0 },
]

const checksByRole = {
    jobseeker: jobseekerChecks,
    employer: employerChecks,
    homeowner: homeownerChecks,
}

export function calculateCompletion(userData) {
    if (!userData?.role) return { percentage: 0, missing: [] }

    // For role='user', look up checks by subtype
    const key = userData.role === 'user' ? userData.subtype : userData.role
    const checks = checksByRole[key]
    if (!checks) return { percentage: 0, missing: [] }

    let earned = 0
    const missing = []

    for (const check of checks) {
        if (check.test(userData)) {
            earned += check.weight
        } else {
            missing.push({ key: check.key, label: check.label })
        }
    }

    return { percentage: earned, missing }
}
```

- [ ] **Step 2: Update profileCompletion.test.js**

Update test data to use new role structure. At lines 77-84, replace `role: 'individual'` with `role: 'user', subtype: 'homeowner'`:

```js
    it('returns 0% for empty homeowner', () => {
        const result = calculateCompletion({ role: 'user', subtype: 'homeowner' })
        expect(result.percentage).toBe(0)
    })

    it('returns 100% for complete homeowner', () => {
        const result = calculateCompletion({
            role: 'user',
            subtype: 'homeowner',
```

Also update any other test cases that use `role: 'jobseeker'` to `role: 'user', subtype: 'jobseeker'`.

- [ ] **Step 3: Run tests**

```bash
cd /c/Users/Steven/Desktop/PESO-Connect
npx vitest run src/utils/profileCompletion.test.js
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/utils/profileCompletion.js src/utils/profileCompletion.test.js
git commit -m "feat: update profileCompletion for two-level role system"
```

---

## Task 16: Update Admin Dashboard

**Files:**
- Modify: `src/pages/admin/Dashboard.jsx`

- [ ] **Step 1: Update the profile table reference**

At line 66:

```js
// OLD: supabase.from('individual_profiles').select('*'),
supabase.from('homeowner_profiles').select('*'),
```

- [ ] **Step 2: Update role filter**

At line 80:

```js
// OLD: setJobseekers(merged.filter(u => u.role === 'jobseeker'))
setJobseekers(merged.filter(u => u.role === 'user' && u.subtype === 'jobseeker'))
```

Check for any other `role === 'jobseeker'` or `role === 'individual'` filters in this file and update them similarly.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Dashboard.jsx
git commit -m "feat: update admin dashboard for two-level role system"
```

---

## Task 17: Update seed-users.js

**Files:**
- Modify: `scripts/seed-users.js`

- [ ] **Step 1: Update individual references**

Search and replace throughout the file:

1. Update the `individuals` array (line 440): add `role: 'user', subtype: 'homeowner'` to each entry
2. Replace all `individual_status: 'active'` → `homeowner_status: 'active'` (lines 447, 461, 475, 489, 503)
3. At line 971: `individual: 'individual_profiles'` → `homeowner: 'homeowner_profiles'`
4. At line 1068: Update the `seedGroup` call to pass `'user'` as role and `'homeowner'` as subtype (check the `seedGroup` function signature to understand how it passes role to Supabase signup metadata — it may need a subtype param added)
5. Rename the variable `individuals` → `homeowners` for clarity

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-users.js
git commit -m "feat: update seed script for two-level role system"
```

---

## Task 18: Build SubtypeSwitcher Component

**Files:**
- Create: `src/components/SubtypeSwitcher.jsx`
- Modify: `src/pages/Settings.jsx`

- [ ] **Step 1: Create `src/components/SubtypeSwitcher.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { SUBTYPES } from '../utils/roles'
import { RefreshCw, Search, Home, AlertCircle } from 'lucide-react'

const SubtypeSwitcher = () => {
    const { currentUser, userData, isUser, fetchUserData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // Only render for user role with completed registration
    if (!isUser() || !userData?.registration_complete) return null

    const currentSubtype = userData.subtype
    const targetSubtype = currentSubtype === SUBTYPES.JOBSEEKER
        ? SUBTYPES.HOMEOWNER
        : SUBTYPES.JOBSEEKER

    const targetLabel = targetSubtype === SUBTYPES.JOBSEEKER ? 'Jobseeker' : 'Homeowner'
    const TargetIcon = targetSubtype === SUBTYPES.JOBSEEKER ? Search : Home

    const handleSwitch = async () => {
        setLoading(true)
        try {
            // Update subtype
            const { error } = await supabase
                .from('users')
                .update({ subtype: targetSubtype, updated_at: new Date().toISOString() })
                .eq('id', currentUser.uid)
            if (error) throw error

            // Create empty target profile if it doesn't exist
            const targetTable = targetSubtype === SUBTYPES.JOBSEEKER
                ? 'jobseeker_profiles'
                : 'homeowner_profiles'

            await supabase
                .from(targetTable)
                .upsert({ id: currentUser.uid }, { onConflict: 'id', ignoreDuplicates: true })

            // Refresh auth context
            await fetchUserData(currentUser.uid)

            setShowConfirm(false)
            navigate('/dashboard')
        } catch (err) {
            console.error('Subtype switch failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Account Type</h3>
            <p className="text-sm text-gray-600 mb-4">
                You are currently registered as a <strong className="capitalize">{currentSubtype}</strong>.
                You can switch to {targetLabel} to access different features.
            </p>

            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
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
                                Your {currentSubtype} profile data will be preserved.
                                You can switch back anytime.
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
                            onClick={() => setShowConfirm(false)}
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

- [ ] **Step 2: Add SubtypeSwitcher to Settings.jsx**

Read `src/pages/Settings.jsx` to find the appropriate location (likely within the main settings card layout). Add the import and component:

```jsx
import SubtypeSwitcher from '../components/SubtypeSwitcher'
```

Place `<SubtypeSwitcher />` in the settings layout, likely after the account section and before the danger zone (delete account).

- [ ] **Step 3: Commit**

```bash
git add src/components/SubtypeSwitcher.jsx src/pages/Settings.jsx
git commit -m "feat: add SubtypeSwitcher component for user subtype switching"
```

---

## Task 19: Cleanup — Find Remaining `individual` References

**Files:**
- Possibly modify: any files still referencing `individual`

- [ ] **Step 1: Search for remaining references**

```bash
cd /c/Users/Steven/Desktop/PESO-Connect
grep -r "individual" --include="*.{js,jsx}" src/ scripts/ --exclude-dir=node_modules -l
```

Review each match. Expected remaining references:
- `EmployerRegistration.jsx` line 22: `{ value: 'individual', label: 'Individual Service Provider' }` — this is an employer *type*, not a role. **Leave it as-is.** This is a valid employer category (sole proprietor/freelancer), unrelated to the `individual` role.
- `EmployerProfileEdit.jsx` line 175: `{ value: 'individual', label: 'Individual' }` — same, employer type. **Leave it.**
- `MyApplications.test.jsx` line 103: "individual stats" — this is test language for "each stat", not a role reference. **Leave it.**

Any other references to `'individual'` as a role value or `individual_profiles` table must be fixed.

- [ ] **Step 2: Audit admin panel queries**

Review `src/pages/admin/Dashboard.jsx` and any admin components in `src/components/admin/` for queries like:
- `WHERE role = 'jobseeker'` → change to `WHERE role = 'user' AND subtype = 'jobseeker'`
- `WHERE role = 'individual'` → change to `WHERE role = 'user' AND subtype = 'homeowner'`
- References to `individual_profiles` → change to `homeowner_profiles`

```bash
grep -rn "role.*jobseeker\|role.*individual\|individual_profiles" --include="*.{js,jsx}" src/pages/admin/ src/components/admin/
```

Fix any matches found.

- [ ] **Step 3: Clarify "Find Workers" in testing checklist**

The "Find Workers" feature is the `/diagnostic` route (Diagnostic.jsx). It's a **public page** — accessible to everyone including homeowners, jobseekers, employers, and unauthenticated users. It's listed in `Navbar.jsx` as a public nav link (line 46). It is NOT homeowner-specific. In the testing checklist, "Homeowner sees Find Workers" means homeowners should see it in their dashboard quick actions and navbar, which they do.

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: cleanup remaining individual references across codebase"
```

---

## Task 20: Run Migration and End-to-End Testing

**Note:** This task is manual. The migration runs in Supabase SQL Editor, not via code.

- [ ] **Step 1: Check for RLS policies**

In Supabase Dashboard → Authentication → Policies, check if `individual_profiles` has any RLS policies. If yes, add `ALTER POLICY` statements to the migration script before running it.

- [ ] **Step 2: Run the migration**

Copy the contents of `sql/migration_two_level_roles.sql` into Supabase SQL Editor and execute.

- [ ] **Step 3: Verify migration**

Run these queries in Supabase SQL Editor:

```sql
-- Check that no 'jobseeker' or 'individual' roles remain
SELECT role, subtype, COUNT(*) FROM public.users GROUP BY role, subtype;

-- Check that homeowner_profiles table exists
SELECT COUNT(*) FROM homeowner_profiles;

-- Check constraints exist
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'users' AND constraint_name LIKE 'chk_%';
```

- [ ] **Step 4: Deploy to Vercel**

Push the code to trigger Vercel deployment, or deploy manually. Do this immediately after the migration.

- [ ] **Step 5: End-to-end testing**

Run through the testing checklist from the spec (Section 8.3):

**Registration:**
- [ ] Employer registration creates `role='employer', subtype=NULL`
- [ ] Jobseeker registration creates `role='user', subtype='jobseeker'`
- [ ] Homeowner registration creates `role='user', subtype='homeowner'`
- [ ] `/register/individual` redirects to `/register/homeowner`
- [ ] Interrupted registration resumes correctly for each type

**Auth & Routing:**
- [ ] Employer sees Post Job, My Listings (not My Applications)
- [ ] Jobseeker sees My Applications, Saved Jobs (not Post Job)
- [ ] Homeowner sees Find Workers quick action (the `/diagnostic` page) in dashboard
- [ ] Admin sees Admin Panel
- [ ] Cross-role route access is denied

**Subtype Switching:**
- [ ] Jobseeker switches to homeowner via Settings — UI updates
- [ ] Homeowner switches to jobseeker via Settings — UI updates
- [ ] Old profile data preserved on switch back
- [ ] Employer and admin do not see SubtypeSwitcher

**Migration:**
- [ ] Pre-existing jobseeker accounts work
- [ ] Pre-existing homeowner accounts work
- [ ] Pre-existing employer accounts unaffected
- [ ] Stale localStorage refreshes on login
