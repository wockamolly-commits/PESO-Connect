# PESO Jobseeker Registration Redesign

**Date:** 2026-03-28
**Branch:** feat/peso-registration-redesign
**Reference:** NSRP Form 1 (DOLE National Skills Registration Program, September 2020)

## Overview

Redesign the 6-step jobseeker registration form into a 7-step flow that aligns with the DOLE NSRP Form 1 reference. Cherry-pick high-value NSRP fields (split name, employment status, languages, training, professional licenses) while retaining web-specific features (resume upload, salary range, portfolio URL). Fields highlighted yellow in the NSRP form are marked REQUIRED.

## Design Decisions

- **Approach:** Cherry-pick high-value NSRP additions, skip low-value government fields (TIN, Religion, Height, OFW status, 4Ps beneficiary)
- **Steps:** 7-step flow (was 6) — added step for Contact & Employment Status
- **Skills:** Hybrid — predefined NSRP checkbox list + custom tag input
- **Languages:** Dynamic entries with single proficiency dropdown per language (Beginner/Conversational/Proficient/Fluent/Native)
- **Employment Status:** Medium detail — Employed (Full-time/Part-time), Self-Employed (with type dropdown), Unemployed (with reason dropdown)
- **Name:** Split into surname/first_name/middle_name/suffix — stored separately, composed for display
- **Training:** Folded into Education step as sub-section
- **Licenses:** Added to Skills & Experience step as sub-section

---

## Step 1: Account Credentials

_No changes from current implementation._

