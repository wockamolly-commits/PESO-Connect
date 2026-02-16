import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import {
    Briefcase,
    FileText,
    Plus,
    X,
    Loader2,
    AlertCircle,
    CheckCircle,
    Info,
    MapPin,
    Clock,
    Users,
    GraduationCap,
    Zap,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Search,
    Calendar
} from 'lucide-react'

// Standardized skills by category
const SKILL_CATEGORIES = {
    agriculture: {
        name: 'Agriculture',
        skills: ['Farming', 'Livestock Care', 'Crop Management', 'Irrigation', 'Harvesting', 'Organic Farming', 'Pest Control', 'Farm Equipment Operation']
    },
    energy: {
        name: 'Energy & Utilities',
        skills: ['Electrical Installation', 'Solar Panel Installation', 'Power Line Maintenance', 'Generator Operation', 'Meter Reading', 'Energy Auditing']
    },
    retail: {
        name: 'Retail & Service',
        skills: ['Customer Service', 'Sales', 'Inventory Management', 'Cashiering', 'Visual Merchandising', 'Stock Management', 'POS Operation']
    },
    it: {
        name: 'Information Technology',
        skills: ['Computer Repair', 'Network Setup', 'Web Development', 'Data Entry', 'MS Office', 'Technical Support', 'Database Management']
    },
    trades: {
        name: 'Skilled Trades',
        skills: ['Plumbing', 'Electrical Work', 'Carpentry', 'Welding', 'Masonry', 'Painting', 'HVAC', 'Auto Repair', 'Motorcycle Repair']
    },
    hospitality: {
        name: 'Hospitality',
        skills: ['Cooking', 'Baking', 'Food Preparation', 'Bartending', 'Housekeeping', 'Front Desk', 'Event Planning']
    }
}

// Flatten all skills for autocomplete
const ALL_SKILLS = Object.values(SKILL_CATEGORIES).flatMap(cat => cat.skills)

// Generate skill ID for matching vector
const getSkillId = (skill) => skill.toLowerCase().replace(/\s+/g, '_')

