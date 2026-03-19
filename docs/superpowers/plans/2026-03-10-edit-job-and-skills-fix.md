# Edit Job Feature + Skills Persistence Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix skills not persisting after profile edit, and add an edit-job feature that reuses the PostJob wizard.

**Architecture:** Two independent changes. (1) Expose `fetchUserData` from AuthContext and call it after profile save so AuthContext + localStorage stay in sync. (2) Add an `/edit-job/:id` route that renders PostJob in edit mode — on mount it fetches the existing job and pre-populates the wizard; on submit it uses `.update()` instead of `.insert()`.

**Tech Stack:** React 18, Supabase JS v2, React Router v6

---

### Task 1: Fix skills persistence — expose fetchUserData from AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.jsx:333-352`

- [ ] **Step 1: Add `fetchUserData` to the context value**

In `src/contexts/AuthContext.jsx`, find the `value` object (line 333) and add `fetchUserData`:

```js
    const value = {
        currentUser,
        userData,
        loading,
        register,
        createAccount,
        saveRegistrationStep,
        completeRegistration,
        compressAndEncode,
        login,
        logout,
        resetPassword,
        deleteAccount,
        isVerified,
        hasRole,
        isAdmin,
        isEmployer,
        isJobseeker,
        isIndividual,
        fetchUserData,
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: expose fetchUserData from AuthContext"
```

---

### Task 2: Fix skills persistence — call fetchUserData after profile save

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx:3,15,316-321`

- [ ] **Step 1: Destructure fetchUserData from useAuth**

In `src/pages/JobseekerProfileEdit.jsx`, line 15, change:

```js
    const { userData, currentUser } = useAuth()
```

to:

```js
    const { userData, currentUser, fetchUserData } = useAuth()
```

- [ ] **Step 2: Call fetchUserData after successful save**

In `src/pages/JobseekerProfileEdit.jsx`, after line 316 (`if (profileErr) throw profileErr`), add a call to refresh AuthContext before showing success. Replace:

```js
            if (profileErr) throw profileErr

            setSuccess('Profile updated successfully!')
            setTimeout(() => {
                navigate('/dashboard')
            }, 2000)
```

with:

```js
            if (profileErr) throw profileErr

            // Refresh AuthContext + localStorage cache with saved data
            await fetchUserData(currentUser.uid)

            setSuccess('Profile updated successfully!')
            setTimeout(() => {
                navigate('/dashboard')
            }, 2000)
```

- [ ] **Step 3: Verify manually**

1. Log in as a jobseeker
2. Go to `/profile/edit`
3. Add or remove a skill, click Save
4. After redirect to dashboard, navigate back to `/profile/edit`
5. Confirm skills reflect the saved changes (no stale data)

- [ ] **Step 4: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "fix: refresh AuthContext after profile save so skills persist"
```

---

### Task 3: Add /edit-job/:id route in App.jsx

**Files:**
- Modify: `src/App.jsx:159-165`

- [ ] **Step 1: Add the edit-job route**

In `src/App.jsx`, immediately after the `/post-job` route block (after line 165), add:

```jsx
                        <Route
                            path="/edit-job/:id"
                            element={
                                <ProtectedRoute allowedRoles={['employer']} requireVerified>
                                    <ErrorBoundary><PostJob /></ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
```

No new imports needed — `PostJob` is already imported.

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add /edit-job/:id route"
```

---

### Task 4: Add edit mode to PostJob.jsx

**Files:**
- Modify: `src/pages/employer/PostJob.jsx:1-2,59-62,67-87,93,208-253,284-296`

- [ ] **Step 1: Add useParams import**

In `src/pages/employer/PostJob.jsx`, line 2, change:

```js
import { useNavigate } from 'react-router-dom'
```

to:

```js
import { useNavigate, useParams } from 'react-router-dom'
```

- [ ] **Step 2: Read the route param and set up edit-mode state**

After line 61 (`const navigate = useNavigate()`), add:

```js
    const { id: editId } = useParams()
    const isEditMode = Boolean(editId)
    const [fetchingJob, setFetchingJob] = useState(false)
```

- [ ] **Step 3: Add useEffect to fetch existing job in edit mode**

After the skill suggestions `useEffect` (after line 126), add:

```js
    // Fetch existing job data when editing
    useEffect(() => {
        if (!isEditMode || !currentUser) return

        const fetchJob = async () => {
            setFetchingJob(true)
            try {
                const { data, error } = await supabase
                    .from('job_postings')
                    .select('*')
                    .eq('id', editId)
                    .eq('employer_id', currentUser.uid)
                    .maybeSingle()
                if (error) throw error
                if (!data) {
                    setError('Job not found or you do not have permission to edit it.')
                    return
                }
                setJobData({
                    title: data.title || '',
                    category: data.category || '',
                    type: data.type || 'full-time',
                    location: data.location || 'San Carlos City',
                    salaryMin: data.salary_min != null ? String(data.salary_min) : '',
                    salaryMax: data.salary_max != null ? String(data.salary_max) : '',
                    description: data.description || '',
                    requiredSkills: data.requirements || [],
                    experienceLevel: data.experience_level || 'entry',
                    educationLevel: data.education_level || 'high-school',
                    vacancies: data.vacancies || 1,
                    deadline: data.deadline || '',
                    filterMode: data.filter_mode || 'strict',
                    aiMatchingEnabled: data.ai_matching_enabled ?? true,
                })
            } catch (err) {
                console.error('Error fetching job for edit:', err)
                setError('Failed to load job data.')
            } finally {
                setFetchingJob(false)
            }
        }

        fetchJob()
    }, [isEditMode, editId, currentUser])
