# Profile Completeness Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add profile photos, completion tracking, new fields for all roles, and public profile views to PESO-Connect.

**Architecture:** Unified profile system with role-specific edit pages, shared components (photo upload, completion bar), and a public profile view. All data stays in the existing Firestore `users` collection. Photos stored as Base64 (same as existing resume/cert storage).

**Tech Stack:** React 18, React Router 6, Firebase/Firestore, Tailwind CSS, Lucide icons, Vitest + Testing Library

---

### Task 1: Profile Completion Utility

**Files:**
- Create: `src/utils/profileCompletion.js`
- Create: `src/utils/profileCompletion.test.js`

**Step 1: Write the failing tests**

```js
// src/utils/profileCompletion.test.js
import { describe, it, expect } from 'vitest'
import { calculateCompletion } from './profileCompletion'

describe('calculateCompletion', () => {
    it('returns 0% for empty jobseeker', () => {
        const result = calculateCompletion({ role: 'jobseeker' })
        expect(result.percentage).toBe(0)
        expect(result.missing.length).toBeGreaterThan(0)
    })

    it('returns 100% for complete jobseeker', () => {
        const result = calculateCompletion({
            role: 'jobseeker',
            profile_photo: 'data:image/jpeg;base64,abc',
            full_name: 'Juan Dela Cruz',
            date_of_birth: '1995-01-01',
            barangay: 'San Roque',
            city: 'Manila',
            province: 'Metro Manila',
            mobile_number: '09171234567',
            preferred_job_type: ['full-time'],
            preferred_job_location: 'Manila',
            highest_education: 'College Graduate',
            school_name: 'UP',
            skills: ['Excel', 'Word', 'PowerPoint'],
            work_experiences: [{ company: 'DOLE', position: 'Clerk', duration: '2020-2022' }],
            resume_url: 'data:application/pdf;base64,abc',
            certifications: ['PRC License'],
            portfolio_url: 'https://example.com'
        })
        expect(result.percentage).toBe(100)
        expect(result.missing).toEqual([])
    })

    it('calculates partial jobseeker correctly', () => {
        const result = calculateCompletion({
            role: 'jobseeker',
            full_name: 'Juan',
            date_of_birth: '1995-01-01',
            city: 'Manila',
            province: 'Metro Manila',
            mobile_number: '09171234567',
            skills: ['Excel']
        })
        expect(result.percentage).toBeGreaterThan(0)
        expect(result.percentage).toBeLessThan(100)
        expect(result.missing.some(m => m.key === 'profile_photo')).toBe(true)
    })

    it('returns 0% for empty employer', () => {
        const result = calculateCompletion({ role: 'employer' })
        expect(result.percentage).toBe(0)
    })

    it('returns 100% for complete employer', () => {
        const result = calculateCompletion({
            role: 'employer',
            company_name: 'ACME Corp',
            employer_type: 'company',
            business_address: '123 Main St',
            nature_of_business: 'Manufacturing',
            representative_name: 'Juan',
            representative_position: 'HR Manager',
            business_permit_url: 'data:image/jpeg;base64,abc',
            gov_id_url: 'data:image/jpeg;base64,abc',
            contact_email: 'test@example.com',
            contact_number: '09171234567',
            company_description: 'We make things',
            profile_photo: 'data:image/jpeg;base64,abc',
            company_website: 'https://acme.com'
        })
        expect(result.percentage).toBe(100)
        expect(result.missing).toEqual([])
    })

    it('returns 0% for empty individual', () => {
        const result = calculateCompletion({ role: 'individual' })
        expect(result.percentage).toBe(0)
    })

    it('returns 100% for complete individual', () => {
        const result = calculateCompletion({
            role: 'individual',
            full_name: 'Maria Santos',
            contact_number: '09171234567',
            profile_photo: 'data:image/jpeg;base64,abc',
            barangay: 'San Roque',
            city: 'Manila',
            province: 'Metro Manila',
            bio: 'Homeowner looking for services',
            service_preferences: ['Plumbing', 'Cleaning']
        })
        expect(result.percentage).toBe(100)
        expect(result.missing).toEqual([])
    })

    it('returns empty result for unknown role', () => {
        const result = calculateCompletion({ role: 'unknown' })
        expect(result.percentage).toBe(0)
        expect(result.missing).toEqual([])
    })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/profileCompletion.test.js`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```js
// src/utils/profileCompletion.js

const jobseekerChecks = [
    { key: 'profile_photo', label: 'Add a profile photo', weight: 5, test: (d) => !!d.profile_photo },
    { key: 'personal_info', label: 'Complete personal information', weight: 15, test: (d) => !!(d.full_name && d.date_of_birth && d.city && d.province) },
    { key: 'contact_info', label: 'Add contact information', weight: 10, test: (d) => !!d.mobile_number },
    { key: 'employment_prefs', label: 'Set employment preferences', weight: 10, test: (d) => !!(d.preferred_job_type?.length > 0 && d.preferred_job_location) },
    { key: 'education', label: 'Add educational background', weight: 15, test: (d) => !!(d.highest_education && d.school_name) },
    { key: 'skills', label: 'Add at least 3 skills', weight: 15, test: (d) => d.skills?.length >= 3 },
    { key: 'work_experience', label: 'Add work experience', weight: 10, test: (d) => d.work_experiences?.length > 0 },
    { key: 'resume', label: 'Upload your resume', weight: 10, test: (d) => !!d.resume_url },
    { key: 'certifications', label: 'Add certifications', weight: 5, test: (d) => d.certifications?.length > 0 },
    { key: 'portfolio', label: 'Add portfolio URL', weight: 5, test: (d) => !!d.portfolio_url },
]

const employerChecks = [
    { key: 'company_info', label: 'Complete company information', weight: 20, test: (d) => !!(d.company_name && d.employer_type && d.business_address && d.nature_of_business) },
    { key: 'representative', label: 'Add representative details', weight: 15, test: (d) => !!(d.representative_name && d.representative_position) },
    { key: 'documents', label: 'Upload business documents', weight: 20, test: (d) => !!(d.business_permit_url && d.gov_id_url) },
    { key: 'contact', label: 'Add contact details', weight: 15, test: (d) => !!(d.contact_email && d.contact_number) },
    { key: 'description', label: 'Add company description', weight: 10, test: (d) => !!d.company_description },
    { key: 'profile_photo', label: 'Upload company logo', weight: 10, test: (d) => !!d.profile_photo },
    { key: 'website', label: 'Add website or social links', weight: 10, test: (d) => !!(d.company_website || d.facebook_url || d.linkedin_url) },
]

const individualChecks = [
    { key: 'personal_info', label: 'Complete your name', weight: 25, test: (d) => !!d.full_name },
    { key: 'contact_info', label: 'Add contact number', weight: 20, test: (d) => !!d.contact_number },
    { key: 'profile_photo', label: 'Add a profile photo', weight: 15, test: (d) => !!d.profile_photo },
    { key: 'address', label: 'Add your address', weight: 15, test: (d) => !!(d.city && d.province) },
    { key: 'bio', label: 'Write a short bio', weight: 15, test: (d) => !!d.bio },
    { key: 'service_preferences', label: 'Add service preferences', weight: 10, test: (d) => d.service_preferences?.length > 0 },
]

const checksByRole = {
    jobseeker: jobseekerChecks,
    employer: employerChecks,
    individual: individualChecks,
}

export function calculateCompletion(userData) {
    if (!userData?.role) return { percentage: 0, missing: [] }

    const checks = checksByRole[userData.role]
    if (!checks) return { percentage: 0, missing: [] }

    let earned = 0
    const missing = []

    for (const check of checks) {
        if (check.test(userData)) {
            earned += check.weight
        } else {
            missing.push({ key: check.key, label: check.label })
        }
    }

    return { percentage: earned, missing }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/profileCompletion.test.js`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add src/utils/profileCompletion.js src/utils/profileCompletion.test.js
