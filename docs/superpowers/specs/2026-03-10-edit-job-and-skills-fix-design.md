# Edit Job Feature + Skills Persistence Fix

**Date:** 2026-03-10
**Status:** Approved

## Problem

1. Employer job listings have no edit feature — employers can only delete or change status/deadline, not edit title, description, salary, etc.
2. Updating jobseeker skills saves to Supabase but doesn't update AuthContext or localStorage, so changes appear lost after navigation or refresh.

## Design

### Fix 1: Skills Persistence

**Root cause:** `JobseekerProfileEdit.handleSubmit` saves to Supabase but never refreshes AuthContext `userData` or the localStorage cache.

**Fix:**
- Expose `fetchUserData` from AuthContext's context value
- After successful upsert in `JobseekerProfileEdit.handleSubmit`, call `fetchUserData(currentUser.uid)` to sync DB state into AuthContext and localStorage

**Files:** `AuthContext.jsx`, `JobseekerProfileEdit.jsx`

### Fix 2: Edit Job Feature

**Approach:** Reuse PostJob.jsx with an edit mode triggered by URL param.

**Route:** `/edit-job/:id` in App.jsx (employer-protected)

**PostJob.jsx changes:**
- Read `id` from `useParams()` — presence means edit mode
- On mount in edit mode: fetch job from `job_postings` where `id` matches AND `employer_id = currentUser.uid`
- Pre-populate all wizard fields with fetched data
- Submit button: "Update Job" vs "Post Job"
- On submit: `.update().eq('id', id)` instead of `.insert()`
- After success: navigate to `/my-listings`

**MyListings.jsx changes:**
- Add Edit button (pencil icon) next to Eye and Trash buttons, linking to `/edit-job/:id`

**No new files, no schema changes, no RLS changes.**
