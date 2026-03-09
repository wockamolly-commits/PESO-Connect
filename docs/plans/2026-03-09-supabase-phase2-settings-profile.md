# Supabase Phase 2 — Settings, Profile, PublicProfile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Settings.jsx, Profile.jsx, and PublicProfile.jsx from Firebase Firestore to Supabase, removing all remaining Firebase dependencies from these three files.

**Architecture:** Settings writes `notification_preferences` and `privacy_settings` JSONB columns directly to `public.users`. Profile.jsx is effectively dead code (always redirects to role-specific edit pages) but gets cleaned up anyway using the same split-write pattern as the existing ProfileEdit pages. PublicProfile fetches any user's data by merging `public.users` + role profile table — requires new read-all RLS policies since the current policies only allow self-read.

**Tech Stack:** React 18, Supabase JS v2, Vitest, Tailwind CSS

---

### Task 1: SQL — add read policies and ensure settings columns exist

**Files:** None (run manually in Supabase SQL Editor)

**Step 1: Create `sql/phase2_public_read_policies.sql`**

Create this file locally for reference, then run it in the Supabase SQL Editor.

```sql
-- ============================================================
-- Phase 2: allow authenticated users to read any user's profile
-- and ensure notification/privacy columns exist on public.users
-- ============================================================

-- 1. Ensure settings columns exist (safe to run even if already present)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb,
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb;

-- 2. Allow any authenticated user to read any row in public.users
--    (privacy enforcement is done at the app layer in PublicProfile.jsx)
CREATE POLICY "Authenticated users can read all user rows"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Allow any authenticated user to read any jobseeker profile
CREATE POLICY "Authenticated users can read all jobseeker profiles"
  ON public.jobseeker_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Allow any authenticated user to read any employer profile
CREATE POLICY "Authenticated users can read all employer profiles"
  ON public.employer_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Allow any authenticated user to read any individual profile
CREATE POLICY "Authenticated users can read all individual profiles"
  ON public.individual_profiles FOR SELECT
  USING (auth.role() = 'authenticated');
```

**Step 2: Run in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → paste the contents → Run.

Expected: "Success. No rows returned." for each statement.

**Step 3: Commit the SQL file**

```bash
git add sql/phase2_public_read_policies.sql
git commit -m "feat: add read-all RLS policies and settings columns for Phase 2"
```

---

### Task 2: Migrate Settings.jsx

**Files:**
- Modify: `src/pages/Settings.jsx`

The only Firebase call is in `saveSettings` (line 182):
```js
await updateDoc(doc(db, 'users', currentUser.uid), {
    [field]: value,
    updated_at: new Date().toISOString()
})
```
Both `notification_preferences` and `privacy_settings` are JSONB columns in `public.users` — no profile table split needed.

**Step 1: Replace the Firebase imports**

Remove lines 3–4:
```js
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
```

Replace with:
```js
import { supabase } from '../config/supabase'
```

**Step 2: Replace the `saveSettings` function body**

Old (line 182–185):
```js
await updateDoc(doc(db, 'users', currentUser.uid), {
    [field]: value,
    updated_at: new Date().toISOString()
})
```

New:
```js
const { error } = await supabase
    .from('users')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('id', currentUser.uid)
if (error) throw error
```

**Step 3: Start dev server and smoke test**

```bash
npm run dev
```

- Log in → go to Settings → toggle any notification → confirm "Saved" indicator appears
- Reload the page → confirm toggles are in the same state (data persisted)
- Go to Settings → Privacy → change profile visibility → confirm it persists on reload
- Check Supabase Table Editor → `users` table → confirm `notification_preferences` and `privacy_settings` columns are populated

**Step 4: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "feat: migrate Settings.jsx from Firebase to Supabase"
```

---

### Task 3: Migrate Profile.jsx

**Files:**
- Modify: `src/pages/Profile.jsx`

`Profile.jsx` always redirects logged-in users to their role-specific edit page, making `handleSubmit`'s Firebase call dead code. We clean it up anyway using the same split-write pattern as the existing ProfileEdit pages.

**Step 1: Replace the Firebase imports**

Remove lines 3–4:
```js
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
```

Replace with:
```js
import { supabase } from '../config/supabase'
```

**Step 2: Replace `handleSubmit`**

Old:
```js
await updateDoc(doc(db, 'users', currentUser.uid), {
    ...formData,
    updated_at: new Date().toISOString()
})
```

New (split write — `full_name` goes to role profile table, others to `users`):
```js
const now = new Date().toISOString()
const { error: baseErr } = await supabase
    .from('users')
    .update({ name: formData.full_name, updated_at: now })
    .eq('id', currentUser.uid)
