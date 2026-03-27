# Jobseeker Registration Form Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the 7-step jobseeker registration form to match the official PESO NSRP Form 1, with progressive disclosure (required fields at registration, optional fields later).

**Architecture:** Replace the existing 6-step form with a 7-step modern wizard using a slim progress bar, pill-style radio/checkbox inputs, conditional reveal panels, and floating navigation. New static JSON data files power cascading location dropdowns and a searchable course list. Database schema is extended with new columns for PESO-specific fields.

**Tech Stack:** React 18, Tailwind CSS 3, Supabase (auth + database), Lucide React icons

**Spec:** `docs/superpowers/specs/2026-03-27-jobseeker-registration-redesign.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `sql/registration_redesign_migration.sql` | DB migration: add new columns to jobseeker_profiles |
| `src/data/psgc.json` | Static PSGC dataset for Province/City/Barangay cascading dropdowns |
| `src/data/courses.json` | Curated Philippine college course list grouped by category |
| `src/components/forms/ProgressBar.jsx` | Slim progress bar with step label (replaces StepIndicator) |
| `src/components/registration/Step3AddressContact.jsx` | Step 3: Address & Contact fields with cascading dropdowns |
| `src/components/registration/Step4EmploymentStatus.jsx` | Step 4: Employment status with conditional reveal |
| `src/components/registration/Step5JobPreference.jsx` | Step 5: Preferred occupations, work type, location |
| `src/components/registration/Step6EducationLanguage.jsx` | Step 6: Education + language proficiency grid |
| `src/components/registration/Step7Consent.jsx` | Step 7: Consent checkboxes + summary |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/JobseekerRegistration.jsx` | 7-step flow, new formData fields, new progress bar, updated navigation, updated getStepData/validateStep |
| `src/components/registration/Step2PersonalInfo.jsx` | Full rewrite: split name, sex, civil status, optional section |
| `src/contexts/AuthContext.jsx` | Update BASE_FIELDS set, add new profile fields to splitFields |
| `src/utils/validation.js` | Add `tin()` validator |

### Deleted Files (after all new steps work)
| File | Replaced By |
|------|------------|
| `src/components/registration/Step3EmploymentPreferences.jsx` | Step5JobPreference.jsx |
| `src/components/registration/Step4Education.jsx` | Step6EducationLanguage.jsx |
| `src/components/registration/Step5SkillsExperience.jsx` | Moved to profile edit (future task) |
| `src/components/registration/Step6Consent.jsx` | Step7Consent.jsx |
| `src/components/forms/StepIndicator.jsx` | ProgressBar.jsx |

---

## Task 1: Database Migration

**Files:**
- Create: `sql/registration_redesign_migration.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Registration Redesign Migration
-- Adds PESO NSRP Form 1 fields to jobseeker_profiles

-- Split name fields
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS surname text NOT NULL DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS middle_name text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS suffix text DEFAULT '';

-- Personal info
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS sex text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS religion text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS tin text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS height text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS disability text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS disability_other text DEFAULT '';

-- Address
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS house_street text DEFAULT '';

-- Employment status
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_status text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS employment_type text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS self_employed_type text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS self_employed_other text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_months integer;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_reason text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS unemployment_reason_other text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS terminated_abroad_country text DEFAULT '';

-- OFW / 4Ps
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_ofw text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS ofw_country text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_former_ofw text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS former_ofw_country text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS former_ofw_return_date text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS is_4ps text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS household_id text DEFAULT '';

-- Job preference
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_occupations text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS work_type text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS work_location_type text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_local_locations text[] DEFAULT '{}';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS preferred_overseas_locations text[] DEFAULT '{}';

-- Education
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS currently_in_school text DEFAULT 'no';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS senior_high_strand text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS currently_enrolled boolean DEFAULT false;
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS level_reached text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS year_last_attended text DEFAULT '';

-- Migrate existing full_name into surname + first_name (best-effort split)
UPDATE public.jobseeker_profiles
SET
  surname = CASE
    WHEN full_name LIKE '% %' THEN split_part(full_name, ' ', array_length(string_to_array(full_name, ' '), 1))
    ELSE full_name
  END,
  first_name = CASE
    WHEN full_name LIKE '% %' THEN array_to_string((string_to_array(full_name, ' '))[1:array_length(string_to_array(full_name, ' '), 1)-1], ' ')
    ELSE ''
  END
WHERE full_name IS NOT NULL AND full_name != '' AND surname = '';
```

- [ ] **Step 2: Run the migration in Supabase**