| Field | Type | Required | Validation |
|---|---|---|---|
| Email | email input | YES | Valid email format, `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| Password | password input | YES | Min 8 chars, must contain at least one letter and one number |
| Confirm Password | password input | YES | Must match password |

Existing features retained: password visibility toggle, password strength indicator.

---

## Step 2: Personal Information

| Field | Type | Required | Validation |
|---|---|---|---|
| Surname | text | YES | Min 2 chars |
| First Name | text | YES | Min 2 chars |
| Middle Name | text | No | — |
| Suffix | dropdown (None, Jr., Sr., III, IV, V) | No | Default: None |
| Date of Birth | date picker | YES | Must be ≥15 years old, not future date |
| Sex | radio (Male, Female) | YES | — |
| Civil Status | dropdown (Single, Married, Widowed, Separated, Solo Parent) | YES | — |
| Disability (PWD) | toggle (Yes/No) | YES | Default: No |
| Disability Type | multi-select checkboxes (Visual, Hearing, Speech, Physical, Mental, Others) | YES if PWD=Yes | At least one selected |
| PWD ID Number | text | No | Shown only if PWD=Yes |

**Conditional logic:**
- PWD toggle = Yes → reveal Disability Type checkboxes + PWD ID Number field
- PWD toggle = No → hide both

---

## Step 3: Contact & Employment Status

### Contact Sub-section

| Field | Type | Required | Validation |
|---|---|---|---|
| House No. / Street / Village | text | YES | — |
| Province | cascading dropdown | YES | Populated from PSGC dataset |
| Municipality / City | cascading dropdown | YES | Filtered by selected Province |
| Barangay | cascading dropdown | YES | Filtered by selected Municipality/City |
| Mobile Number | text | YES | Philippine format: `^(\+?63\|0)9\d{9}$` |
| Preferred Contact Method | radio (Email, SMS/Text, Phone Call) | No | Default: Email |

### Employment Status Sub-section

| Field | Type | Required | Validation |
|---|---|---|---|
| Employment Status | radio (Employed, Unemployed, Self-Employed) | YES | — |
| Employment Type | dropdown (Full-time, Part-time) | YES if Employed | — |
| Self-Employment Type | dropdown (Freelancer, Vendor/Retailer, Home-based, Transport, Domestic Worker, Artisan/Craft Worker, Others) | YES if Self-Employed | — |
| Self-Employment Specify | text | YES if type=Others | — |
| Unemployment Reason | dropdown (New Entrant/Fresh Graduate, Finished Contract, Resigned, Retired, Terminated/Laid Off, Others) | YES if Unemployed | — |
| Months Looking for Work | number | No, shown if Unemployed | Min 0 |

**Conditional logic:**
- Employed → show Employment Type dropdown
- Self-Employed → show Self-Employment Type dropdown; if "Others" → show specify text field
- Unemployed → show Unemployment Reason dropdown + Months Looking for Work

**Address cascading dropdowns:**
Province → Municipality/City → Barangay follow a cascading pattern. Data source: Philippine Standard Geographic Code (PSGC) dataset. The PSGC JSON data file will be stored locally in `src/data/psgc.json`. When Province changes, Municipality/City resets and repopulates. When Municipality/City changes, Barangay resets and repopulates.

---

## Step 4: Education & Training

### Education Sub-section

| Field | Type | Required | Validation |
|---|---|---|---|
| Currently in School | toggle (Yes/No) | YES | — |
| Highest Education Level | dropdown | YES | See options below |
| School Name | text | YES | — |
| Course / Field of Study | searchable dropdown | No | Options grouped by category; see course list below. Shown for Senior High School and above |
| Year Graduated | number | No | 1950–current year |
| Level Reached (if undergraduate) | text | No | Shown if Year Graduated is blank |
| Year Last Attended (if undergraduate) | number | No | Shown if Year Graduated is blank; 1950–current year |

**Education Level options** (per NSRP Form 1):
- Elementary
- Secondary (Non-K12)
- Secondary (K-12)
- Senior High School
- Tertiary
- Graduate Studies / Post-graduate

**Conditional logic:**
- Year Graduated left blank → show "Level Reached" and "Year Last Attended" fields (undergraduate path)
- Education Level = Elementary or Secondary → hide Course/Field of Study
- Education Level = Senior High School → Course dropdown shows SHS Tracks/Strands
- Education Level = Tertiary → Course dropdown shows undergraduate degree programs
- Education Level = Graduate Studies / Post-graduate → Course dropdown shows post-graduate programs

**Senior High School Tracks & Strands:**
- Academic Track — ABM (Accountancy, Business and Management)
- Academic Track — HUMSS (Humanities and Social Sciences)
- Academic Track — STEM (Science, Technology, Engineering and Mathematics)
- Academic Track — GAS (General Academic Strand)
- TVL Track — Home Economics
- TVL Track — Information and Communication Technology
- TVL Track — Industrial Arts
- TVL Track — Agri-Fishery Arts
- Sports Track
- Arts and Design Track

**Undergraduate Degree Programs** (sourced from courses.com.ph, grouped by category):

_Humanities:_
Bachelor of Arts in History, Bachelor of Arts in Philosophy, Bachelor of Fine Arts Major in Industrial Design, Bachelor of Fine Arts Major in Painting, Bachelor of Fine Arts Major in Sculpture, Bachelor of Fine Arts Major in Visual Communication

_Social Sciences:_
Bachelor of Arts in Economics, Bachelor of Science in Economics, Bachelor of Arts in Psychology, Bachelor of Science in Psychology, Bachelor of Science in Criminology, Bachelor of Arts in Political Science, Bachelor of Arts in Linguistics, Bachelor of Arts in Literature, Bachelor of Arts in English, Bachelor of Arts in Filipino, Bachelor of Arts in Anthropology, Bachelor of Arts in Sociology, Bachelor of Science in Islamic Studies

_Natural Sciences:_
Bachelor of Science in Environmental Science, Bachelor of Science in Forestry, Bachelor of Science in Fisheries, Bachelor of Science in Geology, Bachelor of Science in Biology, Bachelor of Science in Physics, Bachelor of Science in Applied Physics, Bachelor of Science in Chemistry, Bachelor of Science in Molecular Biology, Bachelor of Science in Agroforestry

_Formal Sciences:_
Bachelor of Science in Computer Science, Bachelor of Science in Information Technology, Bachelor of Science in Information Systems, Bachelor of Science in Mathematics, Bachelor of Science in Applied Mathematics, Bachelor of Science in Statistics

_Agriculture:_
Bachelor of Science in Agriculture, Bachelor of Science in Agribusiness

_Architecture and Design:_
Bachelor of Science in Architecture, Bachelor of Science in Interior Design, Bachelor in Landscape Architecture

_Business:_
Bachelor of Science in Accountancy, Bachelor of Science in Accounting Technology, Bachelor of Science in Business Administration (Business Economics), Bachelor of Science in Business Administration (Financial Management), Bachelor of Science in Business Administration (Human Resource Development), Bachelor of Science in Business Administration (Marketing Management), Bachelor of Science in Business Administration (Operations Management), Bachelor of Science in Hotel and Restaurant Management, Bachelor of Science in Entrepreneurship, Bachelor of Science in Tourism Management, Bachelor of Science in Real Estate Management

_Health Sciences:_
Bachelor of Science in Nursing, Bachelor of Science in Physical Therapy, Bachelor of Science in Occupational Therapy, Bachelor of Science in Pharmacy, Bachelor of Science in Midwifery, Bachelor of Science in Medical Technology, Bachelor of Science in Radiologic Technology, Bachelor of Science in Respiratory Therapy, Bachelor of Science in Speech-Language Pathology

_Education:_
Bachelor in Secondary Education, Bachelor in Elementary Education, Bachelor in Secondary Education (Technology and Livelihood Education), Bachelor in Secondary Education (Biological Sciences), Bachelor in Secondary Education (English), Bachelor in Secondary Education (Filipino), Bachelor in Secondary Education (Mathematics), Bachelor in Secondary Education (Islamic Studies), Bachelor in Secondary Education (MAPEH), Bachelor in Secondary Education (Physical Sciences), Bachelor in Secondary Education (Social Studies), Bachelor in Secondary Education (Values Education), Bachelor in Elementary Education (Preschool Education), Bachelor in Elementary Education (Special Education), Bachelor of Library and Information Science, Bachelor of Physical Education, Bachelor of Sports Science

_Engineering:_
Bachelor of Science in Aeronautical Engineering, Bachelor of Science in Chemical Engineering, Bachelor of Science in Ceramic Engineering, Bachelor of Science in Civil Engineering, Bachelor of Science in Electrical Engineering, Bachelor of Science in Electronics and Communications Engineering, Bachelor of Science in Geodetic Engineering, Bachelor of Science in Geological Engineering, Bachelor of Science in Industrial Engineering, Bachelor of Science in Marine Engineering, Bachelor of Science in Materials Engineering, Bachelor of Science in Mechanical Engineering, Bachelor of Science in Metallurgical Engineering, Bachelor of Science in Mining Engineering, Bachelor of Science in Sanitary Engineering, Bachelor of Science in Computer Engineering, Bachelor of Science in Agricultural Engineering, Bachelor of Science in Petroleum Engineering

_Media and Communication:_
Bachelor of Science in Development Communication, Bachelor of Arts in Journalism, Bachelor of Arts in Communication, Bachelor of Arts in Broadcasting

_Public Administration:_
Bachelor of Science in Customs Administration, Bachelor of Science in Community Development, Bachelor of Science in Foreign Service, Bachelor of Arts in International Studies, Bachelor of Public Administration, Bachelor of Science in Social Work, Bachelor of Science in Public Safety

_Transportation:_
Bachelor of Science in Marine Transportation

_Family and Consumer Science:_
Bachelor of Science in Nutrition and Dietetics

_Criminal Justice:_
Bachelor of Science in Forensic Science

_Other:_ (free-text input if course is not in list)

**Graduate / Post-graduate Programs:**
- Master of Arts (MA)
- Master of Science (MS)
- Master of Business Administration (MBA)
- Master in Public Administration (MPA)
- Master of Education (MEd)
- Master of Engineering (MEng)
- Doctor of Philosophy (PhD)
- Doctor of Education (EdD)
- Doctor of Medicine (MD)
- Doctor of Juridical Science (JSD)
- Other (free-text input)

The Course/Field of Study dropdown must be **searchable** (type-to-filter) given the large number of options. Each category group should appear as an `<optgroup>` or equivalent visual separator.

### Technical/Vocational Training Sub-section

Repeatable entries, up to 3. Entire sub-section is optional. "Add Training" button to add entries.

| Field | Type | Required | Validation |
|---|---|---|---|
| Training/Vocational Course | text | No | — |
| Training Institution | text | No | — |
| Hours of Training | number | No | Min 1 |
| Skills Acquired | text | No | — |
| Certificate Received | dropdown (NC I, NC II, NC III, NC IV, None, Others) | No | — |

Each entry has a remove button.

---

## Step 5: Skills, Licenses & Work Experience

### Skills Sub-section

**Predefined Skills** (checkbox grid from NSRP):
Auto Mechanic, Beautician, Carpentry Work, Computer Literate, Domestic Chores, Driver, Electrician, Embroidery, Gardening, Masonry, Painter/Artist, Painting Jobs, Photography, Plumbing, Sewing/Dresses, Stenography, Tailoring, Others

**Custom Skills:** Tag input (existing TagInput component) below the checkbox grid for skills not on the predefined list.

**Combined validation:** At least 1 skill total (predefined or custom).

Checked predefined skills are merged into the skills array alongside custom tags.

### Professional Licenses Sub-section

Repeatable entries, up to 2. Optional. "Add License" button.

| Field | Type | Required | Validation |
|---|---|---|---|
| License Name (PRC) | text | No | — |
| License Number | text | No | — |
| Valid Until | date | No | Can be past (expired) |

### Civil Service Eligibility Sub-section

| Field | Type | Required | Validation |
|---|---|---|---|
| Civil Service Eligibility | text | No | — |
| Date Taken | date | No | Not future date |

### Work Experience Sub-section

Repeatable entries, up to 5. Optional. "Add Work Experience" button. Instruction text: _"Start with the most recent employment."_

| Field | Type | Required | Validation |
|---|---|---|---|
| Company Name | text | YES per entry | — |
| Address (City/Municipality) | text | No | — |
| Position | text | YES per entry | — |
| Number of Months | number | No | Min 1 |
| Employment Status | dropdown (Permanent, Contractual, Part-time, Probationary) | No | — |

### Resume & Certificates

| Field | Type | Required | Validation |
|---|---|---|---|
| Resume Upload | file input | YES | PDF/DOC/DOCX, max 5MB |
| Certificate Files | file input (multiple) | No | PDF/JPG/PNG, max 2MB each |
| Portfolio URL | text | No | Valid URL format |

---

## Step 6: Job Preferences & Language

### Job Preference Sub-section

| Field | Type | Required | Validation |
|---|---|---|---|
| Preferred Job Type | multi-select checkboxes (Full-time, Part-time, Contractual, On-demand) | YES | At least 1 selected |
| Preferred Occupation (1-3) | text inputs, up to 3 | YES | At least 1 filled |
| Preferred Work Location — Local (1-3) | text inputs, up to 3 (city/municipality) | No | — |
| Preferred Work Location — Overseas (1-3) | text inputs, up to 3 (country) | No | — |
| Expected Salary Range | two number inputs (min, max) | No | Max ≥ Min, ratio ≤ 10 |
| Willing to Relocate | radio (Yes/No) | No | Default: No |

**Combined location requirement:** At least 1 location total (local or overseas).

**UX:** Local location fields shown by default. "Add Overseas Locations" toggle reveals overseas inputs.

### Language Proficiency Sub-section

Repeatable entries, dynamic. Optional. "Add Language" button.

| Field | Type | Required | Validation |
|---|---|---|---|
| Language | text input | YES per entry | — |
| Proficiency Level | dropdown (Beginner, Conversational, Proficient, Fluent, Native) | YES per entry | — |

Each entry has a remove button. No minimum — entire section is optional.

---

## Step 7: Consent & Review

### Consent Checkboxes

| Field | Type | Required |
|---|---|---|
| Terms and Conditions | checkbox | YES |
| Data Processing Consent | checkbox | YES |
| PESO Verification Consent | checkbox | YES |
| Information Accuracy Confirmation | checkbox | YES |
| DOLE Authorization | checkbox | YES |

**DOLE Authorization text:** _"I authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf."_

### Registration Summary

Collapsible sections displaying all entered data grouped by step. Updated to reflect new fields (split name, employment status, languages, training, licenses, etc.).

---

## Database Changes

### Table: `public.users`

| Change | Column | Type |
|---|---|---|
| REPLACE `full_name` | `surname` | TEXT |
| ADD | `first_name` | TEXT |
| ADD | `middle_name` | TEXT |
| ADD | `suffix` | TEXT |

A computed display name (`first_name || ' ' || surname`) will be used wherever `full_name` was previously referenced (navbar, messaging, profile displays).

### Table: `public.jobseeker_profiles`

| Change | Column | Type | Default |
|---|---|---|---|
| REPLACE `full_name` | `surname` | TEXT | — |
| ADD | `first_name` | TEXT | — |
| ADD | `middle_name` | TEXT | — |
| ADD | `suffix` | TEXT | — |
| RENAME `gender` → | `sex` | TEXT | '' |
| ADD | `disability_type` | TEXT[] | '{}' |
| ADD | `street_address` | TEXT | '' |
| ADD | `employment_status` | TEXT | '' |
| ADD | `employment_type` | TEXT | '' |
| ADD | `self_employment_type` | TEXT | '' |
| ADD | `unemployment_reason` | TEXT | '' |
| ADD | `months_looking_for_work` | INTEGER | NULL |
| ADD | `currently_in_school` | BOOLEAN | false |
| ADD | `education_level_reached` | TEXT | '' |
| ADD | `year_last_attended` | TEXT | '' |
| REPLACE `certifications` | `vocational_training` | JSONB | '[]' |
| ADD | `predefined_skills` | TEXT[] | '{}' |
| ADD | `professional_licenses` | JSONB | '[]' |
| ADD | `civil_service_eligibility` | TEXT | '' |
| ADD | `civil_service_date` | DATE | NULL |
| REPLACE `preferred_job_location` | `preferred_local_locations` | TEXT[] | '{}' |
| ADD | `preferred_overseas_locations` | TEXT[] | '{}' |
| ADD | `preferred_occupations` | TEXT[] | '{}' |
| ADD | `dole_authorization` | BOOLEAN | false |
| UPDATE structure | `work_experiences` | JSONB | Structure: `{company, address, position, months, employment_status}` |
| UPDATE structure | `languages` | JSONB | Structure: `[{language, proficiency}]` |

Existing columns `civil_status`, `is_pwd`, `pwd_id_number` are already in the DB — they move into the registration flow (Step 2) with no schema change needed.

### Migration for Existing Users

The `full_name` → split name migration must handle existing registered users:

1. **Add new columns** (`surname`, `first_name`, `middle_name`, `suffix`) as nullable first
2. **Parse existing `full_name`** values:
   - Split on spaces: last token → `surname`, first token → `first_name`, middle tokens → `middle_name`
   - Detect common suffixes (Jr., Sr., III, IV, V) and extract to `suffix`
   - If parsing is ambiguous (single word name, etc.), put entire value in `first_name` and leave `surname` as empty string
3. **Keep `full_name` column temporarily** as a fallback during transition — drop after verifying all references are updated
4. **Update all display references** (AuthContext, navbar, messaging, profile views) to use `first_name + ' ' + surname` before dropping `full_name`
5. **Replace columns:** For `certifications` → `vocational_training` and `preferred_job_location` → split locations, migrate existing data into new structure (wrap existing certifications as training entries with only the course name populated; copy existing location into `preferred_local_locations[0]`)

### Static Data Files

| File | Purpose |
|---|---|
| `src/data/psgc.json` | Philippine Standard Geographic Code dataset — provinces, municipalities/cities, barangays for cascading address dropdowns |
| `src/data/courses.json` | Course/degree program list organized by education level and category for the Course/Field of Study searchable dropdown |

The PSGC data can be sourced from the Philippine Statistics Authority (PSA) open data. The courses data is sourced from courses.com.ph and structured as a JSON file with education level keys mapping to categorized course arrays.

### Affected Files

| File | Changes |
|---|---|
| `src/pages/JobseekerRegistration.jsx` | Update step count (6→7), formData structure, step validation, step rendering |
| `src/components/registration/Step2PersonalInfo.jsx` | Replace full_name with split name, add sex/civil status/PWD fields, remove address |
| `src/components/registration/Step3EmploymentPreferences.jsx` | Rename → `Step3ContactEmployment.jsx`, replace with contact + employment status |
| `src/components/registration/Step4Education.jsx` | Add currently_in_school, undergraduate fields, vocational training sub-section |
| `src/components/registration/Step5SkillsExperience.jsx` | Add predefined skills grid, licenses, eligibility, enrich work experience fields |
| NEW `src/components/registration/Step6JobPreferences.jsx` | Job preferences + language proficiency (extracted from old Step 3) |
| `src/components/registration/Step6Consent.jsx` | Rename → `Step7Consent.jsx`, add DOLE authorization checkbox |
| `src/contexts/AuthContext.jsx` | Update `fetchUserData` to compose display name from split fields, update `saveRegistrationStep` field mappings |
| `src/utils/validation.js` | Add validators for new fields (employment conditional, location combined requirement) |
| `src/components/forms/TagInput.jsx` | No changes |
| `sql/` | New migration SQL file for schema changes |
| All components displaying user name | Update to use `first_name + ' ' + surname` |

---

## Fields Removed

| Removed | Replacement |
|---|---|
| `full_name` (single field) | `surname` + `first_name` + `middle_name` + `suffix` |
| `certifications` (text[]) | `vocational_training` (JSONB with richer structure) |
| `preferred_job_location` (single text) | `preferred_local_locations` (text[]) + `preferred_overseas_locations` (text[]) |

No fields are deleted without replacement.

---

## Fields Kept from Current Form (not in NSRP)

These web-specific fields are retained as they add value for the online platform:

- Password / Confirm Password (required for web auth)
- Preferred Contact Method
- Expected Salary Range (min/max)
- Willing to Relocate
- Portfolio URL
- Resume Upload
- Certificate File Uploads
- On-demand job type option

---

## NSRP Fields Intentionally Excluded

| NSRP Field | Reason |
|---|---|
| TIN | Tax ID — not relevant for job matching |
| Religion | Not relevant for employment, potential discrimination concern |
| Height | Not relevant for most job types |
| OFW Status (current/former) | Low value for local job matching platform |
| 4Ps Beneficiary | Government assistance status — not relevant for job matching |
| Household ID No. | Government reference — not relevant |

---

## UI/UX Enhancement Requirements

### 1. Visual Polish

- **Floating labels** on all text inputs — labels start inside the field and float above on focus/fill
- **Progress bar** across all 7 steps — clearly shows current step, completed steps (with checkmarks), and remaining steps
- **Step transitions** — smooth slide/fade animations when navigating between steps (slide-left for next, slide-right for back)
- **Inline validation** — green checkmark icon for valid fields, red border + error message for invalid fields, validated on blur
- **Modern feel** — the form should feel like a polished web app, not a digitized government form. Clean spacing, rounded inputs, subtle shadows

### 2. Conditional Field Animations

- **PWD toggle** → disability type checkboxes + PWD ID slide down with fade-in; slide up with fade-out on toggle off
- **Employment Status radio** → conditional fields (Employment Type, Self-Employment Type, Unemployment Reason, etc.) animate with smooth slide-down/fade-in on selection change
- **Repeatable sections** (Add Training, Add License, Add Language, Add Work Experience) → new entries slide in from top with fade; removed entries fade out then collapse
- No jarring show/hide — all conditional visibility changes must be animated

### 3. Smart Form Logic

- **Auto-save draft** — form state is persisted to localStorage on every field change, so users don't lose progress on page reload or accidental navigation. Existing `saveRegistrationStep` in AuthContext handles server-side persistence per step; the client-side auto-save covers mid-step progress
- **Field-level help tooltips** — small `?` icon next to confusing fields that shows a tooltip on hover/tap:
  - Civil Service Eligibility: "Government exams you've passed (e.g., Professional, Sub-professional, Career Service)"
  - NC I–IV: "National Certificate levels issued by TESDA for technical/vocational competency"
  - PWD ID Number: "Your official Person with Disability ID number, if available"
  - Preferred Occupation: "Job titles you're interested in (e.g., Office Staff, Electrician, Nurse)"
- **"Save & Continue Later" button** — visible on every step (except Step 1). Saves current progress via `saveRegistrationStep` and redirects to login/home with a confirmation message. On next login, the user resumes from the last incomplete step (existing progress recovery behavior)

### 4. Mobile-First Design

- All steps must be fully usable on mobile screens (320px minimum width)
- **Input types** — `type="email"` for email, `type="tel"` for phone, `inputMode="numeric"` for salary/year/months fields
- No horizontal scrolling on any step
- **Tap targets** — minimum 44x44px for all interactive elements (buttons, checkboxes, radio buttons, toggles, dropdowns)
- Checkbox grids (predefined skills, disability types) wrap responsively — 2 columns on mobile, 3 on tablet, 4 on desktop
- Repeatable section cards stack vertically with full-width remove buttons on mobile

### 5. Color Palette Constraint

- **Do not change any existing PESO-Connect brand colors.** All enhancements (floating labels, progress bar, validation states, animations, tooltips) must use the existing color scheme and design language
- Green validation checkmarks and red error states should use the existing success/error colors already defined in the app's CSS/theme
- Progress bar styling should match the current StepIndicator component's color scheme
