import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import { sendJobseekerRegistrationEmail } from '../services/emailService'
import { validators } from '../utils/validation'
import { normalizeSkillName, deduplicateSkills } from '../services/geminiService'
import {
    Loader2, AlertCircle, ChevronRight, ChevronLeft, CheckCircle
} from 'lucide-react'
import { StepIndicator } from '../components/forms'
import {
    Step1AccountCredentials,
    Step2PersonalInfo,
    Step3EmploymentPreferences,
    Step4Education,
    Step5SkillsExperience,
    Step6Consent
} from '../components/registration'

const JobseekerRegistration = () => {
    const [currentStep, setCurrentStep] = useState(1)
    const [formData, setFormData] = useState({
        // Account Credentials
        email: '',
        password: '',
        confirmPassword: '',

        // Personal Information
        full_name: '',
        date_of_birth: '',
        barangay: '',
        city: '',
        province: '',

        // Contact Information
        mobile_number: '',
        preferred_contact_method: 'email',

        // Employment Preferences
        preferred_job_type: [],
        preferred_job_location: '',
        expected_salary_min: '',
        expected_salary_max: '',
        willing_to_relocate: 'no',

        // Educational Background
        highest_education: '',
        school_name: '',
        course_or_field: '',
        year_graduated: '',

        // Skills and Work Experience
        skills: [],
        work_experiences: [],
        certifications: [],
        portfolio_url: '',

        // Consent
        terms_accepted: false,
        data_processing_consent: false,
        peso_verification_consent: false,
        info_accuracy_confirmation: false
    })

    const [skillInput, setSkillInput] = useState('')
    const [workExpInput, setWorkExpInput] = useState({ company: '', position: '', duration: '' })
    const [certInput, setCertInput] = useState('')
    const [resumeFile, setResumeFile] = useState(null)
    const [resumeUrl, setResumeUrl] = useState('')
    const [certificateFiles, setCertificateFiles] = useState([])
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [fieldErrors, setFieldErrors] = useState({})
    const [accountCreated, setAccountCreated] = useState(false)
    const [saving, setSaving] = useState(false)
    const [touchedFields, setTouchedFields] = useState({})
    const restoredRef = useRef(false)

    const { createAccount, saveRegistrationStep, completeRegistration, compressAndEncode, currentUser, userData } = useAuth()
    const navigate = useNavigate()

    const passwordStrength = validators.passwordStrength(formData.password)

    // Restore saved progress only once on initial load
    useEffect(() => {
        if (restoredRef.current) return
        if (userData && userData.registration_complete === false && userData.role === 'jobseeker') {
            restoredRef.current = true
            setAccountCreated(true)
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
            const savedStep = userData.registration_step || 1
            setCurrentStep(Math.min(savedStep + 1, totalSteps))
        }
    }, [userData])

    const handleBlur = useCallback((e) => {
        const { name } = e.target
        setTouchedFields(prev => ({ ...prev, [name]: true }))

        // Inline validation on blur
        let fieldError = null
        switch (name) {
            case 'email':
                fieldError = validators.required(formData.email, 'Email') || validators.email(formData.email)
                break
            case 'password':
                fieldError = validators.required(formData.password, 'Password') || validators.minLength(formData.password, 6, 'Password')
                break
            case 'confirmPassword':
                fieldError = validators.passwordMatch(formData.password, formData.confirmPassword)
                break
            case 'mobile_number':
                fieldError = validators.required(formData.mobile_number, 'Mobile number') || validators.phone(formData.mobile_number)
                break
            case 'full_name':
                fieldError = validators.required(formData.full_name, 'Full name')
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

    const totalSteps = 6

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleJobTypeToggle = (type) => {
        setFormData(prev => ({
            ...prev,
            preferred_job_type: prev.preferred_job_type.includes(type)
                ? prev.preferred_job_type.filter(t => t !== type)
                : [...prev.preferred_job_type, type]
        }))
    }

    const addSkill = () => {
        const normalized = normalizeSkillName(skillInput.trim())
        if (normalized && !formData.skills.includes(normalized)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, normalized] }))
            setSkillInput('')
        }
    }

    const removeSkill = (skillToRemove) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }))
    }

    const addWorkExperience = () => {
        if (workExpInput.company.trim() && workExpInput.position.trim()) {
            setFormData(prev => ({
                ...prev,
                work_experiences: [...prev.work_experiences, { ...workExpInput }]
            }))
            setWorkExpInput({ company: '', position: '', duration: '' })
        }
    }

    const removeWorkExp = (index) => {
        setFormData(prev => ({
            ...prev,
            work_experiences: prev.work_experiences.filter((_, i) => i !== index)
        }))
    }

    const addCertification = () => {
        if (certInput.trim() && !formData.certifications.includes(certInput.trim())) {
            setFormData(prev => ({ ...prev, certifications: [...prev.certifications, certInput.trim()] }))
            setCertInput('')
        }
    }

    const removeCertification = (certToRemove) => {
        setFormData(prev => ({
            ...prev,
            certifications: prev.certifications.filter(cert => cert !== certToRemove)
        }))
    }

    const handleResumeChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            if (!validTypes.includes(file.type)) {
                setError('Resume must be PDF or DOC format')
                return
            }
            if (file.size > 2 * 1024 * 1024) {
                setError('Resume must be under 2MB')
                return
            }
            setResumeFile(file)
            setError('')
        }
    }

    const handleCertificateChange = (e) => {
        const files = Array.from(e.target.files)
        const validFiles = []

        for (const file of files) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
            if (!validTypes.includes(file.type)) {
                setError('Certificates must be PDF, JPG, or PNG format')
                continue
            }
            if (file.size > 2 * 1024 * 1024) {
                setError('Each certificate must be under 2MB')
                continue
            }
            validFiles.push(file)
        }

        setCertificateFiles(prev => [...prev, ...validFiles])
        setError('')
    }

    const removeCertificateFile = (index) => {
        setCertificateFiles(prev => prev.filter((_, i) => i !== index))
    }

    const validateStep = (step) => {
        setError('')

        switch (step) {
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
                if (!formData.full_name || !formData.date_of_birth || !formData.barangay ||
                    !formData.city || !formData.province || !formData.mobile_number) {
                    setError('Please fill in all required fields')
                    return false
                }
                break

            case 3:
                if (formData.preferred_job_type.length === 0 || !formData.preferred_job_location) {
                    setError('Please select at least one job type and specify preferred location')
                    return false
                }
                break

            case 4:
                if (!formData.highest_education || !formData.school_name) {
                    setError('Please fill in your educational background')
                    return false
                }
                break

            case 5:
                if (formData.skills.length === 0) {
                    setError('Please add at least one skill')
                    return false
                }
                if (!resumeUrl && !userData?.resume_url) {
                    setError('Please upload your resume')
                    return false
                }
                break

            case 6:
                if (!formData.terms_accepted || !formData.data_processing_consent ||
                    !formData.peso_verification_consent || !formData.info_accuracy_confirmation) {
                    setError('You must accept all terms and confirmations to proceed')
                    return false
                }
                break
        }

        return true
    }

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
                    skills: deduplicateSkills(formData.skills),
                    work_experiences: formData.work_experiences,
                    certifications: formData.certifications,
                    portfolio_url: formData.portfolio_url,
                }
            default:
                return {}
        }
    }

    const nextStep = async () => {
        if (!validateStep(currentStep)) return

        if (currentStep === 1 && !accountCreated) {
            setLoading(true)
            setError('')
            try {
                await createAccount(formData.email, formData.password, 'user', 'jobseeker')
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
            let stepData = getStepData(currentStep)

            if (currentStep === 5) {
                let certificatesData = []
                if (certificateFiles && certificateFiles.length > 0) {
                    for (const file of certificateFiles) {
                        const encoded = await compressAndEncode(file)
                        certificatesData.push({ name: file.name, data: encoded, type: file.type })
                    }
                }
                stepData = { ...stepData, resume_url: resumeUrl || userData?.resume_url || '', certificate_urls: certificatesData }
            }

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

            if (resumeUrl && !userData?.resume_url) {
                finalData.resume_url = resumeUrl
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
                return (
                    <Step2PersonalInfo
                        formData={formData}
                        handleChange={handleChange}
                        setFormData={setFormData}
                    />
                )
            case 3:
                return (
                    <Step3EmploymentPreferences
                        formData={formData}
                        handleChange={handleChange}
                        setFormData={setFormData}
                        handleJobTypeToggle={handleJobTypeToggle}
                    />
                )
            case 4:
                return (
                    <Step4Education
                        formData={formData}
                        handleChange={handleChange}
                    />
                )
            case 5:
                return (
                    <Step5SkillsExperience
                        formData={formData}
                        handleChange={handleChange}
                        skillInput={skillInput}
                        setSkillInput={setSkillInput}
                        addSkill={addSkill}
                        removeSkill={removeSkill}
                        workExpInput={workExpInput}
                        setWorkExpInput={setWorkExpInput}
                        addWorkExperience={addWorkExperience}
                        removeWorkExp={removeWorkExp}
                        certInput={certInput}
                        setCertInput={setCertInput}
                        addCertification={addCertification}
                        removeCertification={removeCertification}
                        userId={currentUser?.uid}
                        resumeUrl={resumeUrl || userData?.resume_url || ''}
                        onResumeUploaded={(url) => setResumeUrl(url)}
                        onResumeRemoved={() => setResumeUrl('')}
                        certificateFiles={certificateFiles}
                        handleCertificateChange={handleCertificateChange}
                        removeCertificateFile={removeCertificateFile}
                    />
                )
            case 6:
                return (
                    <Step6Consent
                        formData={formData}
                        handleChange={handleChange}
                        resumeUrl={resumeUrl || userData?.resume_url || ''}
                    />
                )
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
                    <p className="text-gray-600 mt-2">Step {currentStep} of {totalSteps}</p>
                </div>

                {/* Progress Bar */}
                <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

                {/* Form */}
                <div className="card animate-slide-up">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {renderStep()}

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 mt-8">
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating account...
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