Open the Supabase SQL Editor and run the migration script. Verify with:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jobseeker_profiles'
ORDER BY ordinal_position;
```

Expected: All new columns appear with correct types and defaults.

- [ ] **Step 3: Commit**

```bash
git add sql/registration_redesign_migration.sql
git commit -m "feat: add PESO registration redesign DB migration"
```

---

## Task 2: Static Data Files (PSGC + Courses)

**Files:**
- Create: `src/data/psgc.json`
- Create: `src/data/courses.json`

- [ ] **Step 1: Create the PSGC location data file**

Download the PSGC dataset from the Philippine Statistics Authority and structure it as a nested JSON. The file should contain all provinces, cities/municipalities, and barangays.

Create `src/data/psgc.json` with this structure (full dataset — this is a large file ~2-4MB):

```json
[
  {
    "name": "Abra",
    "cities": [
      {
        "name": "Bangued",
        "barangays": ["Agtangao", "Angad", "Ba-ug", "Bañacao", "Banquero"]
      }
    ]
  },
  {
    "name": "Agusan del Norte",
    "cities": [
      {
        "name": "Butuan City",
        "barangays": ["Agao", "Agusan Pequeño", "Ambago"]
      }
    ]
  }
]
```

Source the full data from: https://psa.gov.ph/classification/psgc or use an existing open-source PSGC JSON (e.g., `ph-locations` npm package data). The structure must be a flat array of provinces, each with a `cities` array, each city with a `barangays` string array.

- [ ] **Step 2: Create the curated courses data file**

Create `src/data/courses.json`:

```json
{
  "categories": [
    {
      "name": "Engineering & Technology",
      "courses": [
        "BS Civil Engineering",
        "BS Mechanical Engineering",
        "BS Electrical Engineering",
        "BS Electronics Engineering",
        "BS Chemical Engineering",
        "BS Industrial Engineering",
        "BS Computer Engineering",
        "BS Geodetic Engineering",
        "BS Mining Engineering",
        "BS Agricultural Engineering",
        "BS Environmental Engineering",
        "BS Sanitary Engineering"
      ]
    },
    {
      "name": "Information Technology & Computer Science",
      "courses": [
        "BS Computer Science",
        "BS Information Technology",
        "BS Information Systems",
        "BS Data Science",
        "BS Cybersecurity",
        "BS Entertainment and Multimedia Computing",
        "Associate in Computer Technology"
      ]
    },
    {
      "name": "Business & Management",
      "courses": [
        "BS Business Administration",
        "BS Accountancy",
        "BS Management Accounting",
        "BS Accounting Technology",
        "BS Entrepreneurship",
        "BS Office Administration",
        "BS Customs Administration",
        "BS Hotel and Restaurant Management",
        "BS Tourism Management",
        "BS Real Estate Management"
      ]
    },
    {
      "name": "Education & Teaching",
      "courses": [
        "Bachelor of Elementary Education",
        "Bachelor of Secondary Education",
        "Bachelor of Early Childhood Education",
        "Bachelor of Special Needs Education",
        "Bachelor of Physical Education",
        "Bachelor of Technical-Vocational Teacher Education",
        "Bachelor of Technology and Livelihood Education"
      ]
    },
    {
      "name": "Health Sciences & Medicine",
      "courses": [
        "BS Nursing",
        "BS Pharmacy",
        "BS Medical Technology",
        "BS Physical Therapy",
        "BS Occupational Therapy",
        "BS Radiologic Technology",
        "BS Respiratory Therapy",
        "BS Midwifery",
        "BS Nutrition and Dietetics",
        "BS Speech-Language Pathology",
        "Doctor of Medicine",
        "Doctor of Dental Medicine"
      ]
    },
    {
      "name": "Arts & Humanities",
      "courses": [
        "BA Communication",
        "BA Journalism",
        "BA Broadcasting",
        "BA English",
        "BA Filipino",
        "BA Literature",
        "BA Philosophy",
        "BA History",
        "Bachelor of Fine Arts",
        "Bachelor of Music",
        "Bachelor of Performing Arts"
      ]
    },
    {
      "name": "Social Sciences",
      "courses": [
        "BS Psychology",
        "BS Social Work",
        "BA Political Science",
        "BA Sociology",
        "BS Economics",
        "BA Anthropology",
        "BS Development Communication",
        "BS Public Administration"
      ]
    },
    {
      "name": "Agriculture & Fisheries",
      "courses": [
        "BS Agriculture",
        "BS Agricultural Business",
        "BS Fisheries",
        "BS Forestry",
        "BS Environmental Science",
        "BS Food Technology",
        "BS Animal Science"
      ]
    },
    {
      "name": "Law & Legal Studies",
      "courses": [
        "Bachelor of Laws (LLB)",
        "Juris Doctor (JD)",
        "BS Legal Management",
        "BS Criminology"
      ]
    },
    {
      "name": "Architecture & Fine Arts",
      "courses": [
        "BS Architecture",
        "BS Interior Design",
        "BS Landscape Architecture",
        "Bachelor of Fine Arts - Industrial Design",
        "Bachelor of Fine Arts - Advertising Arts"
      ]
    },
    {
      "name": "Maritime",
      "courses": [
        "BS Marine Transportation",
        "BS Marine Engineering",
        "BS Naval Architecture and Marine Engineering"
      ]
    },
    {
      "name": "Public Safety & Defense",
      "courses": [
        "BS Criminology",
        "BS Industrial Security Administration",
        "BS Fire Technology"
      ]
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/data/psgc.json src/data/courses.json
git commit -m "feat: add PSGC location data and curated courses list"
```

---

## Task 3: ProgressBar Component

**Files:**
- Create: `src/components/forms/ProgressBar.jsx`

- [ ] **Step 1: Create the ProgressBar component**

```jsx
import React from 'react';

const STEP_LABELS = [
  'Account',
  'Personal Info',
  'Address & Contact',
  'Employment',
  'Job Preference',
  'Education & Language',
  'Consent'
];

export default function ProgressBar({ currentStep, totalSteps = 7 }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const label = STEP_LABELS[currentStep - 1] || '';

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {label}
        </span>
        <span className="text-xs text-gray-400">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Temporarily import into `JobseekerRegistration.jsx` and confirm the bar renders with correct step labels. Revert the temporary import after confirming.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/ProgressBar.jsx
git commit -m "feat: add ProgressBar component for registration wizard"
```

---

## Task 4: Rewrite Step2PersonalInfo

**Files:**
- Modify: `src/components/registration/Step2PersonalInfo.jsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire content of `src/components/registration/Step2PersonalInfo.jsx`:

```jsx
import React from 'react';
import { User, Calendar } from 'lucide-react';

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent'];
const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'III', 'IV', 'V'];
const DISABILITY_OPTIONS = ['Visual', 'Hearing', 'Speech', 'Physical', 'Mental', 'Others'];

export default function Step2PersonalInfo({ formData, handleChange, setFormData }) {

  const handleSexSelect = (value) => {
    setFormData(prev => ({ ...prev, sex: value }));
  };

  const handleDisabilityToggle = (type) => {
    setFormData(prev => {
      const current = prev.disability || [];
      if (type === 'None') {
        return { ...prev, disability: [], disability_other: '' };
      }
      const updated = current.includes(type)
        ? current.filter(d => d !== type)
        : [...current, type];
      const newData = { ...prev, disability: updated };
      if (!updated.includes('Others')) newData.disability_other = '';
      return newData;
    });
  };

  const hasNoDisability = !formData.disability || formData.disability.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tell us about yourself</h2>
        <p className="text-sm text-gray-400 mt-1">Fields marked with <span className="text-red-500">*</span> are required</p>
      </div>

      {/* Surname + Suffix row */}
      <div className="flex gap-3">
        <div className="flex-[2]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Surname <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="surname"
            value={formData.surname || ''}
            onChange={handleChange}
            placeholder="e.g. Dela Cruz"
            className="input-field w-full"
          />
        </div>
        <div className="flex-[0.8]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Suffix <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <select
            name="suffix"
            value={formData.suffix || ''}
            onChange={handleChange}
            className="input-field w-full"
          >
            <option value="">None</option>
            {SUFFIX_OPTIONS.filter(s => s).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* First Name + Middle Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name || ''}
            onChange={handleChange}
            placeholder="e.g. Juan"
            className="input-field w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Middle Name <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <input
            type="text"
            name="middle_name"
            value={formData.middle_name || ''}
            onChange={handleChange}
            placeholder="e.g. Santos"
            className="input-field w-full"
          />
        </div>
      </div>

      {/* Date of Birth */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Date of Birth <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth || ''}
            onChange={handleChange}
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {/* Sex */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Sex <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {['Male', 'Female'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => handleSexSelect(option)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
                formData.sex === option
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                formData.sex === option ? 'border-indigo-500' : 'border-gray-300'
              }`}>
                {formData.sex === option && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              </span>
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Civil Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Civil Status <span className="text-red-500">*</span>
        </label>
        <select
          name="civil_status"
          value={formData.civil_status || ''}
          onChange={handleChange}
          className="input-field w-full"
        >
          <option value="">Select...</option>
          {CIVIL_STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Optional Details Divider */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Optional Details</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Religion (full-width) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Religion <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="religion"
          value={formData.religion || ''}
          onChange={handleChange}
          placeholder="e.g. Roman Catholic"
          className="input-field w-full"
        />
      </div>

      {/* TIN (full-width) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          TIN <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="tin"
          value={formData.tin || ''}
          onChange={handleChange}
          placeholder="000-000-000-000"
          className="input-field w-full"
        />
      </div>

      {/* Height */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Height (ft) <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="height"
          value={formData.height || ''}
          onChange={handleChange}
          placeholder={`e.g. 5'7"`}
          className="input-field w-full"
        />
      </div>

      {/* Disability */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Disability <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDisabilityToggle('None')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
              hasNoDisability
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
              hasNoDisability ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
            }`}>
              {hasNoDisability && '✓'}
            </span>
            None
          </button>
          {DISABILITY_OPTIONS.map(option => {
            const isSelected = (formData.disability || []).includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleDisabilityToggle(option)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
                  isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
                }`}>
                  {isSelected && '✓'}
                </span>
                {option}
              </button>
            );
          })}
        </div>
        {(formData.disability || []).includes('Others') && (
          <input
            type="text"
            name="disability_other"
            value={formData.disability_other || ''}
            onChange={handleChange}
            placeholder="Please specify disability"
            className="input-field w-full mt-2"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/registration/Step2PersonalInfo.jsx
git commit -m "feat: rewrite Step2PersonalInfo with PESO form fields"
```

---

## Task 5: Create Step3AddressContact

**Files:**
- Create: `src/components/registration/Step3AddressContact.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useMemo } from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import psgcData from '../../data/psgc.json';

export default function Step3AddressContact({ formData, handleChange, setFormData }) {
  const provinces = useMemo(() => psgcData.map(p => p.name).sort(), []);

  const cities = useMemo(() => {
    if (!formData.province) return [];
    const prov = psgcData.find(p => p.name === formData.province);
    return prov ? prov.cities.map(c => c.name).sort() : [];
  }, [formData.province]);

  const barangays = useMemo(() => {
    if (!formData.province || !formData.city) return [];
    const prov = psgcData.find(p => p.name === formData.province);
    if (!prov) return [];
    const city = prov.cities.find(c => c.name === formData.city);
    return city ? city.barangays.sort() : [];
  }, [formData.province, formData.city]);

  const handleProvinceChange = (e) => {
    setFormData(prev => ({
      ...prev,
      province: e.target.value,
      city: '',
      barangay: ''
    }));
  };

  const handleCityChange = (e) => {
    setFormData(prev => ({
      ...prev,
      city: e.target.value,
      barangay: ''
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Address & Contact</h2>
        <p className="text-sm text-gray-400 mt-1">Your current address and contact details</p>
      </div>

      {/* House/Street */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          House No. / Street / Village <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="house_street"
          value={formData.house_street || ''}
          onChange={handleChange}
          placeholder="e.g. 123 Rizal Street, Brgy. Centro"
          className="input-field w-full"
        />
      </div>

      {/* Province */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Province <span className="text-red-500">*</span>
        </label>
        <select
          name="province"
          value={formData.province || ''}
          onChange={handleProvinceChange}
          className="input-field w-full"
        >
          <option value="">Select province...</option>
          {provinces.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* City/Municipality */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          City / Municipality <span className="text-red-500">*</span>
        </label>
        <select
          name="city"
          value={formData.city || ''}
          onChange={handleCityChange}
          disabled={!formData.province}
          className={`input-field w-full ${!formData.province ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{formData.province ? 'Select city...' : 'Select province first'}</option>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Barangay */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Barangay <span className="text-red-500">*</span>
        </label>
        <select
          name="barangay"
          value={formData.barangay || ''}
          onChange={handleChange}
          disabled={!formData.city}
          className={`input-field w-full ${!formData.city ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{formData.city ? 'Select barangay...' : 'Select city first'}</option>
          {barangays.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Contact Number */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Contact Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            name="mobile_number"
            value={formData.mobile_number || ''}
            onChange={handleChange}
            placeholder="09XX XXX XXXX"
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={formData.email || ''}
            readOnly
            className="input-field w-full pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">From your account credentials</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/registration/Step3AddressContact.jsx
git commit -m "feat: add Step3AddressContact with cascading PSGC dropdowns"
```

---

## Task 6: Create Step4EmploymentStatus

**Files:**
- Create: `src/components/registration/Step4EmploymentStatus.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from 'react';

const SELF_EMPLOYED_TYPES = [
  'Fisherman/Fisherfolk', 'Vendor/Retailer', 'Home-based Worker',
  'Transport', 'Domestic Worker', 'Freelancer', 'Artisan/Craft Worker', 'Others'
];

const UNEMPLOYMENT_REASONS = [
  'New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned', 'Retired',
  'Terminated/Laid off (Local)', 'Terminated/Laid off (Abroad)',
  'Laid off due to Calamity', 'Others'
];

function RadioPill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
          : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        selected ? 'border-indigo-500' : 'border-gray-300'
      }`}>
        {selected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
      </span>
      {children}
    </button>
  );
}

function CheckPill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium'
          : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
        selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
      }`}>
        {selected && '✓'}
      </span>
      {children}
    </button>
  );
}

export default function Step4EmploymentStatus({ formData, handleChange, setFormData }) {

  const setField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleArrayField = (fieldName, value) => {
    setFormData(prev => {
      const current = prev[fieldName] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [fieldName]: updated };
    });
  };

  const handleStatusChange = (status) => {
    setFormData(prev => ({
      ...prev,
      employment_status: status,
      // Reset sub-fields when switching
      employment_type: '',
      self_employed_type: [],
      self_employed_other: '',
      unemployment_months: '',
      unemployment_reason: [],
      unemployment_reason_other: '',
      terminated_abroad_country: '',
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your employment status</h2>
        <p className="text-sm text-gray-400 mt-1">This helps us match you with the right opportunities</p>
      </div>

      {/* Employment Status */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Current Status <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <RadioPill
            selected={formData.employment_status === 'employed'}
            onClick={() => handleStatusChange('employed')}
          >
            Employed
          </RadioPill>
          <RadioPill
            selected={formData.employment_status === 'unemployed'}
            onClick={() => handleStatusChange('unemployed')}
          >
            Unemployed
          </RadioPill>
        </div>
      </div>

      {/* Employed conditional */}
      {formData.employment_status === 'employed' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <RadioPill
                selected={formData.employment_type === 'wage_employed'}
                onClick={() => setField('employment_type', 'wage_employed')}
              >
                Wage Employed
              </RadioPill>
              <RadioPill
                selected={formData.employment_type === 'self_employed'}
                onClick={() => setField('employment_type', 'self_employed')}
              >
                Self-Employed
              </RadioPill>
            </div>
          </div>

          {formData.employment_type === 'self_employed' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Type of Self-Employment <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SELF_EMPLOYED_TYPES.map(type => (
                  <CheckPill
                    key={type}
                    selected={(formData.self_employed_type || []).includes(type)}
                    onClick={() => toggleArrayField('self_employed_type', type)}
                  >
                    {type}
                  </CheckPill>
                ))}
              </div>
              {(formData.self_employed_type || []).includes('Others') && (
                <input
                  type="text"
                  name="self_employed_other"
                  value={formData.self_employed_other || ''}
                  onChange={handleChange}
                  placeholder="Please specify"
                  className="input-field w-full mt-2"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Unemployed conditional */}
      {formData.employment_status === 'unemployed' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              How long have you been looking for work?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="unemployment_months"
                value={formData.unemployment_months || ''}
                onChange={handleChange}
                placeholder="e.g. 6"
                min="0"
                className="input-field w-24"
              />
              <span className="text-sm text-gray-500">months</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {UNEMPLOYMENT_REASONS.map(reason => (
                <CheckPill
                  key={reason}
                  selected={(formData.unemployment_reason || []).includes(reason)}
                  onClick={() => toggleArrayField('unemployment_reason', reason)}
                >
                  {reason}
                </CheckPill>
              ))}
            </div>
            {(formData.unemployment_reason || []).includes('Terminated/Laid off (Abroad)') && (
              <input
                type="text"
                name="terminated_abroad_country"
                value={formData.terminated_abroad_country || ''}
                onChange={handleChange}
                placeholder="Specify country"
                className="input-field w-full mt-2"
              />
            )}
            {(formData.unemployment_reason || []).includes('Others') && (
              <input
                type="text"
                name="unemployment_reason_other"
                value={formData.unemployment_reason_other || ''}
                onChange={handleChange}
                placeholder="Please specify reason"
                className="input-field w-full mt-2"
              />
            )}
          </div>
        </div>
      )}

      {/* Optional section */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Optional</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* OFW */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Are you an OFW? <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.is_ofw === 'yes'} onClick={() => setField('is_ofw', 'yes')}>Yes</RadioPill>
          <RadioPill selected={formData.is_ofw !== 'yes'} onClick={() => { setField('is_ofw', 'no'); setField('ofw_country', ''); }}>No</RadioPill>
        </div>
        {formData.is_ofw === 'yes' && (
          <input type="text" name="ofw_country" value={formData.ofw_country || ''} onChange={handleChange}
            placeholder="Specify country" className="input-field w-full mt-2" />
        )}
      </div>

      {/* Former OFW */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Are you a former OFW? <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.is_former_ofw === 'yes'} onClick={() => setField('is_former_ofw', 'yes')}>Yes</RadioPill>
          <RadioPill selected={formData.is_former_ofw !== 'yes'} onClick={() => { setField('is_former_ofw', 'no'); setField('former_ofw_country', ''); setField('former_ofw_return_date', ''); }}>No</RadioPill>
        </div>
        {formData.is_former_ofw === 'yes' && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <input type="text" name="former_ofw_country" value={formData.former_ofw_country || ''} onChange={handleChange}
              placeholder="Country of deployment" className="input-field w-full" />
            <input type="month" name="former_ofw_return_date" value={formData.former_ofw_return_date || ''} onChange={handleChange}
              className="input-field w-full" />
          </div>
        )}
      </div>

      {/* 4Ps */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Are you a 4Ps beneficiary? <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.is_4ps === 'yes'} onClick={() => setField('is_4ps', 'yes')}>Yes</RadioPill>
          <RadioPill selected={formData.is_4ps !== 'yes'} onClick={() => { setField('is_4ps', 'no'); setField('household_id', ''); }}>No</RadioPill>
        </div>
        {formData.is_4ps === 'yes' && (
          <input type="text" name="household_id" value={formData.household_id || ''} onChange={handleChange}
            placeholder="Household ID No." className="input-field w-full mt-2" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/registration/Step4EmploymentStatus.jsx
git commit -m "feat: add Step4EmploymentStatus with conditional reveal"
```

---

## Task 7: Create Step5JobPreference

**Files:**
- Create: `src/components/registration/Step5JobPreference.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from 'react';
import { Briefcase } from 'lucide-react';

function RadioPill({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}>
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-indigo-500' : 'border-gray-300'}`}>
        {selected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
      </span>
      {children}
    </button>
  );
}

function CheckPill({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-sm transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}>
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
        selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'
      }`}>
        {selected && '✓'}
      </span>
      {children}
    </button>
  );
}

export default function Step5JobPreference({ formData, handleChange, setFormData }) {

  const toggleWorkType = (type) => {
    setFormData(prev => {
      const current = prev.work_type || [];
      const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
      return { ...prev, work_type: updated };
    });
  };

  const handleLocationTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      work_location_type: type,
      preferred_local_locations: type === 'local' ? prev.preferred_local_locations || ['', '', ''] : [],
      preferred_overseas_locations: type === 'overseas' ? prev.preferred_overseas_locations || ['', '', ''] : [],
    }));
  };

  const updateLocationEntry = (field, index, value) => {
    setFormData(prev => {
      const arr = [...(prev[field] || ['', '', ''])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const updateOccupation = (index, value) => {
    setFormData(prev => {
      const arr = [...(prev.preferred_occupations || ['', '', ''])];
      arr[index] = value;
      return { ...prev, preferred_occupations: arr };
    });
  };

  const occupations = formData.preferred_occupations || ['', '', ''];
  const localLocations = formData.preferred_local_locations || ['', '', ''];
  const overseasLocations = formData.preferred_overseas_locations || ['', '', ''];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Job Preference</h2>
        <p className="text-sm text-gray-400 mt-1">What kind of work are you looking for?</p>
      </div>

      {/* Preferred Occupation */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Preferred Occupation <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                value={occupations[i] || ''}
                onChange={(e) => updateOccupation(i, e.target.value)}
                placeholder={i === 0 ? 'e.g. Software Developer' : '(optional)'}
                className="input-field w-full"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">At least 1 required, up to 3</p>
      </div>

      {/* Work Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Work Type <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <CheckPill selected={(formData.work_type || []).includes('Part-time')} onClick={() => toggleWorkType('Part-time')}>
            Part-time
          </CheckPill>
          <CheckPill selected={(formData.work_type || []).includes('Full-time')} onClick={() => toggleWorkType('Full-time')}>
            Full-time
          </CheckPill>
        </div>
      </div>

      {/* Preferred Work Location */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">
          Preferred Work Location <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <RadioPill selected={formData.work_location_type === 'local'} onClick={() => handleLocationTypeChange('local')}>
            Local
          </RadioPill>
          <RadioPill selected={formData.work_location_type === 'overseas'} onClick={() => handleLocationTypeChange('overseas')}>
            Overseas
          </RadioPill>
        </div>
      </div>

      {/* Local locations */}
      {formData.work_location_type === 'local' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Preferred Cities / Municipalities <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={localLocations[i] || ''}
                  onChange={(e) => updateLocationEntry('preferred_local_locations', i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. Quezon City' : '(optional)'}
                  className="input-field w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overseas locations */}
      {formData.work_location_type === 'overseas' && (
        <div className="p-4 bg-gray-50 rounded-xl border-l-[3px] border-indigo-500">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Preferred Countries <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-indigo-600 flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={overseasLocations[i] || ''}
                  onChange={(e) => updateLocationEntry('preferred_overseas_locations', i, e.target.value)}
                  placeholder={i === 0 ? 'e.g. Canada' : '(optional)'}
                  className="input-field w-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/registration/Step5JobPreference.jsx
git commit -m "feat: add Step5JobPreference with occupation and location fields"
```

---

## Task 8: Create Step6EducationLanguage

**Files:**
- Create: `src/components/registration/Step6EducationLanguage.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React, { useState, useMemo } from 'react';
import { GraduationCap, Plus, X } from 'lucide-react';
import coursesData from '../../data/courses.json';

const EDUCATION_LEVELS = [
  'Elementary',
  'Secondary (Non-K12)',
  'Secondary (K-12)',
  'Tertiary',
  'Graduate Studies / Post-graduate'
];

const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Sports', 'Arts & Design'];

const DEFAULT_LANGUAGES = [
  { language: 'English', read: false, write: false, speak: false, understand: false },
  { language: 'Filipino', read: false, write: false, speak: false, understand: false },
  { language: 'Mandarin', read: false, write: false, speak: false, understand: false },
];

function RadioPill({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-[1.5px] text-sm transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50 text-indigo-600 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}>
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-indigo-500' : 'border-gray-300'}`}>
        {selected && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
      </span>
      {children}
    </button>
  );
}

export default function Step6EducationLanguage({ formData, handleChange, setFormData }) {
  const [newLanguage, setNewLanguage] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const isTertiaryOrHigher = ['Tertiary', 'Graduate Studies / Post-graduate'].includes(formData.highest_education);
  const isK12 = formData.highest_education === 'Secondary (K-12)';
  const isCurrentlyEnrolled = formData.currently_in_school === 'yes';

  // Flatten courses for search
  const allCourses = useMemo(() => {
    const result = [];
    coursesData.categories.forEach(cat => {
      cat.courses.forEach(course => {
        result.push({ category: cat.name, course });
      });
    });
    return result;
  }, []);

  const filteredCourses = useMemo(() => {
    if (!courseSearch) return allCourses;
    const q = courseSearch.toLowerCase();
    return allCourses.filter(c =>
      c.course.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [courseSearch, allCourses]);

  // Language helpers
  const languages = formData.languages && formData.languages.length > 0
    ? formData.languages
    : DEFAULT_LANGUAGES;

  const toggleLangSkill = (langIndex, skill) => {
    const updated = languages.map((lang, i) => {
      if (i !== langIndex) return lang;
      return { ...lang, [skill]: !lang[skill] };
    });
    setFormData(prev => ({ ...prev, languages: updated }));
  };

  const addLanguage = () => {
    if (!newLanguage.trim()) return;
    const updated = [...languages, { language: newLanguage.trim(), read: false, write: false, speak: false, understand: false }];
    setFormData(prev => ({ ...prev, languages: updated }));
    setNewLanguage('');
  };

  const removeLanguage = (index) => {
    // Only allow removing custom languages (index >= 3)
    if (index < 3) return;
    const updated = languages.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, languages: updated }));
  };

  const handleEducationChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      highest_education: value,
      senior_high_strand: '',
      course_or_field: value === prev.highest_education ? prev.course_or_field : '',
    }));
  };

  const handleCurrentlyInSchoolChange = (value) => {
    setFormData(prev => ({
      ...prev,
      currently_in_school: value,
      currently_enrolled: value === 'yes',
      // Reset conditional fields
      ...(value === 'yes' ? { year_graduated: '' } : { level_reached: '', year_last_attended: '' }),
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Education & Language</h2>
        <p className="text-sm text-gray-400 mt-1">Your educational background and language skills</p>
      </div>

      {/* Section: Education */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Educational Background</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Highest Education */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Highest Educational Attainment <span className="text-red-500">*</span>
        </label>
        <select
          name="highest_education"
          value={formData.highest_education || ''}
          onChange={handleEducationChange}
          className="input-field w-full"
        >
          <option value="">Select...</option>
          {EDUCATION_LEVELS.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Currently in school */}
      {formData.highest_education && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Currently in school?
          </label>
          <div className="flex gap-2">
            <RadioPill selected={isCurrentlyEnrolled} onClick={() => handleCurrentlyInSchoolChange('yes')}>Yes</RadioPill>
            <RadioPill selected={!isCurrentlyEnrolled} onClick={() => handleCurrentlyInSchoolChange('no')}>No</RadioPill>
          </div>
        </div>
      )}

      {/* Senior High Strand (K-12 only) */}
      {isK12 && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Senior High Strand <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </label>
          <select
            name="senior_high_strand"
            value={formData.senior_high_strand || ''}
            onChange={handleChange}
            className="input-field w-full"
          >
            <option value="">Select strand...</option>
            {SHS_STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Course (Tertiary+ only) */}
      {isTertiaryOrHigher && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Course / Field of Study <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={courseSearch || formData.course_or_field || ''}
            onChange={(e) => setCourseSearch(e.target.value)}
            onFocus={() => { if (formData.course_or_field && !courseSearch) setCourseSearch(''); }}
            placeholder="Search courses..."
            className="input-field w-full"
          />
          {courseSearch && (
            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
              {filteredCourses.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, course_or_field: courseSearch }));
                    setCourseSearch('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50"
                >
                  Use "{courseSearch}" as custom course
                </button>
              ) : (
                <>
                  {filteredCourses.slice(0, 20).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, course_or_field: c.course }));
                        setCourseSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium">{c.course}</span>
                      <span className="text-xs text-gray-400 ml-2">{c.category}</span>
                    </button>
                  ))}
                  {filteredCourses.length > 20 && (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      {filteredCourses.length - 20} more results — keep typing to narrow down
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {formData.course_or_field && !courseSearch && (
            <div className="mt-1 flex items-center gap-2 text-sm text-indigo-600">
              <GraduationCap className="w-4 h-4" />
              {formData.course_or_field}
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, course_or_field: '' }))}
                className="text-gray-400 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Year Graduated OR Level Reached */}
      {formData.highest_education && !isCurrentlyEnrolled && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Year Graduated <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="year_graduated"
            value={formData.year_graduated || ''}
            onChange={handleChange}
            placeholder="e.g. 2020"
            min="1950"
            max={new Date().getFullYear()}
            className="input-field w-full"
          />
        </div>
      )}

      {formData.highest_education && isCurrentlyEnrolled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Level Reached <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              name="level_reached"
              value={formData.level_reached || ''}
              onChange={handleChange}
              placeholder="e.g. 3rd Year"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Year Last Attended <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="number"
              name="year_last_attended"
              value={formData.year_last_attended || ''}
              onChange={handleChange}
              placeholder="e.g. 2024"
              min="1950"
              max={new Date().getFullYear()}
              className="input-field w-full"
            />
          </div>
        </div>
      )}

      {/* Section: Language Proficiency */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Language Proficiency</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-xs font-semibold text-gray-500 uppercase text-left py-2 pr-2">Language</th>
              {['Read', 'Write', 'Speak', 'Understand'].map(skill => (
                <th key={skill} className="text-xs font-semibold text-gray-500 uppercase text-center py-2 px-1">{skill}</th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {languages.map((lang, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-2 pr-2 text-sm font-medium text-gray-800">{lang.language}</td>
                {['read', 'write', 'speak', 'understand'].map(skill => (
                  <td key={skill} className="text-center py-2 px-1">
                    <button
                      type="button"
                      onClick={() => toggleLangSkill(i, skill)}
                      className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center text-xs transition-all ${
                        lang[skill]
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {lang[skill] && '✓'}
                    </button>
                  </td>
                ))}
                <td className="py-2 pl-1">
                  {i >= 3 && (
                    <button type="button" onClick={() => removeLanguage(i)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add language */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLanguage}
          onChange={(e) => setNewLanguage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLanguage(); } }}
          placeholder="Add another language..."
          className="input-field flex-1"
        />
        <button
          type="button"
          onClick={addLanguage}
          disabled={!newLanguage.trim()}
          className="px-3 py-2 rounded-lg border-[1.5px] border-indigo-200 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400">Check at least 1 language with 1 proficiency</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/registration/Step6EducationLanguage.jsx
git commit -m "feat: add Step6EducationLanguage with course search and language grid"
```

---

## Task 9: Create Step7Consent

**Files:**
- Create: `src/components/registration/Step7Consent.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from 'react';
import { ShieldCheck } from 'lucide-react';

const CONSENT_ITEMS = [
  {
    field: 'terms_accepted',
    label: 'Terms and Conditions',
    description: 'I certify that all data/information I have provided in this form are true to the best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.'
  },
  {
    field: 'data_processing_consent',
    label: 'Data Processing Consent',
    description: 'I consent to the collection, processing, and storage of my personal data in accordance with the Data Privacy Act of 2012 (RA 10173).'
  },
  {
    field: 'peso_verification_consent',
    label: 'PESO Verification',
    description: 'I understand that my registration is subject to verification by the Public Employment Service Office (PESO) and my profile will remain pending until verified.'
  }
];

export default function Step7Consent({ formData, setFormData }) {

  const toggleConsent = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const displayName = [formData.first_name, formData.middle_name, formData.surname]
    .filter(Boolean).join(' ');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Almost done!</h2>
        <p className="text-sm text-gray-400 mt-1">Please review and accept the following to complete your registration</p>
      </div>

      {/* Consent checkboxes */}
      <div className="space-y-3">
        {CONSENT_ITEMS.map(item => (
          <label
            key={item.field}
            className={`flex gap-3 p-4 rounded-xl border-[1.5px] cursor-pointer transition-all ${
              formData[item.field]
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <button
              type="button"
              onClick={() => toggleConsent(item.field)}
              className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs transition-all ${
                formData[item.field]
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-gray-300'
              }`}
            >
              {formData[item.field] && '✓'}
            </button>
            <div>
              <span className="text-sm font-semibold text-gray-800">{item.label} <span className="text-red-500">*</span></span>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Registration Summary */}
      <div className="flex items-center gap-3 pt-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Registration Summary</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Name</span>
          <span className="font-medium text-gray-800">{displayName || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Email</span>
          <span className="font-medium text-gray-800">{formData.email || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Location</span>
          <span className="font-medium text-gray-800">
            {[formData.barangay, formData.city, formData.province].filter(Boolean).join(', ') || '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Education</span>
          <span className="font-medium text-gray-800">{formData.highest_education || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className="font-medium text-gray-800 capitalize">{formData.employment_status || '—'}</span>
        </div>
      </div>

      {/* Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Important</p>
            <p className="text-xs text-amber-700 mt-1">
              Your registration will be reviewed and verified by PESO staff. Your account will remain in "pending" status until verification is complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/registration/Step7Consent.jsx
git commit -m "feat: add Step7Consent with certification and summary"
```

---

## Task 10: Update JobseekerRegistration.jsx (Main Orchestrator)

**Files:**
- Modify: `src/pages/JobseekerRegistration.jsx`

This is the largest change — updating the main registration page to wire up 7 steps, new formData fields, new progress bar, and updated validation/navigation.

- [ ] **Step 1: Read the current file**

Read `src/pages/JobseekerRegistration.jsx` fully to confirm exact current state before editing.

- [ ] **Step 2: Update imports**

Replace the import block (lines 1-19) with:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';

// Registration steps
import Step1AccountCredentials from '../components/registration/Step1AccountCredentials';
import Step2PersonalInfo from '../components/registration/Step2PersonalInfo';
import Step3AddressContact from '../components/registration/Step3AddressContact';
import Step4EmploymentStatus from '../components/registration/Step4EmploymentStatus';
import Step5JobPreference from '../components/registration/Step5JobPreference';
import Step6EducationLanguage from '../components/registration/Step6EducationLanguage';
import Step7Consent from '../components/registration/Step7Consent';

// Components
import ProgressBar from '../components/forms/ProgressBar';

// Utils & services
import * as validators from '../utils/validation';
import { sendJobseekerRegistrationEmail } from '../services/emailService';
```

- [ ] **Step 3: Update formData initial state**

Replace the formData state initialization (lines 23-64 approximately) with:

```jsx
const [formData, setFormData] = useState({
  // Step 1: Account
  email: '', password: '', confirmPassword: '',
  // Step 2: Personal Info
  surname: '', first_name: '', middle_name: '', suffix: '',
  date_of_birth: '', sex: '', civil_status: '',
  religion: '', tin: '', height: '',
  disability: [], disability_other: '',
  // Step 3: Address & Contact
  house_street: '',
  province: '', city: '', barangay: '',
  mobile_number: '',
  // Step 4: Employment Status
  employment_status: '',
  employment_type: '',
  self_employed_type: [], self_employed_other: '',
  unemployment_months: '', unemployment_reason: [], unemployment_reason_other: '',
  terminated_abroad_country: '',
  is_ofw: 'no', ofw_country: '',
  is_former_ofw: 'no', former_ofw_country: '', former_ofw_return_date: '',
  is_4ps: 'no', household_id: '',
  // Step 5: Job Preference
  preferred_occupations: ['', '', ''],
  work_type: [],
  work_location_type: '',
  preferred_local_locations: ['', '', ''],
  preferred_overseas_locations: ['', '', ''],
  // Step 6: Education & Language
  highest_education: '', currently_in_school: 'no', currently_enrolled: false,
  senior_high_strand: '',
  course_or_field: '', year_graduated: '',
  level_reached: '', year_last_attended: '',
  languages: [],
  // Step 7: Consent
  terms_accepted: false,
  data_processing_consent: false,
  peso_verification_consent: false,
});
```

- [ ] **Step 4: Update validateStep function**

Replace the validateStep function with:

```jsx
const validateStep = () => {
  const errors = {};

  switch (currentStep) {
    case 1:
      if (!formData.email) errors.email = 'Email is required';
      else if (validators.email(formData.email)) errors.email = validators.email(formData.email);
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
      break;

    case 2:
      if (!formData.surname?.trim()) errors.surname = 'Surname is required';
      if (!formData.first_name?.trim()) errors.first_name = 'First name is required';
      if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
      if (!formData.sex) errors.sex = 'Sex is required';
      if (!formData.civil_status) errors.civil_status = 'Civil status is required';
      break;

    case 3:
      if (!formData.province) errors.province = 'Province is required';
      if (!formData.city) errors.city = 'City/Municipality is required';
      if (!formData.barangay) errors.barangay = 'Barangay is required';
      if (!formData.mobile_number?.trim()) errors.mobile_number = 'Contact number is required';
      else if (validators.phone(formData.mobile_number)) errors.mobile_number = validators.phone(formData.mobile_number);
      break;

    case 4:
      if (!formData.employment_status) errors.employment_status = 'Employment status is required';
      if (formData.employment_status === 'employed' && !formData.employment_type) {
        errors.employment_type = 'Employment type is required';
      }
      if (formData.employment_type === 'self_employed' && (!formData.self_employed_type || formData.self_employed_type.length === 0)) {
        errors.self_employed_type = 'Select at least one type';
      }
      if (formData.employment_status === 'unemployed' && (!formData.unemployment_reason || formData.unemployment_reason.length === 0)) {
        errors.unemployment_reason = 'Select at least one reason';
      }
      break;

    case 5: {
      const occupations = (formData.preferred_occupations || []).filter(o => o.trim());
      if (occupations.length === 0) errors.preferred_occupations = 'At least 1 occupation is required';
      if (!formData.work_type || formData.work_type.length === 0) errors.work_type = 'Select work type';
      if (!formData.work_location_type) errors.work_location_type = 'Select location preference';
      if (formData.work_location_type === 'local') {
        const locs = (formData.preferred_local_locations || []).filter(l => l.trim());
        if (locs.length === 0) errors.preferred_local_locations = 'At least 1 city is required';
      }
      if (formData.work_location_type === 'overseas') {
        const locs = (formData.preferred_overseas_locations || []).filter(l => l.trim());
        if (locs.length === 0) errors.preferred_overseas_locations = 'At least 1 country is required';
      }
      break;
    }

    case 6:
      if (!formData.highest_education) errors.highest_education = 'Education level is required';
      if (['Tertiary', 'Graduate Studies / Post-graduate'].includes(formData.highest_education) && !formData.course_or_field) {
        errors.course_or_field = 'Course is required for tertiary education';
      }
      if (!formData.currently_enrolled && !formData.year_graduated) {
        errors.year_graduated = 'Year graduated is required';
      }
      // Language validation
      {
        const langs = formData.languages || [];
        const hasAnyProficiency = langs.some(l => l.read || l.write || l.speak || l.understand);
        if (!hasAnyProficiency) errors.languages = 'Check at least 1 language proficiency';
      }
      break;

    case 7:
      if (!formData.terms_accepted) errors.terms_accepted = 'Required';
      if (!formData.data_processing_consent) errors.data_processing_consent = 'Required';
      if (!formData.peso_verification_consent) errors.peso_verification_consent = 'Required';
      break;

    default:
      break;
  }

  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};
```

- [ ] **Step 5: Update getStepData function**

Replace getStepData with:

```jsx
const getStepData = () => {
  switch (currentStep) {
    case 2:
      return {
        surname: formData.surname, first_name: formData.first_name,
        middle_name: formData.middle_name, suffix: formData.suffix,
        full_name: [formData.first_name, formData.middle_name, formData.surname].filter(Boolean).join(' '),
        date_of_birth: formData.date_of_birth, sex: formData.sex, civil_status: formData.civil_status,
        religion: formData.religion, tin: formData.tin, height: formData.height,
        disability: formData.disability, disability_other: formData.disability_other,
      };
    case 3:
      return {
        house_street: formData.house_street,
        province: formData.province, city: formData.city, barangay: formData.barangay,
        mobile_number: formData.mobile_number,
      };
    case 4:
      return {
        employment_status: formData.employment_status,
        employment_type: formData.employment_type,
        self_employed_type: formData.self_employed_type, self_employed_other: formData.self_employed_other,
        unemployment_months: formData.unemployment_months ? parseInt(formData.unemployment_months) : null,
        unemployment_reason: formData.unemployment_reason, unemployment_reason_other: formData.unemployment_reason_other,
        terminated_abroad_country: formData.terminated_abroad_country,
        is_ofw: formData.is_ofw, ofw_country: formData.ofw_country,
        is_former_ofw: formData.is_former_ofw, former_ofw_country: formData.former_ofw_country,
        former_ofw_return_date: formData.former_ofw_return_date,
        is_4ps: formData.is_4ps, household_id: formData.household_id,
      };
    case 5:
      return {
        preferred_occupations: (formData.preferred_occupations || []).filter(o => o.trim()),
        work_type: formData.work_type,
        work_location_type: formData.work_location_type,
        preferred_local_locations: (formData.preferred_local_locations || []).filter(l => l.trim()),
        preferred_overseas_locations: (formData.preferred_overseas_locations || []).filter(l => l.trim()),
      };
    case 6:
      return {
        highest_education: formData.highest_education,
        currently_in_school: formData.currently_in_school,
        currently_enrolled: formData.currently_enrolled,
        senior_high_strand: formData.senior_high_strand,
        course_or_field: formData.course_or_field,
        year_graduated: formData.year_graduated,
        level_reached: formData.level_reached,
        year_last_attended: formData.year_last_attended,
        languages: formData.languages,
      };
    default:
      return {};
  }
};
```

- [ ] **Step 6: Update renderStep function**

Replace the renderStep switch with:

```jsx
const renderStep = () => {
  switch (currentStep) {
    case 1:
      return (
        <Step1AccountCredentials
          formData={formData}
          handleChange={handleChange}
          fieldErrors={fieldErrors}
          touchedFields={touchedFields}
          handleBlur={handleBlur}
          passwordStrength={passwordStrength}
        />
      );
    case 2:
      return <Step2PersonalInfo formData={formData} handleChange={handleChange} setFormData={setFormData} />;
    case 3:
      return <Step3AddressContact formData={formData} handleChange={handleChange} setFormData={setFormData} />;
    case 4:
      return <Step4EmploymentStatus formData={formData} handleChange={handleChange} setFormData={setFormData} />;
    case 5:
      return <Step5JobPreference formData={formData} handleChange={handleChange} setFormData={setFormData} />;
    case 6:
      return <Step6EducationLanguage formData={formData} handleChange={handleChange} setFormData={setFormData} />;
    case 7:
      return <Step7Consent formData={formData} setFormData={setFormData} />;
    default:
      return null;
  }
};
```

- [ ] **Step 7: Update navigation and total steps**

Update the total steps constant and navigation logic:
- Change `totalSteps` or any `6` references to `7`
- Replace `<StepIndicator currentStep={currentStep} totalSteps={6} />` with `<ProgressBar currentStep={currentStep} totalSteps={7} />`
- Update `nextStep` to save on steps 2-6 (was 2-5)
- Update `handleSubmit` to trigger on step 7 (was step 6)
- Update the submit button condition: `currentStep === 7`

- [ ] **Step 8: Update the main JSX layout**

Replace the main JSX return with the modern wizard layout:
- Remove the old header logo section
- Use ProgressBar instead of StepIndicator
- Replace the bottom navigation with a sticky floating bottom bar
- Use `max-w-lg mx-auto` for centering
- Add `pb-24` padding to form content for bottom bar space

The bottom bar should be:
```jsx
<div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-4 z-10">
  <div className="max-w-lg mx-auto flex gap-3">
    {currentStep > 1 && (
      <button type="button" onClick={prevStep}
        className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
    )}
    <button
      type="button"
      onClick={currentStep === 7 ? handleSubmit : nextStep}
      disabled={loading}
      className="flex-[2] py-3 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-1 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : currentStep === 7 ? (
        <><Check className="w-4 h-4" /> Submit Registration</>
      ) : (
        <>Continue <ChevronRight className="w-4 h-4" /></>
      )}
    </button>
  </div>
</div>
```

- [ ] **Step 9: Remove old helper functions**

Remove the following functions and state that are no longer needed (they were for old steps 3-5):
- `handleJobTypeToggle`
- `addSkill`, `removeSkill`, `skillInput` state
- `addWorkExperience`, `removeWorkExp`, `workExpInput` state
- `addCertification`, `removeCertification`, `certInput` state
- `handleResumeChange`, `handleCertificateChange`, `removeCertificateFile`
- `resumeFile`, `resumeUrl`, `certificateFiles` state
- `passwordStrength` can stay (used by Step1)

- [ ] **Step 10: Update progress restoration**

Update the useEffect that restores form data from `userData` to map the new field names. Ensure it pulls `surname`, `first_name`, `employment_status`, `preferred_occupations`, `languages`, etc. from `userData` into formData.

- [ ] **Step 11: Verify the form compiles and runs**

Run: `npm run dev`

Open the app, navigate to registration, select Jobseeker, and verify:
- Progress bar shows with correct labels
- All 7 steps render without errors
- Navigation between steps works
- Validation blocks advancement on required fields
- Console shows no errors

- [ ] **Step 12: Commit**

```bash
git add src/pages/JobseekerRegistration.jsx
git commit -m "feat: rewire JobseekerRegistration for 7-step PESO form"
```

---

## Task 11: Update AuthContext Field Mapping

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

- [ ] **Step 1: Read AuthContext.jsx**

Read the file to find the exact current `BASE_FIELDS` set and `splitFields` function.

- [ ] **Step 2: Update BASE_FIELDS**

The `BASE_FIELDS` set (around line 16-20) defines which fields go to the `users` table vs the `jobseeker_profiles` table. Keep it as-is — the new fields are all profile-specific and will go to `jobseeker_profiles` by default.

Verify that `splitFields()` correctly routes unknown fields to the profile table. If it uses a whitelist approach, add the new fields. If it uses the BASE_FIELDS exclusion approach (anything not in BASE_FIELDS goes to profile), no changes needed.

- [ ] **Step 3: Update completeRegistration to compose full_name**

In `completeRegistration`, ensure that `full_name` is composed from the new split name fields for backward compatibility:

```js
const fullName = [finalData.first_name, finalData.middle_name, finalData.surname].filter(Boolean).join(' ');
```

Add `full_name: fullName` to the data being saved.

- [ ] **Step 4: Verify and commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: update AuthContext for new PESO registration fields"
```

---

## Task 12: Delete Old Step Files

**Files:**
- Delete: `src/components/registration/Step3EmploymentPreferences.jsx`
- Delete: `src/components/registration/Step4Education.jsx`
- Delete: `src/components/registration/Step5SkillsExperience.jsx`
- Delete: `src/components/registration/Step6Consent.jsx`
- Delete: `src/components/forms/StepIndicator.jsx`

- [ ] **Step 1: Verify no imports reference the old files**

Search the codebase for any remaining imports of the old step files. If any exist outside JobseekerRegistration.jsx (which was already updated), fix them first.

Run: `grep -r "Step3EmploymentPreferences\|Step4Education\|Step5SkillsExperience\|Step6Consent\|StepIndicator" src/ --include="*.jsx" --include="*.js"`

Expected: No matches (all imports were updated in Task 10).

- [ ] **Step 2: Delete the files**

```bash
rm src/components/registration/Step3EmploymentPreferences.jsx
rm src/components/registration/Step4Education.jsx
rm src/components/registration/Step5SkillsExperience.jsx
rm src/components/registration/Step6Consent.jsx
rm src/components/forms/StepIndicator.jsx
```

- [ ] **Step 3: Verify app still runs**

Run: `npm run dev`

Confirm no import errors. Navigate through all 7 registration steps.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove old registration step files replaced by PESO redesign"
```

---

## Task 13: End-to-End Smoke Test

- [ ] **Step 1: Full registration walkthrough**

1. Open the app, go to Register, select Jobseeker
2. **Step 1:** Enter email, password, confirm → Continue
3. **Step 2:** Fill surname, first name, DOB, select Sex, select Civil Status → Continue
4. **Step 3:** Select Province → City → Barangay (verify cascading works), enter phone → Continue
5. **Step 4:** Select Unemployed → verify conditional reveal shows reasons → select a reason → Continue
6. **Step 5:** Enter 1 occupation, select Full-time, select Local, enter 1 city → Continue
7. **Step 6:** Select Tertiary → search and select a course → enter year → check English Read/Write → Continue
8. **Step 7:** Check all 3 consent boxes → verify summary shows correct data → Submit

Verify:
- Data saved correctly in Supabase `jobseeker_profiles` table
- No console errors
- Progress bar updates correctly at each step
- Back button works on all steps
- Validation errors display for missing required fields

- [ ] **Step 2: Test validation edge cases**

- Try advancing Step 2 without Sex selected → should block
- Try advancing Step 4 with Employed but no type → should block
- Try advancing Step 5 with no occupations → should block
- Try advancing Step 6 with Tertiary but no course → should block
- Try advancing Step 6 with no language proficiency → should block

- [ ] **Step 3: Test progress restoration**

1. Fill Steps 1-4, then close the browser tab
2. Re-open the registration page
3. Verify it resumes at Step 5 with Steps 1-4 data intact

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during registration smoke test"
```
