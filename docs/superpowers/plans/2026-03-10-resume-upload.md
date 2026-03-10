# Resume Upload Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow jobseekers to upload a PDF resume to their profile (default) and optionally override it per job application, stored in Supabase Storage.

**Architecture:** Create a `resumes` Supabase Storage bucket. Add a reusable `ResumeUpload` component used by both JobseekerProfileEdit (default resume) and JobDetail (per-application override). On apply, the application record saves the resume URL (either profile default or override). Replaces existing base64-in-DB pattern with proper file storage.

**Tech Stack:** React, Supabase Storage API, Supabase JS client

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `sql/create_resumes_bucket.sql` | Create | SQL to create storage bucket + RLS policies |
| `src/components/common/ResumeUpload.jsx` | Create | Reusable resume upload component (file input, validation, upload, display) |
| `src/pages/JobseekerProfileEdit.jsx` | Modify | Replace base64 resume handling with ResumeUpload component |
| `src/pages/JobDetail.jsx` | Modify | Add resume section to apply form |

---

## Chunk 1: Storage Setup + Reusable Component

### Task 1: Create Supabase Storage Bucket SQL

**Files:**
- Create: `sql/create_resumes_bucket.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- Create resumes storage bucket
-- Run in Supabase Dashboard > SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own resumes
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/replace their own resumes
CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own resumes
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access (bucket is public, so URLs work without auth)
CREATE POLICY "Anyone can read resumes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');
```

- [ ] **Step 2: Commit**

```bash
git add sql/create_resumes_bucket.sql
git commit -m "feat: add SQL for resumes storage bucket with RLS policies"
```

- [ ] **Step 3: Run in Supabase Dashboard**

Copy the SQL and run it in Supabase Dashboard > SQL Editor. Verify the bucket appears in Storage.

---

### Task 2: Create ResumeUpload Component