```

- [ ] **Step 4: Update publishJob to handle update vs insert**

In `src/pages/employer/PostJob.jsx`, replace the `publishJob` function (lines 208-253) with:

```js
    const publishJob = async () => {
        if (!validateStep(3)) return

        setLoading(true)
        setError('')

        try {
            const jobDocument = {
                title: jobData.title,
                category: jobData.category,
                type: jobData.type,
                location: jobData.location,
                salary_range: `PHP ${Number(jobData.salaryMin).toLocaleString()} - ${Number(jobData.salaryMax).toLocaleString()}`,
                salary_min: Number(jobData.salaryMin),
                salary_max: Number(jobData.salaryMax),
                description: jobData.description,
                requirements: jobData.requiredSkills,
                experience_level: jobData.experienceLevel,
                education_level: jobData.educationLevel,
                vacancies: Number(jobData.vacancies),
                deadline: jobData.deadline || null,
                ai_matching_enabled: jobData.aiMatchingEnabled,
                employer_id: currentUser.uid,
                employer_name: userData?.name || 'Unknown',
                filter_mode: jobData.filterMode,
            }

            if (isEditMode) {
                jobDocument.updated_at = new Date().toISOString()
                const { error } = await supabase
                    .from('job_postings')
                    .update(jobDocument)
                    .eq('id', editId)
                    .eq('employer_id', currentUser.uid)
                if (error) throw error
            } else {
                jobDocument.status = 'open'
                const { error } = await supabase
                    .from('job_postings')
                    .insert(jobDocument)
                if (error) throw error
            }

            setSuccess(true)
            setTimeout(() => {
                navigate('/my-listings')
            }, 2000)
        } catch (err) {
            console.error('Error saving job:', err)
            setError(isEditMode ? 'Failed to update job. Please try again.' : 'Failed to post job. Please try again.')
        } finally {
            setLoading(false)
        }
    }
```

- [ ] **Step 5: Update success screen text for edit mode**

Find the success screen (line 284-296). Change the heading and description to be mode-aware. Replace:

```jsx
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Posted Successfully!</h2>
                    <p className="text-gray-600">
                        {jobData.aiMatchingEnabled
                            ? 'AI matching is enabled. Qualified candidates will be notified automatically.'
                            : 'Your job listing is now live. Redirecting to your listings...'}
                    </p>
```

with:

```jsx
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {isEditMode ? 'Job Updated Successfully!' : 'Job Posted Successfully!'}
                    </h2>
                    <p className="text-gray-600">
                        {isEditMode
                            ? 'Your changes have been saved. Redirecting to your listings...'
                            : jobData.aiMatchingEnabled
                                ? 'AI matching is enabled. Qualified candidates will be notified automatically.'
                                : 'Your job listing is now live. Redirecting to your listings...'}
                    </p>
```

- [ ] **Step 6: Update the page title and submit button text**

Find the page header that says "Post a New Job" and change it to be mode-aware. Search for the heading text in the JSX and replace:

```jsx
                        Post a New Job
```

with:

```jsx
                        {isEditMode ? 'Edit Job Listing' : 'Post a New Job'}
```

Find the publish button in the Step 4 review section. It currently says "Publish Job Listing". Replace:

```jsx
                                    Publish Job Listing
```

with:

```jsx
                                    {isEditMode ? 'Save Changes' : 'Publish Job Listing'}
```

- [ ] **Step 7: Add loading state for fetching job in edit mode**

After the verification check (`if (!isVerified()) { ... }`) and before the success check (`if (success) { ... }`), add:

```jsx
    if (fetchingJob) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
                <div className="card max-w-md text-center">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading job data...</p>
                </div>
            </div>
        )
    }
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/employer/PostJob.jsx
git commit -m "feat: add edit mode to PostJob wizard"
```

---

### Task 5: Add Edit button to MyListings.jsx

**Files:**
- Modify: `src/pages/employer/MyListings.jsx:292-298`

- [ ] **Step 1: Add Edit button next to the Eye button**

In `src/pages/employer/MyListings.jsx`, find the Eye button (line 292-298). Add an Edit button immediately before it:

```jsx
                                            <Link
                                                to={`/edit-job/${job.id}`}
                                                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                                title="Edit Posting"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </Link>
```

The `Edit` icon and `Link` are already imported in this file.

- [ ] **Step 2: Commit**

```bash
git add src/pages/employer/MyListings.jsx
git commit -m "feat: add Edit button to MyListings job cards"
```

---

### Task 6: Verify everything end-to-end

- [ ] **Step 1: Run tests**

```bash
npx vitest run
```

Expected: no new failures compared to baseline (3 pre-existing failing files).

- [ ] **Step 2: Smoke test skills persistence**

1. Log in as jobseeker → `/profile/edit` → add a skill → Save
2. Navigate to dashboard → back to `/profile/edit` → confirm skill persists
3. Hard refresh → confirm skill still persists

- [ ] **Step 3: Smoke test edit job**

1. Log in as employer → `/my-listings` → click Edit (pencil) on a job
2. Confirm wizard pre-populates with existing job data
3. Change the title → step through to Review → click "Save Changes"
4. Confirm redirect to `/my-listings` → confirm title updated
5. Click the job's Eye icon → confirm public detail page shows updated title

- [ ] **Step 4: Smoke test that posting new jobs still works**

1. Go to `/post-job` → fill out wizard → publish
2. Confirm job appears in `/my-listings`

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: edit-job feature + skills persistence fix complete"
```