if (baseErr) throw baseErr

const profileTable = {
    jobseeker: 'jobseeker_profiles',
    employer: 'employer_profiles',
    individual: 'individual_profiles',
}[userData?.role]

if (profileTable) {
    const { error: profileErr } = await supabase
        .from(profileTable)
        .upsert({
            id: currentUser.uid,
            full_name: formData.full_name,
            updated_at: now,
        }, { onConflict: 'id' })
    if (profileErr) throw profileErr
}
```

**Step 3: Commit**

```bash
git add src/pages/Profile.jsx
git commit -m "feat: migrate Profile.jsx from Firebase to Supabase"
```

---

### Task 4: Migrate PublicProfile.jsx

**Files:**
- Modify: `src/pages/PublicProfile.jsx`

This is the most involved change. The current code does a single `getDoc(doc(db, 'users', userId))` which fetched all flat data from Firebase. Now data is split across `public.users` and a role-specific profile table, so we need two queries and a merge.

Also: line 277 references `profile.uid` (Firebase convention) — this must change to `profile.id` (Supabase convention).

**Step 1: Replace the Firebase imports**

Remove lines 3–4:
```js
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
```

Replace with:
```js
import { supabase } from '../config/supabase'
```

**Step 2: Replace `fetchProfile` inside the `useEffect`**

Old:
```js
const userDoc = await getDoc(doc(db, 'users', userId))
if (userDoc.exists()) {
    setProfile(userDoc.data())
}
```

New:
```js
const PROFILE_TABLE = {
    jobseeker: 'jobseeker_profiles',
    employer: 'employer_profiles',
    individual: 'individual_profiles',
}

// Fetch base user row
const { data: baseData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

if (error) throw error
if (!baseData) return // profile not found — setProfile stays null

// Fetch role-specific profile
const profileTable = PROFILE_TABLE[baseData.role]
let profileData = {}
if (profileTable) {
    const { data: roleProfile } = await supabase
        .from(profileTable)
        .select('*')
        .eq('id', userId)
        .maybeSingle()
    if (roleProfile) profileData = roleProfile
}

// Merge: base fields first, then overlay non-empty profile fields
const merged = { ...baseData }
Object.entries(profileData).forEach(([key, val]) => {
    const isEmpty = val === null || val === '' ||
        (Array.isArray(val) && val.length === 0)
    if (!isEmpty) merged[key] = val
})

setProfile(merged)
```

**Step 3: Fix `profile.uid` → `profile.id`**

On the "View Job Listings" link (currently line 277):

Old:
```js
<Link to={`/jobs?employer=${profile.uid}`} ...>
```

New:
```js
<Link to={`/jobs?employer=${profile.id}`} ...>
```

**Step 4: Start dev server and smoke test**

```bash
npm run dev
```

- Visit `/profile/<userId>` for a jobseeker — confirm name, skills, education, work experience show
- Visit `/profile/<userId>` for an employer — confirm company name, type, description show
- Visit `/profile/<userId>` for a non-existent ID — confirm "Profile Not Found" card shows
- Log in as an unverified user → visit a "verified_only" profile → confirm "Restricted Profile" card shows
- As the profile owner → confirm "Edit Profile" button appears

**Step 5: Commit**

```bash
git add src/pages/PublicProfile.jsx
git commit -m "feat: migrate PublicProfile.jsx from Firebase to Supabase"
```

---

### Task 5: Verify no Firebase imports remain in these files

**Step 1: Run grep**

```bash
grep -n "firebase" src/pages/Settings.jsx src/pages/Profile.jsx src/pages/PublicProfile.jsx
```

Expected: no output (zero matches).

**Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: no new failures vs. baseline.

**Step 3: Final commit if any cleanup needed**

```bash
git add .
git commit -m "chore: Phase 2 complete — Settings, Profile, PublicProfile on Supabase"
```
