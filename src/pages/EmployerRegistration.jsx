import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sendEmployerRegistrationEmail } from '../services/emailService'
import { validators } from '../utils/validation'
import psgcData from '../data/psgc.json'
import { SearchableSelect } from '../components/forms/SearchableSelect'
import {
    Building2, User, Phone, FileText, Lock, Mail, ChevronRight, ChevronLeft,
    Loader2, AlertCircle, CheckCircle, Upload, X, Briefcase, MapPin, Hash,
    Shield, Globe, Check, Eye, EyeOff, Users, Home, ChevronDown
} from 'lucide-react'

// --- PSGC helpers (mirrors Step3ContactEmployment.jsx) ---
const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi

function normalizeLocationName(value = '') {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\bsta\b\.?/g, 'santa')
        .replace(/\bsto\b\.?/g, 'santo')
        .replace(/\bof\b/g, '')
        .replace(CITY_OR_MUNICIPALITY_SUFFIX, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

function sortNames(values = []) {
    return [...values].sort((a, b) => a.localeCompare(b))
}

function findProvinceByName(provinceName) {
    if (!provinceName) return null
    return psgcData.provinces.find((province) => (
        province.name === provinceName || normalizeLocationName(province.name) === normalizeLocationName(provinceName)
    )) || null
}

function findMunicipalityByName(province, municipalityName) {
    if (!province || !municipalityName) return null
    return province.municipalities.find((municipality) => (
        municipality.name === municipalityName || normalizeLocationName(municipality.name) === normalizeLocationName(municipalityName)
    )) || null
}

const STEPS = [
    { id: 1, title: 'Account', icon: Lock },
    { id: 2, title: 'Establishment', icon: Building2 },
    { id: 3, title: 'Address', icon: MapPin },
    { id: 4, title: 'Contact', icon: User },
    { id: 5, title: 'Documents', icon: FileText },
]

const OFFICE_TYPES = [
    { value: 'main_office', label: 'Main Office' },
    { value: 'branch', label: 'Branch' },
]

const PRIVATE_TYPES = [
    { value: 'direct_hire', label: 'Direct Hire' },
    { value: 'local_recruitment_agency', label: 'Local Recruitment Agency' },
    { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency' },
    { value: 'do_174', label: 'D.O. 174' },
]

const PUBLIC_TYPES = [
    { value: 'nga', label: 'National Government Agency' },
    { value: 'lgu', label: 'Local Government Unit' },
    { value: 'gocc', label: 'Government-owned and Controlled Corporation' },
    { value: 'suc', label: 'State/Local University or College' },
]

const WORKFORCE_SIZES = [
    { value: 'micro', label: 'Micro (1-9)' },
    { value: 'small', label: 'Small (10-99)' },
    { value: 'medium', label: 'Medium (100-199)' },
    { value: 'large', label: 'Large (200 and up)' },
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
        // Step 2 — Establishment Details
        company_name: '',
        trade_name: '',
        acronym: '',
        office_type: '',
        employer_sector: '', // 'private' | 'public'
        employer_type_specific: '',
        nature_of_business: '',
        total_work_force: '',
        tin: '',
        business_reg_number: '',
        // Step 3 — Business Address
        province: '',
        city: '',
        barangay: '',
        street: '',
        // Step 4 — Contact & Representative
        owner_name: '',
        same_as_owner: false,
        representative_name: '',
        representative_position: '',
        contact_email: '',
        contact_number: '',
        telephone_number: '',
        // Step 5 — Agreements
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

    const prevStepRef = useRef(currentStep)
    useEffect(() => {
        if (currentStep !== prevStepRef.current) {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        prevStepRef.current = currentStep
    }, [currentStep])

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
                trade_name: userData.trade_name || '',
                acronym: userData.acronym || '',
                office_type: userData.office_type || '',
                employer_sector: userData.employer_sector || '',
                employer_type_specific: userData.employer_type_specific || '',
                nature_of_business: userData.nature_of_business || '',
                total_work_force: userData.total_work_force || '',
                tin: userData.tin || '',
                business_reg_number: userData.business_reg_number || '',
                province: userData.province || '',
                city: userData.city || '',
                barangay: userData.barangay || '',
                street: userData.street || '',
                owner_name: userData.owner_name || '',
                same_as_owner: userData.same_as_owner || false,
                representative_name: userData.representative_name || '',
                representative_position: userData.representative_position || '',
                contact_email: userData.contact_email || '',
                contact_number: userData.contact_number || '',
                telephone_number: userData.telephone_number || '',
                terms_accepted: userData.terms_accepted || false,
                peso_consent: userData.peso_consent || false,
                labor_compliance: userData.labor_compliance || false,
            }))
            const savedStep = userData.registration_step || 1
            setCurrentStep(Math.min(savedStep + 1, 5))
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value }
            // If user changes the sector, reset the specific sub-type
            if (name === 'employer_sector') {
                next.employer_type_specific = ''
            }
            // If "same as owner" toggled on, mirror owner_name into representative_name
            if (name === 'same_as_owner' && checked) {
                next.representative_name = prev.owner_name
            }
            // If owner_name edited while same_as_owner is on, keep them in sync
            if (name === 'owner_name' && prev.same_as_owner) {
                next.representative_name = value
            }
            return next
        })
        // Clear field error on change
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: null }))
        }
    }

    // --- PSGC cascading options ---
    const resolvedProvince = useMemo(() => findProvinceByName(formData.province), [formData.province])
    const resolvedProvinceName = resolvedProvince?.name ?? formData.province
    const resolvedCity = useMemo(() => findMunicipalityByName(resolvedProvince, formData.city), [resolvedProvince, formData.city])
    const resolvedCityName = resolvedCity?.name ?? formData.city

    const provinceOptions = useMemo(() => sortNames(psgcData.provinces.map(p => p.name)), [])
    const cityOptions = useMemo(() => {
        if (!resolvedProvince) return []
        return sortNames(resolvedProvince.municipalities.map(m => m.name))
    }, [resolvedProvince])
    const barangayOptions = useMemo(() => {
        if (!resolvedCity) return []
        return sortNames(resolvedCity.barangays)
    }, [resolvedCity])

    const handleProvinceChange = (e) => {
        setFormData(prev => ({ ...prev, province: e.target.value, city: '', barangay: '' }))
    }
    const handleCityChange = (e) => {
        setFormData(prev => ({ ...prev, city: e.target.value, barangay: '' }))
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
                if (!formData.company_name.trim()) return 'Business name is required.'
                if (!formData.office_type) return 'Please select an office classification.'
                if (!formData.employer_sector) return 'Please select an employer sector.'
                if (!formData.employer_type_specific) return 'Please select a specific employer type.'
                if (!formData.nature_of_business.trim()) return 'Line of business / industry is required.'
                if (!formData.total_work_force) return 'Please select a total work force size.'
                if (!formData.tin.trim()) return 'TIN is required.'
                return null
            case 3:
                if (!formData.province.trim()) return 'Province is required.'
                if (!formData.city.trim()) return 'City / Municipality is required.'
                if (!formData.barangay.trim()) return 'Barangay is required.'
                return null
            case 4:
                if (!formData.owner_name.trim()) return 'Name of owner / president is required.'
                if (!formData.representative_name.trim()) return 'Contact person full name is required.'
                if (!formData.representative_position.trim()) return 'Position is required.'
                if (!formData.contact_email.trim()) return 'Official contact email is required.'
                if (validators.email(formData.contact_email)) return 'Please enter a valid email address.'
                if (!formData.contact_number.trim()) return 'Mobile number is required.'
                if (validators.phone(formData.contact_number)) return 'Please enter a valid mobile number.'
                return null
            case 5:
                if (!govIdFile && !userData?.gov_id_url) return 'Please upload a government-issued ID.'
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
                    trade_name: formData.trade_name,
                    acronym: formData.acronym,
                    office_type: formData.office_type,
                    employer_sector: formData.employer_sector,
                    employer_type_specific: formData.employer_type_specific,
                    nature_of_business: formData.nature_of_business,
                    total_work_force: formData.total_work_force,
                    tin: formData.tin,
                    business_reg_number: formData.business_reg_number,
                }
            } else if (currentStep === 3) {
                stepData = {
                    province: formData.province,
                    city: formData.city,
                    barangay: formData.barangay,
                    street: formData.street,
                }
            } else if (currentStep === 4) {
                stepData = {
                    owner_name: formData.owner_name,
                    same_as_owner: formData.same_as_owner,
                    representative_name: formData.representative_name,
                    representative_position: formData.representative_position,
                    name: formData.representative_name,
                    contact_email: formData.contact_email,
                    contact_number: formData.contact_number,
                    telephone_number: formData.telephone_number,
                }
            }
            await saveRegistrationStep(stepData, currentStep)
            setCurrentStep(prev => Math.min(prev + 1, 5))
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
        const validationError = validateStep(5)
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

            if (govIdFile) {
                finalData.gov_id_url = await compressAndEncode(govIdFile)
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

            // Redirect to email verification if not yet confirmed
            if (!currentUser?.email_confirmed_at && !currentUser?.confirmed_at) {
                navigate('/verify-email', { state: { email: userData?.email || formData.email } })
            } else {
                setSubmitted(true)
            }
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

            case 2: {
                const sectorOptions = formData.employer_sector === 'public' ? PUBLIC_TYPES
                    : formData.employer_sector === 'private' ? PRIVATE_TYPES
                    : []
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary-600" />
                            Establishment Details
                        </h3>

                        {/* Business Name */}
                        <div>
                            <label className="label">Business Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. ABC Trading Corp" required />
                            </div>
                        </div>

                        {/* Trade Name */}
                        <div>
                            <label className="label">Trade Name</label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="trade_name" value={formData.trade_name} onChange={handleChange}
                                    className="input-field pl-12" placeholder="Optional" />
                            </div>
                        </div>

                        {/* Acronym */}
                        <div>
                            <label className="label">Acronym / Abbreviation</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="acronym" value={formData.acronym} onChange={handleChange}
                                    className="input-field pl-12" placeholder="Optional" />
                            </div>
                        </div>

                        {/* Office Classification */}
                        <div>
                            <label className="label">Office Classification <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-3">
                                {OFFICE_TYPES.map((opt) => (
                                    <label key={opt.value}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.office_type === opt.value
                                            ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <input type="radio" name="office_type" value={opt.value}
                                            checked={formData.office_type === opt.value} onChange={handleChange} className="sr-only" />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.office_type === opt.value ? 'border-primary-500' : 'border-gray-300'
                                            }`}>
                                            {formData.office_type === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                                        </div>
                                        <span className="font-medium text-gray-900">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Employer Sector */}
                        <div>
                            <label className="label">Employer Sector <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ value: 'private', label: 'Private' }, { value: 'public', label: 'Public' }].map((opt) => (
                                    <label key={opt.value}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.employer_sector === opt.value
                                            ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <input type="radio" name="employer_sector" value={opt.value}
                                            checked={formData.employer_sector === opt.value} onChange={handleChange} className="sr-only" />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.employer_sector === opt.value ? 'border-primary-500' : 'border-gray-300'
                                            }`}>
                                            {formData.employer_sector === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                                        </div>
                                        <span className="font-medium text-gray-900">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Specific Employer Type (depends on sector) */}
                        {formData.employer_sector && (
                            <div>
                                <label className="label">
                                    {formData.employer_sector === 'public' ? 'Type of Public Establishment' : 'Type of Private Establishment'}
                                    <span className="text-red-500"> *</span>
                                </label>
                                <div className="space-y-2">
                                    {sectorOptions.map((opt) => (
                                        <label key={opt.value}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.employer_type_specific === opt.value
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                        >
                                            <input type="radio" name="employer_type_specific" value={opt.value}
                                                checked={formData.employer_type_specific === opt.value} onChange={handleChange} className="sr-only" />
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.employer_type_specific === opt.value ? 'border-primary-500' : 'border-gray-300'
                                                }`}>
                                                {formData.employer_type_specific === opt.value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                                            </div>
                                            <span className="text-sm text-gray-800">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Line of Business / Industry */}
                        <div>
                            <label className="label">Line of Business / Industry <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="nature_of_business" value={formData.nature_of_business} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. Retail, Manufacturing, IT Services" required />
                            </div>
                        </div>

                        {/* Total Work Force */}
                        <SearchableSelect
                            label="Total Work Force"
                            name="total_work_force"
                            value={WORKFORCE_SIZES.find(o => o.value === formData.total_work_force)?.label || ''}
                            onChange={(e) => {
                                const selectedLabel = e.target.value
                                const match = WORKFORCE_SIZES.find(o => o.label === selectedLabel)
                                handleChange({ target: { name: 'total_work_force', value: match?.value || '' } })
                            }}
                            options={WORKFORCE_SIZES.map(o => o.label)}
                            icon={Users}
                            required
                        />

                        {/* TIN */}
                        <div>
                            <label className="label">TIN (Tax Identification Number) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="tin" value={formData.tin} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. 123-456-789-000" required />
                            </div>
                        </div>

                        {/* Business Reg Number */}
                        <div>
                            <label className="label">Business Registration Number (DTI / SEC)</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="business_reg_number" value={formData.business_reg_number} onChange={handleChange}
                                    className="input-field pl-12" placeholder="If applicable" />
                            </div>
                        </div>
                    </div>
                )
            }

            case 3:
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-600" />
                            Business Address
                        </h3>

                        {/* Province */}
                        <SearchableSelect
                            label="Province"
                            name="province"
                            value={resolvedProvinceName || ''}
                            onChange={handleProvinceChange}
                            options={provinceOptions}
                            icon={MapPin}
                            required
                        />

                        {/* City */}
                        <SearchableSelect
                            label="City / Municipality"
                            name="city"
                            value={resolvedCityName || ''}
                            onChange={handleCityChange}
                            options={cityOptions}
                            icon={MapPin}
                            required
                        />

                        {/* Barangay */}
                        <SearchableSelect
                            label="Barangay"
                            name="barangay"
                            value={formData.barangay || ''}
                            onChange={handleChange}
                            options={barangayOptions}
                            icon={MapPin}
                            required
                        />

                        {/* Street */}
                        <div>
                            <label className="label">Street / Village / Bldg Number</label>
                            <div className="relative">
                                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="street" value={formData.street} onChange={handleChange}
                                    className="input-field pl-12" placeholder="Optional" />
                            </div>
                        </div>
                    </div>
                )

            case 4:
                return (
                    <div className="space-y-5 animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Contact & Representative
                        </h3>

                        {/* Owner / President */}
                        <div>
                            <label className="label">Name of Owner / President <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="owner_name" value={formData.owner_name} onChange={handleChange}
                                    className="input-field pl-12" placeholder="Full name of owner or president" required />
                            </div>
                        </div>

                        {/* Same as owner checkbox */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input type="checkbox" name="same_as_owner" checked={formData.same_as_owner} onChange={handleChange}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                Contact person is the same as Owner / President
                            </span>
                        </label>

                        {/* Contact Person Name */}
                        <div>
                            <label className="label">Contact Person Full Name <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="representative_name" value={formData.representative_name} onChange={handleChange}
                                    disabled={formData.same_as_owner}
                                    className="input-field pl-12 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="Authorized representative's full name" required />
                            </div>
                        </div>

                        {/* Position */}
                        <div>
                            <label className="label">Position <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" name="representative_position" value={formData.representative_position} onChange={handleChange}
                                    className="input-field pl-12" placeholder="e.g. Owner, HR Manager, Director" required />
                            </div>
                        </div>

                        {/* Official Email */}
                        <div>
                            <label className="label">Official Contact Email <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange}
                                    className="input-field pl-12" placeholder="company@email.com" required />
                            </div>
                        </div>

                        {/* Mobile Number */}
                        <div>
                            <label className="label">Mobile Number <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange}
                                    className="input-field pl-12" placeholder="09XX XXX XXXX" required />
                            </div>
                        </div>

                        {/* Telephone / Landline */}
                        <div>
                            <label className="label">Telephone / Landline Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="tel" name="telephone_number" value={formData.telephone_number} onChange={handleChange}
                                    className="input-field pl-12" placeholder="Optional" />
                            </div>
                        </div>
                    </div>
                )

            case 5:
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
                            label={<>Government-Issued ID <span className="text-red-500">*</span></>}
                            file={govIdFile}
                            setFile={setGovIdFile}
                        />

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

                            {currentStep < 5 ? (
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
