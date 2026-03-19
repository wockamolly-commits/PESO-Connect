# Supabase Phase 3 — Jobs Domain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the jobs domain (PostJob, MyListings, JobListings, JobDetail, JobApplicants) from Firebase Firestore to Supabase, creating the `job_postings` and `applications` tables.

**Architecture:** Two new Postgres tables — `job_postings` and `applications` — replace the Firestore `job_postings` and `applications` collections. All five files swap `addDoc`/`getDocs`/`updateDoc`/`deleteDoc` for `supabase.from(...)` calls. RLS allows anonymous reads on `job_postings` (public browsing) and restricts `applications` to the applicant and the job's employer.

**Tech Stack:** React 18, Supabase JS v2, Vitest, Tailwind CSS

---

### Task 1: SQL — create job_postings and applications tables

**Files:** None (run manually in Supabase SQL Editor)

**Step 1: Create `sql/phase3_jobs_tables.sql`**

Create this file locally for reference, then run it in the Supabase SQL Editor.

```sql
-- ============================================================
-- Phase 3: job_postings and applications tables + RLS
-- ============================================================

-- 1. job_postings table
CREATE TABLE IF NOT EXISTS public.job_postings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_name  text,
  title          text NOT NULL,
  description    text,
  category       text,
  type           text,              -- full-time | part-time | contract | temporary
  location       text,
  salary_min     numeric,
  salary_max     numeric,
  requirements   text[]  DEFAULT '{}',
  education_level text,
  filter_mode    text    DEFAULT 'flexible',  -- strict | flexible
  deadline       date,
  status         text    DEFAULT 'open',      -- open | filled | closed
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read job postings
-- (app layer filters by status='open' on public pages)
CREATE POLICY "Anyone can read job postings"
  ON public.job_postings FOR SELECT
  USING (true);

-- Only the owning employer can insert
CREATE POLICY "Employers can insert their own job postings"
  ON public.job_postings FOR INSERT
  WITH CHECK (employer_id = auth.uid());

-- Only the owning employer can update
CREATE POLICY "Employers can update their own job postings"
  ON public.job_postings FOR UPDATE
  USING (employer_id = auth.uid());

-- Only the owning employer can delete
CREATE POLICY "Employers can delete their own job postings"
  ON public.job_postings FOR DELETE
  USING (employer_id = auth.uid());

-- 2. applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  job_title        text,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name   text,
  applicant_email  text,
  applicant_skills text[]  DEFAULT '{}',
  justification_text text,
  resume_url       text,
  status           text    DEFAULT 'pending',  -- pending | shortlisted | hired | rejected
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Applicants can read their own applications
CREATE POLICY "Applicants can read their own applications"
  ON public.applications FOR SELECT
  USING (user_id = auth.uid());

-- Employers can read applications for their own job postings
CREATE POLICY "Employers can read applications for their jobs"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE id = applications.job_id
        AND employer_id = auth.uid()
    )
  );

-- Applicants can insert their own applications
CREATE POLICY "Applicants can insert their own applications"
  ON public.applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Employers can update status on applications for their jobs
CREATE POLICY "Employers can update application status"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE id = applications.job_id
        AND employer_id = auth.uid()
    )
  );
```

**Step 2: Run in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → paste the contents → Run.

Expected: "Success. No rows returned." for each statement.

**Step 3: Commit the SQL file**

```bash
git add sql/phase3_jobs_tables.sql
git commit -m "feat: add job_postings and applications tables with RLS for Phase 3"
```

---

### Task 2: Migrate PostJob.jsx

**Files:**
- Modify: `src/pages/employer/PostJob.jsx`

The only Firebase call is in `handleSubmit` — `addDoc(collection(db, 'job_postings'), jobData)`.

**Step 1: Replace the Firebase imports**

Remove:
```js
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
```

Replace with:
```js
import { supabase } from '../../config/supabase'
```

**Step 2: Replace the `addDoc` call in `handleSubmit`**

Old:
```js
await addDoc(collection(db, 'job_postings'), {
    employer_id: currentUser.uid,
    employer_name: userData?.company_name || userData?.name || 'Unknown Employer',
    ...
    created_at: new Date().toISOString()
})
```

New (same shape, just Supabase insert):
```js
const { error } = await supabase
    .from('job_postings')
    .insert({
        employer_id: currentUser.uid,
        employer_name: userData?.company_name || userData?.name || 'Unknown Employer',
        ...  // keep all other fields exactly as they were
        created_at: new Date().toISOString()
    })
if (error) throw error
```

**Step 3: Commit**

