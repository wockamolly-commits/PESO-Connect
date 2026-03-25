import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendEmployerRegistrationEmail } from '../services/emailService'
import { validators } from '../utils/validation'
import {
    Building2, User, Phone, FileText, Lock, Mail, ChevronRight, ChevronLeft,
    Loader2, AlertCircle, CheckCircle, Upload, X, Briefcase, MapPin, Hash,
    Shield, Globe, Check, Eye, EyeOff
} from 'lucide-react'

const STEPS = [
    { id: 1, title: 'Account', icon: Lock },
    { id: 2, title: 'Business Info', icon: Building2 },
    { id: 3, title: 'Representative', icon: User },
    { id: 4, title: 'Documents', icon: FileText },
]

const EMPLOYER_TYPES = [
    { value: 'company', label: 'Company', desc: 'Registered corporation or partnership' },
    { value: 'small_business', label: 'Small Business', desc: 'DTI-registered sole proprietorship' },
    { value: 'individual', label: 'Individual Service Provider', desc: 'Freelance or self-employed' },
]

const CONTACT_METHODS = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Call' },
    { value: 'sms', label: 'SMS / Text' },
]

const EmployerRegistration = () => {
    const [currentStep, setCurrentStep] = useState(1)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [accountCreated, setAccountCreated] = useState(false)
    const [saving, setSaving] = useState(false)

    const { createAccount, saveRegistrationStep, completeRegistration, compressAndEncode, currentUser, userData } = useAuth()
    const navigate = useNavigate()
    const restoredRef = useRef(false)

    // Form data
    const [formData, setFormData] = useState({
        // Step 1 — Account
        email: '',
        password: '',
        confirmPassword: '',
        // Step 2 — Business Info
        company_name: '',
        employer_type: '',
        business_reg_number: '',
        business_address: '',
        nature_of_business: '',
        // Step 3 — Representative & Contact
        representative_name: '',
        representative_position: '',
        contact_email: '',
        contact_number: '',
        preferred_contact_method: 'email',
        // Step 4 — Agreements
        terms_accepted: false,
        peso_consent: false,
        labor_compliance: false,
    })

    // File state
    const [govIdFile, setGovIdFile] = useState(null)
    const [businessPermitFile, setBusinessPermitFile] = useState(null)
    const [showPassword, setShowPassword] = useState(false)
    const [fieldErrors, setFieldErrors] = useState({})
    const [touchedFields, setTouchedFields] = useState({})

    const passwordStrength = validators.passwordStrength(formData.password)

    // Resume from saved step (only once on initial load)
    useEffect(() => {
        if (restoredRef.current) return
        if (userData && userData.registration_complete === false && userData.role === 'employer') {
            restoredRef.current = true
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
        // Clear field error on change
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    const handleBlur = useCallback((e) => {
        const { name } = e.target
        setTouchedFields(prev => ({ ...prev, [name]: true }))
        let fieldError = null
        switch (name) {
            case 'email':
            case 'contact_email':
                fieldError = validators.required(formData[name], 'Email') || validators.email(formData[name])
                break
            case 'password':
                fieldError = validators.required(formData.password, 'Password') || validators.minLength(formData.password, 6, 'Password')
                break
            case 'confirmPassword':
                fieldError = validators.passwordMatch(formData.password, formData.confirmPassword)
                break
            case 'contact_number':
                fieldError = validators.required(formData.contact_number, 'Contact number') || validators.phone(formData.contact_number)
                break
            case 'company_name':
                fieldError = validators.required(formData.company_name, 'Company name')
                break
        }
        setFieldErrors(prev => ({ ...prev, [name]: fieldError }))
    }, [formData])

    // --- Per-step validation ---
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

    const nextStep = async () => {
        const validationError = validateStep(currentStep)
        if (validationError) {
            setError(validationError)
            return
        }
        setError('')

        if (currentStep === 1 && !accountCreated) {
            setLoading(true)
            try {
                const result = await createAccount(formData.email, formData.password, 'employer')
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
                    setError('Password is too weak.')
                } else {
                    setError(err.message || 'Failed to create account.')
                }
            } finally {
                setLoading(false)
            }
            return
        }

        setSaving(true)
        try {
            let stepData = {}
            if (currentStep === 2) {
                stepData = {
                    company_name: formData.company_name,
                    name: formData.company_name,
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

    const prevStep = () => {
        setError('')
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

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

    // --- Success screen ---
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
                <div className="w-full max-w-md text-center animate-fade-in">
                    <div className="card">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
                        <p className="text-gray-600 mb-6">
                            Your employer registration has been submitted for review.
                            A PESO administrator will verify your information and documents.
                            You will be notified once your account has been approved.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                            <p className="text-yellow-800 text-sm">
                                <strong>Note:</strong> You will not be able to post jobs until your account is approved by PESO personnel.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="btn-primary w-full"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // --- Progress bar ---
    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between relative">
                {/* Progress line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                    <div
                        className="h-full bg-primary-500 transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    />
                </div>
                {STEPS.map((step) => (
                    <div key={step.id} className="relative flex flex-col items-center z-10">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep > step.id
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : currentStep === step.id
                                    ? 'bg-white border-primary-500 text-primary-600 shadow-lg shadow-primary-100'
                                    : 'bg-white border-gray-200 text-gray-400'
                                }`}
                        >
                            {currentStep > step.id ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                <step.icon className="w-5 h-5" />
                            )}
                        </div>
                        <span className={`text-xs mt-2 font-medium whitespace-nowrap ${currentStep >= step.id ? 'text-primary-700' : 'text-gray-400'
                            }`}>
                            {step.title}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )

    // --- File input component ---
    const FileUpload = ({ label, file, setFile, accept = 'image/*,.pdf' }) => (
        <div>
            <label className="label">{label}</label>
            {file ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 truncate flex-1">{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-green-600 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload</span>
                    <span className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF (max 5MB)</span>
                    <input
                        type="file"
                        className="hidden"
                        accept={accept}
                        onChange={(e) => {
                            const selectedFile = e.target.files[0]
                            if (selectedFile && selectedFile.size <= 5 * 1024 * 1024) {
                                setFile(selectedFile)
                            } else if (selectedFile) {
                                setError('File size must be under 5MB.')
                            }
                        }}
                    />
                </label>
            )}
        </div>
    )

    // --- Step content ---
    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary-600" />
                            Create Your Account
                        </h3>

                        {/* Email */}
                        <div>
                            <label className="label">Login Email Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur}
                                    className={`input-field pl-12 ${touchedFields.email && fieldErrors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} placeholder="Your login email" required />
                            </div>
                            {touchedFields.email && fieldErrors.email && (
                                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="label">Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur}
                                    className={`input-field pl-12 pr-12 ${touchedFields.password && fieldErrors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} placeholder="Create a password (min 6 characters)" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {touchedFields.password && fieldErrors.password && (
                                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {fieldErrors.password}
                                </p>
                            )}
                            {/* Password strength indicator */}
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4, 5].map(level => (
                                            <div
                                                key={level}
                                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                                    level <= passwordStrength.score
                                                        ? passwordStrength.color
                                                        : 'bg-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs font-medium ${passwordStrength.textColor}`}>
                                        {passwordStrength.label}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="label">Confirm Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur}
                                    className={`input-field pl-12 ${touchedFields.confirmPassword && fieldErrors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} placeholder="Re-enter your password" required />
                            </div>
                            {touchedFields.confirmPassword && fieldErrors.confirmPassword && (
                                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    {fieldErrors.confirmPassword}
                                </p>
                            )}
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary-600" />
                            Business Information
                        </h3>

                        {/* Company Name */}
                        <div>
                            <label className="label">Company / Business Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. ABC Trading Corp" required />
                            </div>
                        </div>

                        {/* Employer Type */}
                        <div>
                            <label className="label">Employer Type <span className="text-red-500">*</span></label>
                            <div className="space-y-3">
                                {EMPLOYER_TYPES.map((opt) => (
                                    <label key={opt.value}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.employer_type === opt.value
                                            ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <input type="radio" name="employer_type" value={opt.value}
                                            checked={formData.employer_type === opt.value} onChange={handleChange} className="sr-only" />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.employer_type === opt.value ? 'border-primary-500' : 'border-gray-300'
                                            }`}>
                                            {formData.employer_type === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{opt.label}</p>
                                            <p className="text-xs text-gray-500">{opt.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Registration Number */}
                        <div>
                            <label className="label">Business Registration Number (DTI / SEC)</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="business_reg_number" value={formData.business_reg_number} onChange={handleChange}
                                    className="input-field pl-12" placeholder="If applicable" />
                            </div>
                        </div>

                        {/* Business Address */}
                        <div>
                            <label className="label">Business Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <textarea name="business_address" value={formData.business_address} onChange={handleChange}
                                    className="input-field pl-12 min-h-[80px] resize-none" placeholder="Complete business address" required />
                            </div>
                        </div>

                        {/* Nature of Business */}
                        <div>
                            <label className="label">Nature of Business / Industry <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="nature_of_business" value={formData.nature_of_business} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. Retail, Manufacturing, IT Services" required />
                            </div>
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Representative & Contact Details
                        </h3>

                        {/* Full Name */}
                        <div>
                            <label className="label">Full Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="representative_name" value={formData.representative_name} onChange={handleChange}
                                    className="input-field pl-12" placeholder="Authorized representative's full name" required />
                            </div>
                        </div>

                        {/* Position */}
                        <div>
                            <label className="label">Position / Role <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="representative_position" value={formData.representative_position} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. Owner, HR Manager, Director" required />
                            </div>
                        </div>

                        {/* Gov ID Upload */}
                        <FileUpload label={<>Government-Issued ID <span className="text-red-500">*</span></>} file={govIdFile} setFile={setGovIdFile} />

                        <hr className="border-gray-200" />

                        {/* Official Email */}
                        <div>
                            <label className="label">Official Email Address <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange}
                                    className="input-field pl-12" placeholder="company@email.com" required />
                            </div>
                        </div>

                        {/* Contact Number */}
                        <div>
                            <label className="label">Contact Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange}
                                    className="input-field pl-12" placeholder="09XX XXX XXXX" required />
                            </div>
                        </div>

                        {/* Preferred Contact Method */}
                        <div>
                            <label className="label">Preferred Communication Method</label>
                            <div className="grid grid-cols-3 gap-3">
                                {CONTACT_METHODS.map((m) => (
                                    <label key={m.value}
                                        className={`p-3 rounded-xl border-2 text-center text-sm cursor-pointer transition-all ${formData.preferred_contact_method === m.value
                                            ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}
                                    >
                                        <input type="radio" name="preferred_contact_method" value={m.value}
                                            checked={formData.preferred_contact_method === m.value} onChange={handleChange} className="sr-only" />
                                        {m.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )

            case 4:
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            Verification Documents
                        </h3>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
                            <p className="text-blue-800 text-sm">
                                <strong>Why we need this:</strong> PESO requires business verification documents to ensure
                                all employer accounts are legitimate and compliant with local employment regulations.
                            </p>
                        </div>

                        <FileUpload
                            label={<>Business Permit or Registration Certificate <span className="text-red-500">*</span></>}
                            file={businessPermitFile}
                            setFile={setBusinessPermitFile}
                        />

                        <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="font-medium text-gray-700 mb-2 text-sm">Acceptable documents:</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Mayor's / Business Permit</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> DTI Certificate of Registration</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> SEC Certificate of Registration</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> BIR Certificate of Registration</li>
                            </ul>
                        </div>

                        <hr className="border-gray-200" />

                        {/* Agreements */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary-600" />
                                Agreements & Compliance
                            </h4>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input type="checkbox" name="terms_accepted" checked={formData.terms_accepted} onChange={handleChange}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                    I accept the <a href="#" className="text-primary-600 underline hover:text-primary-700">Terms and Conditions</a> of PESO Connect. <span className="text-red-500">*</span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input type="checkbox" name="peso_consent" checked={formData.peso_consent} onChange={handleChange}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                    I consent to PESO verification and data processing in accordance with the Data Privacy Act of 2012. <span className="text-red-500">*</span>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <input type="checkbox" name="labor_compliance" checked={formData.labor_compliance} onChange={handleChange}
                                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                    I confirm compliance with all applicable labor and employment laws and regulations. <span className="text-red-500">*</span>
                                </span>
                            </label>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4 py-12">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <img src="/peso-logo.png" alt="PESO Connect" className="w-20 h-20 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold gradient-text">Employer Registration</h1>
                    <p className="text-gray-600 mt-2">Register your business with PESO Connect</p>
                </div>

                {/* Progress */}
                <ProgressBar />

                {/* Form Card */}
                <div className="card animate-slide-up">
                    <form onSubmit={handleSubmit}>
                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-6">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Step Content */}
                        {renderStep()}

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                            {currentStep === 1 ? (
                                <Link to="/register"
                                    className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all font-medium">
                                    <ChevronLeft className="w-5 h-5" /> Back to Register
                                </Link>
                            ) : currentStep === 2 && accountCreated ? (
                                <Link to="/register"
                                    className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all font-medium">
                                    <ChevronLeft className="w-5 h-5" /> Back to Register
                                </Link>
                            ) : (
                                <button type="button" onClick={prevStep}
                                    className="flex items-center gap-2 px-5 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all font-medium">
                                    <ChevronLeft className="w-5 h-5" /> Back
                                </button>
                            )}

                            {currentStep < 4 ? (
                                <button type="button" onClick={nextStep} disabled={loading || saving}
                                    className="btn-primary flex items-center gap-2">
                                    {loading || saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {loading ? 'Creating Account...' : 'Saving...'}
                                        </>
                                    ) : (
                                        <>
                                            Next <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button type="submit" disabled={loading || saving}
                                    className="btn-primary flex items-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Submit Registration <CheckCircle className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default EmployerRegistration
