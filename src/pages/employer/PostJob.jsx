import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../config/supabase'
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
    Calendar,
    Heart,
    Globe,
    Settings,
    Languages,
    TrendingUp,
    Brain,
} from 'lucide-react'
import { deepAnalyzeJobRequirements } from '../../services/geminiService'
import Select from '../../components/common/Select'
import psgcData from '../../data/psgc.json'
import coursesData from '../../data/courses.json'
import { SearchableSelect } from '../../components/forms/SearchableSelect'
import { SKILL_VOCAB, getSuggestedSkillsFromTitle, getSuggestedSkillsFromDescription, getSuggestedSkillsFromVocab } from '../../utils/jobSkillRecommender'
import { getMarketTrendSkills, getSkillSupplyCounts } from '../../utils/employerSkillSuggestions'

// --- PSGC helpers ---
const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi
function normalizeLocationName(value = '') {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\bsto\b\.?/g, 'santo')
        .replace(/\bof\b/g, '')
        .replace(CITY_OR_MUNICIPALITY_SUFFIX, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}
function sortNames(names) {
    return [...names].sort((a, b) => a.localeCompare(b))
}
function findProvinceByName(provinceName) {
    if (!provinceName) return null
    return psgcData.provinces.find(p =>
        p.name === provinceName || normalizeLocationName(p.name) === normalizeLocationName(provinceName)
    ) || null
}
function findMunicipalityByName(province, municipalityName) {
    if (!province || !municipalityName) return null
    return province.municipalities.find(m =>
        m.name === municipalityName || normalizeLocationName(m.name) === normalizeLocationName(municipalityName)
    ) || null
}

// Standardized skills by category — skills sourced from SKILL_VOCAB for consistency with the recommender
const SKILL_CATEGORIES = {
    agriculture: { name: 'Agriculture', skills: SKILL_VOCAB.agriculture },
    energy:      { name: 'Energy & Utilities', skills: SKILL_VOCAB.energy },
    retail:      { name: 'Retail & Service', skills: SKILL_VOCAB.retail },
    it:          { name: 'Information Technology', skills: SKILL_VOCAB.it },
    trades:      { name: 'Skilled Trades', skills: SKILL_VOCAB.trades },
    hospitality: { name: 'Hospitality', skills: SKILL_VOCAB.hospitality },
}

const ALL_SKILLS = Object.values(SKILL_CATEGORIES).flatMap(cat => cat.skills)

const EMPLOYMENT_TYPES = [
    { value: 'permanent', label: 'Permanent / Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contractual', label: 'Contractual' },
    { value: 'project-based', label: 'Project-based' },
    { value: 'internship', label: 'Internship / OJT' },
]

const WORK_ARRANGEMENTS = [
    { value: 'on-site', label: 'On-site' },
    { value: 'remote', label: 'Work from Home / Remote' },
    { value: 'hybrid', label: 'Hybrid' },
]

const EXPERIENCE_LEVELS = [
    { value: 'entry', label: 'Entry Level (No exp)' },
    { value: '1-3', label: '1-3 Years' },
    { value: '3-5', label: '3-5 Years' },
    { value: '5+', label: '5+ Years' },
]

const EDUCATION_OPTIONS = [
    { value: 'none', label: 'No formal education required' },
    { value: 'elementary', label: 'Elementary Graduate' },
    { value: 'high-school', label: 'High School Graduate (Old Curriculum)' },
    { value: 'senior-high', label: 'Senior High School Graduate (K-12)' },
    { value: 'vocational', label: 'Vocational/TESDA Certificate' },
    { value: 'college', label: 'College Graduate' },
    { value: 'postgraduate', label: 'Postgraduate' },
]

const DISABILITY_OPTIONS = [
    { value: 'visual', label: 'Visual' },
    { value: 'hearing', label: 'Hearing' },
    { value: 'speech', label: 'Speech' },
    { value: 'physical', label: 'Physical' },
    { value: 'mental', label: 'Mental' },
    { value: 'others', label: 'Others' },
]

const COMMON_LANGUAGES = ['English', 'Tagalog', 'Ilocano', 'Pangasinense', 'Cebuano', 'Hiligaynon']
const COMMON_BENEFITS = ['Health Insurance', 'SSS/PhilHealth/Pag-IBIG', 'Transportation Allowance', 'Meal Allowance', 'Performance Bonus', '13th Month Pay', 'Paid Leave', 'Training & Development']

