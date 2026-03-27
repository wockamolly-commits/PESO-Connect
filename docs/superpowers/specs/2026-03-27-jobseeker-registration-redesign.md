# Jobseeker Registration Redesign — AI Matching Gap Analysis + Fixes

**Date:** 2026-03-27
**Revision:** 2 (added matching gap analysis and Approach C fixes)
**Scope:** 8-step registration flow + matching pipeline integration
**Strategy:** Swap low-value registration fields for high-value AI matching signals within existing step structure

---

## Registration Analysis Summary

### What's Working Well
- Progressive disclosure with conditional reveals mirrors NSRP Form 1 structure
- PSGC cascading dropdowns use authoritative Philippine geographic codes
- Language proficiency grid (Read/Write/Speak/Understand) feeds `languageSatisfied()` in scoring
- Incremental save via `saveRegistrationStep()` prevents data loss on mobile
- Other Skills (Step 7) captures NSRP Section VIII verbatim
- AI matching architecture: one-time alias expansion at profile save, zero API calls at scoring time

### Critical Gaps (pre-fix)
1. **No skills at registration** — `skills[]` (50% of match score) is empty until profile edit
2. **No work experience at registration** — `experience_categories` (30% of score) defaults to baseline 20%
3. **No TVET/TESDA certifications** — not captured anywhere (NSRP Sections V/V-b missing)
4. **`other_skills` isolated from matching** — stored but never read by `calculateDeterministicScore`
5. **No "Vocational/Technical" education level** — TESDA graduates have no accurate option

### Approach Chosen: C (Hybrid — Swap Low-Value Fields for Matching Signals)
- Remove religion, TIN, height, disability from Step 2 (defer to profile edit)
- Expand Step 7 into "Skills & Qualifications" with skills tag input, TVET cert, and most recent job
- Add "Vocational/Technical" to education levels in Step 6
- Merge `other_skills` into `skills` during registration completion
- Trigger `expandProfileAliases()` at registration completion

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Scope | Required fields at registration; optional/reporting fields deferred to profile edit |
| Steps | 8 steps (unchanged count), Step 7 expanded for matching signals |
| Location fields | Static PSGC JSON with cascading Province > City > Barangay dropdowns |
| Course list | Curated top 100-150 Philippine college courses grouped by category + "Others (specify)" |
| Employment status | Conditional reveal — radio buttons progressively show sub-fields |
| UI pattern | Modern wizard — slim progress bar, step title, floating Back/Continue buttons |
| Matching integration | Skills + other_skills merged at completion; alias expansion triggered at completion |
| Profile edit | Separate task — already has religion, TIN, height, disability fields |

---

## UI Pattern

### Progress Indicator
- Slim horizontal progress bar (6px) with gradient fill (indigo to purple)
- Above bar: step label (left) + "Step X of 8" (right)
- Below bar: step title (h2) + subtitle describing the step

### Field Styling
- Required fields: label with red asterisk `*`
- Optional fields: label with muted "(optional)" text
- Section dividers separate required from optional groups within a step
- Inputs: rounded (10px), 1.5px border, indigo focus ring
- Radio/checkbox: pill-style buttons with dot/check indicators

### Conditional Reveal
- Indented panel with left purple border and light gray background
- Animates in when parent selection triggers it

### Navigation
- Floating bottom bar (sticky) with frosted glass background
- "Back" (gray) and "Continue" (indigo gradient) buttons
- Step 1: no Back button; Step 8: "Submit" replaces "Continue"

### Layout
- Single column on mobile, max-width container on desktop
- Side-by-side fields where appropriate (name fields, etc.)

---

## Step-by-Step Field Specification

### Step 1: Account Credentials

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | email input | Yes | Valid email format, unique |
| Password | password input | Yes | Min 8 chars, letter + number |
| Confirm Password | password input | Yes | Must match password |

**Behavior:** Creates Supabase auth account on "Continue". If email verification required, redirects to /verify-email.

### Step 2: Personal Information (REVISED — optional details removed)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Surname | text | Yes | Non-empty |
| First Name | text | Yes | Non-empty |
| Middle Name | text | No | -- |
| Suffix | dropdown (None, Jr., Sr., III, IV, V) | No | -- |
| Date of Birth | date picker | Yes | Valid date, age 15-100 |
| Sex | radio pills (Male, Female) | Yes | Must select one |
| Civil Status | dropdown (Single, Married, Widowed, Separated, Solo Parent) | Yes | Must select |

**Layout Notes:**
- Surname (flex:2) + Suffix (flex:0.8) on same row
- First Name + Middle Name on same row

**Removed from registration (deferred to profile edit):**
- Religion, TIN, Height, Disability — these don't feed AI matching and aren't NSRP required fields

