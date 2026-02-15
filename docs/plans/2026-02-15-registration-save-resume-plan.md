# Save & Resume Registration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to create their Firebase Auth account on Step 1, save registration progress to Firestore after each subsequent step, and resume from where they left off on next login.

**Architecture:** Firebase Auth account created on Step 1 (email + password). Minimal Firestore doc created immediately with `registration_complete: false` and `registration_step: 1`. Each subsequent step calls `updateDoc` to save fields incrementally. On login, incomplete users see a "Complete Registration" banner on the dashboard. A new `/register/continue` route loads the appropriate wizard at the saved step.

**Tech Stack:** React 18, Firebase Auth, Firestore (setDoc/updateDoc/onSnapshot), React Router 6, Tailwind CSS, Lucide React icons, Vitest + @testing-library/react

---

## Task 1: Add new AuthContext methods for incremental registration

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

**What to do:**

Add three new methods to AuthContext while keeping the existing `registerJobseeker`, `registerEmployer`, `registerIndividual` methods intact (we'll migrate the registration pages to use the new methods in later tasks, then remove the old ones).

**Step 1: Add `createAccount` method**

Add this method after the existing `compressAndEncode` function (after line 78) in `AuthContext.jsx`:

```jsx
// Create Firebase Auth account and minimal Firestore doc (Step 1 of registration)
const createAccount = async (email, password, role) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    const minimalDoc = {
        uid: user.uid,
        email: email,
        role: role,
        name: '',
        registration_complete: false,
        registration_step: 1,
        is_verified: role === 'individual',
        skills: [],
        credentials_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    await setDoc(doc(db, 'users', user.uid), minimalDoc)
    return { user, userData: minimalDoc }
}
```

**Step 2: Add `saveRegistrationStep` method**

Add this right after `createAccount`:

```jsx
// Save registration step data to Firestore
const saveRegistrationStep = async (stepData, stepNumber) => {
    if (!currentUser) throw new Error('No authenticated user')
    await updateDoc(doc(db, 'users', currentUser.uid), {
        ...stepData,
        registration_step: stepNumber,
        updated_at: new Date().toISOString()
    })
}
```

**Step 3: Add `completeRegistration` method**

Add this right after `saveRegistrationStep`:

```jsx
// Mark registration as complete
const completeRegistration = async (finalData = {}) => {
    if (!currentUser) throw new Error('No authenticated user')
    await updateDoc(doc(db, 'users', currentUser.uid), {
        ...finalData,
        registration_complete: true,
        registration_step: null,
        updated_at: new Date().toISOString()
    })
}
```

**Step 4: Add `compressAndEncode` to the context value**

The `compressAndEncode` utility is currently a private function inside AuthProvider. We need to expose it so registration pages can encode files before saving step data.

In the `value` object (around line 438), add the three new methods and `compressAndEncode`:

```jsx
const value = {
    currentUser,
    userData,
    loading,
    register,
    registerJobseeker,
    registerEmployer,
    registerIndividual,
    createAccount,
    saveRegistrationStep,
    completeRegistration,
    compressAndEncode,
    login,
    logout,
    isVerified,
    hasRole,
    isAdmin,
    isEmployer,
    isJobseeker,
    isIndividual
}
```

Also add `updateDoc` to the Firestore import at line 8:

```jsx
import { doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
```

**Step 5: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "feat: add incremental registration methods to AuthContext"
```

---

## Task 2: Refactor JobseekerRegistration to use incremental saves

**Files:**
- Modify: `src/pages/JobseekerRegistration.jsx`

**What to do:**

Restructure the jobseeker registration so that:
- Step 1 creates the Firebase Auth account immediately via `createAccount()`
- Steps 2-5 save data to Firestore via `saveRegistrationStep()`
- Step 6 calls `completeRegistration()` and sends the confirmation email
- On load, if `userData` exists with `registration_complete === false`, pre-fill form and jump to the saved step

**Step 1: Update imports and auth hook**

Replace line 74:
```jsx
const { registerJobseeker } = useAuth()
```
with:
```jsx
const { createAccount, saveRegistrationStep, completeRegistration, compressAndEncode, currentUser, userData } = useAuth()
```

Add `useEffect` to the import on line 1:
```jsx
import { useState, useCallback, useEffect } from 'react'
```

Add import for the email service at the top:
```jsx
import { sendJobseekerRegistrationEmail } from '../services/emailService'
```

**Step 2: Add resume-from-saved-step logic**

Add this `useEffect` after the state declarations (after line 72), before the `handleBlur`:

```jsx
const [accountCreated, setAccountCreated] = useState(false)
const [saving, setSaving] = useState(false)

// Resume from saved step if user has incomplete registration
useEffect(() => {
    if (userData && userData.registration_complete === false && userData.role === 'jobseeker') {
        setAccountCreated(true)
        // Pre-fill form data from saved Firestore data
        setFormData(prev => ({
            ...prev,
            email: userData.email || '',
            full_name: userData.full_name || '',
            date_of_birth: userData.date_of_birth || '',
            barangay: userData.barangay || '',
            city: userData.city || '',
            province: userData.province || '',
            mobile_number: userData.mobile_number || '',
            preferred_contact_method: userData.preferred_contact_method || 'email',
            preferred_job_type: userData.preferred_job_type || [],
            preferred_job_location: userData.preferred_job_location || '',
            expected_salary_min: userData.expected_salary_min || '',
            expected_salary_max: userData.expected_salary_max || '',
            willing_to_relocate: userData.willing_to_relocate || 'no',
            highest_education: userData.highest_education || '',
            school_name: userData.school_name || '',
            course_or_field: userData.course_or_field || '',
            year_graduated: userData.year_graduated || '',
            skills: userData.skills || [],
            work_experiences: userData.work_experiences || [],
            certifications: userData.certifications || [],
            portfolio_url: userData.portfolio_url || '',
            terms_accepted: userData.terms_accepted || false,
            data_processing_consent: userData.data_processing_consent || false,
            peso_verification_consent: userData.peso_verification_consent || false,
            info_accuracy_confirmation: userData.info_accuracy_confirmation || false,
        }))
        // Jump to the next step after the last saved one
        const savedStep = userData.registration_step || 1
        setCurrentStep(Math.min(savedStep + 1, totalSteps))
    }
}, [userData])
```

**Step 3: Replace `nextStep` to save after each step**

Replace the existing `nextStep` function with:

```jsx
const nextStep = async () => {
    if (!validateStep(currentStep)) return

    // Step 1: Create account
    if (currentStep === 1 && !accountCreated) {
        setLoading(true)
        setError('')
        try {
            await createAccount(formData.email, formData.password, 'jobseeker')
            setAccountCreated(true)
            setCurrentStep(2)
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists.')
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.')
            } else {
                setError(err.message || 'Failed to create account. Please try again.')
            }
        } finally {
            setLoading(false)
        }
        return
    }

    // Steps 2-5: Save step data to Firestore
    setSaving(true)
    try {
        const stepData = getStepData(currentStep)
        await saveRegistrationStep(stepData, currentStep)
        setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } catch (err) {
        console.error('Error saving step:', err)
        setError('Failed to save progress. Please try again.')
    } finally {
        setSaving(false)
    }
}
```

**Step 4: Add `getStepData` helper**

Add this function before `nextStep`:

```jsx
const getStepData = (step) => {
    switch (step) {
        case 2:
            return {
                name: formData.full_name,
                full_name: formData.full_name,
                date_of_birth: formData.date_of_birth,
                barangay: formData.barangay,
                city: formData.city,
                province: formData.province,
                mobile_number: formData.mobile_number,
                preferred_contact_method: formData.preferred_contact_method,
            }
        case 3:
            return {
                preferred_job_type: formData.preferred_job_type,
                preferred_job_location: formData.preferred_job_location,
                expected_salary_min: formData.expected_salary_min,
                expected_salary_max: formData.expected_salary_max,
                willing_to_relocate: formData.willing_to_relocate,
            }
        case 4:
            return {
                highest_education: formData.highest_education,
                school_name: formData.school_name,
                course_or_field: formData.course_or_field,
                year_graduated: formData.year_graduated,
            }
        case 5:
            return {
                skills: formData.skills,
                work_experiences: formData.work_experiences,
                certifications: formData.certifications,
                portfolio_url: formData.portfolio_url,
            }
        default:
            return {}
    }
}
```

**Step 5: Replace `handleSubmit` for Step 6 (final)**

Replace the existing `handleSubmit` with:

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(currentStep)) return

    setLoading(true)
    setError('')

    try {
        // Encode resume and certificates
        let resumeData = ''
        if (resumeFile) {
            resumeData = await compressAndEncode(resumeFile)
        }
        let certificatesData = []
        if (certificateFiles && certificateFiles.length > 0) {
            for (const file of certificateFiles) {
                const encoded = await compressAndEncode(file)
                certificatesData.push({ name: file.name, data: encoded, type: file.type })
            }
        }

        await completeRegistration({
            resume_url: resumeData,
            certificate_urls: certificatesData,
            terms_accepted: formData.terms_accepted,
            data_processing_consent: formData.data_processing_consent,
            peso_verification_consent: formData.peso_verification_consent,
            info_accuracy_confirmation: formData.info_accuracy_confirmation,
            jobseeker_status: 'pending',
            rejection_reason: '',
        })

        // Send confirmation email (non-blocking)
        try {
            await sendJobseekerRegistrationEmail({
                email: formData.email,
                full_name: formData.full_name
            })
        } catch (emailErr) {
            console.error('Failed to send registration email:', emailErr)
        }

        navigate('/dashboard')
    } catch (err) {
        console.error('Registration error:', err)
        setError(err.message || 'Failed to complete registration. Please try again.')
    } finally {
        setLoading(false)
    }
}
```

