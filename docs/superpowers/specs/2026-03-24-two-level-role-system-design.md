# Two-Level Role System Design

**Date:** 2026-03-24
**Status:** Approved
**Author:** Steven (with Claude Code)
**Context:** Capstone adviser requested a hierarchical role structure for government (PESO) deployment readiness.

---

## 1. Problem

The current registration system has three flat roles: Employer, Jobseeker, and Homeowner (stored as `individual`). This structure does not reflect the intended user flow where Employer is a distinct entity, while Jobseeker and Homeowner are both citizen-facing subtypes of a general "User" role. The flat structure also makes the system harder to scale for future government deployment.

## 2. Decision

Add a `subtype` text column to `public.users` alongside the existing `role` column, creating a two-level role hierarchy.

### Role Structure

| Primary Role | Subtype | Description |
|-------------|---------|-------------|
| `employer` | `NULL` | Businesses hiring workers |
| `user` | `jobseeker` | Citizens seeking employment |
| `user` | `homeowner` | Citizens seeking household workers |
| `admin` | `NULL` | PESO staff managing the platform |

### Why This Approach

Three approaches were evaluated:

1. **Add `subtype` column to `public.users`** (chosen) — minimal schema change, single-query auth, DB-enforced integrity, easy subtype switching, solo-dev friendly.
2. **Separate `user_roles` junction table** (rejected) — over-engineered, adds JOINs to every auth query, harder for a solo dev to maintain.
3. **Composite string values (e.g., `user:jobseeker`)** (rejected) — requires string parsing everywhere, fragile, not standard for government systems.

### Key Design Decisions

- **Renaming:** `individual` disappears entirely. The database value becomes `homeowner`, the table becomes `homeowner_profiles`, the status column becomes `homeowner_status`. Self-documenting for future government IT teams.
- **Admin as primary role:** Three primary roles (`employer`, `user`, `admin`). Admin is a distinct entity (PESO staff), not a flag on another role.
- **Subtype switching:** One subtype at a time, switchable via profile settings. Old profile data is preserved (not deleted) to support switching back. No admin approval required for switching.

---

## 3. Database Design

### 3.1 Schema Change

```sql
ALTER TABLE public.users ADD COLUMN subtype text;
```

### 3.2 Constraints

```sql
-- Valid primary roles
ALTER TABLE public.users
  ADD CONSTRAINT chk_valid_role
  CHECK (role IN ('employer', 'user', 'admin'));

-- Valid subtypes
ALTER TABLE public.users
  ADD CONSTRAINT chk_valid_subtype
  CHECK (subtype IN ('jobseeker', 'homeowner') OR subtype IS NULL);

-- Integrity: user role MUST have subtype, others MUST NOT
ALTER TABLE public.users
  ADD CONSTRAINT chk_role_subtype_integrity
  CHECK (
    (role = 'user' AND subtype IS NOT NULL) OR
    (role != 'user' AND subtype IS NULL)
  );
```

### 3.3 Profile Table Mapping

| Role | Subtype | Profile Table | Status Field |
|------|---------|---------------|-------------|
| `employer` | `NULL` | `employer_profiles` | `employer_status` |
| `user` | `jobseeker` | `jobseeker_profiles` | `jobseeker_status` |
| `user` | `homeowner` | `homeowner_profiles` | `homeowner_status` |
| `admin` | `NULL` | None | N/A |

### 3.4 Updated DB Trigger

```sql
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
```

**Verification policy:** Homeowners are auto-verified (`is_verified = true`) because they do not require PESO employment verification — they are citizens seeking household workers, not job placement services. Jobseekers require PESO admin approval because the agency validates their employment eligibility. Employers require admin approval to verify business legitimacy. This matches the current system's behavior (where `individual` was auto-verified).

