# Profile Edit ↔ Registration Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Edit Profile page consistent with the Registration form — same fields, labels, dropdowns, validations, conditional logic — and ensure all registration data is correctly pre-filled and saved.

**Architecture:** The Edit Profile page (`JobseekerProfileEdit.jsx`) will be rewritten to match the 6-section structure of the registration flow (Steps 2–6), reusing the same constants, field names, and input types. The form state and save logic will be updated to use the actual DB column names (`sex` not `gender`, `preferred_local_locations` not `preferred_job_location`, etc.).

**Tech Stack:** React, Supabase, existing form components (`FloatingLabelInput`, `SearchableSelect`, `Select`), Lucide icons, Tailwind CSS.

---

## Critical Mismatches Identified

| # | Field | Registration (DB) | Edit Profile (Current) | Fix |
|---|-------|-------------------|----------------------|-----|
| 1 | Name | `surname`, `first_name`, `middle_name`, `suffix` (split) | `full_name` (single field) | Split into 4 fields |
| 2 | Sex/Gender | `sex` (Male/Female) | `gender` (Male/Female/Prefer not to say) | Use `sex` with same options |
| 3 | Civil Status | Includes "Solo Parent" | Missing "Solo Parent" | Add option |
| 4 | Religion | Full dropdown + "Others" specify | Not shown | Add section |
| 5 | Height | `height_cm` numeric | Not shown | Add field |
| 6 | Disability | `disability_type` multi-checkbox + specify | Only `is_pwd` + `pwd_id_number` | Add full disability fields |
| 7 | Street Address | `street_address` text | Not shown | Add field |
| 8 | Address dropdowns | Searchable province→city→barangay cascade | Plain text inputs | Use SearchableSelect with PSGC |
| 9 | Employment Status | Full section: status + conditional sub-fields | Not shown | Add full section |
| 10 | Education levels | 6 values: `'Elementary (Grades 1-6)'`, etc. | 8 different values: `'Elementary Graduate'`, etc. | Use registration values |
| 11 | Education extras | `currently_in_school`, `did_not_graduate`, `education_level_reached`, `year_last_attended`, `vocational_training` | Not shown | Add fields |
| 12 | Predefined Skills | `predefined_skills` multi-checkbox (17 options) | Not shown | Add section |
| 13 | Professional Licenses | Array of `{name, number, valid_until}` | Not shown | Add section |
| 14 | Civil Service | `civil_service_eligibility` + `civil_service_date` | Not shown | Add fields |
| 15 | Work Experience | `{company, address, position, months, employment_status}` | `{company, position, duration}` (simplified) | Match registration shape |
| 16 | Job Locations | `preferred_local_locations` (array of 3) + `preferred_overseas_locations` (array of 3) | `preferred_job_location` (single text) | Use arrays |
| 17 | Preferred Occupations | `preferred_occupations` (array of 3) | Not shown | Add section |
| 18 | Language proficiency | 5 levels: Beginner/Conversational/Proficient/Fluent/Native | 3 levels: Basic/Conversational/Fluent | Use 5 levels |
| 19 | Salary | Same | Same | OK |
| 20 | Relocate | Same | Same | OK |

## File Structure

**Modify:**
- `src/pages/JobseekerProfileEdit.jsx` — Complete rewrite of form state, pre-fill, sections, and save logic
  
**No new files needed** — we reuse existing form components and constants from registration steps.

---

### Task 1: Update Form State & Pre-fill to Match All Registration Fields

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx:21-57` (formData state)
- Modify: `src/pages/JobseekerProfileEdit.jsx:131-167` (pre-fill useEffect)

This task replaces the form state shape and pre-fill logic to use every field from registration (Steps 2–6), using the correct DB column names.

- [ ] **Step 1: Replace `formData` initial state**

Replace lines 21–57 with:

```jsx
const [formData, setFormData] = useState({
    // Step 2: Personal Information
    surname: '',
    first_name: '',
    middle_name: '',
    suffix: '',
    date_of_birth: '',
    sex: '',
    civil_status: '',
    religion: '',
    religion_specify: '',
    height_cm: '',
    is_pwd: false,
    disability_type: [],
    disability_type_specify: '',
    pwd_id_number: '',

    // Step 3: Contact & Employment
    street_address: '',
    barangay: '',
    city: '',
    province: '',
    mobile_number: '',
    employment_status: '',
    employment_type: '',
    self_employment_type: '',
    self_employment_specify: '',
    unemployment_reason: '',
    unemployment_reason_specify: '',
    months_looking_for_work: '',

    // Step 4: Education & Training
    currently_in_school: false,
    highest_education: '',
    school_name: '',
    course_or_field: '',
    year_graduated: '',
    did_not_graduate: false,
    education_level_reached: '',
    year_last_attended: '',
    vocational_training: [],

    // Step 5: Skills, Licenses & Experience
    predefined_skills: [],
    skills: [],
    professional_licenses: [],
    civil_service_eligibility: '',
    civil_service_date: '',
    work_experiences: [],
    portfolio_url: '',
    certificate_urls: [],

    // Step 6: Job Preferences & Language
    preferred_job_type: [],
    preferred_occupations: ['', '', ''],
    preferred_local_locations: ['', '', ''],
    preferred_overseas_locations: ['', '', ''],
    expected_salary_min: '',
    expected_salary_max: '',
    willing_to_relocate: 'no',
    languages: [],

    // Profile-only
    profile_photo: '',
    certifications: [],
})
```

- [ ] **Step 2: Replace pre-fill useEffect**

Replace the `useEffect` at lines 131–167. Parse "Others:" prefixed fields the same way registration does:

```jsx
useEffect(() => {
    if (restoredRef.current) return
    if (userData) {
        restoredRef.current = true

        // Parse "Others:" prefix for self_employment_type and unemployment_reason
        const parseSelfEmployment = parseOtherSelection(userData.self_employment_type || '')
        const parseUnemployment = parseOtherSelection(userData.unemployment_reason || '')

        const initial = {
            // Step 2
            surname: userData.surname || '',
            first_name: userData.first_name || '',
            middle_name: userData.middle_name || '',
            suffix: userData.suffix || '',
            date_of_birth: userData.date_of_birth || '',
            sex: userData.sex || '',
            civil_status: userData.civil_status || '',
            religion: userData.religion?.startsWith('Others:') ? 'Others' : (userData.religion || ''),
            religion_specify: userData.religion?.startsWith('Others:') ? userData.religion.slice(8).trim() : '',
            height_cm: userData.height_cm ?? '',
            is_pwd: userData.is_pwd || false,
            disability_type: userData.disability_type || [],
            disability_type_specify: userData.disability_type_specify || '',
            pwd_id_number: userData.pwd_id_number || '',

            // Step 3
            street_address: userData.street_address || '',
            barangay: userData.barangay || '',
            city: userData.city || '',
            province: userData.province || '',
            mobile_number: userData.mobile_number || '',
            employment_status: userData.employment_status || '',
            employment_type: userData.employment_type || '',
            self_employment_type: parseSelfEmployment.selectedValue,
            self_employment_specify: parseSelfEmployment.otherValue,
            unemployment_reason: parseUnemployment.selectedValue,
            unemployment_reason_specify: parseUnemployment.otherValue,
            months_looking_for_work: userData.months_looking_for_work || '',

            // Step 4
            currently_in_school: userData.currently_in_school || false,
            highest_education: userData.highest_education || '',
            school_name: userData.school_name || '',
            course_or_field: userData.course_or_field || '',
            year_graduated: userData.year_graduated || '',
            did_not_graduate: userData.did_not_graduate || false,
            education_level_reached: userData.education_level_reached || '',
            year_last_attended: userData.year_last_attended || '',
            vocational_training: userData.vocational_training || [],

            // Step 5
            predefined_skills: userData.predefined_skills || [],
            skills: userData.skills || [],
            professional_licenses: userData.professional_licenses || [],
            civil_service_eligibility: userData.civil_service_eligibility || '',
            civil_service_date: userData.civil_service_date || '',
            work_experiences: userData.work_experiences || [],
            portfolio_url: userData.portfolio_url || '',
            certificate_urls: userData.certificate_urls || [],

            // Step 6
            preferred_job_type: userData.preferred_job_type || [],
            preferred_occupations: userData.preferred_occupations?.length ? [...userData.preferred_occupations, ...Array(3 - userData.preferred_occupations.length).fill('')].slice(0, 3) : ['', '', ''],
            preferred_local_locations: userData.preferred_local_locations?.length ? [...userData.preferred_local_locations, ...Array(3 - userData.preferred_local_locations.length).fill('')].slice(0, 3) : ['', '', ''],
            preferred_overseas_locations: userData.preferred_overseas_locations?.length ? [...userData.preferred_overseas_locations, ...Array(3 - userData.preferred_overseas_locations.length).fill('')].slice(0, 3) : ['', '', ''],
            expected_salary_min: userData.expected_salary_min || '',
            expected_salary_max: userData.expected_salary_max || '',
            willing_to_relocate: userData.willing_to_relocate || 'no',
            languages: userData.languages || [],

            // Profile-only
            profile_photo: userData.profile_photo || '',
            certifications: userData.certifications || [],
        }
        setFormData(initial)
        setResumeUrl(userData.resume_url || '')
        initialFormDataRef.current = JSON.stringify(initial)
        setIsDirty(false)
    }
}, [userData])
```

- [ ] **Step 3: Add parseOtherSelection and buildOtherSelection helpers**

Add these at the top of the file (before the component), matching the registration's logic:

```jsx
const parseOtherSelection = (value) => {
    if (!value) return { selectedValue: '', otherValue: '' }
    if (typeof value === 'string' && value.startsWith('Others:')) {
        return { selectedValue: 'Others', otherValue: value.slice(8).trim() }
    }
    return { selectedValue: value, otherValue: '' }
}

