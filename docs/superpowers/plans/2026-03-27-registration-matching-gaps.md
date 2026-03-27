# Registration Matching Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix registration so freshly registered jobseekers have populated `skills[]`, `skill_aliases`, `experience_categories`, and a correct `highest_education` ordinal — giving them meaningful AI match scores from day one.

**Architecture:** Three parallel tracks: (1) remove low-value Step 2 fields, (2) add Vocational/Technical education level + scoring fix, (3) expand Step 7 into a full Skills & Qualifications step with tag input, TVET cert, and most recent work; wire all new data into the matching pipeline on final submit.

**Tech Stack:** React (Vite), Supabase (postgres), Vitest, Cohere API via `geminiService.js`

---

## File Map

| File | What changes |
|------|-------------|
| `sql/registration_redesign_migration.sql` | Add 2 columns: `tvet_certification_level`, `tvet_certification_title` |
| `src/components/forms/ProgressBar.jsx` | Step 7 label: "Other Skills" → "Skills & Qualifications" |
| `src/services/geminiService.js` | Add `'Vocational/Technical': 2` to `USER_EDUCATION_ORDINAL` |
| `src/services/geminiService.test.js` | Test `calculateDeterministicScore` with Vocational/Technical education |
| `src/components/registration/Step2PersonalInfo.jsx` | Remove Optional Details section (religion, TIN, height, disability) |
| `src/components/registration/Step6EducationLanguage.jsx` | Add Vocational/Technical level + conditional course/program text field |
| `src/components/registration/Step7OtherSkills.jsx` | Rebuild as "Skills & Qualifications": add Sections A (tag input), C (TVET), D (recent work); keep Section B (checkboxes) |
| `src/pages/JobseekerRegistration.jsx` | New `formData` fields, updated `getStepData()`, `validateStep()`, restoration block, TVET auto-populate `useEffect`, `handleSubmit` matching pipeline |
| `src/pages/JobseekerProfileEdit.jsx` | Add TVET fields to the edit form |

---

## Task 1: SQL Migration — Add TVET Columns

**Files:**
- Modify: `sql/registration_redesign_migration.sql`

- [ ] **Step 1: Add the two new columns at the bottom of the migration file**

Open `sql/registration_redesign_migration.sql` and append after the last `ALTER TABLE` statement:

```sql
-- ------------------------------------------------------------
-- TVET / TESDA Certification (Approach C — AI matching signals)
-- ------------------------------------------------------------
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS tvet_certification_level text DEFAULT '';
ALTER TABLE public.jobseeker_profiles ADD COLUMN IF NOT EXISTS tvet_certification_title text DEFAULT '';
```

- [ ] **Step 2: Run the migration in Supabase**

In the Supabase dashboard SQL editor (or via CLI), run the two `ALTER TABLE` statements above. Verify with:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jobseeker_profiles'
  AND column_name IN ('tvet_certification_level', 'tvet_certification_title');