**Files:**
- Create: `src/components/common/ResumeUpload.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState, useRef } from 'react'
import { supabase } from '../../config/supabase'
import { Upload, FileText, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Reusable resume upload component.
 *
 * Props:
 *   userId       — current user's UUID (required)
 *   storagePath  — path within resumes bucket, e.g. "{userId}/resume.pdf" (required)
 *   currentUrl   — existing resume URL to display (optional)
 *   onUploaded   — callback(publicUrl) after successful upload (required)
 *   onRemoved    — callback() after resume removed (optional)
 *   label        — display label (default: "Resume")
 *   optional     — show "(optional)" text (default: true)
 */
export default function ResumeUpload({
    userId,
    storagePath,
    currentUrl,
    onUploaded,
    onRemoved,
    label = 'Resume',
    optional = true,
}) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const [fileName, setFileName] = useState('')
    const fileRef = useRef(null)

    const validate = (file) => {
        if (!file) return 'No file selected'
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            return 'Only PDF files are accepted'
        }
        if (file.size > MAX_SIZE) {
            return `File too large. Maximum size is 5MB (yours: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
        }
        return null
    }

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validationError = validate(file)
        if (validationError) {
            setError(validationError)
            if (fileRef.current) fileRef.current.value = ''
            return
        }

        setError('')
        setUploading(true)
        setFileName(file.name)

        try {
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                })

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(storagePath)

            // Append timestamp to bust cache
            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
            onUploaded(publicUrl)
        } catch (err) {
            setError(`Upload failed: ${err.message}`)
            setFileName('')
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const handleRemove = async () => {
        setUploading(true)
        try {
            await supabase.storage.from('resumes').remove([storagePath])
            setFileName('')
            onRemoved?.()
        } catch (err) {
            setError(`Remove failed: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }

    const displayUrl = currentUrl
    const displayName = fileName || (displayUrl ? 'resume.pdf' : '')

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} {optional && <span className="text-gray-400">(optional)</span>}
            </label>

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {displayUrl ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:underline truncate flex-1"
                    >
                        {displayName}
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
                            Replace
                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleUpload}
                                className="hidden"
                                ref={fileRef}
                                disabled={uploading}
                            />
                        </label>
                        {onRemoved && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={uploading}
                                className="text-red-500 hover:text-red-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                }`}>
                    {uploading ? (
                        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                    ) : (
                        <Upload className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">
                        {uploading ? 'Uploading...' : 'Click to upload PDF (max 5MB)'}
                    </span>
                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleUpload}
                        className="hidden"
                        ref={fileRef}
                        disabled={uploading}
                    />
                </label>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/ResumeUpload.jsx
git commit -m "feat: add reusable ResumeUpload component with Supabase Storage"
```

---

## Chunk 2: Integrate into Profile and Apply Form

### Task 3: Add ResumeUpload to JobseekerProfileEdit

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx`

- [ ] **Step 1: Add import**

At the imports section (around line 10), add:

```jsx
import ResumeUpload from '../components/common/ResumeUpload'
```

- [ ] **Step 2: Add resume URL state tracking**

The form already has `resumeFile` state (line 77). We need to track the resume URL from Supabase Storage instead. Find the state declarations and add:

```jsx
const [resumeUrl, setResumeUrl] = useState(userData?.resume_url || '')
```

- [ ] **Step 3: Replace the resume file input section**

Find the existing resume file input (lines 936-945) and replace it with:

```jsx
<ResumeUpload
    userId={currentUser.uid}
    storagePath={`${currentUser.uid}/resume.pdf`}
    currentUrl={resumeUrl}
    onUploaded={(url) => setResumeUrl(url)}
    onRemoved={() => setResumeUrl('')}
    label="Resume"
    optional={true}
/>
```

- [ ] **Step 4: Update handleSubmit to save resume URL**

In `handleSubmit` (around lines 254-330), find where `resume_url` is saved to the `jobseeker_profiles` upsert. Remove the old base64 logic (lines 271-275 that call `compressAndEncode`) and ensure `resume_url: resumeUrl` is included in the profile data object being upserted.

Find the section that builds the profile update data and make sure it includes:

```jsx
resume_url: resumeUrl,
```

Remove the old `resumeFile` processing block that calls `compressAndEncode(resumeFile)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: integrate ResumeUpload into jobseeker profile edit"
```

---

### Task 4: Add Resume Section to Job Application Form

**Files:**
- Modify: `src/pages/JobDetail.jsx`

- [ ] **Step 1: Add import**

At the imports section (line 1-25), add:

```jsx
import ResumeUpload from '../components/common/ResumeUpload'
```

- [ ] **Step 2: Add state for application resume**

Near the existing state declarations (around line 35), add:

```jsx
const [applicationResumeUrl, setApplicationResumeUrl] = useState('')
const [useProfileResume, setUseProfileResume] = useState(true)
```

- [ ] **Step 3: Add resume section to apply form JSX**

Find the apply form section (after the justification textarea, around line 600, before the Cancel/Apply buttons). Add the resume section:

```jsx
{/* Resume Section */}
<div className="mt-4">
    {userData?.resume_url && useProfileResume ? (
        <div>
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 flex-1">Using your saved resume</span>
                <a
                    href={userData.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline"
                >
                    View
                </a>
            </div>
            <button
                type="button"
                onClick={() => setUseProfileResume(false)}
                className="text-sm text-primary-600 hover:text-primary-700 mt-2"
            >
                Upload a different resume
            </button>
        </div>
    ) : (
        <div>
            {userData?.resume_url && (
                <button
                    type="button"
                    onClick={() => {
                        setUseProfileResume(true)
                        setApplicationResumeUrl('')
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 mb-2"
                >
                    Use saved resume instead
                </button>
            )}
            <ResumeUpload
                userId={currentUser.uid}
                storagePath={`${currentUser.uid}/${id}.pdf`}
                currentUrl={applicationResumeUrl}
                onUploaded={(url) => setApplicationResumeUrl(url)}
                onRemoved={() => setApplicationResumeUrl('')}
                label={userData?.resume_url ? 'Upload different resume' : 'Resume'}
                optional={true}
            />
        </div>
    )}
</div>
```

Note: `FileText` is already imported in JobDetail.jsx. The `id` variable is the job ID from `useParams()`.

- [ ] **Step 4: Update handleApply to include resume URL**

In `handleApply` (line 143-188), find the `.insert()` call (lines 164-177) and add `resume_url` to the inserted data:

```jsx
resume_url: useProfileResume
    ? (userData?.resume_url || null)
    : (applicationResumeUrl || null),
```

Add this field alongside the existing fields in the insert object (after `justification_text`).

- [ ] **Step 5: Reset resume state when apply form closes**

Find where `setShowApplyForm(false)` is called (the Cancel button handler and after successful submission). Add cleanup:

```jsx
setApplicationResumeUrl('')
setUseProfileResume(true)
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/JobDetail.jsx
git commit -m "feat: add resume upload to job application form"
```

---

### Task 5: Manual Testing Checklist

- [ ] **Step 1: Verify Supabase bucket exists**

Go to Supabase Dashboard > Storage. Confirm `resumes` bucket is listed.

- [ ] **Step 2: Test profile resume upload**

1. Log in as `maria.santos@test.com` / `Test1234!`
2. Go to profile edit page
3. Upload a PDF file < 5MB → should show green confirmation with filename
4. Try uploading a `.docx` file → should show "Only PDF files are accepted" error
5. Try uploading a 10MB PDF → should show "File too large" error
6. Click Replace → should let you swap files
7. Click Remove → should clear the resume
8. Save profile → resume_url should persist in database

- [ ] **Step 3: Test application with profile resume**

1. With a saved profile resume, go to a job detail page
2. Click "Apply Now"
3. Should see "Using your saved resume" with View link
4. Submit application
5. Check `applications` table — `resume_url` should match profile resume URL

- [ ] **Step 4: Test application with override resume**

1. With a saved profile resume, go to a different job
2. Click "Apply Now"
3. Click "Upload a different resume"
4. Upload a different PDF
5. Submit application
6. Check `applications` table — `resume_url` should be the override URL, not the profile one

- [ ] **Step 5: Test application without any resume**

1. Submit an application without uploading or having a profile resume
2. Should succeed (resume is optional)
3. Check `applications` table — `resume_url` should be null

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during resume upload testing"
```