### Step 3: Address & Contact

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| House No./Street/Village | text | No | -- |
| Province | cascading dropdown (PSGC) | Yes | Must select |
| City/Municipality | cascading dropdown (filtered by province) | Yes | Must select |
| Barangay | cascading dropdown (filtered by city) | Yes | Must select |
| Contact Number | tel input | Yes | PH format (09XX / +639XX), 11 digits |
| Email Address | email (read-only, pre-filled from Step 1) | Yes | Pre-filled |

**Behavior:**
- Province dropdown loads all PH provinces from static JSON
- Selecting province filters and enables City dropdown
- Selecting city filters and enables Barangay dropdown
- City and Barangay are disabled until parent is selected

### Step 4: Employment Status

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Employment Status | radio pills (Employed, Unemployed) | Yes | Must select one |

**If Employed -> conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Employment Type | radio pills (Wage Employed, Self-Employed) | Yes | Must select |
| If Self-Employed: Sub-type | checkboxes (Fisherman/Fisherfolk, Vendor/Retailer, Home-based worker, Transport, Domestic Worker, Freelancer, Artisan/Craft Worker, Others) | Yes | At least one |
| If Others: specify | text | Yes (if Others checked) | Non-empty |

**If Unemployed -> conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| How long looking for work | number + "months" label | No | Positive integer |
| Reason for unemployment | checkboxes (New Entrant/Fresh Graduate, Finished Contract, Resigned, Retired, Terminated/Laid off (local), Terminated/Laid off (abroad), Laid off due to calamity, Others) | Yes | At least one |
| If Terminated abroad: specify country | text | Yes (if selected) | Non-empty |
| If Others: specify | text | Yes (if Others checked) | Non-empty |

**Optional section (below divider):**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Are you an OFW? | radio pills (Yes, No) | No | Default: No |
| If Yes: specify country | text | Yes (if Yes) | Non-empty |
| Are you a former OFW? | radio pills (Yes, No) | No | Default: No |
| If Yes: latest country of deployment | text | Yes (if Yes) | Non-empty |
| If Yes: month and year of return | month/year picker | Yes (if Yes) | Valid date |
| Are you a 4Ps beneficiary? | radio pills (Yes, No) | No | Default: No |
| If Yes: Household ID No. | text | Yes (if Yes) | Non-empty |

### Step 5: Job Preference

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Preferred Occupation | 3 text inputs (numbered 1-3) | Yes | At least 1 filled |
| Work Type | checkbox pills (Part-time, Full-time) | Yes | At least one |
| Preferred Work Location | radio pills (Local, Overseas) | Yes | Must select |

**If Local -> conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Preferred cities/municipalities | 3 text inputs (numbered 1-3) | Yes | At least 1 filled |

**If Overseas -> conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Preferred countries | 3 text inputs (numbered 1-3) | Yes | At least 1 filled |

### Step 6: Education & Language (REVISED — added Vocational/Technical)

**Education section:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Highest Educational Attainment | dropdown (see list below) | Yes | Must select |
| Currently in school? | radio pills (Yes, No) | No | Default: No |
| If Senior High (K-12): Senior High Strand | dropdown (STEM, ABM, HUMSS, GAS, TVL, Sports, Arts & Design) | No | -- |
| If Vocational/Technical: Course/Program | text input | Yes | Non-empty |
| If College+: Course/Field of Study | searchable dropdown (curated list + Others) | Yes | Must select |
| If Others: specify course | text | Yes (if Others) | Non-empty |
| Year Graduated | number input (4 digits) | Yes (unless enrolled) | Valid year, 1950-current |
| If currently enrolled: Level Reached | text | No | -- |
| If currently enrolled: Year Last Attended | number input | No | Valid year |

**Education level dropdown (REVISED):**
1. Elementary
2. High School (Non K-12)
3. Senior High School (K-12)
4. **Vocational/Technical** (NEW)
5. College / University
6. Graduate Studies

**Scoring ordinal mapping (updated):**
| Value | Ordinal |
|-------|---------|
| Elementary | 0 |
| High School | 1 |
| Senior High School (K-12) | 1.5 |
| Vocational/Technical | 2 |
| College | 3 |
| Graduate Studies | 4+ |

This aligns with job posting `education_level: 'vocational'` (ordinal 2).

**"Currently enrolled" logic:** If "Currently in school? Yes", shows Level Reached and Year Last Attended instead of Year Graduated. Sets `currently_enrolled = true` in DB.

**Course dropdown categories (for College+):**
- Engineering & Technology
- Information Technology & Computer Science
- Business & Management
- Education & Teaching
- Health Sciences & Medicine
- Arts & Humanities
- Social Sciences
- Agriculture & Fisheries
- Law & Legal Studies
- Architecture & Fine Arts
- Others (specify)