```bash
git add src/pages/employer/PostJob.jsx
git commit -m "feat: migrate PostJob.jsx from Firebase to Supabase"
```

---

### Task 3: Migrate MyListings.jsx

**Files:**
- Modify: `src/pages/employer/MyListings.jsx`

Has 4 Firebase operations: read jobs, read applications per job, update status, update deadline, delete job.

**Step 1: Replace the Firebase imports**

Remove:
```js
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
```

Replace with:
```js
import { supabase } from '../../config/supabase'
```

**Step 2: Replace `fetchMyJobs`**

Old (fetches jobs then loops for applications):
```js
const jobsQuery = query(
    collection(db, 'job_postings'),
    where('employer_id', '==', currentUser.uid)
)
const snapshot = await getDocs(jobsQuery)
const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
jobsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
setJobs(jobsData)

const appsData = {}
for (const job of jobsData) {
    const appsQuery = query(
        collection(db, 'applications'),
        where('job_id', '==', job.id)
    )
    const appsSnapshot = await getDocs(appsQuery)
    appsData[job.id] = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}
setApplications(appsData)
```

New (two parallel queries, group applications in JS):
```js
const { data: jobsData, error: jobsError } = await supabase
    .from('job_postings')
    .select('*')
    .eq('employer_id', currentUser.uid)
    .order('created_at', { ascending: false })
if (jobsError) throw jobsError

setJobs(jobsData || [])

const jobIds = (jobsData || []).map(j => j.id)
const appsData = {}
if (jobIds.length > 0) {
    const { data: appsRows } = await supabase
        .from('applications')
        .select('*')
        .in('job_id', jobIds)
    if (appsRows) {
        appsRows.forEach(app => {
            if (!appsData[app.job_id]) appsData[app.job_id] = []
            appsData[app.job_id].push(app)
        })
    }
}
setApplications(appsData)
```

**Step 3: Replace `updateJobStatus`**

Old:
```js
await updateDoc(doc(db, 'job_postings', jobId), {
    status: newStatus,
    updated_at: new Date().toISOString()
})
```

New:
```js
const { error } = await supabase
    .from('job_postings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', jobId)
if (error) throw error
```

**Step 4: Replace `saveDeadline`**

Old:
```js
await updateDoc(doc(db, 'job_postings', jobId), {
    deadline: newDeadline,
    updated_at: new Date().toISOString()
})
```

New:
```js
const { error } = await supabase
    .from('job_postings')
    .update({ deadline: newDeadline, updated_at: new Date().toISOString() })
    .eq('id', jobId)
if (error) throw error
```

**Step 5: Replace `deleteJob`**

Old:
```js
await deleteDoc(doc(db, 'job_postings', jobId))
```

New:
```js
const { error } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', jobId)
if (error) throw error
```

**Step 6: Commit**

```bash
git add src/pages/employer/MyListings.jsx
git commit -m "feat: migrate MyListings.jsx from Firebase to Supabase"
```

---

### Task 4: Migrate JobListings.jsx

**Files:**
- Modify: `src/pages/JobListings.jsx`

One Firebase read: `getDocs` on `job_postings` filtered by `status === 'open'`.

**Step 1: Replace the Firebase imports**

Remove:
```js
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../config/firebase'
```

Replace with:
```js
import { supabase } from '../config/supabase'
```

**Step 2: Replace `fetchJobs`**

Old:
```js
const q = query(
    collection(db, 'job_postings'),
    where('status', '==', 'open')
)
const snapshot = await getDocs(q)
const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
jobsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
setJobs(jobsData)
```

New:
```js
const { data: jobsData, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
if (error) throw error
setJobs(jobsData || [])
```

**Step 3: Commit**

```bash
git add src/pages/JobListings.jsx
git commit -m "feat: migrate JobListings.jsx from Firebase to Supabase"
```

---

### Task 5: Migrate JobDetail.jsx

**Files:**
- Modify: `src/pages/JobDetail.jsx`

Three Firebase operations: fetch job by id, check existing application, insert application.

**Step 1: Replace the Firebase imports**

Remove:
```js
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
```

Replace with:
```js
import { supabase } from '../config/supabase'
```

**Step 2: Replace `fetchJob`**

Old:
```js
const jobDoc = await getDoc(doc(db, 'job_postings', id))
if (jobDoc.exists()) {
    setJob({ id: jobDoc.id, ...jobDoc.data() })
}
```

New:
```js
const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .maybeSingle()
if (error) throw error
if (data) setJob(data)
```

**Step 3: Replace `checkExistingApplication`**

