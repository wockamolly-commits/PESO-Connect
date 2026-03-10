# Resume Upload During Job Application — Design Spec

**Date:** 2026-03-10
**Status:** Approved

## Goal

Allow jobseekers to upload a PDF resume to their profile as a default, and optionally override it per application. Resumes stored in Supabase Storage, PDF only, 5MB max, optional.

## Storage

- **Supabase Storage bucket:** `resumes`
- **File paths:**
  - Profile default: `{user_id}/resume.pdf`
  - Per-application override: `{user_id}/{job_id}.pdf`
- **RLS policies:**
  - Users can upload/read their own files
  - Employers can read resumes for applicants to their jobs
  - Admins can read all

## Profile Resume (Default)

- Add "Upload Resume" section to `JobseekerProfileEdit`
- Shows current file name + replace/remove actions if one exists
- Saves public URL to `jobseeker_profiles.resume_url`

## Application Resume (Per-Job Override)

- In `JobDetail.jsx` apply form:
  - If profile has a saved resume: show "Using your saved resume" with filename, plus "Upload a different resume" toggle
  - If no profile resume: show "Upload resume (optional)" file input
- On submit:
  - If override uploaded → upload to `{user_id}/{job_id}.pdf`, use that URL
  - Otherwise → use profile default resume URL (may be empty)
- Saves URL to `applications.resume_url`

## Validation

- **Client-side:** check file type (`.pdf` / `application/pdf`) and size (<=5MB) before upload
- **Inline error:** shown immediately if wrong type or too large
- Resume is optional — application can be submitted without one

## UI Changes

| File | Change |
|------|--------|
| `src/pages/JobseekerProfileEdit.jsx` | Add resume upload section with upload/replace/remove |
| `src/pages/JobDetail.jsx` | Add resume field to apply form (profile default or override) |
| `src/pages/employer/JobApplicants.jsx` | Already shows resume link — no changes needed |

## Database Changes

None — `jobseeker_profiles.resume_url` and `applications.resume_url` columns already exist.

## Supabase Setup Required

Create `resumes` storage bucket with appropriate RLS policies. This must be done in the Supabase Dashboard before the feature works.