**Step 6: Update the Next button to show saving state**

In the navigation buttons section (around line 443), update the Next button:

```jsx
{currentStep < totalSteps ? (
    <button
        type="button"
        onClick={nextStep}
        disabled={loading || saving}
        className="btn-primary flex-1 flex items-center justify-center gap-2"
    >
        {(loading || saving) ? (
            <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {currentStep === 1 ? 'Creating account...' : 'Saving...'}
            </>
        ) : (
            <>
                Next
                <ChevronRight className="w-5 h-5" />
            </>
        )}
    </button>
) : (
    // ... keep existing submit button
)}
```

**Step 7: Also update the Previous button to prevent going back to Step 1 after account creation**

In the navigation buttons, update the condition for the Previous button:

```jsx
{currentStep > 1 && !(currentStep === 2 && accountCreated) && (
    <button
        type="button"
        onClick={prevStep}
        className="btn-secondary flex items-center gap-2"
    >
        <ChevronLeft className="w-5 h-5" />
        Previous
    </button>
)}
```

This prevents the user from going back to Step 1 (credentials) once the account is already created.

**Step 8: Handle the resume file on Step 5 — encode and save immediately**

Currently resume/certificates are only encoded at final submit. For save & resume to work with files, we need to encode them when the user moves past Step 5. Update the `getStepData` case 5 to be async and handle file encoding.

