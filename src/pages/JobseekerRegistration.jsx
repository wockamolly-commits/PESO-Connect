import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { sendJobseekerRegistrationEmail } from '../services/emailService'
import { validators } from '../utils/validation'
import {
    Loader2, AlertCircle, ChevronRight, ChevronLeft, CheckCircle
} from 'lucide-react'
import { StepIndicator } from '../components/forms'
import {
    Step1AccountCredentials,
    Step2PersonalInfo,
    Step3ContactEmployment,
    Step4Education,
    Step5SkillsExperience,
    Step6JobPreferences,
    Step7Consent
} from '../components/registration'

const TOTAL_STEPS = 7
const OTHER_PREFIX = 'Others:'

const getDraftStorageKey = (userId) => `peso-reg-draft-${userId}`

const clampStep = (step) => Math.min(Math.max(step, 1), TOTAL_STEPS)

// Unwrap values that were mistakenly saved as single-element arrays
// or stringified arrays like '["Freelancer"]' or postgres literals like '{Freelancer}'
const unwrapArrayValue = (val) => {
    if (Array.isArray(val)) return val[0] || ''
    if (typeof val === 'string') {
        const trimmed = val.trim()
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed)
                if (Array.isArray(parsed)) return parsed[0] || ''
            } catch {}
        }
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            return trimmed.slice(1, -1).split(',')[0]?.replace(/^"|"$/g, '') || ''
        }
    }
    return val ?? ''
}

const parseOtherSelection = (value = '') => {
    if (typeof value !== 'string') {
        return { selectedValue: '', otherValue: '' }
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
        return { selectedValue: '', otherValue: '' }
    }

    if (trimmedValue === 'Others') {
        return { selectedValue: 'Others', otherValue: '' }
    }

    if (trimmedValue.startsWith(OTHER_PREFIX)) {
        return {
            selectedValue: 'Others',
            otherValue: trimmedValue.slice(OTHER_PREFIX.length).trim()
        }
    }

    return { selectedValue: trimmedValue, otherValue: '' }
}

const buildOtherSelection = (selectedValue, otherValue = '') => {
    if (selectedValue !== 'Others') return selectedValue

    const trimmedOtherValue = otherValue.trim()
    return trimmedOtherValue ? `${OTHER_PREFIX} ${trimmedOtherValue}` : 'Others'
}

const normalizeOptionalDate = (value) => {
    if (typeof value !== 'string') return value ?? null
    const trimmedValue = value.trim()
    return trimmedValue || null
}