```

Expected: 2 rows returned, both `text`, both default `''`.

- [ ] **Step 3: Commit**

```bash
git add sql/registration_redesign_migration.sql
git commit -m "feat: add tvet_certification_level and tvet_certification_title columns"
```

---

## Task 2: ProgressBar Label + geminiService Education Ordinal

**Files:**
- Modify: `src/components/forms/ProgressBar.jsx`
- Modify: `src/services/geminiService.js`
- Modify: `src/services/geminiService.test.js`

### 2a — ProgressBar

- [ ] **Step 1: Update Step 7 label**

In `src/components/forms/ProgressBar.jsx`, change the `STEP_LABELS` array at line 3:

```javascript
const STEP_LABELS = [
  'Account',
  'Personal Info',
  'Address & Contact',
  'Employment',
  'Job Preference',
  'Education & Language',
  'Skills & Qualifications',
  'Consent'
];
```

### 2b — geminiService education ordinal

- [ ] **Step 2: Write the failing test**

In `src/services/geminiService.test.js`, add a new `describe` block after the existing ones:

```javascript
describe('calculateDeterministicScore', () => {
  let calculateDeterministicScore

  beforeAll(async () => {
    vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    vi.resetModules()
    const mod = await import('./geminiService')
    calculateDeterministicScore = mod.calculateDeterministicScore
  })

  it('scores Vocational/Technical education at ordinal 2 (matches vocational job requirement)', () => {
    const job = {
      requirements: [],
      education_level: 'vocational',
      category: '',
    }
    const user = {
      skills: [],
      skill_aliases: {},
      experience_categories: [],
      highest_education: 'Vocational/Technical',
      languages: [],
    }
    const { educationScore } = calculateDeterministicScore(job, user)
    // user ordinal 2 >= job ordinal 2 → educationScore should be 100
    expect(educationScore).toBe(100)
  })

  it('gives partial credit when Vocational/Technical user applies for college-level job', () => {
    const job = {
      requirements: [],
      education_level: 'college',
      category: '',
    }
    const user = {
      skills: [],
      skill_aliases: {},
      experience_categories: [],
      highest_education: 'Vocational/Technical',
      languages: [],
    }
    const { educationScore } = calculateDeterministicScore(job, user)
    // user ordinal 2, job ordinal 3 → diff 1 → educationScore should be 60
    expect(educationScore).toBe(60)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx vitest run src/services/geminiService.test.js
```

Expected: the two new tests fail because `calculateDeterministicScore` doesn't return `educationScore` directly, or because `'Vocational/Technical'` maps to ordinal 0 (not in the map yet).

Note: `calculateDeterministicScore` returns `{ matchScore, matchLevel, matchingSkills, missingSkills }` — it does NOT expose `educationScore` directly. Update the test to check the final `matchScore` instead, since education is 20% weight:

```javascript
// Vocational/Technical + vocational job: educationScore=100, skillScore=100, experienceScore=100 → matchScore=100
expect(matchScore).toBe(100)

// Vocational/Technical + college job: educationScore=60, skillScore=100, experienceScore=100 → matchScore=92
expect(matchScore).toBe(92)
```

Updated test:

```javascript
describe('calculateDeterministicScore', () => {
  let calculateDeterministicScore

  beforeAll(async () => {
    vi.stubEnv('VITE_COHERE_API_KEY', 'test-api-key')
    vi.resetModules()
    const mod = await import('./geminiService')
    calculateDeterministicScore = mod.calculateDeterministicScore
  })

  it('scores Vocational/Technical education at ordinal 2 (matches vocational job requirement)', () => {
    const job = { requirements: [], education_level: 'vocational', category: '' }
    const user = { skills: [], skill_aliases: {}, experience_categories: [], highest_education: 'Vocational/Technical', languages: [] }
    const { matchScore } = calculateDeterministicScore(job, user)
    // skillScore=100, experienceScore=100, educationScore=100 → 100*0.5 + 100*0.3 + 100*0.2 = 100
    expect(matchScore).toBe(100)
  })

  it('gives partial credit when Vocational/Technical user applies for college-level job', () => {
    const job = { requirements: [], education_level: 'college', category: '' }
    const user = { skills: [], skill_aliases: {}, experience_categories: [], highest_education: 'Vocational/Technical', languages: [] }
    const { matchScore } = calculateDeterministicScore(job, user)
    // skillScore=100, experienceScore=100, educationScore=60 → 100*0.5 + 100*0.3 + 60*0.2 = 50+30+12 = 92
    expect(matchScore).toBe(92)
  })
})
```

- [ ] **Step 4: Run tests — should still fail (Vocational/Technical not in ordinal map yet)**

```bash
npx vitest run src/services/geminiService.test.js
```

Expected: both new tests fail — `matchScore` for vocational job is 88 instead of 100 (education falls back to ordinal 0).

- [ ] **Step 5: Add 'Vocational/Technical' to USER_EDUCATION_ORDINAL in geminiService.js**

In `src/services/geminiService.js`, find `USER_EDUCATION_ORDINAL` (around line 180) and add the new entry:

```javascript
const USER_EDUCATION_ORDINAL = {
    'Elementary Graduate': 0,
    'High School Graduate': 1,
    'Senior High School Graduate': 1.5,
    'Vocational/Technical': 2,
    'Vocational\Technical Graduate': 2,
    'College Undergraduate': 2.5,
    'College Graduate': 3,
    'Masteral Degree': 4,
    'Doctoral Degree': 5,
}
```

(Keep the existing `'Vocational\Technical Graduate': 2` entry — it's a legacy key from a previous typo. Add `'Vocational/Technical': 2` as the new canonical key matching the dropdown value.)

- [ ] **Step 6: Run tests — should pass**

```bash
npx vitest run src/services/geminiService.test.js
```

Expected: all tests pass including the two new ones.

- [ ] **Step 7: Commit**

```bash
git add src/components/forms/ProgressBar.jsx src/services/geminiService.js src/services/geminiService.test.js
git commit -m "feat: add Vocational/Technical education ordinal + update step 7 progress label"
```

---

## Task 3: Step 2 — Remove Optional Details Section

**Files:**
- Modify: `src/components/registration/Step2PersonalInfo.jsx`

- [ ] **Step 1: Remove the Optional Details divider and all four optional fields**

In `src/components/registration/Step2PersonalInfo.jsx`:

1. Remove the `DISABILITY_OPTIONS` constant at line 6 (no longer needed in this file).
2. Remove the `handleDisabilityToggle` function (lines 14–27).
3. Remove the `hasNoDisability` variable (line 29).
4. Delete from line 164 (`{/* Optional Details Divider */}`) to line 270 (end of the disability block including the closing `</div>`).

The file should end right after the Civil Status `</div>` block. Final file:

```jsx
import React from 'react';
import { Calendar } from 'lucide-react';

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent'];
const SUFFIX_OPTIONS = ['', 'Jr.', 'Sr.', 'III', 'IV', 'V'];

export default function Step2PersonalInfo({ formData, handleChange, setFormData }) {

  const handleSexSelect = (value) => {
    setFormData(prev => ({ ...prev, sex: value }));
  };

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
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Start the dev server (`npm run dev`) and navigate to `/register`. Step 2 should show only 7 fields: Surname/Suffix row, First Name/Middle Name row, Date of Birth, Sex, Civil Status. No Optional Details section.

- [ ] **Step 3: Commit**

```bash
git add src/components/registration/Step2PersonalInfo.jsx
git commit -m "feat: remove optional details from Step 2 (deferred to profile edit)"
```

---

## Task 4: Step 6 — Add Vocational/Technical Education Level

**Files:**
- Modify: `src/components/registration/Step6EducationLanguage.jsx`

- [ ] **Step 1: Add Vocational/Technical to the EDUCATION_LEVELS array**

In `src/components/registration/Step6EducationLanguage.jsx`, update `EDUCATION_LEVELS` (lines 5–11):

```javascript
const EDUCATION_LEVELS = [
  { value: 'Elementary', label: 'Elementary (Grade 1–6)' },
  { value: 'High School', label: 'High School (Non K-12)' },
  { value: 'Senior High School (K-12)', label: 'Senior High School (K-12)' },
  { value: 'Vocational/Technical', label: 'Vocational/Technical (TESDA)' },
  { value: 'College', label: 'College / University' },
  { value: 'Graduate Studies', label: 'Graduate Studies / Post-Graduate' },
];
```

- [ ] **Step 2: Add the isVocational derived variable and conditional course field**

In the component body, right after the existing `isK12` and `showCourseField` lines (around line 52):

```javascript
const showCourseField = ['College', 'Graduate Studies'].includes(formData.highest_education);
const isVocational = formData.highest_education === 'Vocational/Technical';
const isK12 = formData.highest_education === 'Senior High School (K-12)';
```

- [ ] **Step 3: Add the Vocational course/program field to the JSX**

In the JSX, after the `{isK12 && ...}` block and before the `{showCourseField && ...}` block, add:

```jsx
{isVocational && (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      Course / Program <span className="text-red-500">*</span>
    </label>
    <input
      type="text"
      name="course_or_field"
      value={formData.course_or_field || ''}
      onChange={handleChange}
      placeholder="e.g. Automotive Servicing, Electrical Installation and Maintenance"
      className="input-field w-full"
    />
  </div>
)}
```

- [ ] **Step 4: Also clear `course_or_field` when education level changes away from vocational**

Find the `handleChange` usage for `highest_education`. Since `handleChange` is passed in from the parent, add a local `handleEducationChange` handler in Step6:

```javascript
const handleEducationChange = (e) => {
  handleChange(e)
  // Clear course field when switching education levels
  setFormData(prev => ({ ...prev, course_or_field: '' }))
}
```

Then in the education dropdown JSX, use `handleEducationChange` instead of `handleChange`:

```jsx
<select
  name="highest_education"
  value={formData.highest_education || ''}
  onChange={handleEducationChange}
  className="input-field w-full"
>
```

- [ ] **Step 5: Verify in browser**

Navigate to Step 6. Selecting "Vocational/Technical (TESDA)" should show a plain text input for Course/Program. Selecting "College" should show the existing searchable course dropdown. Switching between levels should clear the course field.

- [ ] **Step 6: Commit**

```bash
git add src/components/registration/Step6EducationLanguage.jsx
git commit -m "feat: add Vocational/Technical education level to Step 6"
```

---

## Task 5: Step 7 — Rebuild as Skills & Qualifications

**Files:**
- Modify: `src/components/registration/Step7OtherSkills.jsx`

This is a full rewrite of the component. It keeps the existing other_skills checkbox logic (Section B) and adds three new sections.

- [ ] **Step 1: Replace the entire file content**

```jsx
import React from 'react';
import { X } from 'lucide-react';

const OTHER_SKILLS = [
  'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
  'Domestic Chores', 'Driver', 'Electrician', 'Embroidery',
  'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs',
  'Photography', 'Plumbing', 'Sewing Dresses', 'Stenography',
  'Tailoring', 'Others'
];

const TVET_LEVELS = ['NC I', 'NC II', 'NC III', 'NC IV'];

export default function Step7OtherSkills({ formData, setFormData, handleChange }) {
  const skills = formData.skills || [];
  const selectedOtherSkills = formData.other_skills || [];

  // Combined skill count: tag input + other_skills checkboxes (excluding "Others")
  const combinedSkillCount = skills.length + selectedOtherSkills.filter(s => s !== 'Others').length;

  // --- Section A: Skills tag input ---
  const handleSkillKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const value = e.target.value.trim();
    if (!value) return;
    if (skills.some(s => s.toLowerCase() === value.toLowerCase())) {
      e.target.value = '';
      return;
    }
    setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), value] }));
    e.target.value = '';
  };

  const removeSkill = (index) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  };

  // --- Section B: Other skills checkboxes ---
  const toggleOtherSkill = (skill) => {
    setFormData(prev => {
      const current = prev.other_skills || [];
      const updated = current.includes(skill)
        ? current.filter(s => s !== skill)
        : [...current, skill];
      const newData = { ...prev, other_skills: updated };
      if (!updated.includes('Others')) newData.other_skills_other = '';
      return newData;
    });
  };

  // --- Section C: TVET level change ---
  const handleTvetLevelChange = (e) => {
    const level = e.target.value;
    setFormData(prev => ({
      ...prev,
      tvet_certification_level: level,
      // Clear title when level is set back to None
      tvet_certification_title: level === '' ? '' : prev.tvet_certification_title,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Skills & Qualifications</h2>
        <p className="text-sm text-gray-400 mt-1">
          Tell us what you can do. Need at least 3 skills combined.
        </p>
      </div>

      {/* Section A: Skills tag input */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Your Skills
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Add skills <span className="text-gray-400 font-normal">(type and press Enter)</span>
        </label>
        <input
          type="text"
          onKeyDown={handleSkillKeyDown}
          placeholder="e.g. Welding, Customer Service, Forklift Operation"
          className="input-field w-full"
        />
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-full"
              >
                {skill}
                <button type="button" onClick={() => removeSkill(i)} className="ml-1 text-indigo-400 hover:text-indigo-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Section B: Other skills checkboxes (NSRP Section VIII) */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Other Skills (No Certificate)
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <div className="flex flex-wrap gap-2">
          {OTHER_SKILLS.map(skill => {
            const isSelected = selectedOtherSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleOtherSkill(skill)}
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
                {skill}
              </button>
            );
          })}
        </div>
        {selectedOtherSkills.includes('Others') && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Please specify <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="other_skills_other"
              value={formData.other_skills_other || ''}
              onChange={handleChange}
              placeholder="e.g. Baking, Sign Painting"
              className="input-field w-full"
            />
          </div>
        )}
      </div>

      {/* Combined count hint */}
      <p className={`text-xs ${combinedSkillCount >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
        {combinedSkillCount} / 3 minimum skills added
        {combinedSkillCount >= 3 && ' ✓'}
      </p>

      {/* Section C: TVET/TESDA Certification */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            TVET / TESDA Certification
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          If you have a TESDA National Certificate, select the level below.
        </p>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Highest TVET Certification <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            name="tvet_certification_level"
            value={formData.tvet_certification_level || ''}
            onChange={handleTvetLevelChange}
            className="input-field w-full"
          >
            <option value="">None</option>
            {TVET_LEVELS.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        {formData.tvet_certification_level && (
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border-l-4 border-purple-400">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Certification Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="tvet_certification_title"
              value={formData.tvet_certification_title || ''}
              onChange={handleChange}
              placeholder="e.g. Shielded Metal Arc Welding NC II"
              className="input-field w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the full title as it appears on your certificate.
            </p>
          </div>
        )}
      </div>

      {/* Section D: Most Recent Work */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
            Most Recent Work
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Helps us match you to relevant jobs. You can add full work history later in your profile.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Job Title <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="recent_job_title"
              value={formData.recent_job_title || ''}
              onChange={handleChange}
              placeholder="e.g. Warehouse Supervisor"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Company <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="recent_job_company"
              value={formData.recent_job_company || ''}
              onChange={handleChange}
              placeholder="e.g. SM Retail Inc."
              className="input-field w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to Step 7. Should show 4 sections: tag input, checkbox pills, TVET dropdown, recent work fields. Adding tags and checking boxes should update the combined count at the bottom.

- [ ] **Step 3: Commit**

```bash
git add src/components/registration/Step7OtherSkills.jsx
git commit -m "feat: rebuild Step 7 as Skills & Qualifications with tag input, TVET, recent work"
```

---

## Task 6: JobseekerRegistration — Wire Up New Fields

**Files:**
- Modify: `src/pages/JobseekerRegistration.jsx`

This task has four sub-tasks: new formData state, updated getStepData, updated validateStep, and the TVET auto-populate effect.

### 6a — formData initial state

- [ ] **Step 1: Add new fields to formData initial state**

In `JobseekerRegistration.jsx`, in the `useState` for `formData` (starting line 27), add new fields under `// Step 7`:

```javascript
// Step 7: Skills & Qualifications
skills: [],
other_skills: [], other_skills_other: '',
tvet_certification_level: '', tvet_certification_title: '',
recent_job_title: '', recent_job_company: '',
```

(Replace the existing `// Step 7: Other Skills` comment and `other_skills: [], other_skills_other: '',` line with the block above.)

### 6b — Restoration useEffect

- [ ] **Step 2: Restore new fields from userData in the useEffect**

In the restoration `useEffect` (around line 83), after the `// Consent` restore block, add the new fields:

```javascript
// Skills (new)
skills: userData.skills || [],
other_skills: userData.other_skills || [],
other_skills_other: userData.other_skills_other || '',
tvet_certification_level: userData.tvet_certification_level || '',
tvet_certification_title: userData.tvet_certification_title || '',
recent_job_title: '',  // not persisted mid-registration, start fresh
recent_job_company: '', // not persisted mid-registration, start fresh
```

### 6c — TVET auto-populate effect

- [ ] **Step 3: Add useEffect for TVET auto-populate (Fix 2)**

After the existing `useEffect` blocks, add a new one:

```javascript
// Auto-populate TVET title from Step 6 course when education is Vocational/Technical
useEffect(() => {
    if (
        formData.highest_education === 'Vocational/Technical' &&
        formData.course_or_field &&
        !formData.tvet_certification_title
    ) {
        setFormData(prev => ({ ...prev, tvet_certification_title: formData.course_or_field }))
    }
}, [formData.highest_education, formData.course_or_field])
```

### 6d — validateStep update

- [ ] **Step 4: Update validateStep case 6 to include Vocational/Technical in course check**

Find `case 6` in `validateStep` (around line 254). Update the course validation line:

```javascript
case 6:
    if (!formData.highest_education) { setError('Highest educational attainment is required'); return false }
    if (['College', 'Graduate Studies', 'Vocational/Technical'].includes(formData.highest_education) && !formData.course_or_field) {
        setError('Course/Program is required'); return false
    }
    if (!formData.currently_enrolled && !formData.year_graduated) {
        setError('Year graduated is required'); return false
    }
    {
        const langs = formData.languages || []
        const hasAnyProficiency = langs.some(l => l.read || l.write || l.speak || l.understand)
        if (!hasAnyProficiency) { setError('Check at least 1 language with 1 proficiency'); return false }
    }
    break
```

- [ ] **Step 5: Update validateStep case 7 for combined skill count**

Find `case 7` in `validateStep` (around line 269). Replace:

```javascript
case 7: {
    const tagCount = (formData.skills || []).length
    const otherCount = (formData.other_skills || []).filter(s => s !== 'Others').length
    const combinedCount = tagCount + otherCount
    if (combinedCount < 3) {
        setError('Add at least 3 skills combined (tag input + checkboxes)'); return false
    }
    if (formData.other_skills.includes('Others') && !formData.other_skills_other?.trim()) {
        setError('Please specify your other skill'); return false
    }
    if (formData.tvet_certification_level && !formData.tvet_certification_title?.trim()) {
        setError('Please enter your TVET certification title'); return false
    }
    break
}
```

### 6e — getStepData update

- [ ] **Step 6: Update getStepData case 7**

Find `case 7` in `getStepData` (around line 340). Replace:

```javascript
case 7:
    return {
        skills: formData.skills || [],
        other_skills: formData.other_skills,
        other_skills_other: formData.other_skills_other,
        tvet_certification_level: formData.tvet_certification_level,
        tvet_certification_title: formData.tvet_certification_title,
        recent_job_title: formData.recent_job_title,
        recent_job_company: formData.recent_job_company,
    }
```

- [ ] **Step 7: Verify navigation through steps**

Run dev server. Go through Steps 6 and 7:
- Select Vocational/Technical in Step 6, type a course → go to Step 7, TVET title should be auto-filled
- Add 3 tag skills → combined count shows "3 / 3 minimum skills added ✓"
- Try to advance with < 3 combined → should see error message

- [ ] **Step 8: Commit**

```bash
git add src/pages/JobseekerRegistration.jsx
git commit -m "feat: wire new Step 7 fields into registration formData, validation, and restore"
```

---

## Task 7: handleSubmit — Matching Pipeline Integration

**Files:**
- Modify: `src/pages/JobseekerRegistration.jsx`

- [ ] **Step 1: Add required imports at the top of the file**

In `JobseekerRegistration.jsx`, add two imports:

```javascript
import { supabase } from '../config/supabase'
import { expandProfileAliases, deduplicateSkills } from '../services/geminiService'
```

- [ ] **Step 2: Replace the handleSubmit function**

Find `handleSubmit` (around line 397) and replace the entire function:

```javascript
const handleSubmit = async () => {
    if (!validateStep()) return

    setLoading(true)
    setError('')

    try {
        const fullName = [formData.first_name, formData.middle_name, formData.surname].filter(Boolean).join(' ')

        // 1. Merge skills: tag input + other_skills checkbox labels (exclude 'Others')
        const tagSkills = formData.skills || []
        const otherSkillLabels = (formData.other_skills || []).filter(s => s !== 'Others')
        const mergedSkills = deduplicateSkills([...tagSkills, ...otherSkillLabels])

        // 2. Seed work_experiences from most recent job (if filled)
        const workExperiences = []
        if (formData.recent_job_title?.trim()) {
            workExperiences.push({
                position: formData.recent_job_title.trim(),
                company: formData.recent_job_company?.trim() || '',
                duration: '',
            })
        }

        const finalData = {
            terms_accepted: formData.terms_accepted,
            data_processing_consent: formData.data_processing_consent,
            peso_verification_consent: formData.peso_verification_consent,
            full_name: fullName,
            name: fullName,
            jobseeker_status: 'pending',
            rejection_reason: '',
            // Matching signals
            skills: mergedSkills,
            work_experiences: workExperiences,
            tvet_certification_level: formData.tvet_certification_level,
            tvet_certification_title: formData.tvet_certification_title,
        }

        await completeRegistration(finalData)

        // 3. Non-blocking: expand skill aliases + experience categories
        try {
            const skillsForExpansion = [...mergedSkills]
            if (formData.tvet_certification_title?.trim()) {
                skillsForExpansion.push(formData.tvet_certification_title.trim())
            }
            const aliasData = await expandProfileAliases(skillsForExpansion, workExperiences)
            if (aliasData.skillAliases && Object.keys(aliasData.skillAliases).length > 0) {
                await supabase
                    .from('jobseeker_profiles')
                    .update({
                        skill_aliases: aliasData.skillAliases,
                        experience_categories: aliasData.experienceCategories,
                    })
                    .eq('id', currentUser.uid)
            }
        } catch (aliasErr) {
            console.warn('Alias expansion failed (non-blocking):', aliasErr.message)
        }

        try {
            await sendJobseekerRegistrationEmail({
                email: formData.email || userData?.email,
                full_name: fullName
            })
        } catch (emailErr) {
            console.error('Failed to send registration email:', emailErr)
        }

        if (!currentUser?.email_confirmed_at && !currentUser?.confirmed_at) {
            navigate('/verify-email', { state: { email: formData.email || userData?.email } })
        } else {
            navigate('/dashboard')
        }
    } catch (err) {
        console.error('Registration error:', err)
        setError(err.message || 'Failed to complete registration. Please try again.')
    } finally {
        setLoading(false)
    }
}
```

- [ ] **Step 3: Verify matching pipeline end-to-end**

Complete a test registration with:
- Step 7: add 2 tag skills ("Welding", "Customer Service"), check 1 checkbox ("Driver")
- Step 7 Section D: fill in "Factory Worker" + "Acme Corp"

After submit and navigating to `/dashboard`, open browser dev tools → Network tab → verify no error responses from Supabase. In Supabase dashboard, check `jobseeker_profiles` for the test user: `skills` should be `["Welding", "Customer Service", "Driver"]`, `work_experiences` should have one entry, `skill_aliases` should be non-null.

- [ ] **Step 4: Commit**

```bash
git add src/pages/JobseekerRegistration.jsx
git commit -m "feat: merge skills/other_skills and run alias expansion on registration submit"
```

---

## Task 8: ProfileEdit — Add TVET Fields

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx`

- [ ] **Step 1: Add TVET fields to formData initial state**

In `JobseekerProfileEdit.jsx`, in the `useState` for `formData` (around line 64), add in the "Other Skills" section:

```javascript
// TVET Certification
tvet_certification_level: '',
tvet_certification_title: '',
```

- [ ] **Step 2: Restore TVET fields from userData**

Find the restoration `useEffect` (the one using `restoredRef`). In the block where fields are restored from `userData`, add:

```javascript
tvet_certification_level: userData.tvet_certification_level || '',
tvet_certification_title: userData.tvet_certification_title || '',
```

- [ ] **Step 3: Add TVET fields to the save payload**

Find where the profile save constructs `profileFields` (or the upsert object). Add the two new fields:

```javascript
tvet_certification_level: formData.tvet_certification_level,
tvet_certification_title: formData.tvet_certification_title,
```

- [ ] **Step 4: Add TVET UI in the edit form**

Find the "Other Skills" section in the JSX (search for `other_skills`). Add a TVET section after it. The exact location will be visible by searching for `other_skills` in the JSX. Add the following block after the other_skills UI section:

```jsx
{/* TVET / TESDA Certification */}
<div>
  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
    <Award className="w-4 h-4 text-indigo-500" />
    TVET / TESDA Certification
  </h3>
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        Highest TVET Certification
      </label>
      <select
        name="tvet_certification_level"
        value={formData.tvet_certification_level || ''}
        onChange={handleChange}
        className="input-field w-full"
      >
        <option value="">None</option>
        {['NC I', 'NC II', 'NC III', 'NC IV'].map(level => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    </div>
    {formData.tvet_certification_level && (
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Certification Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="tvet_certification_title"
          value={formData.tvet_certification_title || ''}
          onChange={handleChange}
          placeholder="e.g. Shielded Metal Arc Welding NC II"
          className="input-field w-full"
        />
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 5: Verify in browser**

Navigate to `/profile/edit` as a jobseeker. The TVET section should appear in the edit form. Setting a TVET level should reveal the title field. Saving should persist both fields.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: add TVET certification fields to profile edit"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|-----------------|-----------------|
| Remove religion/TIN/height/disability from Step 2 | Task 3 |
| Add Vocational/Technical education level | Tasks 2, 4 |
| USER_EDUCATION_ORDINAL update + test | Task 2 |
| Step 7 tag input (Section A) | Task 5 |
| Step 7 combined validation >= 3 | Task 6d |
| Step 7 TVET Section C | Tasks 5, 6 |
| TVET auto-populate from Step 6 course | Task 6c |
| Step 7 recent work Section D | Task 5 |
| other_skills merged into skills at completion | Task 7 |
| work_experiences seeded from recent work | Task 7 |
| expandProfileAliases called at registration | Task 7 |
| TVET title appended to skills for expansion | Task 7 |
| skill_aliases + experience_categories stored | Task 7 |
| ProfileEdit TVET fields | Task 8 |
| SQL migration 2 new columns | Task 1 |
| ProgressBar label update | Task 2 |

All spec requirements are covered.

**Type consistency check:**
- `formData.skills` — `string[]` throughout (tag input, deduplicateSkills input/output, skills stored in DB)
- `formData.other_skills` — `string[]` throughout
- `work_experiences` — `Array<{position, company, duration}>` — matches `expandProfileAliases` input signature
- `expandProfileAliases` returns `{ skillAliases: object, experienceCategories: string[] }` — stored as `skill_aliases` / `experience_categories` — consistent with ProfileEdit pattern
- `currentUser.uid` — used throughout the codebase for Supabase `.eq('id', currentUser.uid)`
- `deduplicateSkills` — takes `string[]`, returns `string[]` — consistent with usage