Actually, file encoding is complex — files are in-memory File objects that can't persist across sessions. The design says to encode and save on Step 5. But since `getStepData` is called synchronously inside `nextStep`, we need to handle Step 5 specially.

Replace the Step 5 save logic in `nextStep`. After the `setSaving(true)` line, change the try block:

```jsx
setSaving(true)
try {
    let stepData = getStepData(currentStep)

    // Step 5: Also encode and save resume/certificates
    if (currentStep === 5) {
        let resumeData = ''
        if (resumeFile) {
            resumeData = await compressAndEncode(resumeFile)
        }
        let certificatesData = []
        if (certificateFiles && certificateFiles.length > 0) {
            for (const file of certificateFiles) {
                const encoded = await compressAndEncode(file)
                certificatesData.push({ name: file.name, data: encoded, type: file.type })
            }
        }
        stepData = { ...stepData, resume_url: resumeData, certificate_urls: certificatesData }
    }

    await saveRegistrationStep(stepData, currentStep)
    setCurrentStep(prev => Math.min(prev + 1, totalSteps))
} catch (err) {
    console.error('Error saving step:', err)
    setError('Failed to save progress. Please try again.')
} finally {
    setSaving(false)
}
```

And update `handleSubmit` to NOT re-encode files if they were already saved (check if `userData` already has `resume_url`):

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(currentStep)) return

    setLoading(true)
    setError('')

    try {
        const finalData = {
            terms_accepted: formData.terms_accepted,
            data_processing_consent: formData.data_processing_consent,
            peso_verification_consent: formData.peso_verification_consent,
            info_accuracy_confirmation: formData.info_accuracy_confirmation,
            jobseeker_status: 'pending',
            rejection_reason: '',
        }

        // Only encode files if not already saved from Step 5
        if (resumeFile && !userData?.resume_url) {
            finalData.resume_url = await compressAndEncode(resumeFile)
        }
        if (certificateFiles.length > 0 && !userData?.certificate_urls?.length) {
            const certificatesData = []
            for (const file of certificateFiles) {
                const encoded = await compressAndEncode(file)
                certificatesData.push({ name: file.name, data: encoded, type: file.type })
            }
            finalData.certificate_urls = certificatesData
        }

        await completeRegistration(finalData)

        try {
            await sendJobseekerRegistrationEmail({
                email: formData.email || userData?.email,
                full_name: formData.full_name || userData?.full_name
            })
        } catch (emailErr) {
            console.error('Failed to send registration email:', emailErr)
        }

        navigate('/dashboard')
    } catch (err) {
        console.error('Registration error:', err)
        setError(err.message || 'Failed to complete registration. Please try again.')
    } finally {
        setLoading(false)
    }
}
```

**Step 9: Update Step 5 resume validation**

The current `validateStep` for Step 5 requires `resumeFile` to be set. But when resuming, the file was already encoded and saved. Update the validation:

```jsx
case 5:
    if (formData.skills.length === 0) {
        setError('Please add at least one skill')
        return false
    }
    if (!resumeFile && !userData?.resume_url) {
        setError('Please upload your resume')
        return false
    }
    break