const JobseekerRegistration = () => {
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState({
        // Step 1: Account Credentials
        email: '',
        password: '',
        confirmPassword: '',

        // Step 2: Personal Information
        surname: '',
        first_name: '',
        middle_name: '',
        suffix: '',
        date_of_birth: '',
        sex: '',
        civil_status: '',
        is_pwd: false,
        disability_type: [],
        disability_type_specify: '',
        pwd_id_number: '',
        religion: '',
        religion_specify: '',
        height_cm: '',

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
        resume_url: '',
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

        // Step 7: Consent
        terms_accepted: false,
        data_processing_consent: false,
        peso_verification_consent: false,
        info_accuracy_confirmation: false,
        dole_authorization: false
    })

    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState({})
    const [accountCreated, setAccountCreated] = useState(false)
    const [saving, setSaving] = useState(false)
    const [touchedFields, setTouchedFields] = useState({})
    const restoredRef = useRef(false)

    const { createAccount, saveRegistrationStep, completeRegistration, currentUser, userData, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const passwordStrength = validators.passwordStrength(formData.password)

    // Persist the current draft only after we've attempted restoration,
    // so an empty initial render never overwrites the real saved draft.
    useEffect(() => {
        if (currentUser?.uid && restoredRef.current) {
            localStorage.setItem(getDraftStorageKey(currentUser.uid), JSON.stringify({
                formData,
                currentStep
            }))
        }
    }, [formData, currentStep, currentUser?.uid])

    // Restore saved progress only once on initial load
    useEffect(() => {
        if (restoredRef.current || authLoading || !currentUser?.uid) return

        restoredRef.current = true

        let restoredFormData = {}
        let restoredStep = 1

        if (userData && userData.registration_complete === false && userData.role === 'user' && userData.subtype === 'jobseeker') {
            const savedSelfEmployment = parseOtherSelection(unwrapArrayValue(userData.self_employment_type))
            const savedUnemploymentReason = parseOtherSelection(unwrapArrayValue(userData.unemployment_reason))
            setAccountCreated(true)
            restoredFormData = {
                email: userData.email || '',
                surname: userData.surname || '',
                first_name: userData.first_name || '',
                middle_name: userData.middle_name || '',
                suffix: userData.suffix || '',
                date_of_birth: userData.date_of_birth || '',
                sex: userData.sex || '',
                civil_status: userData.civil_status || '',
                is_pwd: userData.is_pwd || false,
                disability_type: userData.disability_type || [],
                disability_type_specify: userData.disability_type_specify || '',
                pwd_id_number: userData.pwd_id_number || '',
                religion: userData.religion?.startsWith('Others:') ? 'Others' : (userData.religion || ''),
                religion_specify: userData.religion?.startsWith('Others:') ? userData.religion.slice(8).trim() : '',
                height_cm: userData.height_cm ?? '',
                street_address: userData.street_address || '',
                barangay: userData.barangay || '',
                city: userData.city || '',
                province: userData.province || '',
                mobile_number: userData.mobile_number || '',
                employment_status: userData.employment_status || '',
                employment_type: unwrapArrayValue(userData.employment_type),
                self_employment_type: savedSelfEmployment.selectedValue,
                self_employment_specify: savedSelfEmployment.otherValue,
                unemployment_reason: savedUnemploymentReason.selectedValue,
                unemployment_reason_specify: savedUnemploymentReason.otherValue,
                months_looking_for_work: userData.months_looking_for_work || '',
                currently_in_school: userData.currently_in_school === true || userData.currently_in_school === 'true',
                highest_education: userData.highest_education || '',
                school_name: userData.school_name || '',
                course_or_field: userData.course_or_field || '',
                year_graduated: String(userData.year_graduated ?? '').trim(),
                did_not_graduate: userData.did_not_graduate === true || userData.did_not_graduate === 'true',
                education_level_reached: userData.education_level_reached || '',
                year_last_attended: String(userData.year_last_attended ?? '').trim(),
                vocational_training: userData.vocational_training || [],
                predefined_skills: userData.predefined_skills || [],
                skills: userData.skills || [],
                professional_licenses: userData.professional_licenses || [],
                civil_service_eligibility: userData.civil_service_eligibility || '',
                civil_service_date: userData.civil_service_date || '',
                work_experiences: userData.work_experiences || [],
                portfolio_url: userData.portfolio_url || '',
                resume_url: userData.resume_url || '',
                certificate_urls: userData.certificate_urls || [],
                preferred_job_type: userData.preferred_job_type || [],
                preferred_occupations: userData.preferred_occupations || ['', '', ''],
                preferred_local_locations: userData.preferred_local_locations || ['', '', ''],
                preferred_overseas_locations: userData.preferred_overseas_locations || ['', '', ''],
                expected_salary_min: userData.expected_salary_min || '',
                expected_salary_max: userData.expected_salary_max || '',
                willing_to_relocate: userData.willing_to_relocate || 'no',
                languages: userData.languages || [],
                terms_accepted: userData.terms_accepted || false,
                data_processing_consent: userData.data_processing_consent || false,
                peso_verification_consent: userData.peso_verification_consent || false,
                info_accuracy_confirmation: userData.info_accuracy_confirmation || false,
                dole_authorization: userData.dole_authorization || false,
            }

            const savedStep = userData.registration_step || 1
            restoredStep = clampStep(savedStep + 1)
        }

        const draft = localStorage.getItem(getDraftStorageKey(currentUser.uid))
        if (draft) {
            try {
                const parsed = JSON.parse(draft)
                const draftFormData = parsed?.formData ?? parsed
                const draftStep = parsed?.currentStep

                if (draftFormData && typeof draftFormData === 'object') {
                    restoredFormData = {
                        ...restoredFormData,
                        ...draftFormData
                    }
                }

                if (typeof draftStep === 'number' && Number.isFinite(draftStep)) {
                    restoredStep = clampStep(draftStep)
                }
            } catch (e) { /* ignore parse errors */ }
        }

        setFormData(prev => ({
            ...prev,
            ...restoredFormData
        }))
        setCurrentStep(restoredStep)
    }, [authLoading, currentUser?.uid, userData])

    const handleBlur = useCallback((e) => {
        const { name } = e.target
        setTouchedFields(prev => ({ ...prev, [name]: true }))

        let fieldError = null
        switch (name) {
            case 'email':
                fieldError = validators.required(formData.email, 'Email') || validators.email(formData.email)
                break
            case 'password':
                fieldError = validators.required(formData.password, 'Password') || validators.minLength(formData.password, 8, 'Password')
                break
            case 'confirmPassword':
                fieldError = validators.passwordMatch(formData.password, formData.confirmPassword)
                break
            case 'mobile_number':
                fieldError = validators.required(formData.mobile_number, 'Mobile number') || validators.phone(formData.mobile_number)
                break
            case 'surname':
                fieldError = validators.required(formData.surname, 'Surname')
                break
            case 'first_name':
                fieldError = validators.required(formData.first_name, 'First name')
                break
            case 'expected_salary_min':
            case 'expected_salary_max':
                if (formData.expected_salary_min && formData.expected_salary_max) {
                    const rangeErrors = validators.salaryRange(formData.expected_salary_min, formData.expected_salary_max)
                    if (rangeErrors) {
                        fieldError = rangeErrors.min || rangeErrors.max
                    }
                }
                break
        }
        setFieldErrors(prev => ({ ...prev, [name]: fieldError }))
    }, [formData])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const validateStep = () => {
        const newErrors = {}

        switch (currentStep) {
            case 1:
                if (!formData.email) newErrors.email = 'Email is required'
                else if (validators.email(formData.email)) newErrors.email = 'Invalid email format'
                if (!formData.password) newErrors.password = 'Password is required'
                else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
                else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formData.password)) newErrors.password = 'Password must contain at least one letter and one number'
                if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
                else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
                break
            case 2:
                if (!formData.surname || formData.surname.trim().length < 2) newErrors.surname = 'Surname is required (min 2 characters)'
                if (!formData.first_name || formData.first_name.trim().length < 2) newErrors.first_name = 'First name is required (min 2 characters)'
                if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
                else {
                    const ageError = validators.age(formData.date_of_birth, 15)
                    if (ageError) newErrors.date_of_birth = ageError
                }
                if (!formData.sex) newErrors.sex = 'Sex is required'
                if (!formData.civil_status) newErrors.civil_status = 'Civil status is required'
                if (formData.is_pwd === true && (!formData.disability_type || formData.disability_type.length === 0)) {
                    newErrors.disability_type = 'Select at least one disability type'
                }
                if (formData.is_pwd === true && (formData.disability_type || []).includes('Others') && !formData.disability_type_specify?.trim()) {
                    newErrors.disability_type_specify = 'Please specify the disability'
                }
                if (formData.religion === 'Others' && !formData.religion_specify?.trim()) {
                    newErrors.religion_specify = 'Please specify your religion'
                }
                if (formData.height_cm && (Number(formData.height_cm) < 50 || Number(formData.height_cm) > 300)) {
                    newErrors.height_cm = 'Height must be between 50 and 300 cm'
                }
                break
            case 3:
                if (!formData.street_address) newErrors.street_address = 'Street address is required'
                if (!formData.province) newErrors.province = 'Province is required'
                if (!formData.city) newErrors.city = 'Municipality/City is required'
                if (!formData.barangay) newErrors.barangay = 'Barangay is required'
                if (!formData.mobile_number) newErrors.mobile_number = 'Mobile number is required'
                else if (validators.phone(formData.mobile_number)) newErrors.mobile_number = 'Invalid Philippine phone format (09XXXXXXXXX)'
                if (!formData.employment_status) newErrors.employment_status = 'Employment status is required'
                if (formData.employment_status === 'Employed' && !formData.employment_type) newErrors.employment_type = 'Employment type is required'
                if (formData.employment_status === 'Self-Employed' && !formData.self_employment_type) newErrors.self_employment_type = 'Self-employment type is required'
                if (formData.employment_status === 'Self-Employed' && formData.self_employment_type === 'Others' && !formData.self_employment_specify) newErrors.self_employment_specify = 'Please specify'
                if (formData.employment_status === 'Unemployed' && !formData.unemployment_reason) newErrors.unemployment_reason = 'Unemployment reason is required'
                if (formData.employment_status === 'Unemployed' && formData.unemployment_reason === 'Others' && !formData.unemployment_reason_specify) newErrors.unemployment_reason_specify = 'Please specify'
                break
            case 4:
                if (!formData.highest_education) newErrors.highest_education = 'Education level is required'
                if (!formData.school_name) newErrors.school_name = 'School name is required'
                break
            case 5: {
                const skillsError = validators.atLeastOneSkill(formData.predefined_skills, formData.skills)
                if (skillsError) newErrors.skills = skillsError
                if (!formData.resume_url) newErrors.resume_url = 'Resume is required'
                ;(formData.work_experiences || []).forEach((exp, i) => {
                    if (!exp.company) newErrors[`exp_company_${i}`] = 'Company name is required'
                    if (!exp.position) newErrors[`exp_position_${i}`] = 'Position is required'
                    if (exp.year_started && exp.year_ended && Number(exp.year_ended) < Number(exp.year_started)) {
                        newErrors[`exp_year_ended_${i}`] = 'Year Ended must be ≥ Year Started'
                    }
                })
                break
            }
            case 6: {
                if (!formData.preferred_job_type || formData.preferred_job_type.length === 0) newErrors.preferred_job_type = 'Select at least one job type'
                const occError = validators.atLeastOneOccupation(formData.preferred_occupations)
                if (occError) newErrors.preferred_occupations = occError
                const locError = validators.atLeastOneLocation(formData.preferred_local_locations, formData.preferred_overseas_locations)
                if (locError) newErrors.locations = locError
                if (formData.expected_salary_min && formData.expected_salary_max) {
                    const salaryError = validators.salaryRange(formData.expected_salary_min, formData.expected_salary_max)
                    if (salaryError) newErrors.salary = salaryError
                }
                break
            }
            case 7:
                if (!formData.terms_accepted || !formData.data_processing_consent || !formData.peso_verification_consent || !formData.info_accuracy_confirmation || !formData.dole_authorization) {
                    newErrors.consent = 'All consent checkboxes must be accepted'
                }
                break
            default:
                break
        }

        setFieldErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const getStepData = (step) => {
        switch (step) {
            case 2: {
                const heightCm = formData.height_cm === '' ? null : Number(formData.height_cm)
                return {
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
                    disability_type: formData.disability_type,
                    disability_type_specify: formData.is_pwd && (formData.disability_type || []).includes('Others')
                        ? formData.disability_type_specify?.trim() || ''
                        : '',
                    pwd_id_number: formData.pwd_id_number
                }
            }
            case 3:
                {
                    const monthsLookingForWork = formData.months_looking_for_work === '' ? null : Number(formData.months_looking_for_work)

                return {
                    street_address: formData.street_address,
                    barangay: formData.barangay,
                    city: formData.city,
                    province: formData.province,
                    mobile_number: formData.mobile_number,
                    employment_status: formData.employment_status,
                    employment_type: formData.employment_type,
                    self_employment_type: buildOtherSelection(formData.self_employment_type, formData.self_employment_specify),
                    unemployment_reason: buildOtherSelection(formData.unemployment_reason, formData.unemployment_reason_specify),
                    months_looking_for_work: Number.isNaN(monthsLookingForWork) ? null : monthsLookingForWork
                }
                }
            case 4:
                return {
                    currently_in_school: formData.currently_in_school,
                    highest_education: formData.highest_education,
                    school_name: formData.school_name,
                    course_or_field: formData.course_or_field,
                    year_graduated: String(formData.year_graduated ?? '').trim(),
                    did_not_graduate: formData.did_not_graduate,
                    education_level_reached: formData.education_level_reached,
                    year_last_attended: String(formData.year_last_attended ?? '').trim(),
                    vocational_training: formData.vocational_training
                }
            case 5:
                return {
                    predefined_skills: formData.predefined_skills,
                    skills: formData.skills,
                    professional_licenses: (formData.professional_licenses || []).map((license) => ({
                        ...license,
                        valid_until: normalizeOptionalDate(license.valid_until)
                    })),
                    civil_service_eligibility: formData.civil_service_eligibility,
                    civil_service_date: normalizeOptionalDate(formData.civil_service_date),
                    work_experiences: formData.work_experiences,
                    portfolio_url: formData.portfolio_url,
                    resume_url: formData.resume_url,
                    certificate_urls: formData.certificate_urls
                }
            case 6:
                return {
                    preferred_job_type: formData.preferred_job_type,
                    preferred_occupations: formData.preferred_occupations.filter(o => o && o.trim()),
                    preferred_local_locations: formData.preferred_local_locations.filter(l => l && l.trim()),
                    preferred_overseas_locations: formData.preferred_overseas_locations.filter(l => l && l.trim()),
                    expected_salary_min: formData.expected_salary_min,
                    expected_salary_max: formData.expected_salary_max,
                    willing_to_relocate: formData.willing_to_relocate,
                    languages: formData.languages
                }
            default:
                return {}
        }
    }

    const nextStep = async () => {
        if (!validateStep()) return

        if (currentStep === 1 && !accountCreated) {
            setLoading(true)
            setError('')
            try {
                const result = await createAccount(formData.email, formData.password, 'user', 'jobseeker')
                if (result.emailVerificationRequired) {
                    navigate('/verify-email', { state: { email: formData.email } })
                    return
                }
                setAccountCreated(true)
                setCurrentStep(2)
            } catch (err) {
                if (err.message?.toLowerCase().includes('already registered') || err.status === 422) {
                    setError('An account with this email already exists. Please sign in instead.')
                } else if (err.message?.toLowerCase().includes('password')) {
                    setError('Password is too weak. Please use a stronger password.')
                } else {
                    setError(err.message || 'Failed to create account. Please try again.')
                }
            } finally {
                setLoading(false)
            }
            return
        }

        setSaving(true)
        setError('')
        try {
            const stepData = getStepData(currentStep)
            await saveRegistrationStep(stepData, currentStep)
            setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
        } catch (err) {
            console.error('Error saving step:', err)
            setError(err?.message ? ('Failed to save: ' + err.message) : 'Failed to save progress. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const prevStep = () => {
        setError('')
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateStep()) return

        setLoading(true)
        setError('')

        try {
            const finalData = {
                terms_accepted: formData.terms_accepted,
                data_processing_consent: formData.data_processing_consent,
                peso_verification_consent: formData.peso_verification_consent,
                info_accuracy_confirmation: formData.info_accuracy_confirmation,
                dole_authorization: formData.dole_authorization,
                jobseeker_status: 'pending',
                rejection_reason: '',
            }

            await completeRegistration(finalData)

            // Clear draft on successful submission
            localStorage.removeItem(getDraftStorageKey(currentUser.uid))

            try {
                await sendJobseekerRegistrationEmail({
                    email: formData.email || userData?.email,
                    full_name: formData.first_name && formData.surname
                        ? `${formData.first_name} ${formData.surname}`
                        : userData?.display_name || userData?.full_name
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

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Step1AccountCredentials
                        formData={formData}
                        handleChange={handleChange}
                        setFormData={setFormData}
                        errors={fieldErrors}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        handleBlur={handleBlur}
                        touchedFields={touchedFields}
                        fieldErrors={fieldErrors}
                        passwordStrength={passwordStrength}
                    />
                )
            case 2:
                return <Step2PersonalInfo formData={formData} handleChange={handleChange} setFormData={setFormData} errors={fieldErrors} />
            case 3:
                return <Step3ContactEmployment formData={formData} handleChange={handleChange} setFormData={setFormData} errors={fieldErrors} />
            case 4:
                return <Step4Education formData={formData} handleChange={handleChange} setFormData={setFormData} errors={fieldErrors} />
            case 5:
                return <Step5SkillsExperience formData={formData} handleChange={handleChange} setFormData={setFormData} userId={currentUser?.uid} errors={fieldErrors} />
            case 6:
                return <Step6JobPreferences formData={formData} handleChange={handleChange} setFormData={setFormData} errors={fieldErrors} />
            case 7:
                return <Step7Consent formData={formData} handleChange={handleChange} errors={fieldErrors} />
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4 py-12">
            <div className="w-full max-w-3xl">
                {/* Logo and Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <img
                        src="/peso-logo.png"
                        alt="PESO Connect"
                        className="w-20 h-20 mx-auto mb-4"
                    />
                    <h1 className="text-3xl font-bold gradient-text">Jobseeker Registration</h1>
                    <p className="text-gray-600 mt-2">Step {currentStep} of {TOTAL_STEPS}</p>
                </div>

                {/* Progress Bar */}
                <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

                {/* Form */}
                <div className="card animate-slide-up">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                            >
                                {renderStep()}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-3 mt-8">
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

                            {currentStep > 1 && currentStep < TOTAL_STEPS && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const stepData = getStepData(currentStep)
                                            await saveRegistrationStep(stepData, currentStep)
                                            navigate('/')
                                        } catch (err) {
                                            setError(err?.message ? ('Failed to save: ' + err.message) : 'Failed to save progress. Please try again.')
                                        }
                                    }}
                                    className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
                                >
                                    Save & Continue Later
                                </button>
                            )}

                            {currentStep < TOTAL_STEPS ? (
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Completing registration...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            Complete Registration
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default JobseekerRegistration