### 3.5 Validation Rules

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | `role` must be `employer`, `user`, or `admin` | DB constraint |
| 2 | `subtype` must be `jobseeker`, `homeowner`, or `NULL` | DB constraint |
| 3 | `role='user'` requires `subtype IS NOT NULL` | DB constraint |
| 4 | `role!='user'` requires `subtype IS NULL` | DB constraint |
| 5 | Subtype switch only allowed when `role='user'` AND `registration_complete=true` | App logic |
| 6 | On subtype switch, create empty target profile row | App logic |
| 7 | On subtype switch, preserve source profile data | App logic |
| 8 | Old route `/register/individual` redirects to `/register/homeowner` | App routing |

---

## 4. UI/UX Registration Flow

### 4.1 Two-Step Selection at `/register`

**Step 1 — "How will you use PESO Connect?"**

Two cards:
- **Employer** (Briefcase icon) — "Hire workers for your business"
- **User** (Users icon) — "Access PESO services as a citizen"

Selecting Employer navigates directly to `/register/employer`.
Selecting User reveals Step 2 inline (no page navigation).

**Step 2 — "What are you looking for?"** (only when User is selected)

Two cards slide in:
- **Jobseeker** (Search icon) — "Find employment opportunities"
- **Homeowner** (Home icon) — "Find workers for household needs"

A back arrow lets the user return to Step 1.

Selecting a subtype navigates to the corresponding registration wizard.

### 4.2 Route Map

```
/register
├── [Employer] ──────────────→ /register/employer    (4 steps, unchanged)
└── [User]
     ├── [Jobseeker] ────────→ /register/jobseeker   (6 steps, unchanged)
     └── [Homeowner] ────────→ /register/homeowner    (2 steps, renamed)
```

### 4.3 Registration Wizard Changes

| Wizard | Change |
|--------|--------|
| `EmployerRegistration.jsx` | None — `createAccount(email, password, 'employer')` stays the same |
| `JobseekerRegistration.jsx` | `createAccount` call changes to `createAccount(email, password, 'user', 'jobseeker')` |
| `HomeownerRegistration.jsx` (renamed from `IndividualRegistration.jsx`) | `createAccount` call changes to `createAccount(email, password, 'user', 'homeowner')` |

### 4.4 `createAccount` Signature

```js
// Updated signature with backward-compatible default
createAccount(email, password, role, subtype = null)
```

Both `role` and `subtype` are passed into Supabase signup metadata for the DB trigger.

### 4.5 minimalDoc Cache Update

The `createAccount` function seeds a `minimalDoc` into localStorage immediately after signup (to prevent navbar flash). This object must include the `subtype` field:

```js
const minimalDoc = {
  id: user.id,
  email,
  role,
  subtype,                              // NEW — include subtype
  name: 'User',
  is_verified: role === 'user' && subtype === 'homeowner',  // updated logic
  registration_complete: false,
};
```

Without `subtype` in the cache, `isJobseeker()` and `isHomeowner()` return false during the brief window before `fetchUserData` completes, causing a UI flash.

---

## 5. Authentication & Role Handling

### 5.1 Role Helper Methods (AuthContext)

```js
// Primary role checks
isEmployer()  → userData?.role === 'employer'
isUser()      → userData?.role === 'user'
isAdmin()     → userData?.role === 'admin'

// Subtype checks
isJobseeker() → userData?.role === 'user' && userData?.subtype === 'jobseeker'
isHomeowner() → userData?.role === 'user' && userData?.subtype === 'homeowner'

// Verification (unchanged)
isVerified()  → userData?.is_verified === true
```

`isIndividual()` is deleted and replaced by `isHomeowner()`.

### 5.2 Profile Table Resolution

```js
const getProfileTable = (role, subtype) => {
  if (role === 'employer') return 'employer_profiles';
  if (role === 'user') return PROFILE_TABLES[subtype]; // jobseeker_profiles or homeowner_profiles
  return null; // admin
};
```

**Critical change in `fetchUserData`:** The current code resolves the profile table with `PROFILE_TABLE[baseData.role]`. After migration, `baseData.role` for jobseekers is `'user'` (not `'jobseeker'`), so this lookup fails. Replace with `getProfileTable(baseData.role, baseData.subtype)`.