const buildOtherSelection = (selected, otherText) => {
    if (selected === 'Others' && otherText?.trim()) return `Others: ${otherText.trim()}`
    return selected
}
```

- [ ] **Step 4: Add imports for registration components/constants**

Add at the top of the file:

```jsx
import { FloatingLabelInput } from '../components/forms/FloatingLabelInput'
import { SearchableSelect } from '../components/forms/SearchableSelect'
import psgcData from '../data/psgc.json'
```

- [ ] **Step 5: Remove obsolete state variables**

Remove `newExp` state (line 61) — work experience will use the registration pattern. Remove the `gender` references throughout. Update `newLanguage` default proficiency:

```jsx
const [newExp, setNewExp] = useState({ company: '', address: '', position: '', months: '', employment_status: '' })
```

- [ ] **Step 6: Verify the app still compiles**

Run: `npm run build 2>&1 | head -30`
Expected: Compilation may show warnings but should not error (JSX references to old fields will be updated in Task 3).

- [ ] **Step 7: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "refactor: align profile edit form state and pre-fill with registration fields"
```

---

### Task 2: Update Save Logic to Match Registration Data Transformations

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — `handleSubmit` function (lines 231–335)

The save logic must transform data the same way registration's `getStepData()` does before writing to the DB, and must update `users.surname`, `users.first_name`, etc. instead of `users.name`.

- [ ] **Step 1: Rewrite handleSubmit**

