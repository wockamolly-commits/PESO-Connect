# Jobseeker Registration Form Redesign

**Date:** 2026-03-27
**Scope:** 7-step registration flow only (profile edit page is a separate task)
**Strategy:** Progressive disclosure — required fields at registration, optional fields later via profile edit

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Scope | Required (yellow-highlighted) fields at registration; optional fields fillable later |
| Steps | 7 balanced steps, one topic per step |
| Location fields | Static PSGC JSON with cascading Province → City → Barangay dropdowns |
| Course list | Curated top 100-150 Philippine college courses grouped by category + "Others (specify)" |
| Employment status | Conditional reveal — radio buttons progressively show sub-fields |
| UI pattern | Modern wizard — slim progress bar, step title, floating Back/Continue buttons |
| Profile edit | Separate future task |

---

## UI Pattern

### Progress Indicator
- Slim horizontal progress bar (6px) with gradient fill (indigo → purple)
- Above bar: step label (left) + "Step X of 7" (right)
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
- Step 1: no Back button; Step 7: "Submit" replaces "Continue"

### Layout
- Single column on mobile, max-width container on desktop
- Side-by-side fields where appropriate (name fields, etc.)
- Religion and TIN are full-width stacked (not side-by-side) for mobile space

---

## Step-by-Step Field Specification

### Step 1: Account Credentials

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | email input | Yes | Valid email format, unique |
| Password | password input | Yes | Min 8 chars, letter + number |
| Confirm Password | password input | Yes | Must match password |

**Behavior:** Creates Supabase auth account on "Continue". If email verification required, redirects to /verify-email.

### Step 2: Personal Information

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Surname | text | Yes | Non-empty |
| First Name | text | Yes | Non-empty |
| Middle Name | text | No | — |
| Suffix | dropdown (None, Jr., Sr., III, IV, V) | No | — |
| Date of Birth | date picker | Yes | Valid date, age 15-100 |
| Sex | radio pills (Male, Female) | Yes | Must select one |
| Civil Status | dropdown (Single, Married, Widowed, Separated, Solo Parent) | Yes | Must select |
| — Section Divider: "Optional Details" — | | | |
| Religion | text (full-width) | No | — |
| TIN | text (full-width) | No | Format: 000-000-000-000 |
| Height | text | No | — |
| Disability | checkbox pills (None, Visual, Hearing, Speech, Physical, Mental, Others) | No | If Others → text input for specify |

**Layout Notes:**
- Surname (flex:2) + Suffix (flex:0.8) on same row
- First Name + Middle Name on same row
- Religion: full-width, stacked
- TIN: full-width, stacked
- Height: standalone row

### Step 3: Address & Contact

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| House No./Street/Village | text | No | — |
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

**If Employed → conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Employment Type | radio pills (Wage Employed, Self-Employed) | Yes | Must select |
| If Self-Employed: Sub-type | checkboxes (Fisherman/Fisherfolk, Vendor/Retailer, Home-based worker, Transport, Domestic Worker, Freelancer, Artisan/Craft Worker, Others) | Yes | At least one |
| If Others: specify | text | Yes (if Others checked) | Non-empty |

**If Unemployed → conditional reveal:**

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

**If Local → conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Preferred cities/municipalities | 3 text inputs (numbered 1-3) | Yes | At least 1 filled |

**If Overseas → conditional reveal:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Preferred countries | 3 text inputs (numbered 1-3) | Yes | At least 1 filled |

### Step 6: Education & Language

**Education section:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Highest Educational Attainment | dropdown (Elementary, Secondary Non-K12, Secondary K-12, Tertiary, Graduate/Post-graduate) | Yes | Must select |
| Currently in school? | radio pills (Yes, No) | No | Default: No |
| If Secondary K-12: Senior High Strand | dropdown (STEM, ABM, HUMSS, GAS, TVL, Sports, Arts & Design) | No | — |
| If Tertiary+: Course/Field of Study | searchable dropdown (curated list + Others) | Yes | Must select |
| If Others: specify course | text | Yes (if Others) | Non-empty |
| Year Graduated | number input (4 digits) | Yes | Valid year, 1950-current |
| If currently enrolled: Level Reached | text | No | — |
| If currently enrolled: Year Last Attended | number input | No | Valid year |

**"Currently enrolled" logic:** If the user toggles "Currently in school? Yes", the `currently_enrolled` DB column is set to `true`, and the form shows Level Reached and Year Last Attended fields instead of Year Graduated.

**Course dropdown categories (curated from courses.com.ph):**
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

### Step 7: Consent & Submit

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Certification | checkbox | Yes | Must be checked |
| Data processing consent | checkbox | Yes | Must be checked |
| PESO verification consent | checkbox | Yes | Must be checked |

**Certification text:** "I certify that all data/information I have provided in this form are true to the best of my knowledge. I authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation."

**After submit:** Registration summary preview (collapsible), status set to "pending", confirmation email sent.

---

## Data Model Changes

### New columns for `public.jobseeker_profiles`

