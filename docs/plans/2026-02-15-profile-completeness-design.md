# Profile Completeness Upgrade — Design Document

**Date:** 2026-02-15
**Approach:** Unified Profile System (role-specific edit pages + shared components + public profile view)

---

## 1. Profile Photo Upload

**Shared component:** `src/components/profile/ProfilePhotoUpload.jsx`

- Replaces initial-letter avatars across all profile pages
- Click avatar to select image (JPG/PNG, max 2MB)
- Client-side compression: 200x200px, JPEG quality 0.7
- Stored as `profile_photo` (Base64 data URL) in Firestore `users` document
- Camera icon overlay on hover
- Falls back to initial-letter avatar when no photo exists
- Available to all roles

## 2. Profile Completion Bar

**Shared component:** `src/components/profile/ProfileCompletionBar.jsx`
**Utility:** `src/utils/profileCompletion.js`

- Horizontal progress bar with percentage label
- Color-coded: red (0-33%), yellow (34-66%), green (67-100%)
- Displays clickable missing-item hints that navigate to relevant sections
- Shown on dashboard and profile edit pages

### Completion Weights

**Jobseeker:**

| Field | Weight |
|---|---|
| Profile photo | 5% |
| Personal info (name, DOB, location) | 15% |
| Contact info | 10% |
| Employment preferences | 10% |
| Education | 15% |
| Skills (at least 3) | 15% |
| Work experience | 10% |
| Resume uploaded | 10% |
| Certifications | 5% |
| Portfolio URL | 5% |

**Employer:**

| Field | Weight |
|---|---|
| Company info (name, type, address, nature) | 20% |
| Representative info | 15% |
| Business documents | 20% |
| Contact details | 15% |
| Company description | 10% |
| Company logo | 10% |
| Website/social links | 10% |

**Individual:**

| Field | Weight |
|---|---|
| Personal info (name) | 25% |
| Contact info | 20% |
| Profile photo | 15% |
| Address | 15% |
| Bio | 15% |
| Service preferences | 10% |

## 3. New Fields Per Role

### Jobseeker (added to existing `JobseekerProfileEdit.jsx`)

- **Gender** — dropdown (Male, Female, Prefer not to say)
- **Civil status** — dropdown (Single, Married, Widowed, Separated)
- **Disability/PWD status** — checkbox + optional PWD ID number
- **Language proficiency** — tag list with proficiency level (Basic, Conversational, Fluent)

### Employer (new `EmployerProfileEdit.jsx`)

All existing registration fields become editable, plus:

- **Company logo** — via ProfilePhotoUpload component
- **Company description** — textarea
- **Company website** — URL field
- **Company size** — dropdown (1-10, 11-50, 51-200, 201-500, 500+)
- **Year established** — number field
- **Social media links** — Facebook, LinkedIn (optional)

### Individual (new `IndividualProfileEdit.jsx`)

- **Profile photo** — via ProfilePhotoUpload
- **Full name** — text (exists)
- **Contact number** — text (exists)
- **Address** — barangay, city, province fields
- **Bio/About** — textarea
- **Service preferences** — tag list (e.g., "House cleaning", "Plumbing", "Tutoring")

## 4. Public Profile View

**New page:** `src/pages/PublicProfile.jsx` at route `/profile/:userId`

Read-only profile view, accessible to any authenticated user. Layout adapts per role.

### Jobseeker Public Profile

Visible: profile photo, name, location, bio, skills (tags), education summary, work experience timeline, certifications, portfolio link, "Message" button.

Hidden: contact number, email, exact address, salary expectations, PWD status (visible only to profile owner and admins).

### Employer Public Profile

Visible: company logo, company name, description, nature of business, company size, year established, website, social links, location, "View Job Listings" link, "Message" button.

### Individual Public Profile

Visible: profile photo, name, bio, location (city/province), service preferences (tags), "Message" button.

### Profile Linking

- Applicant names in `JobApplicants.jsx` link to `/profile/:userId`
- Employer names on job listings link to `/profile/:userId`
- Message sender names link to `/profile/:userId`

## 5. Architecture

### New Files

```
src/components/profile/ProfilePhotoUpload.jsx    — shared photo upload
src/components/profile/ProfileCompletionBar.jsx  — shared completion bar
src/pages/EmployerProfileEdit.jsx                — full employer edit page
src/pages/IndividualProfileEdit.jsx              — full individual edit page
src/pages/PublicProfile.jsx                      — public profile view
src/utils/profileCompletion.js                   — completion calculation
```

### Modified Files

```
src/App.jsx                              — add /profile/:userId route
src/pages/Profile.jsx                    — redirect employer/individual to new edit pages
src/pages/Dashboard.jsx                  — add ProfileCompletionBar
src/pages/JobseekerProfileEdit.jsx       — add ProfilePhotoUpload + new fields
src/pages/employer/JobApplicants.jsx     — link applicant names to public profiles
src/pages/JobDetail.jsx                  — link employer name to public profile
src/pages/Messages.jsx                   — link sender names to public profiles
```

### Data Flow

1. Photo upload: select file -> client compress -> Base64 -> Firestore `profile_photo` field
2. New fields: standard Firestore `updateDoc` (same pattern as existing code)
3. Public profile: `getDoc` by userId -> render read-only view with role-based layout
4. Completion bar: reads `userData` from AuthContext -> calculates % via utility

### Storage

- No new Firebase collections — everything in existing `users` collection
- Photos stored as Base64 (consistent with existing resume/certificate storage)
- No changes to AuthContext needed