**`BASE_FIELDS` update:** The `splitFields` function uses a `BASE_FIELDS` set to decide what goes to `public.users` vs. the profile table during `saveRegistrationStep`. Add `'subtype'` to `BASE_FIELDS` so it routes to the users table, not the profile table.

### 5.3 ProtectedRoute Update

The `allowedRoles` array matches against both `role` and `subtype`:

```js
const hasAccess = (userData, allowedRoles) => {
  if (!allowedRoles) return true;
  return allowedRoles.some(allowed =>
    allowed === userData.role || allowed === userData.subtype
  );
};
```

**Usage guidance:** Use subtype values (`'jobseeker'`, `'homeowner'`) for subtype-specific routes. Using `'user'` as an allowed role grants access to ALL user subtypes (both jobseeker and homeowner) — only use this when a route genuinely serves all citizen users regardless of subtype. When in doubt, list subtypes individually for granular control.

### 5.4 Route Access Map

| Route | `allowedRoles` | Matches |
|-------|---------------|---------|
| `/post-job`, `/my-listings` | `['employer']` | `role='employer'` |
| `/my-applications`, `/saved-jobs` | `['jobseeker']` | `subtype='jobseeker'` |
| `/profile/edit` | `['jobseeker']` | `subtype='jobseeker'` |
| `/profile/edit/employer` | `['employer']` | `role='employer'` |
| `/profile/edit/homeowner` | `['homeowner']` | `subtype='homeowner'` |
| `/admin` | `['admin']` | `role='admin'` |
| `/dashboard`, `/messages` | None | All authenticated |

### 5.5 Registration Continuation

```js
if (userData.role === 'employer') navigate('/register/employer');
if (userData.subtype === 'jobseeker') navigate('/register/jobseeker');
if (userData.subtype === 'homeowner') navigate('/register/homeowner');
```

### 5.6 Subtype Switching

User navigates to Profile Settings and clicks "Switch Account Type":

1. Confirmation dialog explains the change.
2. On confirm: `UPDATE users SET subtype = ? WHERE id = ?`
3. Create empty target profile row if none exists.
4. Do NOT delete the source profile row (preserves data for switching back).
5. Call `fetchUserData` to refresh context + localStorage.
6. Redirect to `/dashboard`.

Only visible when `isUser()` returns true and `registration_complete` is true. Employers and admins never see it. Partially-registered users cannot switch subtypes.

---

## 6. Feature Impact Analysis

### 6.1 Files to Modify (~11)

| File | Change |
|------|--------|
| `AuthContext.jsx` | Add `subtype` to `createAccount` + `minimalDoc`, update `fetchUserData` to use `getProfileTable(role, subtype)`, add `subtype` to `BASE_FIELDS`, replace helpers |
| `Register.jsx` | Two-step selection UI |
| `JobseekerRegistration.jsx` | Update `createAccount` params |
| `ProtectedRoute.jsx` | Update `hasAccess` to match role + subtype |
| `RegistrationContinue.jsx` | Route by `subtype` |
| `App.jsx` | Update routes, imports, add redirect |
| `Navbar.jsx` | Replace `isIndividual()` with `isHomeowner()` |
| `Dashboard.jsx` | Replace `isIndividual()` with `isHomeowner()`, update profile table/status field resolution to use `getProfileTable` and `getStatusField` helpers (current hardcoded ternary only handles jobseeker/employer) |
| Settings page | Add `SubtypeSwitcher` component |
| `scripts/seed-users.js` | Update `individual` references to `homeowner`, update `individual_profiles` to `homeowner_profiles`, update `individual_status` to `homeowner_status` |

### 6.2 Files to Rename (2)

| From | To |
|------|-----|
| `IndividualRegistration.jsx` | `HomeownerRegistration.jsx` |
| `IndividualProfileEdit.jsx` | `HomeownerProfileEdit.jsx` |

### 6.3 Files to Create (2)

| File | Purpose |
|------|---------|
| `src/utils/roles.js` | Centralized role constants and helpers |
| `src/components/SubtypeSwitcher.jsx` | Subtype switching UI for profile settings |

### 6.4 Unaffected Features