```sql
-- Split name fields (replace full_name)
surname         text NOT NULL DEFAULT '',
first_name      text NOT NULL DEFAULT '',
middle_name     text DEFAULT '',
suffix          text DEFAULT '',

-- New personal info fields
sex             text DEFAULT '',
religion        text DEFAULT '',
tin             text DEFAULT '',
height          text DEFAULT '',
disability      text[] DEFAULT '{}',
disability_other text DEFAULT '',

-- Address enhancement
house_street    text DEFAULT '',

-- Employment status (new section)
employment_status       text DEFAULT '',           -- 'employed' | 'unemployed'
employment_type         text DEFAULT '',           -- 'wage_employed' | 'self_employed'
self_employed_type      text[] DEFAULT '{}',
self_employed_other     text DEFAULT '',
unemployment_months     integer,
unemployment_reason     text[] DEFAULT '{}',
unemployment_reason_other text DEFAULT '',
terminated_abroad_country text DEFAULT '',

-- OFW / 4Ps (optional)
is_ofw                  text DEFAULT 'no',
ofw_country             text DEFAULT '',
is_former_ofw           text DEFAULT 'no',
former_ofw_country      text DEFAULT '',
former_ofw_return_date  text DEFAULT '',
is_4ps                  text DEFAULT 'no',
household_id            text DEFAULT '',

-- Job preference enhancements
preferred_occupations   text[] DEFAULT '{}',       -- up to 3
work_type               text[] DEFAULT '{}',       -- ['part_time', 'full_time']
work_location_type      text DEFAULT '',           -- 'local' | 'overseas'
preferred_local_locations   text[] DEFAULT '{}',   -- up to 3 cities
preferred_overseas_locations text[] DEFAULT '{}',  -- up to 3 countries

-- Education enhancements
currently_in_school     text DEFAULT 'no',
senior_high_strand      text DEFAULT '',
currently_enrolled      boolean DEFAULT false,
level_reached           text DEFAULT '',
year_last_attended      text DEFAULT '',
```

### Columns to deprecate (keep for backward compat, stop writing)
- `full_name` → replaced by surname + first_name + middle_name + suffix
- `preferred_job_type` → replaced by work_type
- `preferred_job_location` → replaced by work_location_type + preferred_local_locations / preferred_overseas_locations
- `willing_to_relocate` → removed (not on PESO form)
- `expected_salary_min` / `expected_salary_max` → removed (not on PESO form)

### Languages column
The existing `languages` JSONB column already exists. Update its structure:
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
**Structure:**
```json
{
  "provinces": [
    {
      "code": "0128",
      "name": "Ilocos Norte",
      "cities": [
        {
          "code": "012801",
          "name": "Adams",
          "barangays": [
            { "code": "012801001", "name": "Adams (Poblacion)" }
          ]
        }
      ]
    }
  ]
}
```
**Source:** Philippine Statistics Authority PSGC dataset

### 2. Courses List
**File:** `src/data/courses.json`
**Structure:**
```json
{
  "categories": [
    {
      "name": "Engineering & Technology",
      "courses": [
        "BS Civil Engineering",
        "BS Mechanical Engineering",
        "BS Electrical Engineering"
      ]
    },
    {
      "name": "Information Technology & Computer Science",
      "courses": [
        "BS Computer Science",
        "BS Information Technology",
        "BS Information Systems"
      ]
    }
  ]
}
```

---

## Validation Summary

### Per-step validation (blocks "Continue"):
1. **Step 1:** Email valid + unique, password 8+ chars with letter+number, confirmation matches
2. **Step 2:** Surname, First Name, DOB, Sex, Civil Status all filled
3. **Step 3:** Province, City, Barangay selected; Contact Number valid PH format
4. **Step 4:** Employment status selected + relevant required sub-fields filled
5. **Step 5:** At least 1 occupation, work type selected, location type + at least 1 location
6. **Step 6:** Highest attainment selected, year graduated filled, at least 1 language with 1 proficiency; course required if Tertiary+
7. **Step 7:** All 3 consent checkboxes checked

### Inline validation (on blur):
- Email format
- Phone format (09XX / +639XX)
- TIN format (if filled)
- Year fields (4-digit, valid range)

---

## Files to Create/Modify

### New files:
- `src/data/psgc.json` — PSGC location dataset
- `src/data/courses.json` — curated course list
- `src/components/registration/Step3AddressContact.jsx` — new step (address + contact)
- `src/components/registration/Step4EmploymentStatus.jsx` — new step
- `src/components/registration/Step5JobPreference.jsx` — new step (replaces old Step3)
- `src/components/registration/Step6EducationLanguage.jsx` — new step (replaces old Step4)
- `src/components/registration/Step7Consent.jsx` — new step (replaces old Step6)
- `src/components/forms/ProgressBar.jsx` — new progress bar component (replaces StepIndicator)
- `src/components/forms/CascadingDropdown.jsx` — reusable Province/City/Barangay component
- `src/components/forms/SearchableDropdown.jsx` — searchable dropdown with categories
- `src/components/forms/LanguageGrid.jsx` — language proficiency checkbox grid

### Modified files:
- `src/pages/JobseekerRegistration.jsx` — update to 7 steps, new progress bar, field mapping
- `src/components/registration/Step1AccountCredentials.jsx` — minor: remove old StepIndicator usage
- `src/components/registration/Step2PersonalInfo.jsx` — major rewrite: split name, add sex/civil status/optional fields
- `src/contexts/AuthContext.jsx` — update saveRegistrationStep field mapping for new columns
- `src/utils/validation.js` — add validators for new field types

### Deleted files (after migration):
- `src/components/registration/Step3EmploymentPreferences.jsx` — replaced
- `src/components/registration/Step4Education.jsx` — replaced
- `src/components/registration/Step5SkillsExperience.jsx` — replaced (skills/experience moved to profile edit)
- `src/components/registration/Step6Consent.jsx` — replaced by Step7Consent
- `src/components/forms/StepIndicator.jsx` — replaced by ProgressBar

---

## Database Migration

A SQL migration is needed to:
1. Add new columns to `jobseeker_profiles`
2. Migrate existing `full_name` data into `surname` + `first_name` (best-effort split)
3. Keep deprecated columns for backward compatibility (existing profile pages still read them until updated)
