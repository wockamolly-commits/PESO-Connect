# Jobseeker CSV Export Implementation Plan

## Goal

Add an admin dashboard feature that exports filtered jobseeker records to CSV for walk-in employers who need curated candidate lists.

## Current State

- `src/pages/admin/Dashboard.jsx` already loads all `users`, `jobseeker_profiles`, `employer_profiles`, and `homeowner_profiles`, then merges records client-side.
- The admin dashboard has section-based navigation and search/filter patterns already used in verification views.
- Jobseeker registration and profile data live primarily in `jobseeker_profiles`.
- The codebase already has profile export concepts for resumes, but not admin-side CSV export.

## Recommended Scope

- Add export only for jobseekers.
- Export only fields already collected during registration or profile editing.
- Let admins filter by:
  - keyword
  - city or province
  - education
  - skills
  - preferred occupations or industry tags
- Generate CSV client-side from already fetched filtered data unless the dataset becomes too large.

## Step-by-Step Breakdown

### Phase 1: Define exportable fields

1. Finalize which jobseeker fields are safe and useful for walk-in employers.
2. Exclude highly sensitive data that is not needed for screening.
3. Create a single field-mapping module so UI labels and CSV headers stay consistent.

### Phase 2: Add admin permission support

1. If RBAC ships first, require `export_jobseekers` permission.
2. If RBAC is not yet implemented, initially expose the export feature only to full admins.

### Phase 3: Build filter UI

1. Add a dedicated export panel in the admin dashboard.
2. Reuse the existing admin filter/search styling patterns.
3. Support common walk-in requests such as:
   - IT
   - Virtual Assistant
   - Customer Service
   - location-specific shortlists

### Phase 4: Build CSV generation

1. Derive the filtered jobseeker set from already merged admin data.
2. Flatten array and JSON fields into readable CSV-safe strings.
3. Generate a downloadable CSV blob in the browser.
4. Name files consistently, for example:
   - `jobseekers_it_2026-04-10.csv`

### Phase 5: Add export summary and safeguards

1. Show result count before export.
2. Warn the admin when no rows match.
3. Optionally include an export disclaimer that the file contains personal data and must be handled securely.

### Phase 6: Testing

1. Verify filters return the same rows shown in the admin UI.
2. Verify commas, line breaks, and quotes are escaped correctly in CSV.
3. Verify array fields such as skills and certifications are flattened cleanly.
4. Verify empty fields still produce valid CSV output.

## Database Schema Changes

- No schema changes are required for an initial client-side export implementation.

### Optional future schema additions

- If the team wants auditability, add an `admin_export_logs` table later to record:
  - who exported
  - when
  - applied filters
  - number of exported rows

That logging table should be treated as a later enhancement, not a blocker for the first version.

## Suggested Export Columns

- Full Name
- Email
- Mobile Number
- City
- Province
- Highest Education
- School Name
- Course or Field
- Skills
- Certifications
- Work Experience Summary
- Preferred Job Type
- Preferred Occupations
- Preferred Local Locations
- Preferred Overseas Locations
- Portfolio URL
- Resume URL
- Verification Status

## Recommended Exclusions

- Date of birth
- Full street address
- Government IDs
- Consent flags
- Internal admin notes

## Code Changes Required

### Admin dashboard

- Update `src/pages/admin/Dashboard.jsx`:
  - add a new export section or integrate export controls into the jobseekers section
  - derive filtered export rows from the existing merged `jobseekers` state

### Admin UI components

- Create `src/components/admin/JobseekerExportSection.jsx` for:
  - filter controls
  - export preview count
  - export button
- Optionally create `src/components/admin/ExportFilters.jsx` if the filter UI should be shared.

### Utility layer

- Create `src/utils/jobseekerCsvExport.js` for:
  - CSV header mapping
  - row normalization
  - CSV escaping
  - file download helper

### Sidebar navigation

- Update `src/components/admin/AdminSidebar.jsx` to add a new nav item such as `Jobseeker Export`.

### Optional permission integration

- If RBAC is implemented, update the admin permission helper and dashboard gating so only authorized admins can export.

## Suggested Filtering Logic

- Keyword search should match:
  - full name
  - skills
  - course or field
  - preferred occupations
- Industry filters can initially be keyword-driven using existing skills and preference fields rather than requiring a new industry taxonomy table.
- If a formal industry taxonomy is needed later, add it as a separate feature rather than blocking this export.

## Suggested File Deliverables

- `src/components/admin/JobseekerExportSection.jsx`
- `src/utils/jobseekerCsvExport.js`
- `src/pages/admin/Dashboard.jsx`
- `src/components/admin/AdminSidebar.jsx`

## Risks and Notes

- A client-side export is the fastest fit for current patterns because admin data is already fetched into `src/pages/admin/Dashboard.jsx`.
- If the number of jobseekers grows substantially, move export generation to a server-side function to avoid loading too much data in the browser.
- Industry filtering should initially reuse existing registration fields. Introducing a brand-new normalized industry schema would expand scope significantly and is not required for a first delivery.