Old:
```js
const appQuery = query(
    collection(db, 'applications'),
    where('job_id', '==', id),
    where('user_id', '==', currentUser.uid)
)
const snapshot = await getDocs(appQuery)
setHasApplied(!snapshot.empty)
```

New:
```js
const { data, error } = await supabase
    .from('applications')
    .select('id')
    .eq('job_id', id)
    .eq('user_id', currentUser.uid)
    .maybeSingle()
if (error) throw error
setHasApplied(!!data)
```

**Step 4: Replace the `addDoc` call in `handleApply`**

Old:
```js
await addDoc(collection(db, 'applications'), {
    job_id: id,
    job_title: job.title,
    user_id: currentUser.uid,
    applicant_name: userData?.name || 'Unknown',
    applicant_email: userData?.email || '',
    applicant_skills: userData?.skills || [],
    justification_text: justification || null,
    status: 'pending',
    created_at: new Date().toISOString()
})
```

New (note `full_name || name` fallback for split-table architecture):
```js
const { error } = await supabase
    .from('applications')
    .insert({
        job_id: id,
        job_title: job.title,
        user_id: currentUser.uid,
        applicant_name: userData?.full_name || userData?.name || 'Unknown',
        applicant_email: userData?.email || '',
        applicant_skills: userData?.skills || [],
        justification_text: justification || null,
        status: 'pending',
        created_at: new Date().toISOString()
    })
if (error) throw error
```

**Step 5: Commit**

```bash
git add src/pages/JobDetail.jsx
git commit -m "feat: migrate JobDetail.jsx from Firebase to Supabase"
```

---

### Task 6: Migrate JobApplicants.jsx

**Files:**
- Modify: `src/pages/employer/JobApplicants.jsx`

Two reads (job + applications) and one update (application status).

**Step 1: Replace the Firebase imports**

Remove:
```js
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
```

Replace with:
```js
import { supabase } from '../../config/supabase'
```

**Step 2: Replace `fetchJobAndApplicants`**

Old:
```js
const jobDoc = await getDoc(doc(db, 'job_postings', jobId))
if (jobDoc.exists()) {
    setJob({ id: jobDoc.id, ...jobDoc.data() })
}

const q = query(
    collection(db, 'applications'),
    where('job_id', '==', jobId)
)
const snapshot = await getDocs(q)
const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
appsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
setApplicants(appsData)
```

New (parallel fetch):
```js
const [{ data: jobData, error: jobError }, { data: appsData, error: appsError }] = await Promise.all([
    supabase.from('job_postings').select('*').eq('id', jobId).maybeSingle(),
    supabase.from('applications').select('*').eq('job_id', jobId).order('created_at', { ascending: false })
])
if (jobError) throw jobError
if (appsError) throw appsError
if (jobData) setJob(jobData)
setApplicants(appsData || [])
```

**Step 3: Replace `updateStatus`**

Old:
```js
await updateDoc(doc(db, 'applications', appId), {
    status: newStatus,
    updated_at: new Date().toISOString()
})
```

New:
```js
const { error } = await supabase
    .from('applications')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', appId)
if (error) throw error
```

**Step 4: Commit**

```bash
git add src/pages/employer/JobApplicants.jsx
git commit -m "feat: migrate JobApplicants.jsx from Firebase to Supabase"
```

---

### Task 7: Verify no Firebase imports remain, run tests

**Step 1: Run grep**

```bash
grep -n "firebase" src/pages/employer/PostJob.jsx src/pages/employer/MyListings.jsx src/pages/JobListings.jsx src/pages/JobDetail.jsx src/pages/employer/JobApplicants.jsx
```

Expected: no output (zero matches).

**Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: no new failures vs. baseline.

**Step 3: Smoke test the dev server**

```bash
npm run dev
```

- Log in as employer → go to `/post-job` → post a job → confirm it appears in `/my-listings`
- From `/my-listings` → change status (Open/Filled/Closed) → confirm it persists on reload
- From `/my-listings` → edit deadline → confirm it persists on reload
- Go to `/jobs` → confirm the new job appears (if status is 'open')
- Click the job → confirm detail page loads
- Log in as jobseeker → go to `/jobs` → click a job → click Apply → confirm success message
- Log in as employer → go to `/employer/jobs/<id>/applicants` → confirm the application appears
- From applicants page → change status to Shortlisted → confirm it persists on reload
- From `/my-listings` → delete a job → confirm it disappears

**Step 4: Final commit if any cleanup needed**

```bash
git add .
git commit -m "chore: Phase 3 complete — jobs domain on Supabase"
```