Replace the `handleSubmit` function. Key changes:
- Save split name fields (`surname`, `first_name`, `middle_name`, `suffix`) to `users` table
- Compose `name` as display name for backward compat
- Apply `buildOtherSelection()` for religion, self_employment_type, unemployment_reason
- Convert `height_cm` and `months_looking_for_work` to numbers
- Filter empty strings from occupation/location arrays
- Match work experience shape `{company, address, position, months, employment_status}`

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
        // Validation
        if (!formData.surname || !formData.first_name) {
            throw new Error('Surname and first name are required')
        }
        if (!formData.mobile_number) {
            throw new Error('Mobile number is required')
        }
        if (formData.skills.length === 0 && formData.predefined_skills.length === 0) {
            throw new Error('Please add at least one skill')
        }
        if (formData.portfolio_url && !/^https?:\/\//i.test(formData.portfolio_url.trim())) {
            throw new Error('Portfolio URL must start with https:// or http://')
        }

        const now = new Date().toISOString()
        const displayName = [formData.first_name, formData.surname].filter(Boolean).join(' ')

        // Transform data the same way registration does
        const heightCm = formData.height_cm === '' ? null : Number(formData.height_cm)
        const monthsLooking = formData.months_looking_for_work === '' ? null : Number(formData.months_looking_for_work)

        const profileData = {
            // Step 2 fields
            surname: formData.surname,
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            suffix: formData.suffix,
            date_of_birth: formData.date_of_birth,
            sex: formData.sex,
            civil_status: formData.civil_status,
            religion: formData.religion === 'Others' && formData.religion_specify?.trim()
                ? `Others: ${formData.religion_specify.trim()}`
                : formData.religion,
            height_cm: Number.isNaN(heightCm) ? null : heightCm,
            is_pwd: formData.is_pwd,
            disability_type: formData.is_pwd ? formData.disability_type : [],
            disability_type_specify: formData.is_pwd && (formData.disability_type || []).includes('Others')
                ? formData.disability_type_specify?.trim() || ''
                : '',
            pwd_id_number: formData.is_pwd ? formData.pwd_id_number : '',

            // Step 3 fields
            street_address: formData.street_address,
            barangay: formData.barangay,
            city: formData.city,
            province: formData.province,
            mobile_number: formData.mobile_number,
            employment_status: formData.employment_status,
            employment_type: formData.employment_type,
            self_employment_type: buildOtherSelection(formData.self_employment_type, formData.self_employment_specify),
            unemployment_reason: buildOtherSelection(formData.unemployment_reason, formData.unemployment_reason_specify),
            months_looking_for_work: Number.isNaN(monthsLooking) ? null : monthsLooking,

            // Step 4 fields
            currently_in_school: formData.currently_in_school,
            highest_education: formData.highest_education,
            school_name: formData.school_name,
            course_or_field: formData.course_or_field,
            year_graduated: formData.year_graduated,
            did_not_graduate: formData.did_not_graduate,
            education_level_reached: formData.education_level_reached,
            year_last_attended: formData.year_last_attended,
            vocational_training: formData.vocational_training,

            // Step 5 fields
            predefined_skills: formData.predefined_skills,
            skills: formData.skills,
            professional_licenses: formData.professional_licenses,
            civil_service_eligibility: formData.civil_service_eligibility,
            civil_service_date: formData.civil_service_date || null,
            work_experiences: formData.work_experiences,
            portfolio_url: formData.portfolio_url,
            resume_url: resumeUrl,
            certifications: formData.certifications,

            // Step 6 fields
            preferred_job_type: formData.preferred_job_type,
            preferred_occupations: formData.preferred_occupations.filter(o => o && o.trim()),
            preferred_local_locations: formData.preferred_local_locations.filter(l => l && l.trim()),
            preferred_overseas_locations: formData.preferred_overseas_locations.filter(l => l && l.trim()),
            expected_salary_min: formData.expected_salary_min,
            expected_salary_max: formData.expected_salary_max,
            willing_to_relocate: formData.willing_to_relocate,
            languages: formData.languages,

            updated_at: now,
        }

        // Handle certificate uploads
        if (certificateFiles.length > 0) {
            const existingCerts = userData.certificate_urls || []
            const newCertsData = []
            for (const file of certificateFiles) {
                const encoded = await compressAndEncode(file)
                newCertsData.push({ name: file.name, data: encoded, type: file.type })
            }
            profileData.certificate_urls = [...existingCerts, ...newCertsData]
        }

        // Update users table (base fields)
        const { error: baseErr } = await supabase
            .from('users')
            .update({
                name: displayName,
                surname: formData.surname,
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                suffix: formData.suffix,
                profile_photo: formData.profile_photo,
                updated_at: now,
            })
            .eq('id', currentUser.uid)
        if (baseErr) throw baseErr

        // Flag for re-verification if critical fields changed
        const CRITICAL_FIELDS = ['surname', 'first_name', 'highest_education', 'school_name', 'resume_url', 'certifications']
        if (isVerified() && initialFormDataRef.current) {
            const initial = JSON.parse(initialFormDataRef.current)
            const criticalChanged = CRITICAL_FIELDS.some(
                field => JSON.stringify(profileData[field] ?? formData[field]) !== JSON.stringify(initial[field])
            )
            if (criticalChanged) {
                profileData.profile_modified_since_verification = true
            }
        }

        // Remove base fields before profile upsert (they're in users table)
        const { surname: _s, first_name: _f, middle_name: _m, suffix: _x, profile_photo: _p, ...profileOnly } = profileData
        const { error: profileErr } = await supabase
            .from('jobseeker_profiles')
            .upsert({ id: currentUser.uid, ...profileOnly }, { onConflict: 'id' })
        if (profileErr) throw profileErr

        // Expand skill aliases (non-blocking)
        try {
            const aliasData = await expandProfileAliases(profileData.skills, profileData.work_experiences)
            if (aliasData.skillAliases && Object.keys(aliasData.skillAliases).length > 0) {
                await supabase
                    .from('jobseeker_profiles')
                    .update({ skill_aliases: aliasData.skillAliases, experience_categories: aliasData.experienceCategories })
                    .eq('id', currentUser.uid)
            }
        } catch (aliasErr) {
            console.warn('Alias expansion failed (non-blocking):', aliasErr.message)
        }

        clearSessionScores(currentUser.uid)
        await fetchUserData(currentUser.uid)
        setSuccess('Profile updated successfully!')
    } catch (err) {
        setError(err.message || 'Failed to update profile')
    } finally {
        setLoading(false)
    }
}
```

- [ ] **Step 2: Verify save logic compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "fix: align profile edit save logic with registration data transformations"
```

---

### Task 3: Rewrite Personal Information Section (Registration Step 2)

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — JSX for Personal Information section

Replace the "Personal Information" and "Additional Details" sections with registration-matching fields.

- [ ] **Step 1: Define constants at top of file**

Add after the `parseOtherSelection`/`buildOtherSelection` helpers:

```jsx
const SUFFIX_OPTIONS = ['None', 'Jr.', 'Sr.', 'III', 'IV', 'V']
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent']
const DISABILITY_TYPES = ['Visual', 'Hearing', 'Speech', 'Physical', 'Mental', 'Others']
const RELIGION_OPTIONS = [
    'Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Evangelical Christianity',
    "Philippine Independent Church (Aglipayan)", 'Seventh-day Adventist',
    'Bible Baptist Church', 'United Church of Christ in the Philippines',
    "Jehovah's Witnesses", 'Church of Christ', 'Born Again Christian',
    'Others', 'Prefer not to say'
]
```

- [ ] **Step 2: Replace Personal Information JSX**

Replace the "Personal Information" `<div>` (around lines 460–529) with split name fields matching registration Step 2:

```jsx
{/* Personal Information — matches Registration Step 2 */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-primary-600" />
        Personal Information
    </h2>
    <div className="grid md:grid-cols-2 gap-4">
        <FloatingLabelInput label="Surname" name="surname" value={formData.surname} onChange={handleChange} icon={User} required />
        <FloatingLabelInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-4">
        <FloatingLabelInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} />
        <SearchableSelect label="Suffix" name="suffix" value={formData.suffix} onChange={handleChange} options={SUFFIX_OPTIONS} placeholder="None" />
    </div>
    <div className="mt-4">
        <FloatingLabelInput label="Date of Birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} type="date" icon={Calendar} required />
    </div>
    <div className="mt-4">
        <label className="label">Sex <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-3">
            {['Male', 'Female'].map(option => (
                <button key={option} type="button" onClick={() => handleChange({ target: { name: 'sex', value: option } })}
                    className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.sex === option ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    {option}
                </button>
            ))}
        </div>
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-4">
        <SearchableSelect label="Civil Status" name="civil_status" value={formData.civil_status} onChange={handleChange} options={CIVIL_STATUS_OPTIONS} placeholder="Select civil status" required />
        <SearchableSelect label="Religion" name="religion" value={formData.religion} onChange={handleChange} options={RELIGION_OPTIONS} placeholder="Select religion" />
    </div>
    {formData.religion === 'Others' && (
        <div className="mt-4">
            <FloatingLabelInput label="Please specify religion" name="religion_specify" value={formData.religion_specify} onChange={handleChange} required />
        </div>
    )}
    <div className="mt-4">
        <FloatingLabelInput label="Height (cm)" name="height_cm" value={formData.height_cm} onChange={handleChange} type="number" placeholder="e.g. 165" />
    </div>

    {/* PWD Section */}
    <div className="mt-4">
        <label className="label">Person with Disability (PWD)</label>
        <div className="grid grid-cols-2 gap-3">
            {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(option => (
                <button key={option.label} type="button" onClick={() => setFormData(prev => ({ ...prev, is_pwd: option.value, ...(!option.value && { disability_type: [], disability_type_specify: '', pwd_id_number: '' }) }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.is_pwd === option.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    {option.label}
                </button>
            ))}
        </div>
    </div>
    {formData.is_pwd && (
        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
            <div>
                <label className="label">Type of Disability <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DISABILITY_TYPES.map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={(formData.disability_type || []).includes(type)}
                                onChange={() => {
                                    const current = formData.disability_type || []
                                    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
                                    setFormData(prev => ({ ...prev, disability_type: updated }))
                                }}
                                className="w-4 h-4 text-primary-600 rounded" />
                            <span className="text-sm text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>
            </div>
            {(formData.disability_type || []).includes('Others') && (
                <FloatingLabelInput label="Specify disability" name="disability_type_specify" value={formData.disability_type_specify} onChange={handleChange} required />
            )}
            <FloatingLabelInput label="PWD ID Number (Optional)" name="pwd_id_number" value={formData.pwd_id_number} onChange={handleChange} />
        </div>
    )}
</div>
```

- [ ] **Step 3: Remove the old "Additional Details" section**

Delete the entire "Additional Details" section (the one that had `gender`, simplified `civil_status`, and simplified PWD checkbox — around lines 531–593).

- [ ] **Step 4: Add Calendar import**

Ensure `Calendar` is imported from lucide-react (it should already be there, but verify).

- [ ] **Step 5: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: align profile edit personal info section with registration Step 2"
```

---

### Task 4: Rewrite Contact & Employment Section (Registration Step 3)

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — Add Contact & Employment section after Personal Information

- [ ] **Step 1: Define employment constants**

Add after the religion/disability constants:

```jsx
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time']
const SELF_EMPLOYMENT_TYPES = ['Freelancer', 'Vendor/Retailer', 'Home-based', 'Transport', 'Domestic Worker', 'Artisan/Craft Worker', 'Others']
const UNEMPLOYMENT_REASONS = ['New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned', 'Retired', 'Terminated/Laid Off', 'Others']
```

- [ ] **Step 2: Add PSGC address helpers**

Add helper for cascading province→city→barangay. This matches Step3ContactEmployment:

```jsx
const provinces = Object.keys(psgcData).sort()
const getCities = (province) => province && psgcData[province] ? Object.keys(psgcData[province]).sort() : []
const getBarangays = (province, city) => province && city && psgcData[province]?.[city] ? psgcData[province][city].sort() : []
```

- [ ] **Step 3: Add Contact & Employment JSX**

Insert after the Personal Information section, before Language Proficiency:

```jsx
{/* Contact & Employment — matches Registration Step 3 */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary-600" />
        Contact & Address
    </h2>
    <div className="space-y-4">
        <FloatingLabelInput label="Street Address" name="street_address" value={formData.street_address} onChange={handleChange} required />
        <div className="grid md:grid-cols-3 gap-4">
            <SearchableSelect label="Province" name="province" value={formData.province}
                onChange={(e) => {
                    handleChange(e)
                    setFormData(prev => ({ ...prev, city: '', barangay: '' }))
                }}
                options={provinces} placeholder="Select province" required />
            <SearchableSelect label="City/Municipality" name="city" value={formData.city}
                onChange={(e) => {
                    handleChange(e)
                    setFormData(prev => ({ ...prev, barangay: '' }))
                }}
                options={getCities(formData.province)} placeholder="Select city" required
                disabled={!formData.province} />
            <SearchableSelect label="Barangay" name="barangay" value={formData.barangay}
                onChange={handleChange}
                options={getBarangays(formData.province, formData.city)} placeholder="Select barangay" required
                disabled={!formData.city} />
        </div>
        <FloatingLabelInput label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} type="tel" icon={Phone} required placeholder="09XXXXXXXXX" />
    </div>
</div>