```

**Step 10: Commit**

```bash
git add src/pages/JobseekerRegistration.jsx
git commit -m "feat: refactor jobseeker registration to save progress incrementally"
```

---

## Task 3: Refactor EmployerRegistration to use incremental saves

**Files:**
- Modify: `src/pages/EmployerRegistration.jsx`

**What to do:**

The employer registration currently has 4 steps with account creation on Step 4 (last). We need to restructure so Step 1 is account creation (email + password), then Steps 2-4 save business info incrementally.

**New step order:**
1. Account credentials (email, password) — calls `createAccount()`
2. Business information (company_name, employer_type, etc.) — saves to Firestore
3. Representative & contact + gov ID — saves to Firestore
4. Documents + agreements — calls `completeRegistration()`

**Step 1: Update imports**

Replace line 36:
```jsx
const { registerEmployer } = useAuth()
```
with:
```jsx
const { createAccount, saveRegistrationStep, completeRegistration, compressAndEncode, currentUser, userData } = useAuth()
```

Add `useEffect` to the React import:
```jsx
import { useState, useCallback, useEffect } from 'react'
```

Add email service import:
```jsx
import { sendEmployerRegistrationEmail } from '../services/emailService'
```

**Step 2: Reorder STEPS array**

Replace the STEPS array:

```jsx
const STEPS = [
    { id: 1, title: 'Account', icon: Lock },
    { id: 2, title: 'Business Info', icon: Building2 },
    { id: 3, title: 'Representative', icon: User },
    { id: 4, title: 'Documents', icon: FileText },
]
```

**Step 3: Add email/password to formData and new state**

Add `email` and `password` fields are already in formData. Add new state:

```jsx
const [accountCreated, setAccountCreated] = useState(false)
const [saving, setSaving] = useState(false)
```

**Step 4: Add resume-from-saved-step useEffect**

After state declarations:

```jsx
useEffect(() => {
    if (userData && userData.registration_complete === false && userData.role === 'employer') {
        setAccountCreated(true)
        setFormData(prev => ({
            ...prev,
            email: userData.email || '',
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
            terms_accepted: userData.terms_accepted || false,
            peso_consent: userData.peso_consent || false,
            labor_compliance: userData.labor_compliance || false,
        }))
        const savedStep = userData.registration_step || 1
        setCurrentStep(Math.min(savedStep + 1, 4))
    }
}, [userData])
```

**Step 5: Reorder `renderStep` to match new step order**

- Step 1: Account credentials (email, password, confirm) — move current Step 4 content here
- Step 2: Business info — current Step 1 content
- Step 3: Representative & contact + gov ID — current Step 2 content
- Step 4: Documents + agreements — current Step 3 content + agreement checkboxes

Rearrange the `renderStep` switch cases accordingly. Step 1 should render the email/password/confirm password fields plus password strength. Steps 2-4 render the business info, representative, and documents/agreements.

**Step 6: Reorder `validateStep`**

```jsx
const validateStep = (step) => {
    switch (step) {
        case 1:
            if (!formData.email.trim()) return 'Email is required.'
            if (!formData.password) return 'Password is required.'
            if (formData.password.length < 6) return 'Password must be at least 6 characters.'
            if (formData.password !== formData.confirmPassword) return 'Passwords do not match.'
            return null
        case 2:
            if (!formData.company_name.trim()) return 'Company or business name is required.'
            if (!formData.employer_type) return 'Please select an employer type.'
            if (!formData.business_address.trim()) return 'Business address is required.'
            if (!formData.nature_of_business.trim()) return 'Nature of business is required.'
            return null
        case 3:
            if (!formData.representative_name.trim()) return 'Representative full name is required.'
            if (!formData.representative_position.trim()) return 'Position or role is required.'
            if (!govIdFile && !userData?.gov_id_url) return 'Please upload a government-issued ID.'
            if (!formData.contact_email.trim()) return 'Official email address is required.'
            if (!formData.contact_number.trim()) return 'Contact number is required.'
            return null
        case 4:
            if (!businessPermitFile && !userData?.business_permit_url) return 'Please upload a business permit or registration certificate.'
            if (!formData.terms_accepted) return 'You must accept the Terms and Conditions.'
            if (!formData.peso_consent) return 'You must consent to PESO verification.'
            if (!formData.labor_compliance) return 'You must confirm compliance with labor regulations.'
            return null
        default:
            return null
    }
}
```

**Step 7: Replace `nextStep` with incremental save logic**

```jsx
const nextStep = async () => {
    const validationError = validateStep(currentStep)
    if (validationError) {
        setError(validationError)
        return
    }
    setError('')

    // Step 1: Create account
    if (currentStep === 1 && !accountCreated) {
        setLoading(true)
        try {
            await createAccount(formData.email, formData.password, 'employer')
            setAccountCreated(true)
            setCurrentStep(2)
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists.')
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak.')
            } else {
                setError(err.message || 'Failed to create account.')
            }
        } finally {
            setLoading(false)
        }
        return
    }

    // Steps 2-3: Save to Firestore
    setSaving(true)
    try {
        let stepData = {}
        if (currentStep === 2) {
            stepData = {
                company_name: formData.company_name,
                name: formData.representative_name || formData.company_name,
                employer_type: formData.employer_type,
                business_reg_number: formData.business_reg_number,
                business_address: formData.business_address,
                nature_of_business: formData.nature_of_business,
            }
        } else if (currentStep === 3) {
            stepData = {
                representative_name: formData.representative_name,
                representative_position: formData.representative_position,
                name: formData.representative_name,
                contact_email: formData.contact_email,
                contact_number: formData.contact_number,
                preferred_contact_method: formData.preferred_contact_method,
            }
            // Encode and save gov ID
            if (govIdFile) {
                stepData.gov_id_url = await compressAndEncode(govIdFile)
            }
        }
        await saveRegistrationStep(stepData, currentStep)
        setCurrentStep(prev => Math.min(prev + 1, 4))
    } catch (err) {
        console.error('Error saving step:', err)
        setError('Failed to save progress. Please try again.')
    } finally {
        setSaving(false)
    }
}
```

**Step 8: Replace `handleSubmit` for Step 4 (final)**

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validateStep(4)
    if (validationError) {
        setError(validationError)
        return
    }

    setError('')
    setLoading(true)

    try {
        const finalData = {
            terms_accepted: formData.terms_accepted,
            peso_consent: formData.peso_consent,
            labor_compliance: formData.labor_compliance,
            employer_status: 'pending',
            rejection_reason: '',
        }

        if (businessPermitFile) {
            finalData.business_permit_url = await compressAndEncode(businessPermitFile)
        }

        await completeRegistration(finalData)

        try {
            await sendEmployerRegistrationEmail({
                email: userData?.email || formData.email,
                representative_name: formData.representative_name || userData?.representative_name,
                company_name: formData.company_name || userData?.company_name
            })
        } catch (emailErr) {
            console.error('Failed to send registration email:', emailErr)
        }

        setSubmitted(true)
    } catch (err) {
        console.error('Employer registration error:', err)
        setError('Failed to complete registration. Please try again.')
    } finally {
        setLoading(false)
    }
}
```

