import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendJobseekerRegistrationEmail } from '../services/emailService'
import { validators } from '../utils/validation'
import {
    Loader2, AlertCircle, ChevronRight, ChevronLeft, Check
} from 'lucide-react'

// Registration steps
import Step1AccountCredentials from '../components/registration/Step1AccountCredentials'
import Step2PersonalInfo from '../components/registration/Step2PersonalInfo'
import Step3AddressContact from '../components/registration/Step3AddressContact'
import Step4EmploymentStatus from '../components/registration/Step4EmploymentStatus'
import Step5JobPreference from '../components/registration/Step5JobPreference'
import Step6EducationLanguage from '../components/registration/Step6EducationLanguage'
import Step7OtherSkills from '../components/registration/Step7OtherSkills'
import Step8Consent from '../components/registration/Step7Consent'

// Components
import ProgressBar from '../components/forms/ProgressBar'

const totalSteps = 8

const JobseekerRegistration = () => {
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState({
        // Step 1: Account
        email: '', password: '', confirmPassword: '',
        // Step 2: Personal Info
        surname: '', first_name: '', middle_name: '', suffix: '',
        date_of_birth: '', sex: '', civil_status: '',
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
        // Step 7: Skills & Qualifications
        skills: [],
        other_skills: [], other_skills_other: '',
        tvet_certification_level: '', tvet_certification_title: '',
        recent_job_title: '', recent_job_company: '',
        // Step 8: Consent
        terms_accepted: false,
        data_processing_consent: false,
        peso_verification_consent: false,
    })

    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState({})
    const [accountCreated, setAccountCreated] = useState(false)
    const [saving, setSaving] = useState(false)
    const [touchedFields, setTouchedFields] = useState({})
    const restoredRef = useRef(false)

    const { createAccount, saveRegistrationStep, completeRegistration, currentUser, userData } = useAuth()
    const navigate = useNavigate()

    const passwordStrength = validators.passwordStrength(formData.password)

    // Restore saved progress only once on initial load
    useEffect(() => {
        if (restoredRef.current) return
        if (userData && userData.registration_complete === false && userData.role === 'user' && userData.subtype === 'jobseeker') {
            restoredRef.current = true
            setAccountCreated(true)
            setFormData(prev => ({
                ...prev,
                email: userData.email || '',
                // Split name fields
                surname: userData.surname || '',
                first_name: userData.first_name || '',
                middle_name: userData.middle_name || '',
                suffix: userData.suffix || '',
                // Personal info
                date_of_birth: userData.date_of_birth || '',
                sex: userData.sex || '',
                civil_status: userData.civil_status || '',
                // Address
                house_street: userData.house_street || '',
                province: userData.province || '',
                city: userData.city || '',
                barangay: userData.barangay || '',
                mobile_number: userData.mobile_number || '',
                // Employment
                employment_status: userData.employment_status || '',
                employment_type: userData.employment_type || '',
                self_employed_type: userData.self_employed_type || [],
                self_employed_other: userData.self_employed_other || '',
                unemployment_months: userData.unemployment_months || '',
                unemployment_reason: userData.unemployment_reason || [],
                unemployment_reason_other: userData.unemployment_reason_other || '',
                terminated_abroad_country: userData.terminated_abroad_country || '',
                is_ofw: userData.is_ofw || 'no',
                ofw_country: userData.ofw_country || '',
                is_former_ofw: userData.is_former_ofw || 'no',
                former_ofw_country: userData.former_ofw_country || '',
                former_ofw_return_date: userData.former_ofw_return_date || '',
                is_4ps: userData.is_4ps || 'no',
                household_id: userData.household_id || '',
                // Job preference
                preferred_occupations: userData.preferred_occupations || ['', '', ''],
                work_type: userData.work_type || [],
                work_location_type: userData.work_location_type || '',
                preferred_local_locations: userData.preferred_local_locations || ['', '', ''],
                preferred_overseas_locations: userData.preferred_overseas_locations || ['', '', ''],
                // Education & Language
                highest_education: userData.highest_education || '',
                currently_in_school: userData.currently_in_school || 'no',
                currently_enrolled: userData.currently_enrolled || false,
                senior_high_strand: userData.senior_high_strand || '',
                course_or_field: userData.course_or_field || '',
                year_graduated: userData.year_graduated || '',
                level_reached: userData.level_reached || '',
                year_last_attended: userData.year_last_attended || '',
                languages: userData.languages || [],
                // Skills & Qualifications
                skills: userData.skills || [],
                other_skills: userData.other_skills || [],
                other_skills_other: userData.other_skills_other || '',
                tvet_certification_level: userData.tvet_certification_level || '',
                tvet_certification_title: userData.tvet_certification_title || '',
                recent_job_title: '',
                recent_job_company: '',
                // Consent
                terms_accepted: userData.terms_accepted || false,
                data_processing_consent: userData.data_processing_consent || false,
                peso_verification_consent: userData.peso_verification_consent || false,
            }))
            const savedStep = userData.registration_step || 1
            setCurrentStep(Math.min(savedStep + 1, totalSteps))
        }
    }, [userData])

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
        setError('')

        switch (currentStep) {
            case 1:
                if (!formData.email || !formData.password || !formData.confirmPassword) {
                    setError('Please fill in all required fields')
                    return false
                }
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match')
                    return false
                }
                if (formData.password.length < 8) {
                    setError('Password must be at least 8 characters')
                    return false
                }
                if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
                    setError('Password must contain at least one letter and one number')
                    return false
                }
                break

            case 2:
                if (!formData.surname?.trim()) { setError('Surname is required'); return false }
                if (!formData.first_name?.trim()) { setError('First name is required'); return false }
                if (!formData.date_of_birth) { setError('Date of birth is required'); return false }
                if (!formData.sex) { setError('Sex is required'); return false }
                if (!formData.civil_status) { setError('Civil status is required'); return false }
                break

            case 3:
                if (!formData.province) { setError('Province is required'); return false }
                if (!formData.city) { setError('City/Municipality is required'); return false }
                if (!formData.barangay) { setError('Barangay is required'); return false }
                if (!formData.mobile_number?.trim()) { setError('Contact number is required'); return false }
                else {
                    const phoneErr = validators.phone(formData.mobile_number)
                    if (phoneErr) { setError(phoneErr); return false }
                }
                break

            case 4:
                if (!formData.employment_status) { setError('Employment status is required'); return false }
                if (formData.employment_status === 'employed' && !formData.employment_type) {
                    setError('Employment type is required'); return false
                }
                if (formData.employment_type === 'self_employed' && (!formData.self_employed_type || formData.self_employed_type.length === 0)) {
                    setError('Select at least one type of self-employment'); return false
                }
                if (formData.employment_status === 'unemployed' && (!formData.unemployment_reason || formData.unemployment_reason.length === 0)) {
                    setError('Select at least one reason for unemployment'); return false
                }
                break

            case 5: {
                const occupations = (formData.preferred_occupations || []).filter(o => o.trim())
                if (occupations.length === 0) { setError('At least 1 preferred occupation is required'); return false }
                if (!formData.work_type || formData.work_type.length === 0) { setError('Select work type (Part-time/Full-time)'); return false }
                if (!formData.work_location_type) { setError('Select preferred work location type'); return false }
                if (formData.work_location_type === 'local') {
                    const locs = (formData.preferred_local_locations || []).filter(l => l.trim())
                    if (locs.length === 0) { setError('At least 1 preferred city is required'); return false }
                }
                if (formData.work_location_type === 'overseas') {
                    const locs = (formData.preferred_overseas_locations || []).filter(l => l.trim())
                    if (locs.length === 0) { setError('At least 1 preferred country is required'); return false }
                }
                break
            }

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

            case 7: {
                const tagCount = (formData.skills || []).length
                const otherCount = (formData.other_skills || []).filter(s => s !== 'Others').length
                if (tagCount + otherCount < 3) {
                    setError('Add at least 3 skills combined (tag input + checkboxes)'); return false
                }
                if ((formData.other_skills || []).includes('Others') && !formData.other_skills_other?.trim()) {
                    setError('Please specify your other skill'); return false
                }
                if (formData.tvet_certification_level && !formData.tvet_certification_title?.trim()) {
                    setError('Please enter your TVET certification title'); return false
                }
                break
            }

            case 8:
                if (!formData.terms_accepted || !formData.data_processing_consent || !formData.peso_verification_consent) {
                    setError('You must accept all terms and confirmations to proceed')
                    return false
                }
                break
        }

        return true
    }

    const getStepData = () => {
        switch (currentStep) {
            case 2:
                return {
                    surname: formData.surname, first_name: formData.first_name,
                    middle_name: formData.middle_name, suffix: formData.suffix,
                    full_name: [formData.first_name, formData.middle_name, formData.surname].filter(Boolean).join(' '),
                    name: [formData.first_name, formData.middle_name, formData.surname].filter(Boolean).join(' '),
                    date_of_birth: formData.date_of_birth, sex: formData.sex, civil_status: formData.civil_status,
                }
            case 3:
                return {
                    house_street: formData.house_street,
                    province: formData.province, city: formData.city, barangay: formData.barangay,
                    mobile_number: formData.mobile_number,
                }
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
                }
            case 5:
                return {
                    preferred_occupations: (formData.preferred_occupations || []).filter(o => o.trim()),
                    work_type: formData.work_type,
                    work_location_type: formData.work_location_type,
                    preferred_local_locations: (formData.preferred_local_locations || []).filter(l => l.trim()),
                    preferred_overseas_locations: (formData.preferred_overseas_locations || []).filter(l => l.trim()),
                }
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
                }
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
            const stepData = getStepData()
            await saveRegistrationStep(stepData, currentStep)
            setCurrentStep(prev => Math.min(prev + 1, totalSteps))
        } catch (err) {
            console.error('Error saving step:', err)
            setError('Failed to save progress. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const prevStep = () => {
        setError('')
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

    const handleSubmit = async () => {
        if (!validateStep()) return

        setLoading(true)
        setError('')

        try {
            const fullName = [formData.first_name, formData.middle_name, formData.surname].filter(Boolean).join(' ')

            const finalData = {
                terms_accepted: formData.terms_accepted,
                data_processing_consent: formData.data_processing_consent,
                peso_verification_consent: formData.peso_verification_consent,
                full_name: fullName,
                name: fullName,
                jobseeker_status: 'pending',
                rejection_reason: '',
            }

            await completeRegistration(finalData)

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

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <Step1AccountCredentials
                        formData={formData}
                        handleChange={handleChange}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        handleBlur={handleBlur}
                        touchedFields={touchedFields}
                        fieldErrors={fieldErrors}
                        passwordStrength={passwordStrength}
                    />
                )
            case 2:
                return <Step2PersonalInfo formData={formData} handleChange={handleChange} setFormData={setFormData} />
            case 3:
                return <Step3AddressContact formData={formData} handleChange={handleChange} setFormData={setFormData} />
            case 4:
                return <Step4EmploymentStatus formData={formData} handleChange={handleChange} setFormData={setFormData} />
            case 5:
                return <Step5JobPreference formData={formData} handleChange={handleChange} setFormData={setFormData} />
            case 6:
                return <Step6EducationLanguage formData={formData} handleChange={handleChange} setFormData={setFormData} />
            case 7:
                return <Step7OtherSkills formData={formData} handleChange={handleChange} setFormData={setFormData} />
            case 8:
                return <Step8Consent formData={formData} setFormData={setFormData} />
            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 pb-8">
            {/* Header */}
            <div className="max-w-lg mx-auto px-4 pt-8">
                <div className="text-center mb-6 animate-fade-in">
                    <img
                        src="/peso-logo.png"
                        alt="PESO Connect"
                        className="w-16 h-16 mx-auto mb-3"
                    />
                    <h1 className="text-2xl font-bold gradient-text">Jobseeker Registration</h1>
                </div>

                {/* Progress Bar */}
                <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

                {/* Form Content */}
                <div className="card animate-slide-up">
                    {error && (
                        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {renderStep()}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 mt-8">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={currentStep === totalSteps ? handleSubmit : nextStep}
                            disabled={loading || saving}
                            className="flex-[2] py-3 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                        >
                            {(loading || saving) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : currentStep === totalSteps ? (
                                <><Check className="w-4 h-4" /> Submit Registration</>
                            ) : (
                                <>Continue <ChevronRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-xs mt-6">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default JobseekerRegistration