{/* Employment Status */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-primary-600" />
        Employment Status
    </h2>
    <div className="space-y-4">
        <div>
            <label className="label">Current Employment Status <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-3">
                {['Employed', 'Unemployed', 'Self-Employed'].map(status => (
                    <button key={status} type="button"
                        onClick={() => setFormData(prev => ({
                            ...prev,
                            employment_status: status,
                            employment_type: status !== 'Employed' ? '' : prev.employment_type,
                            self_employment_type: status !== 'Self-Employed' ? '' : prev.self_employment_type,
                            self_employment_specify: status !== 'Self-Employed' ? '' : prev.self_employment_specify,
                            unemployment_reason: status !== 'Unemployed' ? '' : prev.unemployment_reason,
                            unemployment_reason_specify: status !== 'Unemployed' ? '' : prev.unemployment_reason_specify,
                            months_looking_for_work: status !== 'Unemployed' ? '' : prev.months_looking_for_work,
                        }))}
                        className={`p-3 rounded-xl border-2 text-center text-sm transition-all duration-200 ${formData.employment_status === status ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        {status}
                    </button>
                ))}
            </div>
        </div>

        {formData.employment_status === 'Employed' && (
            <SearchableSelect label="Employment Type" name="employment_type" value={formData.employment_type} onChange={handleChange} options={EMPLOYMENT_TYPES} placeholder="Select type" required />
        )}

        {formData.employment_status === 'Self-Employed' && (
            <div className="space-y-4">
                <SearchableSelect label="Type of Self-Employment" name="self_employment_type" value={formData.self_employment_type} onChange={handleChange} options={SELF_EMPLOYMENT_TYPES} placeholder="Select type" required />
                {formData.self_employment_type === 'Others' && (
                    <FloatingLabelInput label="Please specify" name="self_employment_specify" value={formData.self_employment_specify} onChange={handleChange} required />
                )}
            </div>
        )}

        {formData.employment_status === 'Unemployed' && (
            <div className="space-y-4">
                <SearchableSelect label="Reason for Unemployment" name="unemployment_reason" value={formData.unemployment_reason} onChange={handleChange} options={UNEMPLOYMENT_REASONS} placeholder="Select reason" required />
                {formData.unemployment_reason === 'Others' && (
                    <FloatingLabelInput label="Please specify" name="unemployment_reason_specify" value={formData.unemployment_reason_specify} onChange={handleChange} required />
                )}
                <FloatingLabelInput label="Months Looking for Work" name="months_looking_for_work" value={formData.months_looking_for_work} onChange={handleChange} type="number" />
            </div>
        )}
    </div>
</div>
```

- [ ] **Step 4: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: align profile edit contact & employment section with registration Step 3"
```

---

### Task 5: Rewrite Education Section (Registration Step 4)

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — Replace Educational Background section

- [ ] **Step 1: Add education constants and import courses data**

Add constants and import:

```jsx
import coursesData from '../data/courses.json'

const EDUCATION_LEVELS = [
    'Elementary (Grades 1-6)',
    'High School (Old Curriculum)',
    'Junior High School (Grades 7-10)',
    'Senior High School (Grades 11-12)',
    'Tertiary',
    'Graduate Studies / Post-graduate'
]

const LEVELS_WITH_COURSE = ['Senior High School (Grades 11-12)', 'Tertiary', 'Graduate Studies / Post-graduate']

const CERTIFICATE_LEVELS = ['NC I', 'NC II', 'NC III', 'NC IV', 'None', 'Others']

const EMPTY_TRAINING = { course: '', institution: '', hours: '', skills_acquired: '', certificate_level: '' }

const WORK_EXPERIENCE_STATUSES = ['Permanent', 'Contractual', 'Part-time', 'Probationary']
```

- [ ] **Step 2: Add course options helper**

```jsx
const getCourseOptions = (level) => {
    if (level === 'Senior High School (Grades 11-12)') return coursesData.seniorHigh || []
    if (level === 'Tertiary') return coursesData.tertiary || []
    if (level === 'Graduate Studies / Post-graduate') return coursesData.graduate || []
    return []
}
```

- [ ] **Step 3: Replace Educational Background JSX**

Remove the old "Educational Background" section and replace with:

```jsx
{/* Education & Training — matches Registration Step 4 */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-primary-600" />
        Education & Training
    </h2>
    <div className="space-y-4">
        <div>
            <label className="label">Currently in School?</label>
            <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(option => (
                    <button key={option.label} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, currently_in_school: option.value, ...(option.value && { did_not_graduate: false, year_graduated: '', education_level_reached: '', year_last_attended: '' }) }))}
                        className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.currently_in_school === option.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>

        <div>
            <label className="label">Highest Educational Attainment <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EDUCATION_LEVELS.map(level => (
                    <button key={level} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, highest_education: level, course_or_field: '', did_not_graduate: false, education_level_reached: '', year_last_attended: '' }))}
                        className={`p-3 rounded-xl border-2 text-center text-sm transition-all duration-200 ${formData.highest_education === level ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        {level}
                    </button>
                ))}
            </div>
        </div>

        {formData.highest_education && (
            <>
                <FloatingLabelInput label="School/Institution Name" name="school_name" value={formData.school_name} onChange={handleChange} icon={Building} required />

                {LEVELS_WITH_COURSE.includes(formData.highest_education) && (
                    <SearchableSelect label="Course / Field of Study" name="course_or_field" value={formData.course_or_field} onChange={handleChange} options={getCourseOptions(formData.highest_education)} placeholder="Search or type course" />
                )}

                {!formData.currently_in_school && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={formData.did_not_graduate}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    did_not_graduate: e.target.checked,
                                    ...(!e.target.checked ? { education_level_reached: '', year_last_attended: '' } : { year_graduated: '' })
                                }))}
                                className="w-4 h-4 text-primary-600 rounded" />
                            <span className="text-sm text-gray-700">Did not graduate / Undergraduate</span>
                        </div>

                        {formData.did_not_graduate ? (
                            <div className="grid md:grid-cols-2 gap-4">
                                <FloatingLabelInput label="Level Reached" name="education_level_reached" value={formData.education_level_reached} onChange={handleChange} placeholder="e.g., 3rd Year" />
                                <FloatingLabelInput label="Year Last Attended" name="year_last_attended" value={formData.year_last_attended} onChange={handleChange} type="number" />
                            </div>
                        ) : (
                            <FloatingLabelInput label="Year Graduated" name="year_graduated" value={formData.year_graduated} onChange={handleChange} type="number" />
                        )}
                    </div>
                )}
            </>
        )}

        {/* Vocational Training */}
        <div className="mt-6">
            <label className="label">Vocational / Technical Training (Optional)</label>
            {(formData.vocational_training || []).map((training, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl mb-3 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Training {index + 1}</span>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, vocational_training: prev.vocational_training.filter((_, i) => i !== index) }))}
                            className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                    <FloatingLabelInput label="Course/Program" name={`vt_course_${index}`} value={training.course}
                        onChange={(e) => { const updated = [...formData.vocational_training]; updated[index] = { ...updated[index], course: e.target.value }; setFormData(prev => ({ ...prev, vocational_training: updated })) }} />
                    <FloatingLabelInput label="Training Institution" name={`vt_inst_${index}`} value={training.institution}
                        onChange={(e) => { const updated = [...formData.vocational_training]; updated[index] = { ...updated[index], institution: e.target.value }; setFormData(prev => ({ ...prev, vocational_training: updated })) }} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FloatingLabelInput label="Training Hours" name={`vt_hours_${index}`} value={training.hours} type="number"
                            onChange={(e) => { const updated = [...formData.vocational_training]; updated[index] = { ...updated[index], hours: e.target.value }; setFormData(prev => ({ ...prev, vocational_training: updated })) }} />
                        <SearchableSelect label="Certificate Level" name={`vt_cert_${index}`} value={training.certificate_level}
                            onChange={(e) => { const updated = [...formData.vocational_training]; updated[index] = { ...updated[index], certificate_level: e.target.value }; setFormData(prev => ({ ...prev, vocational_training: updated })) }}
                            options={CERTIFICATE_LEVELS} placeholder="Select" />
                    </div>
                    <FloatingLabelInput label="Skills Acquired" name={`vt_skills_${index}`} value={training.skills_acquired}
                        onChange={(e) => { const updated = [...formData.vocational_training]; updated[index] = { ...updated[index], skills_acquired: e.target.value }; setFormData(prev => ({ ...prev, vocational_training: updated })) }} />
                </div>
            ))}
            {(formData.vocational_training || []).length < 3 && (
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, vocational_training: [...(prev.vocational_training || []), { ...EMPTY_TRAINING }] }))}
                    className="btn-secondary flex items-center gap-2 mt-2">
                    <Plus className="w-4 h-4" /> Add Training
                </button>
            )}
        </div>
    </div>
</div>
```

- [ ] **Step 4: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: align profile edit education section with registration Step 4"
```

---

### Task 6: Rewrite Skills, Licenses & Work Experience Section (Registration Step 5)

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — Replace Skills & Work Experience sections

- [ ] **Step 1: Add predefined skills constant**

```jsx
const PREDEFINED_SKILLS = [
    'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
    'Domestic Chores', 'Driver', 'Electrician', 'Embroidery', 'Gardening',
    'Masonry', 'Painter/Artist', 'Painting Jobs', 'Photography',
    'Plumbing', 'Sewing/Dresses', 'Stenography', 'Tailoring'
]
```

- [ ] **Step 2: Replace Skills & Certifications and Work Experience JSX**

Remove the old "Skills & Certifications" and "Work Experience" sections. Replace with:

```jsx
{/* Skills, Licenses & Experience — matches Registration Step 5 */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Award className="w-5 h-5 text-primary-600" />
        Skills & Qualifications
    </h2>
    <div className="space-y-6">
        {/* Predefined Skills */}
        <div>
            <label className="label">Skills (check all that apply)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PREDEFINED_SKILLS.map(skill => (
                    <label key={skill} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={(formData.predefined_skills || []).includes(skill)}
                            onChange={() => {
                                const current = formData.predefined_skills || []
                                const updated = current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill]
                                setFormData(prev => ({ ...prev, predefined_skills: updated }))
                            }}
                            className="w-4 h-4 text-primary-600 rounded" />
                        <span className="text-sm text-gray-700">{skill}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* Custom Skills */}
        <div>
            <label className="label">Other Skills <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
                <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="input-field" placeholder="e.g. Microsoft Excel" />
                <button type="button" onClick={addSkill} className="btn-secondary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add
                </button>
            </div>
            {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {formData.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                            {skill}
                            <button type="button" onClick={() => removeSkill(skill)} className="hover:text-primary-900"><X className="w-4 h-4" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>

        {/* Professional Licenses */}
        <div>
            <label className="label">Professional License / PRC (Optional)</label>
            {(formData.professional_licenses || []).map((license, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl mb-3 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">License {index + 1}</span>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, professional_licenses: prev.professional_licenses.filter((_, i) => i !== index) }))}
                            className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                    <FloatingLabelInput label="License Name" name={`lic_name_${index}`} value={license.name}
                        onChange={(e) => { const updated = [...formData.professional_licenses]; updated[index] = { ...updated[index], name: e.target.value }; setFormData(prev => ({ ...prev, professional_licenses: updated })) }} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FloatingLabelInput label="License Number" name={`lic_num_${index}`} value={license.number}
                            onChange={(e) => { const updated = [...formData.professional_licenses]; updated[index] = { ...updated[index], number: e.target.value }; setFormData(prev => ({ ...prev, professional_licenses: updated })) }} />
                        <FloatingLabelInput label="Valid Until" name={`lic_valid_${index}`} value={license.valid_until || ''} type="date"
                            onChange={(e) => { const updated = [...formData.professional_licenses]; updated[index] = { ...updated[index], valid_until: e.target.value }; setFormData(prev => ({ ...prev, professional_licenses: updated })) }} />
                    </div>
                </div>
            ))}
            {(formData.professional_licenses || []).length < 2 && (
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, professional_licenses: [...(prev.professional_licenses || []), { name: '', number: '', valid_until: '' }] }))}
                    className="btn-secondary flex items-center gap-2 mt-2">
                    <Plus className="w-4 h-4" /> Add License
                </button>
            )}
        </div>

        {/* Civil Service */}
        <div className="grid md:grid-cols-2 gap-4">
            <FloatingLabelInput label="Civil Service Eligibility" name="civil_service_eligibility" value={formData.civil_service_eligibility} onChange={handleChange} placeholder="e.g. Professional" />
            <FloatingLabelInput label="Rating/Date" name="civil_service_date" value={formData.civil_service_date} onChange={handleChange} type="date" />
        </div>

        {/* Work Experience */}
        <div>
            <label className="label">Work Experience (Optional, max 5)</label>
            {(formData.work_experiences || []).map((exp, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl mb-3 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Experience {index + 1}</span>
                        <button type="button" onClick={() => removeWorkExperience(index)}
                            className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                    <FloatingLabelInput label="Company Name" name={`exp_company_${index}`} value={exp.company}
                        onChange={(e) => { const updated = [...formData.work_experiences]; updated[index] = { ...updated[index], company: e.target.value }; setFormData(prev => ({ ...prev, work_experiences: updated })) }} required />
                    <FloatingLabelInput label="Company Address (City/Municipality)" name={`exp_addr_${index}`} value={exp.address || ''}
                        onChange={(e) => { const updated = [...formData.work_experiences]; updated[index] = { ...updated[index], address: e.target.value }; setFormData(prev => ({ ...prev, work_experiences: updated })) }} />
                    <FloatingLabelInput label="Position" name={`exp_pos_${index}`} value={exp.position}
                        onChange={(e) => { const updated = [...formData.work_experiences]; updated[index] = { ...updated[index], position: e.target.value }; setFormData(prev => ({ ...prev, work_experiences: updated })) }} required />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FloatingLabelInput label="Duration (months)" name={`exp_months_${index}`} value={exp.months || ''} type="number"
                            onChange={(e) => { const updated = [...formData.work_experiences]; updated[index] = { ...updated[index], months: e.target.value }; setFormData(prev => ({ ...prev, work_experiences: updated })) }} />
                        <SearchableSelect label="Status" name={`exp_status_${index}`} value={exp.employment_status || ''}
                            onChange={(e) => { const updated = [...formData.work_experiences]; updated[index] = { ...updated[index], employment_status: e.target.value }; setFormData(prev => ({ ...prev, work_experiences: updated })) }}
                            options={WORK_EXPERIENCE_STATUSES} placeholder="Select" />
                    </div>
                </div>
            ))}
            {(formData.work_experiences || []).length < 5 && (
                <button type="button"
                    onClick={() => setFormData(prev => ({ ...prev, work_experiences: [...(prev.work_experiences || []), { company: '', address: '', position: '', months: '', employment_status: '' }] }))}
                    className="btn-secondary flex items-center gap-2 mt-2">
                    <Plus className="w-4 h-4" /> Add Experience
                </button>
            )}
        </div>

        {/* Portfolio & Certifications */}
        <div>
            <label className="label">Portfolio URL (Optional)</label>
            <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="url" name="portfolio_url" value={formData.portfolio_url} onChange={handleChange}
                    onBlur={(e) => { const val = e.target.value.trim(); if (val && !/^https?:\/\//i.test(val)) setError('Portfolio URL must start with https:// or http://') }}
                    className="input-field pl-12" placeholder="https://yourportfolio.com" />
            </div>
        </div>

        <div>
            <label className="label">Certifications (Optional)</label>
            <div className="flex gap-2">
                <input type="text" value={newCert} onChange={(e) => setNewCert(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                    className="input-field" placeholder="e.g. PRC License" />
                <button type="button" onClick={addCertification} className="btn-secondary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add
                </button>
            </div>
            {formData.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {formData.certifications.map((cert, index) => (
                        <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2">
                            {cert}
                            <button type="button" onClick={() => removeCertification(cert)} className="hover:text-green-900"><X className="w-4 h-4" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    </div>
</div>
```

- [ ] **Step 3: Update `addWorkExperience` function**

Replace the `addWorkExperience` and `newExp` validation to match new shape:

```jsx
const addWorkExperience = () => {
    if (newExp.company && newExp.position) {
        setFormData(prev => ({
            ...prev,
            work_experiences: [...prev.work_experiences, { ...newExp }]
        }))
        setNewExp({ company: '', address: '', position: '', months: '', employment_status: '' })
    }
}
```

Note: Since work experiences are now added inline (not via the `newExp` state + button pattern), this function can be removed. The inline "Add Experience" button creates an empty entry directly. Remove `newExp` state and `addWorkExperience` function entirely.

- [ ] **Step 4: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: align profile edit skills & experience section with registration Step 5"
```

---

### Task 7: Rewrite Job Preferences & Language Section (Registration Step 6)

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — Replace Employment Preferences and Language sections

- [ ] **Step 1: Add language proficiency constant**

```jsx
const PROFICIENCY_LEVELS = ['Beginner', 'Conversational', 'Proficient', 'Fluent', 'Native']
```

- [ ] **Step 2: Replace Employment Preferences and Language Proficiency JSX**

Remove the old "Employment Preferences" and "Language Proficiency" sections. Replace with:

```jsx
{/* Job Preferences — matches Registration Step 6 */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-primary-600" />
        Job Preferences
    </h2>
    <div className="space-y-4">
        <div>
            <label className="label">Preferred Job Type(s) <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
                {jobTypes.map(type => (
                    <button key={type.id} type="button" onClick={() => handleJobTypeChange(type.id)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${formData.preferred_job_type.includes(type.id) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 hover:border-gray-300'}`}>
                        {type.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Preferred Occupations */}
        <div>
            <label className="label">Preferred Occupation(s) <span className="text-red-500">*</span></label>
            <div className="space-y-3">
                {formData.preferred_occupations.map((occ, index) => (
                    <FloatingLabelInput key={index} label={`Occupation ${index + 1}${index === 0 ? ' *' : ' (Optional)'}`}
                        name={`occ_${index}`} value={occ}
                        onChange={(e) => {
                            const updated = [...formData.preferred_occupations]
                            updated[index] = e.target.value
                            setFormData(prev => ({ ...prev, preferred_occupations: updated }))
                        }}
                        required={index === 0} />
                ))}
            </div>
        </div>

        {/* Local Locations */}
        <div>
            <label className="label">Preferred Work Location — Local</label>
            <div className="space-y-3">
                {formData.preferred_local_locations.map((loc, index) => (
                    <FloatingLabelInput key={index} label={`Location ${index + 1}`}
                        name={`local_loc_${index}`} value={loc}
                        onChange={(e) => {
                            const updated = [...formData.preferred_local_locations]
                            updated[index] = e.target.value
                            setFormData(prev => ({ ...prev, preferred_local_locations: updated }))
                        }}
                        placeholder="City / Municipality" />
                ))}
            </div>
        </div>

        {/* Overseas Locations */}
        <div>
            <label className="label">Preferred Work Location — Overseas (Optional)</label>
            <div className="space-y-3">
                {formData.preferred_overseas_locations.map((loc, index) => (
                    <FloatingLabelInput key={index} label={`Country ${index + 1}`}
                        name={`overseas_loc_${index}`} value={loc}
                        onChange={(e) => {
                            const updated = [...formData.preferred_overseas_locations]
                            updated[index] = e.target.value
                            setFormData(prev => ({ ...prev, preferred_overseas_locations: updated }))
                        }}
                        placeholder="Country name" />
                ))}
            </div>
        </div>

        {/* Salary */}
        <div className="grid md:grid-cols-2 gap-4">
            <FloatingLabelInput label="Expected Salary (Min)" name="expected_salary_min" value={formData.expected_salary_min} onChange={handleChange} type="number" placeholder="15000" />
            <FloatingLabelInput label="Expected Salary (Max)" name="expected_salary_max" value={formData.expected_salary_max} onChange={handleChange} type="number" placeholder="25000" />
        </div>

        {/* Relocate */}
        <div>
            <label className="label">Willing to Relocate?</label>
            <div className="grid grid-cols-2 gap-3">
                {['yes', 'no'].map(option => (
                    <button key={option} type="button" onClick={() => handleChange({ target: { name: 'willing_to_relocate', value: option } })}
                        className={`p-3 rounded-xl border-2 text-center text-sm transition-all duration-200 ${formData.willing_to_relocate === option ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                        {option === 'yes' ? 'Yes' : 'No'}
                    </button>
                ))}
            </div>
        </div>
    </div>
</div>

{/* Language Proficiency — matches Registration Step 6 */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Language Proficiency</h2>
    <div className="flex gap-2">
        <input type="text" value={newLanguage.language}
            onChange={(e) => setNewLanguage(prev => ({ ...prev, language: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
            className="input-field flex-1" placeholder="e.g. Filipino, English" />
        <Select
            options={PROFICIENCY_LEVELS.map(level => ({ value: level, label: level }))}
            value={newLanguage.proficiency}
            onChange={(val) => setNewLanguage(prev => ({ ...prev, proficiency: val }))}
            placeholder="Proficiency"
            className="w-40"
        />
        <button type="button" onClick={addLanguage} className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
        </button>
    </div>
    {formData.languages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
            {formData.languages.map((lang, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                    {lang.language} ({lang.proficiency})
                    <button type="button" onClick={() => removeLanguage(lang.language)} className="hover:text-blue-900">
                        <X className="w-4 h-4" />
                    </button>
                </span>
            ))}
        </div>
    )}
</div>
```

- [ ] **Step 3: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: align profile edit job preferences & languages with registration Step 6"
```

---

### Task 8: Update AI Resume Auto-fill to Match New Field Shape

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — `handleAnalyzeResume` function

The AI resume analysis maps results to form fields. Update it to use the new field names and work experience shape.

- [ ] **Step 1: Update handleAnalyzeResume mapping**

```jsx
const handleAnalyzeResume = async () => {
    if (!aiInputText.trim()) {
        setAnalysisError('Please paste your resume text first.')
        return
    }
    setIsAnalyzing(true)
    setAnalysisError('')

    try {
        const result = await analyzeResume(aiInputText)
        setFormData(prev => {
            const newData = { ...prev }

            // Skills
            if (result.skills && Array.isArray(result.skills)) {
                const aiSkills = result.skills.map(s => normalizeSkillName(s.name || s)).filter(Boolean)
                const merged = [...prev.skills, ...aiSkills]
                newData.skills = deduplicateSkills(merged)
            }

            // Work Experience — use registration shape
            if (result.experience && Array.isArray(result.experience)) {
                const newExps = result.experience.map(exp => ({
                    company: (exp.company || '').trim() || 'Unknown',
                    address: '',
                    position: (exp.title || '').trim() || 'Unknown',
                    months: '',
                    employment_status: ''
                })).filter(exp => exp.company !== 'Unknown' || exp.position !== 'Unknown')
                newData.work_experiences = [...prev.work_experiences, ...newExps]
            }

            // Education
            if (result.education && Array.isArray(result.education) && result.education.length > 0) {
                const edu = result.education[0]
                if (!prev.highest_education && edu.normalizedLevel) newData.highest_education = edu.normalizedLevel
                if (!prev.school_name && edu.school) newData.school_name = edu.school.trim()
                if (!prev.course_or_field && edu.degree) newData.course_or_field = edu.degree.trim()
                if (!prev.year_graduated && edu.year) newData.year_graduated = edu.year.toString().trim()
            }

            return newData
        })
        setShowAIModal(false)
        setSuccess('Profile updated with AI analysis! Please review the changes.')
        setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
        console.error(err)
        setAnalysisError(err.message || 'Failed to analyze resume.')
    } finally {
        setIsAnalyzing(false)
    }
}
```

- [ ] **Step 2: Update ProfilePhotoUpload name prop**

Change from `formData.full_name` to composed display name:

```jsx
<ProfilePhotoUpload
    name={[formData.first_name, formData.surname].filter(Boolean).join(' ')}
    currentPhoto={formData.profile_photo || userData?.profile_photo}
    onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
/>
```

- [ ] **Step 3: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "fix: update AI resume auto-fill and photo display to use split name fields"
```

---

### Task 9: Update External References to Removed Fields

**Files:**
- Modify: `src/components/admin/JobseekerCard.jsx:102` — `preferred_job_location` reference
- Modify: `src/utils/profileCompletion.js:7` — `preferred_job_location` fallback
- Modify: `src/services/geminiService.js:523` — `preferred_job_location` reference

These files reference the old `preferred_job_location` or `gender` fields. Update them to use the registration field names.

- [ ] **Step 1: Update JobseekerCard.jsx**

Change `preferred_job_location` to display from `preferred_local_locations`:

```jsx
// Old:
['Location', jobseeker.preferred_job_location],

// New:
['Location', (jobseeker.preferred_local_locations || []).filter(Boolean).join(', ')],
```

- [ ] **Step 2: Update profileCompletion.js**

```jsx
// Old:
test: (d) => !!(d.preferred_job_type?.length > 0 && (d.preferred_local_locations?.length > 0 || d.preferred_job_location))

// New:
test: (d) => !!(d.preferred_job_type?.length > 0 && d.preferred_local_locations?.length > 0)
```

- [ ] **Step 3: Update geminiService.js**

```jsx
// Old:
Location: ${profile.preferred_job_location || profile.city || 'Not specified'}

// New:
Location: ${(profile.preferred_local_locations || []).filter(Boolean).join(', ') || profile.city || 'Not specified'}
```

- [ ] **Step 4: Verify the app compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/JobseekerCard.jsx src/utils/profileCompletion.js src/services/geminiService.js
git commit -m "fix: update external references from preferred_job_location to preferred_local_locations"
```

---

### Task 10: Clean Up Unused Imports and Final Verification

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx` — Clean up imports

- [ ] **Step 1: Update imports**

Ensure the import block at the top includes all needed icons and removes unused ones. The final import block should be:

```jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import {
    User, Briefcase, MapPin, Phone, FileText, Loader2, AlertCircle,
    Plus, X, ChevronRight, CheckCircle, Upload, Home, GraduationCap,
    Award, Calendar, Building, Link as LinkIcon, Save, Sparkles
} from 'lucide-react'
import { analyzeResume, normalizeSkillName, deduplicateSkills, expandProfileAliases, clearSessionScores } from '../services/geminiService'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ResumeUpload from '../components/common/ResumeUpload'
import { compressAndEncode } from '../utils/fileUtils'
import Select from '../components/common/Select'
import ExportResumeButton from '../components/profile/ExportResumeButton'
import { FloatingLabelInput } from '../components/forms/FloatingLabelInput'
import { SearchableSelect } from '../components/forms/SearchableSelect'
import psgcData from '../data/psgc.json'
import coursesData from '../data/courses.json'
```

- [ ] **Step 2: Remove `newExp` state and `addWorkExperience` function**

These are no longer used since work experiences are now added inline with empty objects. Remove:
- `const [newExp, setNewExp] = useState(...)` 
- `const addWorkExperience = () => { ... }`

- [ ] **Step 3: Remove old `educationLevels` array**

Delete the old `educationLevels` array (lines ~402-411) since we now use `EDUCATION_LEVELS` constant.

- [ ] **Step 4: Full build verification**

Run: `npm run build 2>&1 | head -50`
Expected: Clean compilation with no errors.

- [ ] **Step 5: Manual smoke test checklist**

Open the app in a browser and verify:
1. Navigate to Edit Profile page — all registration data should be pre-filled
2. Split name fields show surname, first name, middle name, suffix
3. Sex shows Male/Female toggle (not "Gender" dropdown)
4. Civil status includes "Solo Parent"
5. Religion dropdown appears with "Others" conditional specify field
6. Height field appears
7. PWD section shows disability type checkboxes when enabled
8. Address uses cascading province→city→barangay dropdowns
9. Employment status section shows with conditional sub-fields
10. Education uses registration-matching level values and card selection
11. Vocational training section appears
12. Predefined skills checkboxes appear
13. Professional licenses section appears
14. Work experience uses full shape (company, address, position, months, status)
15. Preferred occupations (3 slots) appear
16. Local + overseas location arrays (3 slots each) appear
17. Language proficiency has 5 levels (Beginner through Native)
18. Save works — verify data round-trips correctly

- [ ] **Step 6: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "chore: clean up imports and remove unused code from profile edit alignment"
```