**Language Proficiency section:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Language grid | Checkbox grid table | Yes | At least 1 language with 1 proficiency |

**Default languages:** English, Filipino, Mandarin
**Columns:** Read, Write, Speak, Understand (checkboxes per cell)
**"+ Add language" row** allows adding custom languages (text input + 4 checkboxes)

### Step 7: Skills & Qualifications (REVISED — expanded from "Other Skills")

**Section A: Your Skills (NEW — primary matching signal)**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Skills | Tag input with autocomplete | Yes | Minimum 3 skills |

- User types a skill, hits Enter to add as a tag pill
- Autocomplete suggests from curated skill list (optional enhancement)
- Free-text allowed for unlisted skills
- Placeholder: "e.g. Welding, Customer Service, Forklift Operation"
- Stored in `jobseeker_profiles.skills[]`
- This is the field `calculateDeterministicScore` reads for the 50% skill score weight

**Section B: Other Skills Acquired Without Certificate (existing, NSRP Section VIII)**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Other skills checkboxes | Checkbox pills | Yes | At least 1 selected |
| If "Others": specify | Text input | Conditional | Required if "Others" checked |

**Options:** Auto Mechanic, Beautician, Carpentry Work, Computer Literate, Domestic Chores, Driver, Electrician, Embroidery, Gardening, Masonry, Painter/Artist, Painting Jobs, Photography, Plumbing, Sewing Dresses, Stenography, Tailoring, Others

**Pipeline behavior:** During `completeRegistration`, checked labels (excluding "Others") are merged into `skills[]` array, deduplicated case-insensitively. This makes the 18 NSRP checkbox skills visible to the matching engine.

**Section C: TVET/TESDA Certification (NEW — NSRP Section V-b)**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Highest TVET/TESDA Certification | dropdown (None, NC I, NC II, NC III, NC IV) | No | Default: None |
| If not None: Certification title | text input | Yes (conditional) | Non-empty |

- Example title: "Shielded Metal Arc Welding NC II"
- Stored in new columns: `tvet_certification_level`, `tvet_certification_title`
- During alias expansion, certification title is appended to skills list for AI processing

**Section D: Most Recent Work (NEW — lightweight NSRP Section VII)**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Most recent job title | text input | No | -- |
| Company name | text input | No | -- |

- If filled, stored as single entry in `work_experiences[]` JSONB: `[{"position": "...", "company": "...", "duration": ""}]`
- Gives `expandProfileAliases()` enough to generate `experience_categories` (30% score weight)
- Full work history (multiple entries, durations, descriptions) remains in profile edit

### Step 8: Consent & Submit

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Certification | checkbox | Yes | Must be checked |
| Data processing consent | checkbox | Yes | Must be checked |
| PESO verification consent | checkbox | Yes | Must be checked |

**Certification text:** "I certify that all data/information I have provided in this form are true to the best of my knowledge. I authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation."

**After submit:** Registration summary preview, status set to "pending", confirmation email sent.

---

## Matching Pipeline Integration

### On `completeRegistration` (Step 8 submit)

The following happens in sequence:

1. **Merge skills:** Take `skills[]` from tag input + `other_skills[]` checkbox labels (excluding "Others"). Deduplicate case-insensitively. Store merged array in `jobseeker_profiles.skills`.

2. **Seed work experience:** If most recent job title is filled, store as `work_experiences: [{"position": "...", "company": "...", "duration": ""}]`.

3. **Append TVET to skills for expansion:** If `tvet_certification_title` is non-empty, temporarily add it to the skills list sent to `expandProfileAliases()`.

4. **Run alias expansion:** Call `expandProfileAliases(mergedSkills, workExperiences)`. This generates:
   - `skill_aliases` JSONB — semantic synonyms per skill
   - `experience_categories` TEXT[] — job categories from work history

5. **Store results:** Write `skill_aliases` and `experience_categories` to `jobseeker_profiles`.

6. **Mark complete:** Set `registration_complete = true`, `registration_step = null`.

### Scoring impact for a freshly registered user

| Signal | Before (current) | After (with fixes) |
|--------|-------------------|---------------------|
| `skills[]` | Empty — 0% skill score | 3+ skills from tag input + other_skills merge — meaningful skill matching |
| `skill_aliases` | Null — exact match only | Generated at registration — 4-layer matching active |
| `experience_categories` | Null — baseline 20% | Generated from most recent job — category matching active |
| `highest_education` | Missing vocational — wrong ordinal | Vocational/Technical maps to ordinal 2 — correct matching |
| `other_skills` | Stored but unused | Merged into `skills[]` — now feeds scoring |

---

## Data Model Changes

### New columns for `public.jobseeker_profiles`