**Step 9: Update navigation buttons**

- Prevent going back to Step 1 after account creation
- Show saving state on Next button (same pattern as jobseeker)

**Step 10: Move agreement checkboxes to Step 4 render**

Step 4 now renders: business permit upload + acceptable documents list + agreement checkboxes (terms, peso_consent, labor_compliance).

**Step 11: Commit**

```bash
git add src/pages/EmployerRegistration.jsx
git commit -m "feat: refactor employer registration to save progress incrementally"
```

---

## Task 4: Refactor IndividualRegistration to use incremental saves

**Files:**
- Modify: `src/pages/IndividualRegistration.jsx`

**What to do:**

Split the single-page form into 2 steps:
1. Account credentials (email, password) — creates account
2. Profile details (full name, contact number) — completes registration

**Step 1: Update imports and auth hook**

```jsx
import { useState, useEffect } from 'react'
```

Replace:
```jsx
const { registerIndividual } = useAuth()
```
with:
```jsx
const { createAccount, saveRegistrationStep, completeRegistration, currentUser, userData } = useAuth()
```

**Step 2: Add step state and resume logic**

```jsx
const [currentStep, setCurrentStep] = useState(1)
const [accountCreated, setAccountCreated] = useState(false)

useEffect(() => {
    if (userData && userData.registration_complete === false && userData.role === 'individual') {
        setAccountCreated(true)
        setFormData(prev => ({
            ...prev,
            email: userData.email || '',
            fullName: userData.full_name || '',
            contactNumber: userData.contact_number || '',
        }))
        setCurrentStep(2)
    }
}, [userData])
```