const PostJobWizard = () => {
    const { currentUser, userData, isVerified } = useAuth()
    const navigate = useNavigate()
    const { id: editId } = useParams()
    const isEditMode = Boolean(editId)

    // Current step (1-5)
    const [currentStep, setCurrentStep] = useState(1)
    const [fetchingJob, setFetchingJob] = useState(false)

    const DRAFT_KEY = currentUser ? `peso-job-draft-${currentUser.uid}` : null

    const DEFAULT_JOB_DATA = {
        title: '', category: '', type: 'permanent', workArrangement: 'on-site',
        workProvince: '', workCity: '', vacancies: 1,
        jobSummary: '', keyResponsibilities: '', salaryMin: '', salaryMax: '', benefits: [],
        educationLevel: 'high-school', courseStrand: '', experienceLevel: 'entry',
        requiredSkills: [], preferredSkills: [], requiredLanguages: [], licensesCertifications: '',
        acceptsPwd: false, pwdDisabilities: [], acceptsOfw: false, otherQualifications: '',
        deadline: '', filterMode: 'strict', aiMatchingEnabled: true,
    }

    const [jobData, setJobData] = useState(DEFAULT_JOB_DATA)

    // Skills autocomplete UI state (required skills)
    const [skillInput, setSkillInput] = useState('')
    const [skillSuggestions, setSkillSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const skillInputRef = useRef(null)
    const suggestionsRef = useRef(null)

    // AI skill suggestions panel state
    const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
    const [aiSuggestionsGenerated, setAiSuggestionsGenerated] = useState(false)
    const [aiRequiredSkillSuggestions, setAiRequiredSkillSuggestions] = useState([])
    const [aiPreferredSkillSuggestions, setAiPreferredSkillSuggestions] = useState([])
    const [aiSuggestionsSource, setAiSuggestionsSource] = useState('llm')

    // Market trend (green panel) and supply counts (badge on chips)
    const [marketTrendSkills, setMarketTrendSkills] = useState([])
    const [skillSupplyCounts, setSkillSupplyCounts] = useState(new Map())

    // Preferred skills input (plain tag input)
    const [preferredSkillInput, setPreferredSkillInput] = useState('')
    // Language input
    const [languageInput, setLanguageInput] = useState('')
    // Benefit input
    const [benefitInput, setBenefitInput] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [stepErrors, setStepErrors] = useState({})

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

    // --- PSGC cascading options ---
    const resolvedProvince = useMemo(() => findProvinceByName(jobData.workProvince), [jobData.workProvince])
    const resolvedProvinceName = resolvedProvince?.name ?? jobData.workProvince
    const resolvedCity = useMemo(() => findMunicipalityByName(resolvedProvince, jobData.workCity), [resolvedProvince, jobData.workCity])
    const resolvedCityName = resolvedCity?.name ?? jobData.workCity
    const provinceOptions = useMemo(() => sortNames(psgcData.provinces.map(p => p.name)), [])
    const cityOptions = useMemo(() => {
        if (!resolvedProvince) return []
        return sortNames(resolvedProvince.municipalities.map(m => m.name))
    }, [resolvedProvince])

    const handleProvinceChange = (e) => {
        setJobData(prev => ({ ...prev, workProvince: e.target.value, workCity: '' }))
    }
    const handleWorkCityChange = (e) => {
        updateJobData('workCity', e.target.value)
    }

    // Filter required-skill suggestions
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

    // Fetch existing job data when editing
    useEffect(() => {
        if (!isEditMode || !currentUser) return

        const fetchJob = async () => {
            setFetchingJob(true)
            try {
                const { data, error } = await supabase
                    .from('job_postings')
                    .select('*')
                    .eq('id', editId)
                    .eq('employer_id', currentUser.uid)
                    .maybeSingle()
                if (error) throw error
                if (!data) {
                    setError('Job not found or you do not have permission to edit it.')
                    return
                }
                setJobData({
                    title: data.title || '',
                    category: data.category || '',
                    type: data.type || 'permanent',
                    workArrangement: data.work_arrangement || 'on-site',
                    workProvince: data.work_province || '',
                    workCity: data.work_city || '',
                    vacancies: data.vacancies || 1,

                    jobSummary: data.job_summary || data.description || '',
                    keyResponsibilities: data.key_responsibilities || '',
                    salaryMin: data.salary_min != null ? String(data.salary_min) : '',
                    salaryMax: data.salary_max != null ? String(data.salary_max) : '',
                    benefits: data.benefits || [],

                    educationLevel: data.education_level || 'high-school',
                    courseStrand: data.course_strand || '',
                    experienceLevel: data.experience_level || 'entry',
                    requiredSkills: data.requirements || [],
                    preferredSkills: data.preferred_skills || [],
                    requiredLanguages: data.required_languages || [],
                    licensesCertifications: data.licenses_certifications || '',

                    acceptsPwd: !!data.accepts_pwd,
                    pwdDisabilities: data.pwd_disabilities || [],
                    acceptsOfw: !!data.accepts_ofw,
                    otherQualifications: data.other_qualifications || '',

                    deadline: data.deadline || '',
                    filterMode: data.filter_mode || 'strict',
                    aiMatchingEnabled: data.ai_matching_enabled ?? true,
                })
            } catch (err) {
                console.error('Error fetching job for edit:', err)
                setError('Failed to load job data.')
            } finally {
                setFetchingJob(false)
            }
        }

        fetchJob()
    }, [isEditMode, editId, currentUser])

    // Restore draft once currentUser is known (new posts only)
    useEffect(() => {
        if (isEditMode || !DRAFT_KEY) return
        try {
            const saved = localStorage.getItem(DRAFT_KEY)
            if (saved) setJobData(JSON.parse(saved))
        } catch { /* ignore */ }
    }, [DRAFT_KEY])

    // Autosave draft to localStorage on every jobData change (new posts only)
    useEffect(() => {
        if (isEditMode || !DRAFT_KEY) return
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(jobData)) } catch { /* ignore */ }
    }, [jobData])

    // Reset AI suggestions when moving away from step 3 so they re-generate fresh
    useEffect(() => {
        if (currentStep !== 3) {
            setAiSuggestionsGenerated(false)
            setAiRequiredSkillSuggestions([])
            setAiPreferredSkillSuggestions([])
        }
    }, [currentStep])

    // Load market trend + supply counts when entering step 3
    useEffect(() => {
        if (currentStep !== 3 || !jobData.category) return
        let cancelled = false
        Promise.all([
            getMarketTrendSkills(jobData.category, 12),
            getSkillSupplyCounts(jobData.category),
        ]).then(([trend, supply]) => {
            if (cancelled) return
            setMarketTrendSkills(trend)
            setSkillSupplyCounts(supply)
        })
        return () => { cancelled = true }
    }, [currentStep, jobData.category])

    const updateJobData = (field, value) => {
        setJobData(prev => ({ ...prev, [field]: value }))
        if (stepErrors[field]) {
            setStepErrors(prev => ({ ...prev, [field]: null }))
        }
    }

    // Required skills handlers
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

    const buildDeterministicFallback = () => {
        const fromTitle = getSuggestedSkillsFromTitle(jobData.title, jobData.category)
        const descText = [jobData.jobSummary, jobData.keyResponsibilities].join(' ')
        const fromDesc = getSuggestedSkillsFromDescription(descText)
        const fromVocab = getSuggestedSkillsFromVocab(jobData.keyResponsibilities, jobData.category)
        const existing = new Set([...jobData.requiredSkills, ...jobData.preferredSkills].map(s => s.toLowerCase()))
        return [...new Set([...fromTitle, ...fromDesc, ...fromVocab])]
            .filter(s => !existing.has(s.toLowerCase()))
            .slice(0, 12)
    }

    const handleGenerateAiSuggestions = async () => {
        setAiSuggestionsLoading(true)
        try {
            const result = await deepAnalyzeJobRequirements({
                title: jobData.title,
                category: jobData.category,
                jobSummary: jobData.jobSummary,
                keyResponsibilities: jobData.keyResponsibilities,
                experienceLevel: jobData.experienceLevel,
                requiredSkills: jobData.requiredSkills,
                preferredSkills: jobData.preferredSkills,
            })

            const existingRequired = new Set(jobData.requiredSkills.map(s => s.toLowerCase()))
            const existingPreferred = new Set(jobData.preferredSkills.map(s => s.toLowerCase()))

            const nextRequired = (result.requiredSkills || [])
                .filter(s => !existingRequired.has(s.toLowerCase()) && !existingPreferred.has(s.toLowerCase()))
                .slice(0, 8)
            const nextPreferred = (result.preferredSkills || [])
                .filter(s => !existingRequired.has(s.toLowerCase()) && !existingPreferred.has(s.toLowerCase()))
                .filter(s => !nextRequired.some(r => r.toLowerCase() === s.toLowerCase()))
                .slice(0, 6)

            if (nextRequired.length === 0 && nextPreferred.length === 0) {
                setAiRequiredSkillSuggestions(buildDeterministicFallback())
                setAiPreferredSkillSuggestions([])
                setAiSuggestionsSource('fallback')
            } else {
                setAiRequiredSkillSuggestions(nextRequired)
                setAiPreferredSkillSuggestions(nextPreferred)
                setAiSuggestionsSource('llm')
            }
            setAiSuggestionsGenerated(true)
        } catch {
            setAiRequiredSkillSuggestions(buildDeterministicFallback())
            setAiPreferredSkillSuggestions([])
            setAiSuggestionsSource('fallback')
            setAiSuggestionsGenerated(true)
        } finally {
            setAiSuggestionsLoading(false)
        }
    }

    // Generic tag helpers (preferred skills, languages, benefits)
    const addTag = (field, input, setInput) => {
        const value = input.trim()
        if (!value) return
        if (!jobData[field].includes(value)) {
            updateJobData(field, [...jobData[field], value])
        }
        setInput('')
    }

    const removeTag = (field, value) => {
        updateJobData(field, jobData[field].filter(v => v !== value))
    }

    const tagKeyDown = (field, input, setInput) => (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag(field, input, setInput)
        }
    }

    // Toggle PWD disability
    const toggleDisability = (value) => {
        const current = jobData.pwdDisabilities
        updateJobData(
            'pwdDisabilities',
            current.includes(value) ? current.filter(d => d !== value) : [...current, value]
        )
    }

    // Validation
    const validateStep = (step) => {
        const errors = {}

        if (step === 1) {
            const title = jobData.title.trim()
            if (!title) {
                errors.title = 'Job title is required'
            } else if (title.length < 5) {
                errors.title = 'Job title must be at least 5 characters'
            } else if (title.length > 100) {
                errors.title = 'Job title must be 100 characters or less'
            }
            if (!jobData.category) {
                errors.category = 'Please select a category'
            }
            if (!jobData.type) {
                errors.type = 'Please select an employment type'
            }
            if (!jobData.workArrangement) {
                errors.workArrangement = 'Please select a work arrangement'
            }
            if (['on-site', 'hybrid'].includes(jobData.workArrangement)) {
                if (!jobData.workProvince) {
                    errors.workProvince = 'Province is required for on-site or hybrid roles'
                } else if (!jobData.workCity) {
                    errors.workCity = 'City / Municipality is required'
                }
            }
            if (!jobData.vacancies || Number(jobData.vacancies) < 1) {
                errors.vacancies = 'At least 1 vacancy is required'
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
            if (!jobData.jobSummary || jobData.jobSummary.trim().length < 50) {
                errors.jobSummary = 'Job summary must be at least 50 characters'
            }
            if (!jobData.keyResponsibilities || jobData.keyResponsibilities.trim().length < 20) {
                errors.keyResponsibilities = 'Please describe the key responsibilities'
            }
        }

        if (step === 3) {
            if (!jobData.educationLevel) {
                errors.educationLevel = 'Please select a minimum education level'
            }
            if (!jobData.experienceLevel) {
                errors.experienceLevel = 'Please select a minimum experience level'
            }
            if (jobData.requiredSkills.length === 0) {
                errors.requiredSkills = 'At least one required skill is needed'
            }
            if (jobData.requiredLanguages.length === 0) {
                errors.requiredLanguages = 'At least one required language is needed'
            }
        }

        if (step === 4) {
            if (jobData.acceptsPwd && jobData.pwdDisabilities.length === 0) {
                errors.pwdDisabilities = 'Please select at least one disability category'
            }
        }

        if (step === 5) {
            if (jobData.deadline) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const deadline = new Date(jobData.deadline)
                if (deadline < today) {
                    errors.deadline = 'Deadline must be a future date'
                }
            }
            if (!jobData.filterMode) {
                errors.filterMode = 'Please select a matching mode'
            }
        }

        setStepErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 5))
        }
    }

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1))
    }

    // Publish or update job
    const publishJob = async () => {
        // Build final arrays by flushing any text still in tag inputs (state updates are async,
        // so we compute the merged values directly here rather than calling addTag)
        const mergeTag = (existing, pending) => {
            const v = pending.trim()
            return v && !existing.includes(v) ? [...existing, v] : existing
        }
        const finalPreferredSkills = mergeTag(jobData.preferredSkills, preferredSkillInput)
        const finalLanguages = mergeTag(jobData.requiredLanguages, languageInput)
        const finalBenefits = mergeTag(jobData.benefits, benefitInput)

        // Validate every step before submit
        for (let s = 1; s <= 5; s++) {
            if (!validateStep(s)) {
                setCurrentStep(s)
                return
            }
        }

        setLoading(true)
        setError('')

        try {
            // Legacy description = Summary + Responsibilities combined
            const combinedDescription = [
                jobData.jobSummary.trim(),
                '',
                'Key Responsibilities:',
                jobData.keyResponsibilities.trim(),
            ].join('\n')

            const jobDocument = {
                title: jobData.title.trim(),
                category: jobData.category,
                type: jobData.type,
                work_arrangement: jobData.workArrangement,
                work_province: jobData.workProvince || null,
                work_city: jobData.workCity || null,
                location: jobData.workCity && jobData.workProvince
                    ? `${jobData.workCity}, ${jobData.workProvince}`
                    : (jobData.workCity || jobData.workProvince || ''),
                vacancies: Number(jobData.vacancies),

                job_summary: jobData.jobSummary.trim(),
                key_responsibilities: jobData.keyResponsibilities.trim(),
                description: combinedDescription,
                salary_range: `PHP ${Number(jobData.salaryMin).toLocaleString()} - ${Number(jobData.salaryMax).toLocaleString()}`,
                salary_min: Number(jobData.salaryMin),
                salary_max: Number(jobData.salaryMax),
                benefits: finalBenefits,

                education_level: jobData.educationLevel,
                course_strand: jobData.courseStrand.trim() || null,
                experience_level: jobData.experienceLevel,
                requirements: jobData.requiredSkills,
                preferred_skills: finalPreferredSkills,
                required_languages: finalLanguages,
                licenses_certifications: jobData.licensesCertifications.trim() || null,

                accepts_pwd: jobData.acceptsPwd,
                pwd_disabilities: jobData.acceptsPwd ? jobData.pwdDisabilities : [],
                accepts_ofw: jobData.acceptsOfw,
                other_qualifications: jobData.otherQualifications.trim() || null,

                deadline: jobData.deadline || null,
                filter_mode: jobData.filterMode,
                ai_matching_enabled: jobData.aiMatchingEnabled,

                employer_id: currentUser.uid,
                employer_name: userData?.name || 'Unknown',
            }

            if (isEditMode) {
                jobDocument.updated_at = new Date().toISOString()
                const { error } = await supabase
                    .from('job_postings')
                    .update(jobDocument)
                    .eq('id', editId)
                    .eq('employer_id', currentUser.uid)
                if (error) throw error
            } else {
                jobDocument.status = 'open'
                const { error } = await supabase
                    .from('job_postings')
                    .insert(jobDocument)
                if (error) throw error
            }

            if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY)
            setSuccess(true)
            setTimeout(() => {
                navigate('/my-listings')
            }, 2000)
        } catch (err) {
            console.error('Error saving job:', err)
            setError(isEditMode ? 'Failed to update job. Please try again.' : 'Failed to post job. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Steps configuration
    const steps = [
        { number: 1, title: 'Overview', icon: Briefcase },
        { number: 2, title: 'Role & Pay', icon: FileText },
        { number: 3, title: 'Qualifications', icon: GraduationCap },
        { number: 4, title: 'Inclusivity', icon: Heart },
        { number: 5, title: 'Review', icon: CheckCircle },
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

    if (fetchingJob) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
                <div className="card max-w-md text-center">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading job data...</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
                <div className="card max-w-md text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {isEditMode ? 'Job Updated Successfully!' : 'Job Posted Successfully!'}
                    </h2>
                    <p className="text-gray-600">
                        {isEditMode
                            ? 'Your changes have been saved. Redirecting to your listings...'
                            : jobData.aiMatchingEnabled
                                ? 'AI matching is enabled. Qualified candidates will be notified automatically.'
                                : 'Your job listing is now live. Redirecting to your listings...'}
                    </p>
                </div>
            </div>
        )
    }

    // Reusable tag input renderer
    const renderTagInput = (field, input, setInput, placeholder, suggestions = []) => (
        <>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={tagKeyDown(field, input, setInput)}
                    className="input-field flex-1"
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    onClick={() => addTag(field, input, setInput)}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            {jobData[field].length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {jobData[field].map(value => (
                        <span
                            key={value}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                        >
                            {value}
                            <button
                                type="button"
                                onClick={() => removeTag(field, value)}
                                className="hover:text-primary-900 ml-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {suggestions
                        .filter(s => !jobData[field].includes(s))
                        .slice(0, 6)
                        .map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    if (!jobData[field].includes(s)) {
                                        updateJobData(field, [...jobData[field], s])
                                    }
                                }}
                                className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                            >
                                + {s}
                            </button>
                        ))}
                </div>
            )}
        </>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{isEditMode ? 'Edit Job Listing' : 'Post a New Job'}</h1>
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
                                        w-10 md:w-16 h-1 mx-2 rounded-full transition-all duration-300
                                        ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
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

                    {/* ========================= Step 1: Job Overview ========================= */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-6 h-6 text-primary-600" />
                                Basic Information
                            </h2>

                            {/* Job Title */}
                            <div>
                                <label className="label">Job / Position Title *</label>
                                <input
                                    type="text"
                                    value={jobData.title}
                                    onChange={(e) => updateJobData('title', e.target.value)}
                                    className={`input-field ${stepErrors.title ? 'border-red-500' : ''}`}
                                    placeholder="e.g. Electrician, Plumber, Welder"
                                    maxLength={100}
                                />
                                {stepErrors.title && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.title}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="label">Job Category *</label>
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

                            {/* Nature of Work */}
                            <div>
                                <label className="label">Nature of Work *</label>
                                <div className="flex flex-wrap gap-3">
                                    {EMPLOYMENT_TYPES.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateJobData('type', opt.value)}
                                            className={`px-4 py-2 rounded-full border-2 transition-all ${jobData.type === opt.value
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {stepErrors.type && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.type}</p>
                                )}
                            </div>

                            {/* Work Arrangement */}
                            <div>
                                <label className="label">Work Arrangement *</label>
                                <div className="flex flex-wrap gap-3">
                                    {WORK_ARRANGEMENTS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateJobData('workArrangement', opt.value)}
                                            className={`px-4 py-2 rounded-full border-2 transition-all ${jobData.workArrangement === opt.value
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {stepErrors.workArrangement && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.workArrangement}</p>
                                )}
                            </div>

                            {/* Place of Work Location */}
                            <div className="space-y-3">
                                <label className="label">
                                    Place of Work (Location)
                                    {['on-site', 'hybrid'].includes(jobData.workArrangement) && ' *'}
                                </label>
                                {jobData.workArrangement === 'remote' ? (
                                    <p className="text-sm text-gray-500 italic">Not applicable for remote roles.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <SearchableSelect
                                            label="Province"
                                            name="workProvince"
                                            value={resolvedProvinceName || ''}
                                            onChange={handleProvinceChange}
                                            options={provinceOptions}
                                            icon={MapPin}
                                            required={['on-site', 'hybrid'].includes(jobData.workArrangement)}
                                        />
                                        {stepErrors.workProvince && (
                                            <p className="text-red-500 text-sm -mt-2">{stepErrors.workProvince}</p>
                                        )}
                                        <SearchableSelect
                                            label="City / Municipality"
                                            name="workCity"
                                            value={resolvedCityName || ''}
                                            onChange={handleWorkCityChange}
                                            options={cityOptions}
                                            icon={MapPin}
                                            required={['on-site', 'hybrid'].includes(jobData.workArrangement)}
                                        />
                                        {stepErrors.workCity && (
                                            <p className="text-red-500 text-sm -mt-2">{stepErrors.workCity}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Vacancies */}
                            <div>
                                <label className="label">Number of Vacancies *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={jobData.vacancies}
                                    onChange={(e) => updateJobData('vacancies', e.target.value)}
                                    className={`input-field w-32 ${stepErrors.vacancies ? 'border-red-500' : ''}`}
                                />
                                {stepErrors.vacancies && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.vacancies}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================= Step 2: Role Details & Compensation ========================= */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-primary-600" />
                                Role Details & Compensation
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

                            {/* Job Summary */}
                            <div>
                                <label className="label">
                                    Job Summary *
                                    <span className="text-gray-400 font-normal ml-2">
                                        ({jobData.jobSummary.length}/50 min)
                                    </span>
                                </label>
                                <textarea
                                    value={jobData.jobSummary}
                                    onChange={(e) => updateJobData('jobSummary', e.target.value)}
                                    className={`input-field min-h-[100px] ${stepErrors.jobSummary ? 'border-red-500' : ''}`}
                                    placeholder="A short overview of the role and its impact on the company..."
                                />
                                {stepErrors.jobSummary && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.jobSummary}</p>
                                )}
                            </div>

                            {/* Key Responsibilities */}
                            <div>
                                <label className="label">Key Responsibilities *</label>
                                <textarea
                                    value={jobData.keyResponsibilities}
                                    onChange={(e) => updateJobData('keyResponsibilities', e.target.value)}
                                    className={`input-field min-h-[140px] ${stepErrors.keyResponsibilities ? 'border-red-500' : ''}`}
                                    placeholder={'List the main duties. One per line, e.g.:\n- Install and repair electrical wiring\n- Diagnose equipment issues\n- Ensure safety compliance'}
                                />
                                {stepErrors.keyResponsibilities && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.keyResponsibilities}</p>
                                )}
                            </div>

                            {/* Benefits */}
                            <div>
                                <label className="label">Benefits & Perks (Optional)</label>
                                {renderTagInput('benefits', benefitInput, setBenefitInput, 'Add a benefit and press Enter', COMMON_BENEFITS)}
                            </div>
                        </div>
                    )}

                    {/* ========================= Step 3: Qualifications & Skills ========================= */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <GraduationCap className="w-6 h-6 text-primary-600" />
                                Qualifications & Skills
                            </h2>

                            {/* Education Level */}
                            <div>
                                <label className="label">Minimum Education Level *</label>
                                <Select
                                    icon={GraduationCap}
                                    options={EDUCATION_OPTIONS}
                                    value={jobData.educationLevel}
                                    onChange={(val) => {
                                        updateJobData('educationLevel', val)
                                        if (!['senior-high', 'college', 'postgraduate'].includes(val)) {
                                            updateJobData('courseStrand', '')
                                        }
                                    }}
                                    placeholder="Select education level"
                                />
                                {stepErrors.educationLevel && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.educationLevel}</p>
                                )}
                            </div>

                            {/* Course / Strand — shown only when education level is SHS, college, or postgraduate */}
                            {['senior-high', 'college', 'postgraduate'].includes(jobData.educationLevel) && (
                                <div>
                                    <SearchableSelect
                                        label="Course / SHS Strand (Optional)"
                                        name="courseStrand"
                                        value={jobData.courseStrand}
                                        onChange={(e) => {
                                            updateJobData('courseStrand', e.target.value)
                                        }}
                                        options={
                                            jobData.educationLevel === 'senior-high'
                                                ? coursesData.seniorHigh
                                                : jobData.educationLevel === 'postgraduate'
                                                    ? coursesData.graduate
                                                    : coursesData.tertiary
                                        }
                                        grouped
                                        placeholder="Select a course or strand"
                                    />
                                </div>
                            )}

                            {/* Experience Level */}
                            <div>
                                <label className="label">Work Experience Minimum Timeframe *</label>
                                <div className="flex flex-wrap gap-3">
                                    {EXPERIENCE_LEVELS.map(level => (
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
                                {stepErrors.experienceLevel && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.experienceLevel}</p>
                                )}
                            </div>

                            {/* Required Skills (autocomplete) */}
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

                                {jobData.requiredSkills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {jobData.requiredSkills.map(skill => {
                                            const supplyCount = skillSupplyCounts.get(skill.toLowerCase())
                                            return (
                                                <span
                                                    key={skill}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                                                >
                                                    {skill}
                                                    {supplyCount > 0 && (
                                                        <span
                                                            className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold leading-none"
                                                            title={`${supplyCount} jobseeker${supplyCount !== 1 ? 's' : ''} in San Carlos have this skill`}
                                                        >
                                                            {supplyCount}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSkill(skill)}
                                                        className="hover:text-primary-900 ml-1"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* AI skill suggestions panel */}
                                <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-violet-700 flex items-center gap-1.5">
                                            <Brain className="w-4 h-4" />
                                            AI Skill Suggestions
                                        </p>
                                        {aiSuggestionsLoading && (
                                            <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                                        )}
                                    </div>

                                    {!aiSuggestionsGenerated && !aiSuggestionsLoading && (
                                        <button
                                            type="button"
                                            onClick={handleGenerateAiSuggestions}
                                            aria-label="Generate AI skill suggestions"
                                            className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-full hover:bg-violet-700 transition-colors"
                                        >
                                            <Brain className="w-3.5 h-3.5" />
                                            Generate AI skill suggestions
                                        </button>
                                    )}

                                    {aiSuggestionsLoading && (
                                        <p className="text-xs text-violet-500 italic mt-1">Analyzing your job title and description…</p>
                                    )}

                                    {aiSuggestionsGenerated && !aiSuggestionsLoading && (
                                        <>
                                            {aiSuggestionsSource === 'llm' ? (
                                                <div className="space-y-4 mt-2">
                                                    {aiRequiredSkillSuggestions.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-violet-700 mb-1.5">AI Suggested Required Skills</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {aiRequiredSkillSuggestions
                                                                    .filter(s => !jobData.requiredSkills.includes(s))
                                                                    .map(skill => (
                                                                        <button
                                                                            key={skill}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                addSkill(skill)
                                                                                setAiRequiredSkillSuggestions(prev => prev.filter(s => s !== skill))
                                                                            }}
                                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-violet-200 rounded-full text-sm text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-colors"
                                                                        >
                                                                            + {skill}
                                                                        </button>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                    {aiPreferredSkillSuggestions.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-semibold text-violet-700 mb-1.5">AI Suggested Preferred Skills</p>
                                                            <p className="text-xs text-violet-500 mb-1.5">Nice-to-have skills — consider adding these to the Preferred Skills field below.</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {aiPreferredSkillSuggestions
                                                                    .filter(s => !jobData.preferredSkills.includes(s) && !jobData.requiredSkills.includes(s))
                                                                    .map(skill => (
                                                                        <button
                                                                            key={skill}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                updateJobData('preferredSkills', [...jobData.preferredSkills, skill])
                                                                                setAiPreferredSkillSuggestions(prev => prev.filter(s => s !== skill))
                                                                            }}
                                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-violet-200 rounded-full text-sm text-violet-600 hover:bg-violet-100 hover:border-violet-400 transition-colors"
                                                                        >
                                                                            + {skill}
                                                                        </button>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                    {aiRequiredSkillSuggestions.filter(s => !jobData.requiredSkills.includes(s)).length === 0 &&
                                                     aiPreferredSkillSuggestions.filter(s => !jobData.preferredSkills.includes(s) && !jobData.requiredSkills.includes(s)).length === 0 && (
                                                        <p className="text-xs text-violet-400 italic">All suggestions have been added.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-violet-700 mb-1">Suggested Skills From Job Description</p>
                                                    <p className="text-xs text-violet-500 mb-2">AI suggestions were unavailable, so we used your job title, description, and vocabulary.</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {aiRequiredSkillSuggestions
                                                            .filter(s => !jobData.requiredSkills.includes(s))
                                                            .map(skill => (
                                                                <button
                                                                    key={skill}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        addSkill(skill)
                                                                        setAiRequiredSkillSuggestions(prev => prev.filter(s => s !== skill))
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-violet-200 rounded-full text-sm text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-colors"
                                                                >
                                                                    + {skill}
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                    {aiRequiredSkillSuggestions.filter(s => !jobData.requiredSkills.includes(s)).length === 0 && (
                                                        <p className="text-xs text-violet-400 italic">All suggestions have been added, or none were found.</p>
                                                    )}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleGenerateAiSuggestions}
                                                className="mt-3 text-xs text-violet-500 hover:text-violet-700 underline underline-offset-2 transition-colors"
                                            >
                                                Regenerate suggestions
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                                {/* 🌱 Market Trending Skills panel */}
                                {marketTrendSkills.length > 0 && (() => {
                                    const fresh = marketTrendSkills.filter(d => !jobData.requiredSkills.includes(d.requirement))
                                    if (fresh.length === 0) return null
                                    return (
                                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                                <p className="text-sm font-medium text-emerald-800">
                                                    Trending in San Carlos — add skills jobseekers already have
                                                </p>
                                            </div>
                                            <p className="text-xs text-emerald-700 mb-3">
                                                These skills are commonly listed by local jobseekers. Using them maximises your applicant pool.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {fresh.map(d => {
                                                    const supplyCount = skillSupplyCounts.get(d.requirement.toLowerCase())
                                                    return (
                                                        <button
                                                            key={d.requirement}
                                                            type="button"
                                                            onClick={() => addSkill(d.requirement)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-full text-xs font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500 transition-colors"
                                                            title={`Requested in ${d.demand_count} open job${d.demand_count !== 1 ? 's' : ''}`}
                                                        >
                                                            + {d.requirement}
                                                            {supplyCount > 0 && (
                                                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold leading-none border border-emerald-300">
                                                                    {supplyCount} seekers
                                                                </span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })()}

                            {/* Preferred Skills */}
                            <div>
                                <label className="label">Preferred Skills (Optional)</label>
                                <p className="text-xs text-gray-500 mb-2">Nice-to-have skills for AI bonus scoring.</p>
                                {renderTagInput('preferredSkills', preferredSkillInput, setPreferredSkillInput, 'Add a preferred skill and press Enter')}
                                {aiSuggestionsGenerated && aiPreferredSkillSuggestions.filter(s => !jobData.preferredSkills.includes(s) && !jobData.requiredSkills.includes(s)).length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-[11px] text-violet-600 font-medium mb-1.5">AI suggestions — click to add:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {aiPreferredSkillSuggestions
                                                .filter(s => !jobData.preferredSkills.includes(s) && !jobData.requiredSkills.includes(s))
                                                .map(skill => (
                                                    <button
                                                        key={skill}
                                                        type="button"
                                                        onClick={() => {
                                                            updateJobData('preferredSkills', [...jobData.preferredSkills, skill])
                                                            setAiPreferredSkillSuggestions(prev => prev.filter(s => s !== skill))
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full text-xs text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-colors"
                                                    >
                                                        + {skill}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Required Languages */}
                            <div>
                                <label className="label flex items-center gap-2">
                                    <Languages className="w-4 h-4" />
                                    Required Languages / Dialects *
                                </label>
                                {renderTagInput('requiredLanguages', languageInput, setLanguageInput, 'e.g. English, Tagalog, Ilocano', COMMON_LANGUAGES)}
                                {stepErrors.requiredLanguages && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.requiredLanguages}</p>
                                )}
                            </div>

                            {/* Licenses / Certifications */}
                            <div>
                                <label className="label">Licenses, Certifications & Eligibility (Optional)</label>
                                <textarea
                                    value={jobData.licensesCertifications}
                                    onChange={(e) => updateJobData('licensesCertifications', e.target.value)}
                                    className="input-field min-h-[80px]"
                                    placeholder="e.g. Professional Driver's License, CPA, Civil Service Eligibility, TESDA NC II"
                                />
                            </div>
                        </div>
                    )}

                    {/* ========================= Step 4: Inclusive Hiring ========================= */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Heart className="w-6 h-6 text-primary-600" />
                                Inclusive Hiring & Special Qualifications
                            </h2>

                            {/* Accepts PWD */}
                            <div>
                                <label className="label">Accepts Persons with Disabilities (PWD)? *</label>
                                <div className="flex gap-3">
                                    {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(opt => (
                                        <button
                                            key={String(opt.v)}
                                            type="button"
                                            onClick={() => updateJobData('acceptsPwd', opt.v)}
                                            className={`px-6 py-2 rounded-full border-2 transition-all ${jobData.acceptsPwd === opt.v
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>

                                {jobData.acceptsPwd && (
                                    <div className="mt-4 p-4 bg-primary-50/40 border border-primary-100 rounded-xl">
                                        <p className="text-sm font-medium text-gray-700 mb-3">Accommodated disabilities: *</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {DISABILITY_OPTIONS.map(opt => (
                                                <label
                                                    key={opt.value}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${jobData.pwdDisabilities.includes(opt.value)
                                                        ? 'border-primary-500 bg-white'
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={jobData.pwdDisabilities.includes(opt.value)}
                                                        onChange={() => toggleDisability(opt.value)}
                                                        className="w-4 h-4 accent-primary-600"
                                                    />
                                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {stepErrors.pwdDisabilities && (
                                            <p className="text-red-500 text-sm mt-2">{stepErrors.pwdDisabilities}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Accepts OFWs */}
                            <div>
                                <label className="label flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Accepts Returning OFWs? *
                                </label>
                                <div className="flex gap-3">
                                    {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(opt => (
                                        <button
                                            key={String(opt.v)}
                                            type="button"
                                            onClick={() => updateJobData('acceptsOfw', opt.v)}
                                            className={`px-6 py-2 rounded-full border-2 transition-all ${jobData.acceptsOfw === opt.v
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Other Qualifications */}
                            <div>
                                <label className="label">Other Qualifications (Optional)</label>
                                <textarea
                                    value={jobData.otherQualifications}
                                    onChange={(e) => updateJobData('otherQualifications', e.target.value)}
                                    className="input-field min-h-[80px]"
                                    placeholder="Any other physical or geographical requirements not covered above."
                                />
                            </div>
                        </div>
                    )}

                    {/* ========================= Step 5: Posting Settings + Review ========================= */}
                    {currentStep === 5 && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Settings className="w-6 h-6 text-primary-600" />
                                Posting Settings
                            </h2>

                            {/* Deadline */}
                            <div>
                                <label className="label">Application Deadline / Valid Until (Optional)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        value={jobData.deadline}
                                        onChange={(e) => updateJobData('deadline', e.target.value)}
                                        className={`input-field pl-12 ${stepErrors.deadline ? 'border-red-500' : ''}`}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">If empty, the posting runs until manually closed.</p>
                                {stepErrors.deadline && (
                                    <p className="text-red-500 text-sm mt-1">{stepErrors.deadline}</p>
                                )}
                            </div>

                            {/* Filter Mode */}
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

                            {/* AI Matching */}
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Enable AI Matching</p>
                                            <p className="text-sm text-gray-600">Automatically notify qualified candidates</p>
                                        </div>
                                    </div>

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
                                        <span>Job seekers with matching skills will be notified and prioritized.</span>
                                    </div>
                                )}
                            </div>

                            {/* Review Summary */}
                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                    <CheckCircle className="w-5 h-5 text-primary-600" />
                                    Review Your Job Posting
                                </h3>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <h3 className="text-lg font-bold text-gray-900">{jobData.title || 'Untitled role'}</h3>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {jobData.category && <span className="badge badge-info capitalize">{jobData.category}</span>}
                                            <span className="badge badge-success">{EMPLOYMENT_TYPES.find(t => t.value === jobData.type)?.label}</span>
                                            <span className="badge">{WORK_ARRANGEMENTS.find(a => a.value === jobData.workArrangement)?.label}</span>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <MapPin className="w-5 h-5 text-gray-400" />
                                            <span className="text-gray-700">
                                                {jobData.workArrangement === 'remote'
                                                    ? 'Remote'
                                                    : jobData.workCity && jobData.workProvince
                                                        ? `${jobData.workCity}, ${jobData.workProvince}`
                                                        : (jobData.workCity || jobData.workProvince || '—')
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">₱</span>
                                            <span className="text-gray-700">
                                                ₱{Number(jobData.salaryMin || 0).toLocaleString()} - ₱{Number(jobData.salaryMax || 0).toLocaleString()}/mo
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <Clock className="w-5 h-5 text-gray-400" />
                                            <span className="text-gray-700">{EXPERIENCE_LEVELS.find(e => e.value === jobData.experienceLevel)?.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <Users className="w-5 h-5 text-gray-400" />
                                            <span className="text-gray-700">{jobData.vacancies} Vacancy(ies)</span>
                                        </div>
                                    </div>

                                    {jobData.jobSummary && (
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-2">Summary</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap text-sm">{jobData.jobSummary}</p>
                                        </div>
                                    )}

                                    {jobData.keyResponsibilities && (
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-2">Key Responsibilities</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap text-sm">{jobData.keyResponsibilities}</p>
                                        </div>
                                    )}

                                    {jobData.requiredSkills.length > 0 && (
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
                                    )}

                                    {jobData.requiredLanguages.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-2">Required Languages</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {jobData.requiredLanguages.map(lang => (
                                                    <span key={lang} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                        {lang}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Accepts PWD</p>
                                            <p className="text-gray-700 font-medium">
                                                {jobData.acceptsPwd
                                                    ? `Yes (${jobData.pwdDisabilities.join(', ') || '—'})`
                                                    : 'No'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 uppercase tracking-wide">Accepts Returning OFWs</p>
                                            <p className="text-gray-700 font-medium">{jobData.acceptsOfw ? 'Yes' : 'No'}</p>
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

                        {currentStep < 5 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="btn-primary flex items-center gap-2"
                            >
                                Continue
                                <ChevronRight className="w-5 h-5" />
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
                                        {isEditMode ? 'Saving...' : 'Publishing...'}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        {isEditMode ? 'Save Changes' : 'Publish Job'}
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