```sql
-- All columns from original redesign (already added/in migration):
surname, first_name, middle_name, suffix,
sex, religion, tin, height, disability, disability_other,
house_street,
employment_status, employment_type, self_employed_type, self_employed_other,
unemployment_months, unemployment_reason, unemployment_reason_other, terminated_abroad_country,
is_ofw, ofw_country, is_former_ofw, former_ofw_country, former_ofw_return_date,
is_4ps, household_id,
preferred_occupations, work_type, work_location_type,
preferred_local_locations, preferred_overseas_locations,
currently_in_school, senior_high_strand, currently_enrolled, level_reached, year_last_attended,
other_skills, other_skills_other

-- NEW columns (Approach C additions):
tvet_certification_level   text DEFAULT '',      -- '', 'NC I', 'NC II', 'NC III', 'NC IV'
tvet_certification_title   text DEFAULT '',      -- e.g. 'Shielded Metal Arc Welding NC II'
```

### Columns to deprecate (keep for backward compat, stop writing)
- `full_name` -> replaced by surname + first_name + middle_name + suffix
- `preferred_job_type` -> replaced by work_type
- `preferred_job_location` -> replaced by work_location_type + preferred_local_locations / preferred_overseas_locations
- `willing_to_relocate` -> removed (not on PESO form)
- `expected_salary_min` / `expected_salary_max` -> removed (not on PESO form)

### Languages column
The existing `languages` JSONB column structure:
```json
[
  { "language": "English", "read": true, "write": true, "speak": true, "understand": true },
  { "language": "Filipino", "read": true, "write": false, "speak": true, "understand": true }
]
```

---

## Static Data Files

### 1. PSGC Location Data
**File:** `src/data/psgc.json`
**Source:** Philippine Statistics Authority PSGC dataset

### 2. Courses List
**File:** `src/data/courses.json`
**Structure:** Categories with course arrays, grouped by field of study

---

## Validation Summary

### Per-step validation (blocks "Continue"):
1. **Step 1:** Email valid + unique, password 8+ chars with letter+number, confirmation matches
2. **Step 2:** Surname, First Name, DOB, Sex, Civil Status all filled
3. **Step 3:** Province, City, Barangay selected; Contact Number valid PH format
4. **Step 4:** Employment status selected + relevant required sub-fields filled
5. **Step 5:** At least 1 occupation, work type selected, location type + at least 1 location
6. **Step 6:** Highest attainment selected, year graduated filled (unless enrolled), at least 1 language with 1 proficiency; course required if Vocational/Technical or College+
7. **Step 7:** At least 3 skills in tag input; at least 1 other_skills checkbox; if "Others" checked, specify text required; if TVET level selected, certification title required
8. **Step 8:** All 3 consent checkboxes checked

### Inline validation (on blur):
- Email format
- Phone format (09XX / +639XX)
- Year fields (4-digit, valid range)

---

## Files to Modify

### Modified files:
| File | Change |
|------|--------|
| `src/components/registration/Step2PersonalInfo.jsx` | Remove "Optional Details" section (religion, TIN, height, disability) |
| `src/components/registration/Step7OtherSkills.jsx` | Rename to "Skills & Qualifications". Add: skills tag input, TVET dropdown + title, most recent job fields. Keep other_skills checkboxes. |
| `src/components/registration/Step6EducationLanguage.jsx` | Add "Vocational/Technical" to education dropdown with conditional course/program text field |
| `src/pages/JobseekerRegistration.jsx` | Update formData for new fields. Update getStepData() for Step 7. On completion: merge other_skills into skills, seed work_experiences, call expandProfileAliases(). |
| `src/services/geminiService.js` | Add `'Vocational/Technical': 2` to USER_EDUCATION_ORDINAL. In expandProfileAliases(), append tvet_certification_title to skills if present. |
| `src/components/forms/ProgressBar.jsx` | Update Step 7 label from "Other Skills" to "Skills & Qualifications" |
| `sql/registration_redesign_migration.sql` | Add 2 columns: tvet_certification_level, tvet_certification_title |
| `src/pages/JobseekerProfileEdit.jsx` | Add TVET certification fields to edit form |

### Files NOT changed:
- Step1AccountCredentials.jsx — untouched
- Step3AddressContact.jsx — untouched
- Step4EmploymentStatus.jsx — untouched
- Step5JobPreference.jsx — untouched
- Step7Consent.jsx (Step 8) — untouched
- AuthContext.jsx — no changes needed (saveRegistrationStep already handles arbitrary profile fields)
- calculateDeterministicScore — no changes needed (already reads the right columns)

---

## Database Migration

```sql
-- Approach C additions to registration_redesign_migration.sql
ALTER TABLE public.jobseeker_profiles
  ADD COLUMN IF NOT EXISTS tvet_certification_level text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tvet_certification_title text DEFAULT '';
```

The existing migration already handles all other new columns from the original redesign spec.