**Step 3: Replace `handleSubmit`**

For Step 1 (create account):
```jsx
const handleStep1 = async () => {
    if (!formData.email.trim()) { setError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Please enter a valid email.'); return }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError('')
    try {
        await createAccount(formData.email.trim().toLowerCase(), formData.password, 'individual')
        setAccountCreated(true)
        setCurrentStep(2)
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            setError('This email is already registered. Try signing in instead.')
        } else {
            setError(err.message || 'Registration failed. Please try again.')
        }
    } finally {
        setLoading(false)
    }
}
```

For Step 2 (complete):
```jsx
const handleStep2 = async () => {
    if (!formData.fullName.trim()) { setError('Full name is required.'); return }
    if (!formData.contactNumber.trim()) { setError('Contact number is required.'); return }

    setLoading(true)
    setError('')
    try {
        await completeRegistration({
            full_name: formData.fullName.trim(),
            name: formData.fullName.trim(),
            contact_number: formData.contactNumber.trim(),
            individual_status: 'active',
        })
        setSuccess(true)
    } catch (err) {
        setError(err.message || 'Registration failed. Please try again.')
    } finally {
        setLoading(false)
    }
}
```

**Step 4: Update the form rendering**

Conditionally render Step 1 (email, password, confirm password) or Step 2 (full name, contact number) based on `currentStep`.