git commit -m "feat: add profile completion utility with role-based weight calculation"
```

---

### Task 2: ProfilePhotoUpload Component

**Files:**
- Create: `src/components/profile/ProfilePhotoUpload.jsx`
- Create: `src/components/profile/ProfilePhotoUpload.test.jsx`

**Step 1: Write the failing test**

```jsx
// src/components/profile/ProfilePhotoUpload.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePhotoUpload from './ProfilePhotoUpload'

describe('ProfilePhotoUpload', () => {
    it('shows initials when no photo is provided', () => {
        render(<ProfilePhotoUpload name="Juan Dela Cruz" onPhotoChange={vi.fn()} />)
        expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('shows image when photo URL is provided', () => {
        render(<ProfilePhotoUpload name="Juan" currentPhoto="data:image/jpeg;base64,abc" onPhotoChange={vi.fn()} />)
        const img = screen.getByAltText('Profile photo')
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc')
    })

    it('has a hidden file input', () => {
        render(<ProfilePhotoUpload name="Juan" onPhotoChange={vi.fn()} />)
        const input = document.querySelector('input[type="file"]')
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('accept', 'image/jpeg,image/png')
    })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/profile/ProfilePhotoUpload.test.jsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```jsx
// src/components/profile/ProfilePhotoUpload.jsx
import { useRef } from 'react'
import { Camera } from 'lucide-react'

const ProfilePhotoUpload = ({ name, currentPhoto, onPhotoChange, size = 'lg' }) => {
    const fileInputRef = useRef(null)

    const sizeClasses = size === 'lg'
        ? 'w-24 h-24 text-3xl'
        : 'w-16 h-16 text-xl'

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be under 2MB')
            return
        }

        // Compress to 200x200
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)
            const canvas = document.createElement('canvas')
            canvas.width = 200
            canvas.height = 200
            const ctx = canvas.getContext('2d')

            // Center-crop: use the smaller dimension as the crop square
            const minDim = Math.min(img.width, img.height)
            const sx = (img.width - minDim) / 2
            const sy = (img.height - minDim) / 2

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
            onPhotoChange(dataUrl)
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            alert('Failed to load image')
        }

        img.src = url
    }

    const initial = name?.charAt(0)?.toUpperCase() || '?'

    return (
        <div className="flex flex-col items-center">
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
            >
                {currentPhoto ? (
                    <img
                        src={currentPhoto}
                        alt="Profile photo"
                        className={`${sizeClasses} rounded-full object-cover shadow-lg`}
                    />
                ) : (
                    <div className={`${sizeClasses} bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg`}>
                        {initial}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                </div>
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
            />
            <p className="text-xs text-gray-400 mt-2">Click to change photo</p>
        </div>
    )
}

export default ProfilePhotoUpload
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/profile/ProfilePhotoUpload.test.jsx`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add src/components/profile/ProfilePhotoUpload.jsx src/components/profile/ProfilePhotoUpload.test.jsx
git commit -m "feat: add ProfilePhotoUpload component with compression and center-crop"
```

---

### Task 3: ProfileCompletionBar Component

**Files:**
- Create: `src/components/profile/ProfileCompletionBar.jsx`
- Create: `src/components/profile/ProfileCompletionBar.test.jsx`

**Step 1: Write the failing test**

```jsx
// src/components/profile/ProfileCompletionBar.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ProfileCompletionBar from './ProfileCompletionBar'

const wrap = (ui) => <BrowserRouter>{ui}</BrowserRouter>

describe('ProfileCompletionBar', () => {
    it('shows percentage text', () => {
        render(wrap(<ProfileCompletionBar percentage={75} missing={[]} editPath="/profile/edit" />))
        expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('shows missing items as hints', () => {
        const missing = [
            { key: 'photo', label: 'Add a profile photo' },
            { key: 'skills', label: 'Add at least 3 skills' }
        ]
        render(wrap(<ProfileCompletionBar percentage={50} missing={missing} editPath="/profile/edit" />))
        expect(screen.getByText('Add a profile photo')).toBeInTheDocument()
        expect(screen.getByText('Add at least 3 skills')).toBeInTheDocument()
    })

    it('shows green color when percentage >= 67', () => {
        const { container } = render(wrap(<ProfileCompletionBar percentage={80} missing={[]} editPath="/profile/edit" />))
        const bar = container.querySelector('[data-testid="completion-fill"]')
        expect(bar.className).toContain('bg-green')
    })

    it('shows no missing hints when 100%', () => {
        render(wrap(<ProfileCompletionBar percentage={100} missing={[]} editPath="/profile/edit" />))
        expect(screen.getByText('Profile complete!')).toBeInTheDocument()
    })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/profile/ProfileCompletionBar.test.jsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```jsx
// src/components/profile/ProfileCompletionBar.jsx
import { Link } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'

const ProfileCompletionBar = ({ percentage, missing, editPath }) => {
    const colorClass = percentage >= 67
        ? 'bg-green-500'
        : percentage >= 34
            ? 'bg-yellow-500'
            : 'bg-red-500'

    const bgColorClass = percentage >= 67
        ? 'bg-green-50 border-green-200'
        : percentage >= 34
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'

    return (
        <div className={`rounded-xl border p-4 ${bgColorClass}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    data-testid="completion-fill"
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {missing.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                    {missing.map((item) => (
                        <Link
                            key={item.key}
                            to={editPath}
                            className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 transition-colors"
                        >
                            <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Profile complete!
                </div>
            )}
        </div>
    )
}

export default ProfileCompletionBar
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/profile/ProfileCompletionBar.test.jsx`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/components/profile/ProfileCompletionBar.jsx src/components/profile/ProfileCompletionBar.test.jsx
git commit -m "feat: add ProfileCompletionBar component with color-coded progress"
```

---

### Task 4: Add New Fields to Jobseeker Profile Edit

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx`

This task adds the profile photo upload and 4 new fields (gender, civil status, PWD status, languages) to the existing jobseeker edit page.

**Step 1: Add imports and ProfilePhotoUpload at top of form**

At the top of `JobseekerProfileEdit.jsx`, add the import:

```jsx
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
```

Add new fields to `formData` initial state:

```js
// Add after portfolio_url in the formData useState:
gender: '',
civil_status: '',
is_pwd: false,
pwd_id_number: '',
languages: [],
```

Add to the `useEffect` that pre-populates form data — inside the `initial` object:

```js
gender: userData.gender || '',
civil_status: userData.civil_status || '',
is_pwd: userData.is_pwd || false,
pwd_id_number: userData.pwd_id_number || '',
languages: userData.languages || [],
```

**Step 2: Add language management state and helpers**

Add after the `newExp` state:

```jsx
const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Conversational' })

const addLanguage = () => {
    if (newLanguage.language.trim() && !formData.languages.some(l => l.language === newLanguage.language.trim())) {
        setFormData(prev => ({
            ...prev,
            languages: [...prev.languages, { language: newLanguage.language.trim(), proficiency: newLanguage.proficiency }]
        }))
        setNewLanguage({ language: '', proficiency: 'Conversational' })
    }
}

const removeLanguage = (lang) => {
    setFormData(prev => ({
        ...prev,
        languages: prev.languages.filter(l => l.language !== lang)
    }))
}
```

**Step 3: Add ProfilePhotoUpload to the header section**

Replace the existing header `<div className="text-center mb-8">` with:

```jsx
<div className="text-center mb-8">
    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Your Profile</h1>
    <p className="text-gray-600 mb-6">Update your information to keep your profile current</p>

    <div className="mb-6">
        <ProfilePhotoUpload
            name={formData.full_name}
            currentPhoto={formData.profile_photo || userData?.profile_photo}
            onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
        />
    </div>

    <button
        onClick={() => setShowAIModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-primary-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
    >
        <Sparkles className="w-4 h-4" />
        Auto-fill from Resume with AI
    </button>
</div>
```

Also add `profile_photo: ''` to the formData initial state.

**Step 4: Add new fields section after Personal Information section**

Insert this new section after the Personal Information `</div>` and before Employment Preferences:

```jsx
{/* Additional Personal Details */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-primary-600" />
        Additional Details
    </h2>
    <div className="grid md:grid-cols-2 gap-4">
        <div>
            <label className="label">Gender</label>
            <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-field"
            >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
            </select>
        </div>
        <div>
            <label className="label">Civil Status</label>
            <select
                name="civil_status"
                value={formData.civil_status}
                onChange={handleChange}
                className="input-field"
            >
                <option value="">Select civil status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
            </select>
        </div>
    </div>

    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
        <label className="flex items-center gap-3 cursor-pointer">
            <input
                type="checkbox"
                checked={formData.is_pwd}
                onChange={(e) => setFormData(prev => ({ ...prev, is_pwd: e.target.checked }))}
                className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Person with Disability (PWD)</span>
        </label>
        {formData.is_pwd && (
            <div className="mt-3">
                <label className="label">PWD ID Number (Optional)</label>
                <input
                    type="text"
                    name="pwd_id_number"
                    value={formData.pwd_id_number}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="PWD ID number"
                />
            </div>
        )}
    </div>
</div>

{/* Language Proficiency */}
<div>
    <h2 className="text-xl font-semibold text-gray-900 mb-4">Language Proficiency</h2>
    <div className="flex gap-2">
        <input
            type="text"
            value={newLanguage.language}
            onChange={(e) => setNewLanguage(prev => ({ ...prev, language: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
            className="input-field flex-1"
            placeholder="e.g. Filipino, English"
        />
        <select
            value={newLanguage.proficiency}
            onChange={(e) => setNewLanguage(prev => ({ ...prev, proficiency: e.target.value }))}
            className="input-field w-40"
        >
            <option value="Basic">Basic</option>
            <option value="Conversational">Conversational</option>
            <option value="Fluent">Fluent</option>
        </select>
        <button
            type="button"
            onClick={addLanguage}
            className="btn-secondary flex items-center gap-2"
        >
            <Plus className="w-4 h-4" /> Add
        </button>
    </div>
    {formData.languages.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
            {formData.languages.map((lang, index) => (
                <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                >
                    {lang.language} ({lang.proficiency})
                    <button
                        type="button"
                        onClick={() => removeLanguage(lang.language)}
                        className="hover:text-blue-900"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </span>
            ))}
        </div>
    )}
</div>
```

**Step 5: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: add profile photo, gender, civil status, PWD, languages to jobseeker profile"
```

---

### Task 5: Create EmployerProfileEdit Page

**Files:**
- Create: `src/pages/EmployerProfileEdit.jsx`

**Step 1: Create the full employer profile edit page**

```jsx
// src/pages/EmployerProfileEdit.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import {
    Building, Phone, Mail, MapPin, Briefcase, Globe, Save,
    Loader2, CheckCircle, AlertCircle, Users, Calendar, FileText, Link as LinkIcon
} from 'lucide-react'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'

const EmployerProfileEdit = () => {
    const { userData, currentUser } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        company_name: '',
        employer_type: '',
        business_reg_number: '',
        business_address: '',
        nature_of_business: '',
        representative_name: '',
        representative_position: '',
        contact_email: '',
        contact_number: '',
        preferred_contact_method: 'email',
        company_description: '',
        company_website: '',
        company_size: '',
        year_established: '',
        facebook_url: '',
        linkedin_url: '',
        profile_photo: ''
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (userData) {
            setFormData({
                company_name: userData.company_name || '',
                employer_type: userData.employer_type || '',
                business_reg_number: userData.business_reg_number || '',
                business_address: userData.business_address || '',
                nature_of_business: userData.nature_of_business || '',
                representative_name: userData.representative_name || '',
                representative_position: userData.representative_position || '',
                contact_email: userData.contact_email || '',
                contact_number: userData.contact_number || '',
                preferred_contact_method: userData.preferred_contact_method || 'email',
                company_description: userData.company_description || '',
                company_website: userData.company_website || '',
                company_size: userData.company_size || '',
                year_established: userData.year_established || '',
                facebook_url: userData.facebook_url || '',
                linkedin_url: userData.linkedin_url || '',
                profile_photo: userData.profile_photo || ''
            })
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (!formData.company_name || !formData.contact_email) {
                throw new Error('Company name and contact email are required.')
            }

            await updateDoc(doc(db, 'users', currentUser.uid), {
                ...formData,
                updated_at: new Date().toISOString()
            })

            setSuccess('Profile updated successfully!')
            setTimeout(() => navigate('/dashboard'), 2000)
        } catch (err) {
            setError(err.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const completion = calculateCompletion({ ...userData, ...formData })

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Company Profile</h1>
                    <p className="text-gray-600 mb-6">Keep your business information up to date</p>
                    <ProfilePhotoUpload
                        name={formData.company_name}
                        currentPhoto={formData.profile_photo}
                        onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
                    />
                </div>

                <div className="mb-6">
                    <ProfileCompletionBar
                        percentage={completion.percentage}
                        missing={completion.missing}
                        editPath="/profile/edit"
                    />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700 text-sm">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card space-y-8">
                    {/* Company Information */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary-600" />
                            Company Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Company Name *</label>
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Employer Type</label>
                                <select name="employer_type" value={formData.employer_type} onChange={handleChange} className="input-field">
                                    <option value="">Select type</option>
                                    <option value="company">Company</option>
                                    <option value="small_business">Small Business</option>
                                    <option value="individual">Individual</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Business Registration No. (DTI/SEC)</label>
                                <input type="text" name="business_reg_number" value={formData.business_reg_number} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Nature of Business</label>
                                <input type="text" name="nature_of_business" value={formData.nature_of_business} onChange={handleChange} className="input-field" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Business Address</label>
                                <textarea name="business_address" value={formData.business_address} onChange={handleChange} className="input-field resize-none" rows="2" />
                            </div>
                        </div>
                    </div>

                    {/* Company Details */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Company Details
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Company Size</label>
                                <select name="company_size" value={formData.company_size} onChange={handleChange} className="input-field">
                                    <option value="">Select size</option>
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-500">201-500 employees</option>
                                    <option value="500+">500+ employees</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Year Established</label>
                                <input type="number" name="year_established" value={formData.year_established} onChange={handleChange} className="input-field" placeholder="2010" min="1900" max={new Date().getFullYear()} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Company Description</label>
                                <textarea name="company_description" value={formData.company_description} onChange={handleChange} className="input-field resize-none" rows="4" placeholder="Tell jobseekers about your company..." />
                            </div>
                        </div>
                    </div>

                    {/* Representative */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary-600" />
                            Authorized Representative
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Representative Name</label>
                                <input type="text" name="representative_name" value={formData.representative_name} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Position</label>
                                <input type="text" name="representative_position" value={formData.representative_position} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-primary-600" />
                            Contact Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Contact Email *</label>
                                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Contact Number</label>
                                <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                    </div>

                    {/* Web Presence */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary-600" />
                            Web Presence
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">Company Website</label>
                                <input type="url" name="company_website" value={formData.company_website} onChange={handleChange} className="input-field" placeholder="https://yourcompany.com" />
                            </div>
                            <div>
                                <label className="label">Facebook Page</label>
                                <input type="url" name="facebook_url" value={formData.facebook_url} onChange={handleChange} className="input-field" placeholder="https://facebook.com/yourcompany" />
                            </div>
                            <div>
                                <label className="label">LinkedIn</label>
                                <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className="input-field" placeholder="https://linkedin.com/company/yourcompany" />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-5 h-5" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EmployerProfileEdit
```

**Step 2: Commit**

```bash
git add src/pages/EmployerProfileEdit.jsx
git commit -m "feat: add comprehensive employer profile edit page"
```

---

### Task 6: Create IndividualProfileEdit Page

**Files:**
- Create: `src/pages/IndividualProfileEdit.jsx`

**Step 1: Create the full individual profile edit page**

```jsx
// src/pages/IndividualProfileEdit.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import {
    User, Phone, MapPin, FileText, Save, Loader2, CheckCircle, AlertCircle, Plus, X, Home
} from 'lucide-react'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'

const IndividualProfileEdit = () => {
    const { userData, currentUser } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        full_name: '',
        contact_number: '',
        barangay: '',
        city: '',
        province: '',
        bio: '',
        service_preferences: [],
        profile_photo: ''
    })

    const [newService, setNewService] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (userData) {
            setFormData({
                full_name: userData.full_name || userData.name || '',
                contact_number: userData.contact_number || '',
                barangay: userData.barangay || '',
                city: userData.city || '',
                province: userData.province || '',
                bio: userData.bio || '',
                service_preferences: userData.service_preferences || [],
                profile_photo: userData.profile_photo || ''
            })
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const addService = () => {
        if (newService.trim() && !formData.service_preferences.includes(newService.trim())) {
            setFormData(prev => ({
                ...prev,
                service_preferences: [...prev.service_preferences, newService.trim()]
            }))
            setNewService('')
        }
    }

    const removeService = (service) => {
        setFormData(prev => ({
            ...prev,
            service_preferences: prev.service_preferences.filter(s => s !== service)
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (!formData.full_name) {
                throw new Error('Full name is required.')
            }

            await updateDoc(doc(db, 'users', currentUser.uid), {
                ...formData,
                name: formData.full_name,
                updated_at: new Date().toISOString()
            })

            setSuccess('Profile updated successfully!')
            setTimeout(() => navigate('/dashboard'), 2000)
        } catch (err) {
            setError(err.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const completion = calculateCompletion({ ...userData, ...formData })

    const suggestedServices = [
        'House Cleaning', 'Plumbing', 'Electrical Work', 'Carpentry',
        'Gardening', 'Tutoring', 'Painting', 'Cooking', 'Laundry', 'Driving'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Your Profile</h1>
                    <p className="text-gray-600 mb-6">Keep your information up to date</p>
                    <ProfilePhotoUpload
                        name={formData.full_name}
                        currentPhoto={formData.profile_photo}
                        onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
                    />
                </div>

                <div className="mb-6">
                    <ProfileCompletionBar
                        percentage={completion.percentage}
                        missing={completion.missing}
                        editPath="/profile/edit"
                    />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700 text-sm">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card space-y-8">
                    {/* Personal Information */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Personal Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">Full Name *</label>
                                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Contact Number</label>
                                <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} className="input-field" placeholder="09XX XXX XXXX" />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Home className="w-5 h-5 text-primary-600" />
                            Address
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="label">Barangay</label>
                                <input type="text" name="barangay" value={formData.barangay} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Province</label>
                                <input type="text" name="province" value={formData.province} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            About You
                        </h2>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className="input-field resize-none"
                            rows="4"
                            placeholder="Tell us a bit about yourself and what services you're looking for..."
                        />
                    </div>

                    {/* Service Preferences */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Preferences</h2>
                        <p className="text-sm text-gray-500 mb-3">What kind of services are you looking for?</p>

                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newService}
                                onChange={(e) => setNewService(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                                className="input-field flex-1"
                                placeholder="e.g. House Cleaning"
                            />
                            <button type="button" onClick={addService} className="btn-secondary flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {suggestedServices
                                .filter(s => !formData.service_preferences.includes(s))
                                .map(suggestion => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            service_preferences: [...prev.service_preferences, suggestion]
                                        }))}
                                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-primary-100 hover:text-primary-700 transition-colors"
                                    >
                                        + {suggestion}
                                    </button>
                                ))}
                        </div>

                        {formData.service_preferences.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formData.service_preferences.map((service, index) => (
                                    <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                                        {service}
                                        <button type="button" onClick={() => removeService(service)} className="hover:text-primary-900">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-5 h-5" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default IndividualProfileEdit
```

**Step 2: Commit**

```bash
git add src/pages/IndividualProfileEdit.jsx
git commit -m "feat: add comprehensive individual profile edit page with service preferences"
```

---

### Task 7: Update Profile.jsx to Redirect All Roles

**Files:**
- Modify: `src/pages/Profile.jsx`

**Step 1: Update Profile.jsx to redirect all roles to their specific edit pages**

Replace the entire `Profile.jsx` content. The page already redirects jobseekers; now it redirects employers and individuals too. If somehow an unknown role lands here, show the basic form as a fallback.

At the top of the component, update the redirect logic:

Replace the existing `useEffect` that redirects jobseekers:

```jsx
// Redirect jobseekers to comprehensive profile edit page
useEffect(() => {
    if (isJobseeker()) {
        navigate('/profile/edit')
    }
}, [isJobseeker, navigate])
```

With:

```jsx
// Redirect all roles to their comprehensive profile edit pages
useEffect(() => {
    if (userData?.role) {
        navigate('/profile/edit')
    }
}, [userData?.role, navigate])
```

This works because `/profile/edit` is a single route that we'll point to different components based on role (handled in the next task via App.jsx).

Actually, it's simpler to just redirect to role-specific paths. Replace with:

```jsx
useEffect(() => {
    if (userData?.role) {
        navigate('/profile/edit', { replace: true })
    }
}, [userData?.role, navigate])
```

**Step 2: Commit**

```bash
git add src/pages/Profile.jsx
git commit -m "feat: redirect all user roles to comprehensive profile edit page"
```

---

### Task 8: Create PublicProfile Page

**Files:**
- Create: `src/pages/PublicProfile.jsx`

**Step 1: Create the public profile page**

```jsx
// src/pages/PublicProfile.jsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import {
    MapPin, Briefcase, GraduationCap, Award, Globe, Calendar, Users,
    ExternalLink, MessageSquare, ArrowLeft, Loader2, Building, Link as LinkIcon
} from 'lucide-react'

const PublicProfile = () => {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { currentUser } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId))
                if (userDoc.exists()) {
                    setProfile(userDoc.data())
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [userId])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
                    <p className="text-gray-600 mb-4">This user profile does not exist or has been removed.</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
                </div>
            </div>
        )
    }

    const isOwn = currentUser?.uid === userId

    const initial = (profile.full_name || profile.company_name || profile.name || '?').charAt(0).toUpperCase()

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>

                {/* Profile Header */}
                <div className="card mb-6">
                    <div className="flex flex-col items-center text-center">
                        {profile.profile_photo ? (
                            <img src={profile.profile_photo} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-lg mb-4" />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                                {initial}
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {profile.role === 'employer' ? profile.company_name : (profile.full_name || profile.name)}
                        </h1>
                        {profile.role === 'employer' && profile.nature_of_business && (
                            <p className="text-gray-500 mt-1">{profile.nature_of_business}</p>
                        )}
                        {(profile.city || profile.province || profile.business_address) && (
                            <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {profile.role === 'employer'
                                    ? profile.business_address
                                    : [profile.city, profile.province].filter(Boolean).join(', ')}
                            </p>
                        )}
                        <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                            {profile.role}
                        </span>
                    </div>
                </div>

                {/* Role-specific content */}
                {profile.role === 'jobseeker' && (
                    <JobseekerProfile profile={profile} />
                )}
                {profile.role === 'employer' && (
                    <EmployerProfile profile={profile} />
                )}
                {profile.role === 'individual' && (
                    <IndividualProfile profile={profile} />
                )}

                {/* Actions */}
                {currentUser && !isOwn && (
                    <div className="card mt-6">
                        <Link
                            to={`/messages?startWith=${userId}`}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-5 h-5" /> Send Message
                        </Link>
                    </div>
                )}
                {isOwn && (
                    <div className="card mt-6">
                        <Link to="/profile/edit" className="btn-secondary w-full flex items-center justify-center gap-2">
                            Edit Profile
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

const JobseekerProfile = ({ profile }) => (
    <div className="space-y-6">
        {profile.bio && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
        )}

        {profile.skills?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">{skill}</span>
                    ))}
                </div>
            </div>
        )}

        {(profile.highest_education || profile.school_name) && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary-600" /> Education
                </h2>
                <p className="font-medium text-gray-900">{profile.highest_education}</p>
                {profile.school_name && <p className="text-gray-600">{profile.school_name}</p>}
                {profile.course_or_field && <p className="text-gray-500 text-sm">{profile.course_or_field}</p>}
                {profile.year_graduated && <p className="text-gray-400 text-sm">Graduated {profile.year_graduated}</p>}
            </div>
        )}

        {profile.work_experiences?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary-600" /> Work Experience
                </h2>
                <div className="space-y-4">
                    {profile.work_experiences.map((exp, i) => (
                        <div key={i} className="border-l-2 border-primary-200 pl-4">
                            <p className="font-medium text-gray-900">{exp.position}</p>
                            <p className="text-gray-600 text-sm">{exp.company}</p>
                            <p className="text-gray-400 text-xs">{exp.duration}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {profile.certifications?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary-600" /> Certifications
                </h2>
                <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((cert, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{cert}</span>
                    ))}
                </div>
            </div>
        )}

        {profile.languages?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Languages</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {lang.language} — {lang.proficiency}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {profile.portfolio_url && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Portfolio</h2>
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline flex items-center gap-1">
                    {profile.portfolio_url} <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        )}
    </div>
)

const EmployerProfile = ({ profile }) => (
    <div className="space-y-6">
        {profile.company_description && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About the Company</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.company_description}</p>
            </div>
        )}

        <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary-600" /> Company Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                {profile.company_size && (
                    <div>
                        <p className="text-gray-500">Company Size</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1"><Users className="w-4 h-4" /> {profile.company_size}</p>
                    </div>
                )}
                {profile.year_established && (
                    <div>
                        <p className="text-gray-500">Established</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1"><Calendar className="w-4 h-4" /> {profile.year_established}</p>
                    </div>
                )}
                {profile.employer_type && (
                    <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-medium text-gray-900 capitalize">{profile.employer_type.replace('_', ' ')}</p>
                    </div>
                )}
            </div>
        </div>

        {(profile.company_website || profile.facebook_url || profile.linkedin_url) && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-600" /> Links
                </h2>
                <div className="space-y-2">
                    {profile.company_website && (
                        <a href={profile.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                            <Globe className="w-4 h-4" /> Website <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    {profile.facebook_url && (
                        <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                            Facebook <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                            LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        )}

        <div className="card">
            <Link to={`/jobs?employer=${profile.uid}`} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Briefcase className="w-5 h-5" /> View Job Listings
            </Link>
        </div>
    </div>
)

const IndividualProfile = ({ profile }) => (
    <div className="space-y-6">
        {profile.bio && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
        )}

        {profile.service_preferences?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Looking For</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.service_preferences.map((service, i) => (
                        <span key={i} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">{service}</span>
                    ))}
                </div>
            </div>
        )}
    </div>
)

export default PublicProfile
```

**Step 2: Commit**

```bash
git add src/pages/PublicProfile.jsx
git commit -m "feat: add public profile page with role-specific views"
```

---

### Task 9: Update App.jsx Routes

**Files:**
- Modify: `src/App.jsx`

**Step 1: Add imports for new pages**

Add after the existing protected page imports:

```jsx
import EmployerProfileEdit from './pages/EmployerProfileEdit'
import IndividualProfileEdit from './pages/IndividualProfileEdit'
import PublicProfile from './pages/PublicProfile'
```

**Step 2: Add the profile edit route that renders the right component per role**

Replace the existing `/profile/edit` route:

```jsx
<Route
    path="/profile/edit"
    element={
        <ProtectedRoute allowedRoles={['jobseeker']}>
            <ErrorBoundary><JobseekerProfileEdit /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
```

With three role-specific routes:

```jsx
<Route
    path="/profile/edit"
    element={
        <ProtectedRoute allowedRoles={['jobseeker']}>
            <ErrorBoundary><JobseekerProfileEdit /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
<Route
    path="/profile/edit/employer"
    element={
        <ProtectedRoute allowedRoles={['employer']}>
            <ErrorBoundary><EmployerProfileEdit /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
<Route
    path="/profile/edit/individual"
    element={
        <ProtectedRoute allowedRoles={['individual']}>
            <ErrorBoundary><IndividualProfileEdit /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
```

**Step 3: Add public profile route**

Add before the 404 route:

```jsx
{/* Public Profile */}
<Route
    path="/profile/:userId"
    element={
        <ProtectedRoute>
            <ErrorBoundary><PublicProfile /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
```

**Step 4: Update Profile.jsx redirect logic**

In `src/pages/Profile.jsx`, update the redirect to be role-aware:

```jsx
useEffect(() => {
    if (userData?.role === 'jobseeker') {
        navigate('/profile/edit', { replace: true })
    } else if (userData?.role === 'employer') {
        navigate('/profile/edit/employer', { replace: true })
    } else if (userData?.role === 'individual') {
        navigate('/profile/edit/individual', { replace: true })
    }
}, [userData?.role, navigate])
```

**Step 5: Commit**

```bash
git add src/App.jsx src/pages/Profile.jsx
git commit -m "feat: add routes for employer/individual profile edit and public profiles"
```

---

### Task 10: Add ProfileCompletionBar to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`

**Step 1: Add imports**

Add at top of `Dashboard.jsx`:

```jsx
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'
```

**Step 2: Calculate completion and determine edit path**

Inside the `Dashboard` component, after the `quickActions` logic, add:

```jsx
const completion = userData ? calculateCompletion(userData) : { percentage: 0, missing: [] }
const editPath = isEmployer() ? '/profile/edit/employer'
    : isIndividual() ? '/profile/edit/individual'
    : '/profile/edit'
```

**Step 3: Add the completion bar to the UI**

Insert right after the verification status banners and before the Quick Actions section (after the `isVerified()` green banner `</div>`):

```jsx
{/* Profile Completion */}
{completion.percentage < 100 && (
    <div className="mb-8">
        <ProfileCompletionBar
            percentage={completion.percentage}
            missing={completion.missing}
            editPath={editPath}
        />
    </div>
)}
```

**Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: add profile completion bar to dashboard"
```

---

### Task 11: Add Profile Links to Existing Pages

**Files:**
- Modify: `src/pages/employer/JobApplicants.jsx`
- Modify: `src/pages/JobDetail.jsx`

**Step 1: Link applicant names in JobApplicants.jsx**

In `src/pages/employer/JobApplicants.jsx`, find the applicant name display (line ~193):

```jsx
<h3 className="text-xl font-bold text-gray-900">{app.applicant_name}</h3>
```

Replace with:

```jsx
<Link to={`/profile/${app.user_id}`} className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
    {app.applicant_name}
</Link>
```

Note: `Link` is already imported from `react-router-dom` in this file.

**Step 2: Link employer name in JobDetail.jsx**

In `src/pages/JobDetail.jsx`, find the employer name display (line ~264):

```jsx
<p className="text-gray-600 mb-3">{job.employer_name || 'Employer'}</p>
```

Replace with:

```jsx
{job.employer_id ? (
    <Link to={`/profile/${job.employer_id}`} className="text-gray-600 mb-3 hover:text-primary-600 transition-colors inline-block">
        {job.employer_name || 'Employer'}
    </Link>
) : (
    <p className="text-gray-600 mb-3">{job.employer_name || 'Employer'}</p>
)}
```

Note: `Link` needs to be imported. Add it to the existing import from `react-router-dom`:

```jsx
import { useParams, useNavigate, Link } from 'react-router-dom'
```

**Step 3: Commit**

```bash
git add src/pages/employer/JobApplicants.jsx src/pages/JobDetail.jsx
git commit -m "feat: link applicant and employer names to public profiles"
```

---

### Task 12: Run Full Test Suite and Verify

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new)

**Step 2: Run the build to check for compilation errors**

Run: `npx vite build`
Expected: Build succeeds with no errors

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test/build issues from profile completeness upgrade"
```

---

## Summary of All Files

**New files (6):**
1. `src/utils/profileCompletion.js`
2. `src/utils/profileCompletion.test.js`
3. `src/components/profile/ProfilePhotoUpload.jsx`
4. `src/components/profile/ProfilePhotoUpload.test.jsx`
5. `src/components/profile/ProfileCompletionBar.jsx`
6. `src/components/profile/ProfileCompletionBar.test.jsx`
7. `src/pages/EmployerProfileEdit.jsx`
8. `src/pages/IndividualProfileEdit.jsx`
9. `src/pages/PublicProfile.jsx`

**Modified files (5):**
1. `src/pages/JobseekerProfileEdit.jsx` — photo upload + new fields
2. `src/pages/Profile.jsx` — role-aware redirect
3. `src/App.jsx` — new routes
4. `src/pages/Dashboard.jsx` — completion bar
5. `src/pages/employer/JobApplicants.jsx` — profile links
6. `src/pages/JobDetail.jsx` — profile links