const PostJobWizard = () => {
    const { currentUser, userData, isVerified } = useAuth()
    const navigate = useNavigate()

    // Current step (1-4)
    const [currentStep, setCurrentStep] = useState(1)

    // Global job data state
    const [jobData, setJobData] = useState({
        // Step 1: Basic Info
        title: '',
        category: '',
        type: 'full-time',
        location: 'San Carlos City',

        // Step 2: Job Details
        salaryMin: '',
        salaryMax: '',
        description: '',

        // Step 3: Requirements
        requiredSkills: [],
        experienceLevel: 'entry',
        educationLevel: 'high-school',
        vacancies: 1,
        deadline: '',
        filterMode: 'strict',
        aiMatchingEnabled: true
    })

    // UI states
    const [skillInput, setSkillInput] = useState('')
    const [skillSuggestions, setSkillSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [stepErrors, setStepErrors] = useState({})

    const skillInputRef = useRef(null)
    const suggestionsRef = useRef(null)

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                skillInputRef.current && !skillInputRef.current.contains(e.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filter skill suggestions
    useEffect(() => {
        if (skillInput.trim()) {
            const filtered = ALL_SKILLS.filter(skill =>
                skill.toLowerCase().includes(skillInput.toLowerCase()) &&
                !jobData.requiredSkills.includes(skill)
            ).slice(0, 6)
            setSkillSuggestions(filtered)
            setShowSuggestions(filtered.length > 0)
        } else {
            setSkillSuggestions([])
            setShowSuggestions(false)
        }
    }, [skillInput, jobData.requiredSkills])

    const updateJobData = (field, value) => {
        setJobData(prev => ({ ...prev, [field]: value }))
        // Clear error for field when updated
        if (stepErrors[field]) {
            setStepErrors(prev => ({ ...prev, [field]: null }))
        }
    }

    const addSkill = (skill) => {
        if (skill && !jobData.requiredSkills.includes(skill)) {
            updateJobData('requiredSkills', [...jobData.requiredSkills, skill])
        }
        setSkillInput('')
        setShowSuggestions(false)
        skillInputRef.current?.focus()
    }

    const removeSkill = (skill) => {
        updateJobData('requiredSkills', jobData.requiredSkills.filter(s => s !== skill))
    }

    const handleSkillKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (skillSuggestions.length > 0) {
                addSkill(skillSuggestions[0])
            } else if (skillInput.trim()) {
                addSkill(skillInput.trim())
            }
        }
    }

    // Step validation
    const validateStep = (step) => {
        const errors = {}

        if (step === 1) {
            if (!jobData.title.trim()) {
                errors.title = 'Job title is required'
            }
            if (!jobData.category) {
                errors.category = 'Please select a category'
            }
        }

        if (step === 2) {
            if (!jobData.salaryMin || isNaN(jobData.salaryMin) || Number(jobData.salaryMin) < 0) {
                errors.salaryMin = 'Valid minimum salary is required'
            }
            if (!jobData.salaryMax || isNaN(jobData.salaryMax) || Number(jobData.salaryMax) < 0) {
                errors.salaryMax = 'Valid maximum salary is required'
            }
            if (Number(jobData.salaryMax) < Number(jobData.salaryMin)) {
                errors.salaryMax = 'Maximum salary must be greater than minimum'
            }
            if (!jobData.description || jobData.description.length < 50) {
                errors.description = 'Description must be at least 50 characters'
            }
        }

        if (step === 3) {
            if (jobData.requiredSkills.length === 0) {
                errors.requiredSkills = 'At least one skill is required'
            }
        }

        setStepErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4))
        }
    }

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

    // Publish job with AI matching vector
    const publishJob = async () => {
        if (!validateStep(3)) return

        setLoading(true)
        setError('')

        try {
            // Build the job document
            const jobDocument = {
                title: jobData.title,
                category: jobData.category,
                type: jobData.type,
                location: jobData.location,
                salary_range: `PHP ${Number(jobData.salaryMin).toLocaleString()} - ${Number(jobData.salaryMax).toLocaleString()}`,
                salary_min: Number(jobData.salaryMin),
                salary_max: Number(jobData.salaryMax),
                description: jobData.description,
                requirements: jobData.requiredSkills,
                experience_level: jobData.experienceLevel,
                education_level: jobData.educationLevel,
                vacancies: Number(jobData.vacancies),
                deadline: jobData.deadline || null,
                ai_matching_enabled: jobData.aiMatchingEnabled,
                employer_id: currentUser.uid,
                employer_name: userData?.name || 'Unknown',
                status: 'open',
                applications_count: 0,
                filter_mode: jobData.filterMode,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            // If AI matching is enabled, create match vector for faster queries
            if (jobData.aiMatchingEnabled) {
                jobDocument.matchVector = jobData.requiredSkills.map(skill => getSkillId(skill))
                jobDocument.matchVectorCount = jobData.requiredSkills.length
            }

            await addDoc(collection(db, 'job_postings'), jobDocument)

            setSuccess(true)
            setTimeout(() => {
                navigate('/my-listings')
            }, 2000)
        } catch (err) {
            console.error('Error posting job:', err)
            setError('Failed to post job. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Steps configuration
    const steps = [
        { number: 1, title: 'Basic Info', icon: Briefcase },
        { number: 2, title: 'Job Details', icon: FileText },
        { number: 3, title: 'Requirements', icon: Users },
        { number: 4, title: 'Review', icon: CheckCircle }
    ]

    // Verification check
    if (!isVerified()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
                <div className="card max-w-md text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Required</h2>
                    <p className="text-gray-600 mb-6">
                        Your account must be verified by the PESO administrator before you can post job openings.
                    </p>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    // Success screen
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
                <div className="card max-w-md text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Posted Successfully!</h2>
                    <p className="text-gray-600">
                        {jobData.aiMatchingEnabled
                            ? 'AI matching is enabled. Qualified candidates will be notified automatically.'
                            : 'Your job listing is now live. Redirecting to your listings...'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a New Job</h1>
                    <p className="text-gray-600">Complete all steps to publish your job listing.</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {steps.map((step, index) => (
                            <div key={step.number} className="flex items-center">
                                <div className={`
                                    flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300
                                    ${currentStep === step.number
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                        : currentStep > step.number
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    }
                                `}>
                                    {currentStep > step.number ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <step.icon className="w-5 h-5" />
                                    )}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`
                                        w-16 md:w-24 h-1 mx-2 rounded-full transition-all duration-300
                                        ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-sm">
                        {steps.map(step => (
                            <span key={step.number} className={`
                                ${currentStep === step.number ? 'text-primary-600 font-semibold' : 'text-gray-500'}
                            `}>
                                {step.title}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Form Card */}
                <div className="card">
                    {error && (
                        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Step 1: Basic Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-6 h-6 text-primary-600" />
                                Basic Information
                            </h2>

                            {/* Job Title */}
                            <div>
                                <label className="label">Job Title *</label>
                                <input
                                    type="text"
                                    value={jobData.title}
                                    onChange={(e) => updateJobData('title', e.target.value)}
                                    className={`input-field ${stepErrors.title ? 'border-red-500' : ''}`}
                                    placeholder="e.g. Electrician, Plumber, Welder"
                                />
                                {stepErrors.title && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.title}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="label">Category *</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(SKILL_CATEGORIES).map(([key, cat]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => updateJobData('category', key)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${jobData.category === key
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                                        </button>
                                    ))}
                                </div>
                                {stepErrors.category && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.category}</p>
                                )}
                            </div>

                            {/* Job Type */}
                            <div>
                                <label className="label">Employment Type</label>
                                <div className="flex flex-wrap gap-3">
                                    {['full-time', 'part-time', 'contract', 'temporary'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => updateJobData('type', type)}
                                            className={`px-4 py-2 rounded-full border-2 capitalize transition-all ${jobData.type === type
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {type.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="label">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={jobData.location}
                                        onChange={(e) => updateJobData('location', e.target.value)}
                                        className="input-field pl-12"
                                        placeholder="e.g. San Carlos City"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Job Details */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-primary-600">₱</span>
                                Job Details
                            </h2>

                            {/* Salary Range */}
                            <div>
                                <label className="label">Salary Range (PHP/month) *</label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                                            <input
                                                type="number"
                                                value={jobData.salaryMin}
                                                onChange={(e) => updateJobData('salaryMin', e.target.value)}
                                                className={`input-field pl-10 ${stepErrors.salaryMin ? 'border-red-500' : ''}`}
                                                placeholder="Minimum"
                                            />
                                        </div>
                                        {stepErrors.salaryMin && (
                                            <p className="text-red-500 text-sm mt-1">{stepErrors.salaryMin}</p>
                                        )}
                                    </div>
                                    <span className="flex items-center text-gray-400">to</span>
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                                            <input
                                                type="number"
                                                value={jobData.salaryMax}
                                                onChange={(e) => updateJobData('salaryMax', e.target.value)}
                                                className={`input-field pl-10 ${stepErrors.salaryMax ? 'border-red-500' : ''}`}
                                                placeholder="Maximum"
                                            />
                                        </div>
                                        {stepErrors.salaryMax && (
                                            <p className="text-red-500 text-sm mt-1">{stepErrors.salaryMax}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="label">
                                    Job Description *
                                    <span className="text-gray-400 font-normal ml-2">
                                        ({jobData.description.length}/50 min)
                                    </span>
                                </label>
                                <textarea
                                    value={jobData.description}
                                    onChange={(e) => updateJobData('description', e.target.value)}
                                    className={`input-field min-h-[150px] ${stepErrors.description ? 'border-red-500' : ''}`}
                                    placeholder="Describe the job responsibilities, work environment, and what you're looking for in a candidate..."
                                />
                                {stepErrors.description && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.description}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Requirements */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Users className="w-6 h-6 text-primary-600" />
                                Requirements
                            </h2>

                            {/* Skills Autocomplete */}
                            <div>
                                <label className="label">Required Skills *</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        ref={skillInputRef}
                                        type="text"
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={handleSkillKeyDown}
                                        onFocus={() => skillInput && setShowSuggestions(true)}
                                        className={`input-field pl-12 ${stepErrors.requiredSkills ? 'border-red-500' : ''}`}
                                        placeholder="Type to search skills..."
                                    />

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && (
                                        <div
                                            ref={suggestionsRef}
                                            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                                        >
                                            {skillSuggestions.map((skill, index) => (
                                                <button
                                                    key={skill}
                                                    type="button"
                                                    onClick={() => addSkill(skill)}
                                                    className={`w-full px-4 py-3 text-left hover:bg-primary-50 transition-colors ${index !== skillSuggestions.length - 1 ? 'border-b border-gray-100' : ''
                                                        }`}
                                                >
                                                    <span className="font-medium text-gray-700">{skill}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {stepErrors.requiredSkills && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.requiredSkills}</p>
                                )}

                                {/* Skill Chips */}
                                {jobData.requiredSkills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {jobData.requiredSkills.map(skill => (
                                            <span
                                                key={skill}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                                            >
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(skill)}
                                                    className="hover:text-primary-900 ml-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Quick Add from Category */}
                                {jobData.category && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm text-gray-600 mb-2">Quick add from {SKILL_CATEGORIES[jobData.category]?.name}:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {SKILL_CATEGORIES[jobData.category]?.skills
                                                .filter(s => !jobData.requiredSkills.includes(s))
                                                .slice(0, 5)
                                                .map(skill => (
                                                    <button
                                                        key={skill}
                                                        type="button"
                                                        onClick={() => addSkill(skill)}
                                                        className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                                                    >
                                                        + {skill}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Experience Level */}
                            <div>
                                <label className="label">Experience Level</label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'entry', label: 'Entry Level' },
                                        { value: 'mid', label: '1-3 Years' },
                                        { value: 'senior', label: '3+ Years' }
                                    ].map(level => (
                                        <button
                                            key={level.value}
                                            type="button"
                                            onClick={() => updateJobData('experienceLevel', level.value)}
                                            className={`px-4 py-2 rounded-full border-2 transition-all ${jobData.experienceLevel === level.value
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Education Level */}
                            <div>
                                <label className="label">Minimum Education</label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={jobData.educationLevel}
                                        onChange={(e) => updateJobData('educationLevel', e.target.value)}
                                        className="input-select pl-12"
                                    >
                                        <option value="none">No formal education required</option>
                                        <option value="elementary">Elementary Graduate</option>
                                        <option value="high-school">High School Graduate</option>
                                        <option value="vocational">Vocational/TESDA Certificate</option>
                                        <option value="college">College Graduate</option>
                                    </select>
                                </div>
                            </div>

                            {/* Vacancies */}
                            <div>
                                <label className="label">Number of Vacancies</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={jobData.vacancies}
                                    onChange={(e) => updateJobData('vacancies', e.target.value)}
                                    className="input-field w-32"
                                />
                            </div>

                            {/* Application Deadline */}
                            <div>
                                <label className="label">Application Deadline (Optional)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={jobData.deadline}
                                        onChange={(e) => updateJobData('deadline', e.target.value)}
                                        className="input-field pl-12"
                                    />
                                </div>
                            </div>

                            {/* Filter Mode Selector */}
                            <div>
                                <label className="label">Applicant Matching Mode *</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => updateJobData('filterMode', 'strict')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${jobData.filterMode === 'strict'
                                            ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-500/10'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${jobData.filterMode === 'strict' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <p className="font-semibold text-gray-900">Strict Matching</p>
                                        </div>
                                        <p className="text-sm text-gray-500 ml-11">
                                            Only candidates who meet <strong>all</strong> requirements can apply. Best for specialized roles.
                                        </p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateJobData('filterMode', 'flexible')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${jobData.filterMode === 'flexible'
                                            ? 'border-accent-500 bg-accent-50 shadow-lg shadow-accent-500/10'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${jobData.filterMode === 'flexible' ? 'bg-accent-500 text-white' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <p className="font-semibold text-gray-900">Flexible Matching</p>
                                        </div>
                                        <p className="text-sm text-gray-500 ml-11">
                                            Candidates can apply and <strong>justify skill gaps</strong>. Best for entry-level or trainable roles.
                                        </p>
                                    </button>
                                </div>
                                {jobData.filterMode === 'flexible' && (
                                    <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-700">
                                            Applicants without exact skill matches will need to provide a written justification explaining why they're suitable.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* AI Matching Toggle */}
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">AI-Powered Matching</p>
                                            <p className="text-sm text-gray-600">Automatically match qualified candidates</p>
                                        </div>
                                    </div>

                                    {/* Custom Toggle Switch */}
                                    <button
                                        type="button"
                                        onClick={() => updateJobData('aiMatchingEnabled', !jobData.aiMatchingEnabled)}
                                        className={`relative w-14 h-8 rounded-full transition-all duration-300 ${jobData.aiMatchingEnabled
                                            ? 'bg-green-500 shadow-lg shadow-green-500/30'
                                            : 'bg-gray-300'
                                            }`}
                                    >
                                        <span className={`
                                            absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300
                                            ${jobData.aiMatchingEnabled ? 'left-7' : 'left-1'}
                                        `} />
                                    </button>
                                </div>
                                {jobData.aiMatchingEnabled && (
                                    <div className="mt-3 flex items-start gap-2 text-sm text-green-700">
                                        <Zap className="w-4 h-4 mt-0.5" />
                                        <span>When enabled, job seekers with matching skills will be automatically notified and prioritized.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="w-6 h-6 text-primary-600" />
                                Review Your Job Posting
                            </h2>

                            <div className="space-y-4">
                                {/* Job Title & Category */}
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="text-lg font-bold text-gray-900">{jobData.title}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="badge badge-info capitalize">{jobData.category}</span>
                                        <span className="badge badge-success capitalize">{jobData.type.replace('-', ' ')}</span>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <MapPin className="w-5 h-5 text-gray-400" />
                                        <span className="text-gray-700">{jobData.location}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">₱</span>
                                        <span className="text-gray-700">
                                            ₱{Number(jobData.salaryMin).toLocaleString()} - ₱{Number(jobData.salaryMax).toLocaleString()}/mo
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <Clock className="w-5 h-5 text-gray-400" />
                                        <span className="text-gray-700 capitalize">{jobData.experienceLevel} Level</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <Users className="w-5 h-5 text-gray-400" />
                                        <span className="text-gray-700">{jobData.vacancies} Vacancy(ies)</span>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
                                    <p className="text-gray-600 whitespace-pre-wrap">{jobData.description}</p>
                                </div>

                                {/* Skills */}
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Required Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {jobData.requiredSkills.map(skill => (
                                            <span key={skill} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Matching Status */}
                                {/* Filter Mode & AI Matching Status */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className={`p-4 rounded-xl border ${jobData.filterMode === 'strict' ? 'bg-primary-50 border-primary-200' : 'bg-accent-50 border-accent-200'}`}>
                                        <div className="flex items-center gap-3">
                                            {jobData.filterMode === 'strict' ? (
                                                <CheckCircle className="w-5 h-5 text-primary-600" />
                                            ) : (
                                                <Users className="w-5 h-5 text-accent-600" />
                                            )}
                                            <span className={`font-medium ${jobData.filterMode === 'strict' ? 'text-primary-700' : 'text-accent-700'}`}>
                                                Matching Mode: <span className="capitalize">{jobData.filterMode}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl border ${jobData.aiMatchingEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <Sparkles className={`w-5 h-5 ${jobData.aiMatchingEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                                            <span className={jobData.aiMatchingEnabled ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                                AI Matching: {jobData.aiMatchingEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                        {currentStep > 1 ? (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="btn-primary flex items-center gap-2"
                            >
                                {currentStep === 3 ? 'Review' : 'Continue'}
                                <ChevronRight className="w,5 h-5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={publishJob}
                                disabled={loading}
                                className="btn-primary flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Publish Job
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PostJobWizard