Step 1 shows email + password + confirm password fields with a "Create Account" button calling `handleStep1`.

Step 2 shows full name + contact number fields with a "Complete Registration" button calling `handleStep2`.

Add a step indicator text like "Step 1 of 2 — Create Account" / "Step 2 of 2 — Your Details".

**Step 5: Commit**

```bash
git add src/pages/IndividualRegistration.jsx
git commit -m "feat: refactor individual registration to 2-step incremental flow"
```

---

## Task 5: Create RegistrationContinue page

**Files:**
- Create: `src/pages/RegistrationContinue.jsx`

**What to do:**

Create a page at `/register/continue` that detects the user's role and registration step, then redirects to the appropriate registration wizard.

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const RegistrationContinue = () => {
    const { userData, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (loading) return

        if (!userData) {
            navigate('/login', { replace: true })
            return
        }

        if (userData.registration_complete !== false) {
            navigate('/dashboard', { replace: true })
            return
        }

        // Redirect to role-specific registration page
        switch (userData.role) {
            case 'jobseeker':
                navigate('/register/jobseeker', { replace: true })
                break
            case 'employer':
                navigate('/register/employer', { replace: true })
                break
            case 'individual':
                navigate('/register/individual', { replace: true })
                break
            default:
                navigate('/dashboard', { replace: true })
        }
    }, [userData, loading, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
    )
}

export default RegistrationContinue
```

**Step 2: Add route in App.jsx**

In `src/App.jsx`, add import:
```jsx
import RegistrationContinue from './pages/RegistrationContinue'
```

Add route (inside the protected routes section, after the dashboard route):
```jsx
<Route
    path="/register/continue"
    element={
        <ProtectedRoute>
            <ErrorBoundary><RegistrationContinue /></ErrorBoundary>
        </ProtectedRoute>
    }
/>
```

**Step 3: Commit**

```bash
git add src/pages/RegistrationContinue.jsx src/App.jsx
git commit -m "feat: add registration continue page for resuming incomplete signups"
```

---

## Task 6: Add incomplete registration banner to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.jsx`

**What to do:**

Add a banner at the top of the Dashboard when `userData.registration_complete === false`.

**Step 1: Add the banner**

In `Dashboard.jsx`, add this right after the Welcome Header section (after the closing `</div>` of the `mb-8` div, around line 63), before the verification status banner:

```jsx
{/* Incomplete Registration Banner */}
{userData?.registration_complete === false && (
    <div className="card mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-blue-800 mb-1">Complete Your Registration</h3>
                <p className="text-blue-700 text-sm mb-3">
                    Your registration is not yet complete. Finish setting up your profile to unlock all platform features.
                </p>
                <Link to="/register/continue" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
                    Continue Registration <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    </div>
)}
```