Job postings, applications, messaging, saved jobs, and job browsing are unaffected. They reference `users.id` via foreign keys, not the role column.

**Note on admin panel:** If the admin panel filters users by role (e.g., `WHERE role = 'jobseeker'`), those queries must be updated to `WHERE role = 'user' AND subtype = 'jobseeker'`. Audit admin panel queries during Phase 5 cleanup.

---

## 7. Migration Strategy

### 7.1 Migration Script

Run as a single atomic transaction in Supabase SQL Editor:

```sql
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

### 7.1.1 RLS Policy Audit

Before running the migration, audit Row Level Security policies on `individual_profiles` for any references to the table name or `individual_status` column. If RLS policies exist, update them to reference `homeowner_profiles` and `homeowner_status` within the same transaction. If no RLS is enabled, no action needed.

### 7.2 Rollback Script

```sql
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

### 7.3 Deployment Order

1. Run migration SQL in Supabase SQL Editor.
2. Deploy updated frontend to Vercel.
3. Do both back-to-back during low traffic.

### 7.4 localStorage Compatibility

Stale caches with `role: 'jobseeker'` or `role: 'individual'` are overwritten on next `fetchUserData` call. No cache-busting logic needed.

---

## 8. Clean Architecture

### 8.1 Role Constants Module (`src/utils/roles.js`)

```js
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

### 8.2 Implementation Phases

| Phase | Steps | Result |
|-------|-------|--------|
| 1. Foundation | Create `roles.js`, run migration, update `AuthContext`, update `ProtectedRoute` | Auth works with new role structure |
| 2. Registration | Update `Register.jsx`, rename + update homeowner wizard, update jobseeker wizard, update `RegistrationContinue` | New users register with two-level roles |
| 3. UI Updates | Update `App.jsx` routes, `Navbar`, `Dashboard`, rename homeowner profile edit | All pages reflect new role names |
| 4. New Feature | Build `SubtypeSwitcher`, add to settings | Users can switch subtype |
| 5. Cleanup | Search for remaining `individual` references, end-to-end testing | No stale references remain |

### 8.3 Testing Checklist

**Registration:**
- [ ] Employer registration creates `role='employer', subtype=NULL`
- [ ] Jobseeker registration creates `role='user', subtype='jobseeker'`
- [ ] Homeowner registration creates `role='user', subtype='homeowner'`
- [ ] `/register/individual` redirects to `/register/homeowner`
- [ ] Interrupted registration resumes correctly for each type

**Auth & Routing:**
- [ ] Employer sees Post Job, My Listings (not My Applications)
- [ ] Jobseeker sees My Applications, Saved Jobs (not Post Job)
- [ ] Homeowner sees Find Workers (not Post Job, not My Applications)
- [ ] Admin sees Admin Panel
- [ ] Cross-role route access is denied

**Subtype Switching:**
- [ ] Jobseeker switches to homeowner — UI updates
- [ ] Homeowner switches to jobseeker — UI updates
- [ ] Old profile data preserved on switch back
- [ ] Employer and admin do not see SubtypeSwitcher

**Migration:**
- [ ] Pre-existing jobseeker accounts work
- [ ] Pre-existing homeowner accounts work
- [ ] Pre-existing employer accounts unaffected
- [ ] Stale localStorage refreshes on login

---

## 9. Edge Cases

| Edge Case | Mitigation |
|-----------|------------|
| User selects "User" but closes browser before picking subtype | No account created — selection screen only, no side effects |
| Direct navigation to `/register/jobseeker` | Works standalone — role and subtype are hardcoded in the wizard |
| Old URL `/register/individual` | Redirect to `/register/homeowner` in `App.jsx` |
| Employer created with a subtype | DB constraint rejects the INSERT |
| User created without a subtype | DB constraint rejects the INSERT |
| Jobseeker switches to homeowner with pending applications | Applications use `user_id` FK — unaffected, user just can't submit new ones |
| Switch target has no profile row | Empty profile row created on switch |
| Stale localStorage after migration | `fetchUserData` overwrites on next login |