Note: `AlertCircle` and `ArrowRight` are already imported in Dashboard.jsx. `Link` is also already imported.

**Step 2: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "feat: show incomplete registration banner on dashboard"
```

---

## Task 7: Handle login redirect for incomplete registrations

**Files:**
- Modify: `src/pages/Login.jsx`

**What to do:**

Currently, after login the user is redirected to `/dashboard`. This is fine — the dashboard will show the incomplete registration banner. No changes needed to the login page itself.

However, we should make sure the registration pages (jobseeker, employer, individual) work correctly when an already-logged-in user navigates to them. Currently they're public routes, so an authenticated user with incomplete registration will land on them and the `useEffect` we added will detect `userData.registration_complete === false` and pre-fill/resume.

This task is just verification — read the Login.jsx to confirm it redirects to `/dashboard` after login, and verify the flow works:
1. User creates account on Step 1 → gets logged in automatically
2. User closes browser
3. User logs in again → goes to `/dashboard` → sees banner → clicks "Continue Registration" → goes to `/register/continue` → redirected to role-specific page → useEffect detects incomplete registration → pre-fills and jumps to saved step

If Login.jsx already redirects to `/dashboard`, no changes needed. Commit a no-op or skip.

---

## Task 8: Clean up old registration methods from AuthContext

**Files:**
- Modify: `src/contexts/AuthContext.jsx`

**What to do:**

Now that all three registration pages use the new incremental methods, we can remove the old bulk registration methods. However, keep the `register` legacy method (line 81) as it may be used elsewhere.

**Step 1: Remove `registerJobseeker` method** (lines 106-219)

**Step 2: Remove `registerEmployer` method** (lines 262-345)

**Step 3: Remove `registerIndividual` method** (lines 222-259)

**Step 4: Remove them from the context value object**

Remove `registerJobseeker`, `registerEmployer`, `registerIndividual` from the `value` object.

**Step 5: Remove unused email service imports**

Remove the import at line 10:
```jsx
import { sendJobseekerRegistrationEmail, sendEmployerRegistrationEmail } from '../services/emailService'
```

These are now imported directly in the registration page files.

**Step 6: Commit**

```bash
git add src/contexts/AuthContext.jsx
git commit -m "refactor: remove old bulk registration methods from AuthContext"
```

---

## Task 9: Test the full flow manually

**Files:** None (manual testing)

**What to do:**

Run the dev server and test the following scenarios:

```bash
cd C:/Users/Steven/Desktop/PESO-Connect && npm run dev
```

**Test 1: Fresh jobseeker registration**
1. Go to `/register/jobseeker`
2. Fill Step 1 (email, password) → click Next
3. Verify: Firebase Auth account created, Firestore doc exists with `registration_complete: false`
4. Fill Step 2 → click Next
5. Verify: Firestore doc updated with personal info, `registration_step: 2`
6. Close browser tab
7. Log in again → Dashboard shows "Complete Registration" banner
8. Click banner → Redirected to `/register/jobseeker` at Step 3
9. Complete remaining steps → Verify `registration_complete: true` in Firestore

**Test 2: Fresh employer registration**
1. Same flow as above but for employer

**Test 3: Fresh individual registration**
1. Same flow but for individual (2 steps)

**Test 4: Normal complete registration (no interruption)**
1. Register all the way through without closing
2. Verify it works end-to-end

---

## Task 10: Run existing tests and verify no regressions

**Files:** None (test execution)

```bash
cd C:/Users/Steven/Desktop/PESO-Connect && npx vitest run
```

Verify that:
- All 15 existing tests from the profile completeness feature still pass
- No new test failures introduced by our changes
- Pre-existing failures (geminiService.test.js, MyApplications.test.jsx) are still the same
