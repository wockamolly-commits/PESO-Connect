import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import {
    User, Briefcase, MapPin, Phone, FileText, Loader2, AlertCircle,
    Plus, X, CheckCircle, GraduationCap,
    Award, Calendar, Save, Sparkles, TrendingUp,
    Ruler, Shield, Globe, Languages, Check, Brain, Lightbulb
} from 'lucide-react'
import { deduplicateSkills, expandProfileAliases, clearSessionScores, deepAnalyzeProfileSkills } from '../services/geminiService'
import { refreshProfileEmbedding } from '../services/matchingService'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ResumeUpload from '../components/common/ResumeUpload'
import CertificateUpload from '../components/common/CertificateUpload'
import { compressAndEncode } from '../utils/fileUtils'
import ExportResumeButton from '../components/profile/ExportResumeButton'
import { FloatingLabelInput } from '../components/forms/FloatingLabelInput'
import { SearchableSelect } from '../components/forms/SearchableSelect'
import { AnimatedSection } from '../components/forms/AnimatedSection'
import psgcData from '../data/psgc.json'
import coursesData from '../data/courses.json'
import { countTrainingCertificates, getTrainingCertificateRecord } from '../utils/reverification'
import { buildCertificateFingerprint } from '../utils/certificateUtils'
import { getSkillsForPosition, generateSuggestedSkills } from '../utils/skillRecommender'
import { getCompanionSuggestions, getSmartPreferredSuggestions } from '../utils/skillIntelligence'
import { inferCategoryFromProfile, getTopDemandSkills } from '../services/skillDemandService'
import { logSkillAcceptance } from '../services/telemetryService'

// --- Helpers ---
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

const parseOtherSelection = (value) => {
    if (!value) return { selectedValue: '', otherValue: '' }
    const strValue = typeof value === 'string' ? value : String(value)
    if (strValue.startsWith('Others:')) {
        return { selectedValue: 'Others', otherValue: value.slice(8).trim() }
    }
    return { selectedValue: value, otherValue: '' }
}

const buildOtherSelection = (selected, otherText) => {
    if (selected === 'Others' && otherText?.trim()) return `Others: ${otherText.trim()}`
    return selected
}

const padArray = (arr, len) => {
    const result = Array.isArray(arr) ? [...arr] : []
    while (result.length < len) result.push('')
    return result
}

// --- Constants ---
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
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time']
const SELF_EMPLOYMENT_TYPES = [
    'Freelancer', 'Vendor/Retailer', 'Home-based', 'Transport',
    'Domestic Worker', 'Artisan/Craft Worker', 'Others'
]
const UNEMPLOYMENT_REASONS = [
    'New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned',
    'Retired', 'Terminated/Laid Off', 'Others'
]
const EDUCATION_LEVELS = [
    'Elementary (Grades 1-6)',
    'High School (Old Curriculum)',
    'Junior High School (Grades 7-10)',
    'Senior High School (Grades 11-12)',
    'Tertiary',
    'Graduate Studies / Post-graduate'
]
const EDUCATION_CARDS = [
    { value: 'Elementary (Grades 1-6)', description: 'Primary education' },
    { value: 'High School (Old Curriculum)', description: 'Pre-K12 secondary (4-year)' },
    { value: 'Junior High School (Grades 7-10)', description: 'K-12 lower secondary' },
    { value: 'Senior High School (Grades 11-12)', description: 'K-12 upper secondary with tracks' },
    { value: 'Tertiary', description: 'College / University degree' },
    { value: 'Graduate Studies / Post-graduate', description: "Master's or Doctoral program" }
]
const LEVELS_WITH_COURSE = ['Senior High School (Grades 11-12)', 'Tertiary', 'Graduate Studies / Post-graduate']
const CERTIFICATE_LEVELS = ['NC I', 'NC II', 'NC III', 'NC IV', 'None', 'Others']
const EMPTY_TRAINING = { course: '', institution: '', hours: '', skills_acquired: '', certificate_level: '', certificate_path: '' }
const WORK_EXPERIENCE_STATUSES = ['Permanent', 'Contractual', 'Part-time', 'Probationary']
const EMPTY_EXPERIENCE = { company: '', address: '', position: '', year_started: '', year_ended: '', employment_status: '' }
const EMPTY_LICENSE = { name: '', number: '', valid_until: '' }
const PREDEFINED_SKILLS = [
    'Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
    'Domestic Chores', 'Driver', 'Electrician', 'Embroidery', 'Gardening',
    'Masonry', 'Painter/Artist', 'Painting Jobs', 'Photography',
    'Plumbing', 'Sewing/Dresses', 'Stenography', 'Tailoring'
]
const PROFICIENCY_LEVELS = ['Beginner', 'Conversational', 'Proficient', 'Fluent', 'Native']
const JOB_TYPE_OPTIONS = [
    { id: 'full-time', label: 'Full-time' },
    { id: 'part-time', label: 'Part-time' },
    { id: 'contractual', label: 'Contractual' },
    { id: 'on-demand', label: 'On-demand' }
]

// --- PSGC helpers ---
const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi
function normalizeLocationName(value = '') {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/\bsta\b\.?/g, 'santa').replace(/\bsto\b\.?/g, 'santo').replace(/\bof\b/g, '')
        .replace(CITY_OR_MUNICIPALITY_SUFFIX, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
function sortNames(values = []) { return [...values].sort((a, b) => a.localeCompare(b)) }
function findProvinceByName(provinceName) {
    if (!provinceName) return null
    return psgcData.provinces.find(p => p.name === provinceName || normalizeLocationName(p.name) === normalizeLocationName(provinceName)) || null
}
function findMunicipalityByName(province, municipalityName) {
    if (!province || !municipalityName) return null
    return province.municipalities.find(m => m.name === municipalityName || normalizeLocationName(m.name) === normalizeLocationName(municipalityName)) || null
}

const JobseekerProfileEdit = () => {
    const { userData, currentUser, fetchUserData, isVerified } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        // Personal Information (Step 2)
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

        // Contact & Address (Step 3)
        street_address: '',
        province: '',
        city: '',
        barangay: '',
        mobile_number: '',

        // Employment Status (Step 3)
        employment_status: '',
        employment_type: '',
        self_employment_type: '',
        self_employment_specify: '',
        unemployment_reason: '',
        unemployment_reason_specify: '',
        months_looking_for_work: '',

        // Education (Step 4)
        currently_in_school: false,
        highest_education: '',
        school_name: '',
        course_or_field: '',
        year_graduated: '',
        did_not_graduate: false,
        education_level_reached: '',
        year_last_attended: '',
        vocational_training: [],

        // Skills & Experience (Step 5)
        predefined_skills: [],
        skills: [],
        professional_licenses: [],
        civil_service_eligibility: '',
        civil_service_date: '',
        work_experiences: [],
        portfolio_url: '',
        certifications: [],
        certificate_urls: [],

        // Job Preferences (Step 6)
        preferred_job_type: [],
        preferred_occupations: ['', '', ''],
        preferred_local_locations: ['', '', ''],
        preferred_overseas_locations: ['', '', ''],
        expected_salary_min: '',
        expected_salary_max: '',
        willing_to_relocate: 'no',

        // Language Proficiency
        languages: [],

        // Profile
        profile_photo: '',
    })

    const [newSkill, setNewSkill] = useState('')
    const [newCert, setNewCert] = useState('')
    const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Conversational' })
    const [resumeUrl, setResumeUrl] = useState(userData?.resume_url || '')
    const [resumeFile, setResumeFile] = useState(null)
    const [certificateFiles, setCertificateFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [trainingValidationError, setTrainingValidationError] = useState('')
    const [isDirty, setIsDirty] = useState(false)
    const initialFormDataRef = useRef(null)

    const [demandSkills, setDemandSkills] = useState([])
    // AI skill suggestions panel
    const [aiLoading, setAiLoading] = useState(false)
    const [aiGenerated, setAiGenerated] = useState(false)
    const [aiProfileSkills, setAiProfileSkills] = useState([])
    const [aiGrowthSkills, setAiGrowthSkills] = useState([])
    const [aiSoftSkills, setAiSoftSkills] = useState([])
    const [aiWarnings, setAiWarnings] = useState([])
    const [aiSource, setAiSource] = useState('ai')
    const [aiError, setAiError] = useState('')

    // Overseas locations toggle
    const [showOverseas, setShowOverseas] = useState(false)

    // --- PSGC derived state ---
    const resolvedProvince = useMemo(() => findProvinceByName(formData.province), [formData.province])
    const resolvedProvinceName = resolvedProvince?.name ?? formData.province
    const resolvedCity = useMemo(() => findMunicipalityByName(resolvedProvince, formData.city), [resolvedProvince, formData.city])
    const resolvedCityName = resolvedCity?.name ?? formData.city
    const provinces = useMemo(() => sortNames(psgcData.provinces.map(p => p.name)), [])
    const municipalities = useMemo(() => {
        if (!resolvedProvince) return []
        return sortNames(resolvedProvince.municipalities.map(m => m.name))
    }, [resolvedProvince])
    const barangays = useMemo(() => {
        if (!resolvedCity) return []
        return sortNames(resolvedCity.barangays)
    }, [resolvedCity])

    // --- Course helper ---
    const getCourseOptions = (level) => {
        if (level === 'Senior High School (Grades 11-12)') return coursesData.seniorHigh || []
        if (level === 'Tertiary') return coursesData.tertiary || []
        if (level === 'Graduate Studies / Post-graduate') return coursesData.graduate || []
        return []
    }

    const courseOptions = getCourseOptions(formData.highest_education)
    const showCourseField = LEVELS_WITH_COURSE.includes(formData.highest_education)
    const isCurrentlyInSchool = formData.currently_in_school === true
    const showDidNotGraduate = !isCurrentlyInSchool && !!formData.highest_education
    const showUndergraduateFields = !isCurrentlyInSchool && formData.did_not_graduate === true
    const showYearGraduated = !!formData.highest_education && !showUndergraduateFields
    const predefinedSkills = formData.predefined_skills || []
    const customSkills = formData.skills || []

    const inferredCategory = useMemo(
        () => inferCategoryFromProfile(formData),
        [formData.course_or_field, formData.work_experiences, formData.preferred_occupations]
    )

    const currentSkills = useMemo(
        () => [...(formData.predefined_skills || []), ...(formData.skills || [])],
        [formData.predefined_skills, formData.skills]
    )

    const companionRequired = useMemo(() => {
        if (currentSkills.length === 0) return []
        const currentSet = new Set(currentSkills.map(s => s.toLowerCase()))
        return getCompanionSuggestions(currentSkills).filter(s => !currentSet.has(s.toLowerCase()))
    }, [currentSkills])

    const companionPreferred = useMemo(() => {
        if (currentSkills.length === 0) return []
        const currentSet = new Set(currentSkills.map(s => s.toLowerCase()))
        return getSmartPreferredSuggestions(currentSkills, {
            category: inferredCategory,
            existingPreferred: currentSkills,
        }).filter(item => !currentSet.has(item.skill.toLowerCase()))
    }, [currentSkills, inferredCategory])

    const showSuggestions = companionRequired.length > 0 || companionPreferred.length > 0

    useEffect(() => {
        if (!inferredCategory) { setDemandSkills([]); return }
        let cancelled = false
        getTopDemandSkills(inferredCategory, 10).then(rows => {
            if (!cancelled) setDemandSkills(rows)
        })
        return () => { cancelled = true }
    }, [inferredCategory])

    // Warn user about unsaved changes (browser close/refresh)
    useEffect(() => {
        if (!isDirty) return
        const handleBeforeUnload = (e) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    // Block in-app navigation when there are unsaved changes
    useEffect(() => {
        if (!isDirty || success) return
        const handleClick = (e) => {
            const anchor = e.target.closest('a[href]')
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('http') || href.startsWith('#')) return
            if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
        document.addEventListener('click', handleClick, true)
        return () => document.removeEventListener('click', handleClick, true)
    }, [isDirty, success])

    const restoredRef = useRef(false)

    // Pre-populate form with existing user data (only once)
    useEffect(() => {
        if (restoredRef.current) return
        if (userData) {
            restoredRef.current = true

            // Parse "Others:" prefixed fields
            const religionParsed = parseOtherSelection(userData.religion)
            const selfEmpParsed = parseOtherSelection(unwrapArrayValue(userData.self_employment_type))
            const unempParsed = parseOtherSelection(unwrapArrayValue(userData.unemployment_reason))

            const initial = {
                surname: userData.surname || '',
                first_name: userData.first_name || '',
                middle_name: userData.middle_name || '',
                suffix: userData.suffix || '',
                date_of_birth: userData.date_of_birth || '',
                sex: userData.sex || '',
                civil_status: userData.civil_status || '',
                religion: religionParsed.selectedValue,
                religion_specify: religionParsed.otherValue,
                height_cm: userData.height_cm || '',
                is_pwd: userData.is_pwd === true || userData.is_pwd === 'true',
                disability_type: userData.disability_type || [],
                disability_type_specify: userData.disability_type_specify || '',
                pwd_id_number: userData.pwd_id_number || '',

                street_address: userData.street_address || '',
                province: userData.province || '',
                city: userData.city || '',
                barangay: userData.barangay || '',
                mobile_number: userData.mobile_number || '',

                employment_status: userData.employment_status || '',
                employment_type: unwrapArrayValue(userData.employment_type),
                self_employment_type: selfEmpParsed.selectedValue,
                self_employment_specify: selfEmpParsed.otherValue,
                unemployment_reason: unempParsed.selectedValue,
                unemployment_reason_specify: unempParsed.otherValue,
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
                certifications: userData.certifications || [],
                certificate_urls: userData.certificate_urls || [],

                preferred_job_type: userData.preferred_job_type || [],
                preferred_occupations: padArray(userData.preferred_occupations, 3),
                preferred_local_locations: padArray(userData.preferred_local_locations, 3),
                preferred_overseas_locations: padArray(userData.preferred_overseas_locations, 3),
                expected_salary_min: userData.expected_salary_min || '',
                expected_salary_max: userData.expected_salary_max || '',
                willing_to_relocate: userData.willing_to_relocate || 'no',

                languages: userData.languages || [],
                profile_photo: userData.profile_photo || '',
            }
            setFormData(initial)
            initialFormDataRef.current = JSON.stringify(initial)
            setIsDirty(false)
            setResumeUrl(userData.resume_url || '')

            // Show overseas section if any overseas locations exist
            if ((userData.preferred_overseas_locations || []).some(l => l && l.trim() !== '')) {
                setShowOverseas(true)
            }
        }
    }, [userData])

    // Track dirty state by comparing current form data to initial
    useEffect(() => {
        if (initialFormDataRef.current === null) return
        const dirty = JSON.stringify(formData) !== initialFormDataRef.current
        setIsDirty(dirty)
    }, [formData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // --- Job type toggle ---
    const handleJobTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            preferred_job_type: prev.preferred_job_type.includes(type)
                ? prev.preferred_job_type.filter(t => t !== type)
                : [...prev.preferred_job_type, type]
        }))
    }

    // --- Skills ---
    const addSkill = () => {
        if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
            setNewSkill('')
        }
    }
    const removeSkill = (skill) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
    }

    // --- Certifications ---
    const addCertification = () => {
        if (newCert.trim() && !formData.certifications.includes(newCert.trim())) {
            setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }))
            setNewCert('')
        }
    }
    const removeCertification = (cert) => {
        setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== cert) }))
    }

    // --- Work Experiences ---
    const addExperience = () => {
        if ((formData.work_experiences || []).length >= 5) return
        setFormData(prev => ({ ...prev, work_experiences: [...(prev.work_experiences || []), { ...EMPTY_EXPERIENCE }] }))
    }
    const updateExperience = (index, field, value) => {
        setFormData(prev => {
            const updated = [...(prev.work_experiences || [])]
            updated[index] = { ...updated[index], [field]: value }
            return { ...prev, work_experiences: updated }
        })
    }
    const removeExperience = (index) => {
        setFormData(prev => ({ ...prev, work_experiences: (prev.work_experiences || []).filter((_, i) => i !== index) }))
    }

    // --- Professional Licenses ---
    const addLicense = () => {
        if ((formData.professional_licenses || []).length >= 2) return
        setFormData(prev => ({ ...prev, professional_licenses: [...(prev.professional_licenses || []), { ...EMPTY_LICENSE }] }))
    }
    const updateLicense = (index, field, value) => {
        setFormData(prev => {
            const updated = [...(prev.professional_licenses || [])]
            updated[index] = { ...updated[index], [field]: value }
            return { ...prev, professional_licenses: updated }
        })
    }
    const removeLicense = (index) => {
        setFormData(prev => ({ ...prev, professional_licenses: (prev.professional_licenses || []).filter((_, i) => i !== index) }))
    }

    // --- Vocational Training ---
    const addTraining = () => {
        if ((formData.vocational_training || []).length >= 3) return
        setFormData(prev => ({ ...prev, vocational_training: [...(prev.vocational_training || []), { ...EMPTY_TRAINING }] }))
    }
    const updateTraining = (index, field, value) => {
        if (field === 'certificate_path') setTrainingValidationError('')
        setFormData(prev => {
            const updated = [...(prev.vocational_training || [])]
            updated[index] = { ...updated[index], [field]: value }
            return { ...prev, vocational_training: updated }
        })
    }
    const removeTraining = (index) => {
        setTrainingValidationError('')
        setFormData(prev => ({ ...prev, vocational_training: (prev.vocational_training || []).filter((_, i) => i !== index) }))
    }

    const getOtherTrainingFingerprints = (currentIndex) =>
        (formData.vocational_training || [])
            .flatMap((training, index) => index === currentIndex ? [] : getTrainingCertificateRecord(training, index))
            .map(buildCertificateFingerprint)
            .filter(Boolean)

    // --- Languages ---
    const addLanguage = () => {
        setFormData(prev => ({ ...prev, languages: [...(prev.languages || []), { language: '', proficiency: '' }] }))
    }
    const updateLanguage = (index, field, value) => {
        setFormData(prev => {
            const updated = [...(prev.languages || [])]
            updated[index] = { ...updated[index], [field]: value }
            return { ...prev, languages: updated }
        })
    }
    const removeLanguage = (index) => {
        setFormData(prev => ({ ...prev, languages: (prev.languages || []).filter((_, i) => i !== index) }))
    }

    // --- Predefined Skills ---
    const togglePredefinedSkill = (skill) => {
        const current = formData.predefined_skills || []
        const updated = current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill]
        setFormData(prev => ({ ...prev, predefined_skills: updated }))
    }

    const isSkillSelected = (skill) =>
        predefinedSkills.includes(skill) || customSkills.includes(skill)

    const addSuggestedSkill = (skill) => {
        if (PREDEFINED_SKILLS.includes(skill)) {
            if (!predefinedSkills.includes(skill)) {
                setFormData(prev => ({ ...prev, predefined_skills: [...(prev.predefined_skills || []), skill] }))
            }
            return
        }
        if (!customSkills.includes(skill)) {
            setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), skill] }))
        }
    }

    const removeSuggestedSkill = (skill) => {
        if (PREDEFINED_SKILLS.includes(skill)) {
            setFormData(prev => ({ ...prev, predefined_skills: (prev.predefined_skills || []).filter(s => s !== skill) }))
        } else {
            setFormData(prev => ({ ...prev, skills: (prev.skills || []).filter(s => s !== skill) }))
        }
    }

    const toggleSuggestedSkill = (skill) =>
        isSkillSelected(skill) ? removeSuggestedSkill(skill) : addSuggestedSkill(skill)

    const handleSuggestedSkillClick = (skill, source) => {
        if (!isSkillSelected(skill)) {
            logSkillAcceptance(skill, source, inferredCategory || null, currentUser?.uid || null)
        }
        toggleSuggestedSkill(skill)
    }

    const buildDeterministicFallback = () => {
        const { suggestions, predefinedToCheck } = generateSuggestedSkills(formData)
        const selected = new Set([
            ...predefinedSkills.map(s => s.toLowerCase()),
            ...customSkills.map(s => s.toLowerCase()),
        ])
        const combined = [...predefinedToCheck, ...suggestions]
        const seen = new Set()
        return combined.filter(s => {
            const key = s.toLowerCase()
            if (seen.has(key)) return false
            if (selected.has(key)) return false
            seen.add(key)
            return true
        })
    }

    const handleGenerateAiSuggestions = async () => {
        setAiLoading(true)
        setAiError('')
        try {
            const result = await deepAnalyzeProfileSkills(formData)
            const selectedLower = new Set([
                ...predefinedSkills.map(s => s.toLowerCase()),
                ...customSkills.map(s => s.toLowerCase()),
            ])
            const profile = (result.profileSkills || []).filter(s => !selectedLower.has(s.toLowerCase()))
            const growth = (result.growthSkills || []).filter(s => !selectedLower.has(s.toLowerCase()))
            const soft = (result.softSkills || []).filter(s => !selectedLower.has(s.toLowerCase()))

            if (profile.length === 0 && growth.length === 0 && soft.length === 0) {
                const fallback = buildDeterministicFallback()
                setAiProfileSkills(fallback)
                setAiGrowthSkills([])
                setAiSoftSkills([])
                setAiWarnings([])
                setAiSource('fallback')
            } else {
                setAiProfileSkills(profile)
                setAiGrowthSkills(growth)
                setAiSoftSkills(soft)
                setAiWarnings(result.warnings || [])
                setAiSource('ai')
            }
            setAiGenerated(true)
        } catch {
            const fallback = buildDeterministicFallback()
            setAiProfileSkills(fallback)
            setAiGrowthSkills([])
            setAiSoftSkills([])
            setAiWarnings([])
            setAiSource('fallback')
            setAiGenerated(true)
            setAiError('AI suggestions were unavailable, so we used your profile details instead.')
        } finally {
            setAiLoading(false)
        }
    }

    const visibleAiProfileSkills = aiProfileSkills.filter(s => !isSkillSelected(s))
    const visibleAiGrowthSkills = aiGrowthSkills.filter(s => !isSkillSelected(s))
    const visibleAiSoftSkills = aiSoftSkills.filter(s => !isSkillSelected(s))

    const addAllSuggestions = () => {
        const newCustom = [...customSkills]
        companionRequired.forEach(skill => { if (!newCustom.includes(skill)) newCustom.push(skill) })
        companionPreferred.forEach(({ skill }) => { if (!newCustom.includes(skill)) newCustom.push(skill) })
        setFormData(prev => ({ ...prev, skills: newCustom }))
    }

    // --- Disability toggle ---
    const handleDisabilityToggle = (type) => {
        const current = formData.disability_type || []
        const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
        setFormData(prev => ({ ...prev, disability_type: updated }))
    }

    // --- PSGC cascading handlers ---
    const handleProvinceChange = (e) => {
        setFormData(prev => ({ ...prev, province: e.target.value, city: '', barangay: '' }))
    }
    const handleCityChange = (e) => {
        setFormData(prev => ({ ...prev, city: e.target.value, barangay: '' }))
    }

    // --- Employment status change ---
    const handleEmploymentStatusChange = (status) => {
        setFormData(prev => ({
            ...prev,
            employment_status: status,
            employment_type: '',
            self_employment_type: '',
            self_employment_specify: '',
            unemployment_reason: '',
            unemployment_reason_specify: '',
            months_looking_for_work: ''
        }))
    }

    // --- Education level change ---
    const handleEducationLevelChange = (value) => {
        setFormData(prev => ({
            ...prev,
            highest_education: value,
            course_or_field: '',
            did_not_graduate: prev.currently_in_school ? true : false,
            education_level_reached: '',
            year_last_attended: ''
        }))
    }

    const handleCurrentlyInSchool = (value) => {
        setFormData(prev => ({
            ...prev,
            currently_in_school: value,
            did_not_graduate: value ? true : false,
            education_level_reached: value ? '' : prev.education_level_reached,
            year_last_attended: value ? '' : prev.year_last_attended
        }))
    }

    const getLevelReachedPlaceholder = () => {
        const level = formData.highest_education
        if (level === 'Elementary (Grades 1-6)') return 'e.g., Grade 4'
        if (level === 'High School (Old Curriculum)') return 'e.g., 3rd Year'
        if (level === 'Junior High School (Grades 7-10)') return 'e.g., Grade 9'
        if (level === 'Senior High School (Grades 11-12)') return 'e.g., Grade 11'
        if (level === 'Tertiary') return 'e.g., 3rd Year'
        if (level === 'Graduate Studies / Post-graduate') return 'e.g., Completed coursework'
        return ''
    }

    // --- Preferred occupations/locations ---
    const updateOccupation = (index, value) => {
        setFormData(prev => {
            const updated = [...(prev.preferred_occupations || ['', '', ''])]
            updated[index] = value
            return { ...prev, preferred_occupations: updated }
        })
    }
    const updateLocalLocation = (index, value) => {
        setFormData(prev => {
            const updated = [...(prev.preferred_local_locations || ['', '', ''])]
            updated[index] = value
            return { ...prev, preferred_local_locations: updated }
        })
    }
    const updateOverseasLocation = (index, value) => {
        setFormData(prev => {
            const updated = [...(prev.preferred_overseas_locations || ['', '', ''])]
            updated[index] = value
            return { ...prev, preferred_overseas_locations: updated }
        })
    }

    // --- Certificate file upload ---
    const handleCertificateUpload = (e) => {
        const files = Array.from(e.target.files)
        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) return
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    certificate_urls: [...(prev.certificate_urls || []), { name: file.name, data: reader.result, type: file.type }]
                }))
            }
            reader.readAsDataURL(file)
        })
    }
    const removeCertificateFile = (index) => {
        setFormData(prev => ({ ...prev, certificate_urls: (prev.certificate_urls || []).filter((_, i) => i !== index) }))
    }

    // --- Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setTrainingValidationError('')
        setLoading(true)

        try {
            // Validation
            const allSkills = [...(formData.predefined_skills || []), ...(formData.skills || [])]
            if (!formData.surname || !formData.first_name || !formData.mobile_number || allSkills.length === 0) {
                throw new Error('Please fill in all required fields (surname, first name, mobile, at least one skill)')
            }
            if (formData.portfolio_url && !/^https?:\/\//i.test(formData.portfolio_url.trim())) {
                throw new Error('Portfolio URL must start with https:// or http://')
            }
            for (const exp of (formData.work_experiences || [])) {
                if (exp.year_started && exp.year_ended && Number(exp.year_ended) < Number(exp.year_started)) {
                    throw new Error('Work experience: Year Ended must be ≥ Year Started')
                }
            }
            if ((formData.vocational_training || []).length !== countTrainingCertificates(formData.vocational_training || [])) {
                setTrainingValidationError('Each training entry requires a certificate upload before you can continue.')
                throw new Error('Each training entry requires a certificate upload before you can continue.')
            }

            // Compose display name
            const displayName = [formData.first_name, formData.middle_name, formData.surname]
                .filter(Boolean).join(' ')

            // Build the data to save
            const profileData = { ...formData }

            // Normalize scalar fields that may have been stored as stringified arrays
            profileData.employment_type = unwrapArrayValue(formData.employment_type)

            // Apply "Others:" composition
            profileData.religion = buildOtherSelection(formData.religion, formData.religion_specify)
            profileData.self_employment_type = buildOtherSelection(
                unwrapArrayValue(formData.self_employment_type),
                formData.self_employment_specify
            )
            profileData.unemployment_reason = buildOtherSelection(
                unwrapArrayValue(formData.unemployment_reason),
                formData.unemployment_reason_specify
            )

            // Normalize boolean fields to strict true/false (guards against string coercion)
            profileData.currently_in_school = profileData.currently_in_school === true
            profileData.did_not_graduate = profileData.did_not_graduate === true
            profileData.is_pwd = profileData.is_pwd === true

            // Convert numeric fields (empty string → null, match registration pattern)
            profileData.height_cm = profileData.height_cm === '' ? null : Number(profileData.height_cm)
            if (Number.isNaN(profileData.height_cm)) profileData.height_cm = null
            profileData.months_looking_for_work = profileData.months_looking_for_work === '' ? null : Number(profileData.months_looking_for_work)
            if (Number.isNaN(profileData.months_looking_for_work)) profileData.months_looking_for_work = null

            // Year fields are TEXT columns — ensure they are always saved as trimmed strings
            profileData.year_graduated = String(profileData.year_graduated ?? '').trim()
            profileData.year_last_attended = String(profileData.year_last_attended ?? '').trim()

            // Normalize optional date fields (empty string → null)
            profileData.civil_service_date = profileData.civil_service_date?.trim() || null
            ;(profileData.professional_licenses || []).forEach(lic => {
                lic.valid_until = lic.valid_until?.trim() || null
            })

            // Clear disability fields when not PWD
            if (!profileData.is_pwd) {
                profileData.disability_type = []
                profileData.disability_type_specify = ''
                profileData.pwd_id_number = ''
            } else if (!(profileData.disability_type || []).includes('Others')) {
                profileData.disability_type_specify = ''
            }

            // Filter empty strings from array fields
            profileData.preferred_occupations = (profileData.preferred_occupations || []).filter(s => s.trim())
            profileData.preferred_local_locations = (profileData.preferred_local_locations || []).filter(s => s.trim())
            profileData.preferred_overseas_locations = (profileData.preferred_overseas_locations || []).filter(s => s.trim())

            // Remove transient/UI-only fields
            delete profileData.religion_specify
            delete profileData.self_employment_specify
            delete profileData.unemployment_reason_specify

            // Use Supabase Storage URL for resume
            profileData.resume_url = resumeUrl
            profileData.updated_at = new Date().toISOString()

            const now = profileData.updated_at

            // Fields that belong in public.users (split name fields + display name)
            const { error: baseErr } = await supabase
                .from('users')
                .update({
                    name: displayName,
                    surname: formData.surname,
                    first_name: formData.first_name,
                    middle_name: formData.middle_name,
                    suffix: formData.suffix === 'None' ? '' : formData.suffix,
                    profile_photo: profileData.profile_photo,
                    updated_at: now,
                })
                .eq('id', currentUser.uid)
            if (baseErr) throw baseErr

            // Remove base-table-only fields before profile upsert.
            // Note: first_name/surname/middle_name are kept in the profile upsert too
            // so the reverification trigger on jobseeker_profiles can detect name changes.
            const { profile_photo, suffix, ...profileFields } = profileData

            const { data: upsertedRows, error: profileErr } = await supabase
                .from('jobseeker_profiles')
                .upsert({
                    id: currentUser.uid,
                    ...profileFields,
                    updated_at: now,
                }, { onConflict: 'id' })
                .select('id')
            if (profileErr) throw profileErr
            if (!upsertedRows || upsertedRows.length === 0) {
                throw new Error('Profile update did not write — please try again')
            }

            // Verify critical boolean fields were actually persisted
            const { data: verifyRow, error: verifyErr } = await supabase
                .from('jobseeker_profiles')
                .select('currently_in_school, did_not_graduate, is_pwd')
                .eq('id', currentUser.uid)
                .maybeSingle()
            if (verifyErr) {
                console.error('[ProfileEdit] post-save verify failed:', verifyErr.message)
            } else if (verifyRow) {
                // Normalize DB value — column may return string 'true'/'false' instead of boolean
                const dbVal = verifyRow.currently_in_school === true || verifyRow.currently_in_school === 'true'
                if (dbVal !== profileFields.currently_in_school) {
                    console.error('[ProfileEdit] currently_in_school mismatch — sent:', profileFields.currently_in_school, 'got:', verifyRow.currently_in_school, 'type:', typeof verifyRow.currently_in_school)
                    throw new Error('Profile save failed: "Currently in School" did not persist. Please try again.')
                }
            }

            // Immediately sync localStorage so refresh always shows saved data
            // (protects against fetchUserData timeout or stale dedup)
            try {
                const cached = localStorage.getItem(`peso-profile-${currentUser.uid}`)
                if (cached) {
                    const parsed = JSON.parse(cached)
                    Object.assign(parsed, profileFields, { updated_at: now })
                    localStorage.setItem(`peso-profile-${currentUser.uid}`, JSON.stringify(parsed))
                }
            } catch {}

            // Expand skill aliases for deterministic match scoring (non-blocking)
            try {
                const aliasData = await expandProfileAliases(allSkills, profileData.work_experiences)
                if (aliasData.skillAliases && Object.keys(aliasData.skillAliases).length > 0) {
                    await supabase
                        .from('jobseeker_profiles')
                        .update({
                            skill_aliases: aliasData.skillAliases,
                            experience_categories: aliasData.experienceCategories,
                        })
                        .eq('id', currentUser.uid)
                }
            } catch (aliasErr) {
                console.warn('Alias expansion failed (non-blocking):', aliasErr.message)
            }

            // Clear cached match scores so they recalculate with new data
            clearSessionScores(currentUser.uid)

            // Refresh the backend profile embedding after the profile write settles.
            try {
                await refreshProfileEmbedding({ userId: currentUser.uid })
            } catch (embeddingErr) {
                console.warn('Profile embedding refresh failed (non-blocking):', embeddingErr.message)
            }

            // Force-refresh AuthContext + localStorage cache from DB
            // (bypasses dedup so we always get post-save data)
            await fetchUserData(currentUser.uid, { force: true })

            // Reset dirty tracking so the beforeunload warning doesn't fire
            initialFormDataRef.current = JSON.stringify(formData)
            setIsDirty(false)

            setSuccess('Profile updated successfully!')
        } catch (err) {
            const message = err?.message || 'Failed to update profile'
            if (/violates check constraint/i.test(message)) {
                setTrainingValidationError('Each training entry requires a certificate upload before you can continue.')
                setError('One or more training entries is missing a certificate. Please refresh and try again.')
            } else {
                setError(message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Your Profile</h1>
                    <p className="text-gray-600 mb-6">Update your information to keep your profile current</p>

                    <div className="mb-6">
                        <ProfilePhotoUpload
                            name={[formData.first_name, formData.surname].filter(Boolean).join(' ')}
                            currentPhoto={formData.profile_photo || userData?.profile_photo}
                            onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
                        />
                    </div>

                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 flex items-center justify-between gap-3">
                            <p className="text-green-700 text-sm">{success}</p>
                            <Link to="/dashboard" className="btn-primary text-sm py-1.5 px-4 flex-shrink-0">
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card space-y-8">

                    {/* ============================================================ */}
                    {/* 1. PERSONAL INFORMATION */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Personal Information
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FloatingLabelInput label="Surname" name="surname" value={formData.surname} onChange={handleChange} icon={User} required />
                                <FloatingLabelInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FloatingLabelInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} />
                                <SearchableSelect label="Suffix" name="suffix" value={formData.suffix} onChange={handleChange} options={SUFFIX_OPTIONS} placeholder="None" />
                            </div>

                            <FloatingLabelInput label="Date of Birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} type="date" icon={Calendar} required />

                            <div>
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

                            <SearchableSelect label="Civil Status" name="civil_status" value={formData.civil_status} onChange={handleChange} options={CIVIL_STATUS_OPTIONS} required />

                            <SearchableSelect label="Religion" name="religion" value={formData.religion} onChange={handleChange} options={RELIGION_OPTIONS} />
                            <AnimatedSection show={formData.religion === 'Others'}>
                                <FloatingLabelInput label="Please specify religion" name="religion_specify" value={formData.religion_specify} onChange={handleChange} required />
                            </AnimatedSection>

                            <FloatingLabelInput label="Height (cm)" name="height_cm" value={formData.height_cm} onChange={handleChange} type="number" inputMode="numeric" min="50" max="300" icon={Ruler} />

                            <div>
                                <label className="label">Person with Disability (PWD) <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                                        <button key={opt.label} type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, is_pwd: opt.value, ...(!opt.value && { disability_type: [], pwd_id_number: '', disability_type_specify: '' }) }))}
                                            className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.is_pwd === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <AnimatedSection show={formData.is_pwd === true}>
                                <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <label className="label">Disability Type <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {DISABILITY_TYPES.map(type => (
                                                <label key={type} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                                    <input type="checkbox" checked={(formData.disability_type || []).includes(type)} onChange={() => handleDisabilityToggle(type)}
                                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                    <span className="text-sm text-gray-700">{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <AnimatedSection show={(formData.disability_type || []).includes('Others')}>
                                        <FloatingLabelInput label="Please specify disability" name="disability_type_specify" value={formData.disability_type_specify} onChange={handleChange} required />
                                    </AnimatedSection>
                                    <FloatingLabelInput label="PWD ID Number" name="pwd_id_number" value={formData.pwd_id_number} onChange={handleChange} />
                                </div>
                            </AnimatedSection>
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 2. CONTACT & ADDRESS */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-600" />
                            Contact & Address
                        </h2>
                        <div className="space-y-4">
                            <FloatingLabelInput label="House No. / Street / Village" name="street_address" value={formData.street_address} onChange={handleChange} icon={MapPin} required />

                            <SearchableSelect label="Province" name="province" value={resolvedProvinceName} onChange={handleProvinceChange} options={provinces} required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SearchableSelect label="Municipality / City" name="city" value={resolvedCityName} onChange={handleCityChange} options={municipalities} required />
                                <SearchableSelect label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} options={barangays} required />
                            </div>

                            <FloatingLabelInput label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} type="tel" inputMode="numeric" icon={Phone} required placeholder="09XXXXXXXXX" />
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 3. EMPLOYMENT STATUS */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Employment Status
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {['Employed', 'Unemployed', 'Self-Employed'].map(status => (
                                    <button key={status} type="button" onClick={() => handleEmploymentStatusChange(status)}
                                        className={`p-3 rounded-xl border-2 text-center text-sm transition-all duration-200 ${formData.employment_status === status ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                        {status}
                                    </button>
                                ))}
                            </div>

                            <AnimatedSection show={formData.employment_status === 'Employed'}>
                                <div className="mt-4">
                                    <SearchableSelect label="Employment Type" name="employment_type" value={formData.employment_type} onChange={handleChange} options={EMPLOYMENT_TYPES} required />
                                </div>
                            </AnimatedSection>

                            <AnimatedSection show={formData.employment_status === 'Self-Employed'}>
                                <div className="space-y-4 mt-4">
                                    <SearchableSelect label="Self-Employment Type" name="self_employment_type" value={formData.self_employment_type} onChange={handleChange} options={SELF_EMPLOYMENT_TYPES} required />
                                    <AnimatedSection show={formData.self_employment_type === 'Others'}>
                                        <FloatingLabelInput label="Please specify" name="self_employment_specify" value={formData.self_employment_specify} onChange={handleChange} required />
                                    </AnimatedSection>
                                </div>
                            </AnimatedSection>

                            <AnimatedSection show={formData.employment_status === 'Unemployed'}>
                                <div className="space-y-4 mt-4">
                                    <SearchableSelect label="Reason for Unemployment" name="unemployment_reason" value={formData.unemployment_reason} onChange={handleChange} options={UNEMPLOYMENT_REASONS} required />
                                    <AnimatedSection show={formData.unemployment_reason === 'Others'}>
                                        <FloatingLabelInput label="Please specify" name="unemployment_reason_specify" value={formData.unemployment_reason_specify} onChange={handleChange} required />
                                    </AnimatedSection>
                                    <FloatingLabelInput label="Months Looking for Work" name="months_looking_for_work" value={formData.months_looking_for_work} onChange={handleChange} type="number" inputMode="numeric" min="0" />
                                </div>
                            </AnimatedSection>
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 4. EDUCATION & TRAINING */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-primary-600" />
                            Education & Training
                        </h2>

                        <div className="border border-gray-200 rounded-2xl p-5 space-y-5">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-primary-600" />
                                <h3 className="text-lg font-semibold text-gray-800">Formal Education</h3>
                                {formData.highest_education && <CheckCircle className="w-4 h-4 text-green-500 ml-1" />}
                            </div>

                            {/* Currently in School toggle */}
                            <div>
                                <label className="label">Currently in School <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                                        <button key={opt.label} type="button" onClick={() => handleCurrentlyInSchool(opt.value)}
                                            className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.currently_in_school === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Education Level cards */}
                            <div>
                                <label className="label">Highest Education Level <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {EDUCATION_CARDS.map(card => {
                                        const isSelected = formData.highest_education === card.value
                                        return (
                                            <button key={card.value} type="button" onClick={() => handleEducationLevelChange(card.value)}
                                                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                                <div className={`text-sm leading-tight ${isSelected ? 'text-primary-700 font-medium' : 'text-gray-800'}`}>{card.value}</div>
                                                <div className="text-xs text-gray-400 leading-tight mt-0.5">{card.description}</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <FloatingLabelInput label="School or Institution" name="school_name" value={formData.school_name} onChange={handleChange} placeholder="e.g., University of the Philippines" required />

                            <AnimatedSection show={showCourseField}>
                                <div className="mt-1">
                                    <SearchableSelect label="Course / Field of Study" name="course_or_field" value={formData.course_or_field} onChange={handleChange}
                                        options={courseOptions} grouped={courseOptions.length > 0 && typeof courseOptions[0] === 'object' && 'courses' in courseOptions[0]}
                                        placeholder="Search or select a course..." />
                                </div>
                            </AnimatedSection>

                            <AnimatedSection show={showYearGraduated}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                                    <FloatingLabelInput
                                        label={isCurrentlyInSchool ? 'Expected Graduation Year' : 'Year Graduated'}
                                        name="year_graduated" value={formData.year_graduated} onChange={handleChange}
                                        type="text" inputMode="numeric" pattern="[0-9]{4}" icon={Calendar}
                                        maxLength={4} placeholder="e.g. 2024" />
                                </div>
                            </AnimatedSection>

                            <AnimatedSection show={showDidNotGraduate}>
                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                    <input type="checkbox" checked={formData.did_not_graduate || false}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            did_not_graduate: e.target.checked,
                                            ...(!e.target.checked ? { education_level_reached: '', year_last_attended: '' } : { year_graduated: '' })
                                        }))}
                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-sm text-gray-700">I did not graduate</span>
                                </label>
                            </AnimatedSection>

                            <AnimatedSection show={showUndergraduateFields}>
                                <div className="space-y-4 mt-1 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-sm text-blue-700 font-medium">Please provide the following details:</p>
                                    <FloatingLabelInput label="Level Reached" name="education_level_reached" value={formData.education_level_reached} onChange={handleChange} placeholder={getLevelReachedPlaceholder()} />
                                    <FloatingLabelInput label="Year Last Attended" name="year_last_attended" value={formData.year_last_attended} onChange={handleChange} type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 2024" />
                                </div>
                            </AnimatedSection>
                        </div>

                        {/* Vocational Training */}
                        <div className="pt-4 mt-4 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Technical/Vocational Training</h3>
                            <p className="text-sm text-gray-500 mb-4">Optional -- add up to 3 training entries.</p>
                            {trainingValidationError && (
                                <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                    <span>{trainingValidationError}</span>
                                </div>
                            )}

                            {(formData.vocational_training || []).map((training, index) => (
                                <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
                                    <button type="button" onClick={() => removeTraining(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                    <p className="text-sm font-medium text-gray-600 mb-3">Training {index + 1}</p>
                                    <div className="space-y-3">
                                        <FloatingLabelInput label="Training/Vocational Course" name={`training_course_${index}`} value={training.course} onChange={(e) => updateTraining(index, 'course', e.target.value)} />
                                        <FloatingLabelInput label="Training Institution" name={`training_institution_${index}`} value={training.institution} onChange={(e) => updateTraining(index, 'institution', e.target.value)} />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <FloatingLabelInput label="Hours of Training" name={`training_hours_${index}`} value={training.hours} onChange={(e) => updateTraining(index, 'hours', e.target.value)} type="number" inputMode="numeric" min="1" />
                                            <SearchableSelect label="Certificate Received" name={`training_cert_${index}`} value={training.certificate_level} onChange={(e) => updateTraining(index, 'certificate_level', e.target.value)} options={CERTIFICATE_LEVELS} />
                                        </div>
                                        <FloatingLabelInput label="Skills Acquired" name={`training_skills_${index}`} value={training.skills_acquired} onChange={(e) => updateTraining(index, 'skills_acquired', e.target.value)} />
                                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                                            {!training.certificate_path?.trim() && (
                                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                    <span>Proof of Completion Required</span>
                                                </div>
                                            )}
                                            <CertificateUpload
                                                userId={currentUser?.uid}
                                                value={getTrainingCertificateRecord(training, index)}
                                                onChange={(files) => {
                                                    const selectedFile = files?.[0]
                                                    updateTraining(index, 'certificate_path', selectedFile?.path || '')
                                                    updateTraining(index, 'certificate_file_name', selectedFile?.name || '')
                                                    updateTraining(index, 'certificate_size', selectedFile?.size || null)
                                                }}
                                                inputId={`profile-training-certificate-${index}`}
                                                maxFiles={1}
                                                removeFromStorage={false}
                                                uploadLabel="Upload Certificate"
                                                helperText="PDF / JPG / PNG, 5MB"
                                                disallowedFingerprints={getOtherTrainingFingerprints(index)}
                                                duplicateErrorMessage="This certificate is already attached to another Technical/Vocational Training entry."
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(formData.vocational_training || []).length < 3 && (
                                <button type="button" onClick={addTraining} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
                                    <Plus className="w-4 h-4" /> Add Training
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 5. SKILLS & QUALIFICATIONS */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary-600" />
                            Skills & Qualifications
                        </h2>

                        {/* Predefined Skills */}
                        <div className="space-y-4">
                            {/* Unified skill suggestions card — companion by default, AI when generated */}
                            <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Brain className="w-4 h-4 text-violet-600" />
                                        <span className="text-sm font-semibold text-violet-800">Skill Suggestions</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateAiSuggestions}
                                        disabled={aiLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60 text-xs font-semibold shrink-0"
                                    >
                                        {aiLoading
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Sparkles className="w-3.5 h-3.5" />}
                                        {aiLoading ? 'Analyzing...' : (aiGenerated ? 'Regenerate with AI' : 'Generate AI skill suggestions')}
                                    </button>
                                </div>

                                {aiLoading && (
                                    <div className="flex items-center gap-2 p-3 bg-white/70 border border-violet-200 rounded-lg animate-pulse">
                                        <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                                        <p className="text-xs text-violet-700 font-medium">Analyzing your profile…</p>
                                    </div>
                                )}

                                {/* AI succeeded — show AI sections, companion hidden */}
                                {!aiLoading && aiGenerated && aiSource === 'ai' && (
                                    <div className="space-y-4">
                                        {visibleAiProfileSkills.length > 0 && (
                                            <div>
                                                <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700 mb-1">
                                                    AI Suggested Profile Skills
                                                </p>
                                                <p className="text-xs text-violet-700/80 mb-2">
                                                    Skills the AI found evidence for in your education, training, or work experience. Review before adding.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {visibleAiProfileSkills.map(skill => (
                                                        <button
                                                            key={`ai-profile-${skill}`}
                                                            type="button"
                                                            onClick={() => handleSuggestedSkillClick(skill, 'ai_profile')}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-violet-700 border-violet-300 hover:bg-violet-100 transition-all"
                                                        >
                                                            <span className="text-[11px] leading-none">+</span>
                                                            <span>{skill}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {visibleAiGrowthSkills.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                                                    <p className="text-[11px] uppercase tracking-wide font-semibold text-amber-700">
                                                        Skills To Consider Learning
                                                    </p>
                                                </div>
                                                <p className="text-xs text-amber-700/90 mb-2">
                                                    Commonly useful for your target roles — only add if you already have them.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {visibleAiGrowthSkills.map(skill => (
                                                        <button
                                                            key={`ai-growth-${skill}`}
                                                            type="button"
                                                            onClick={() => handleSuggestedSkillClick(skill, 'ai_growth')}
                                                            title="Only add if you already have this skill"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-amber-700 border-amber-300 hover:bg-amber-100 transition-all"
                                                        >
                                                            <span className="text-[11px] leading-none">+</span>
                                                            <span>{skill}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {visibleAiSoftSkills.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                                                    <p className="text-[11px] uppercase tracking-wide font-semibold text-sky-700">
                                                        Nice-to-have Skills
                                                    </p>
                                                </div>
                                                <p className="text-xs text-sky-700/80 mb-2">
                                                    Soft skills commonly expected for your target roles. Add any you genuinely have.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {visibleAiSoftSkills.map(skill => (
                                                        <button
                                                            key={`ai-soft-${skill}`}
                                                            type="button"
                                                            onClick={() => handleSuggestedSkillClick(skill, 'ai_soft')}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-sky-700 border-sky-300 hover:bg-sky-100 transition-all"
                                                        >
                                                            <span className="text-[11px] leading-none">+</span>
                                                            <span>{skill}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {visibleAiProfileSkills.length === 0 && visibleAiGrowthSkills.length === 0 && visibleAiSoftSkills.length === 0 && (
                                            <p className="text-xs text-violet-600 italic">
                                                No new suggestions. Add more education or work experience details and try again.
                                            </p>
                                        )}

                                        {aiWarnings.length > 0 && (
                                            <p className="text-[11px] text-violet-600/80 italic">
                                                Notes: {aiWarnings.join(' | ')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* AI not yet generated or failed — show companion + fallback */}
                                {!aiLoading && (!aiGenerated || aiSource === 'fallback') && (
                                    <div>
                                        {aiGenerated && aiSource === 'fallback' && (
                                            <div className="mb-3">
                                                <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700 mb-1">
                                                    Suggested Skills From Your Profile
                                                </p>
                                                <p className="text-xs text-violet-700/80 mb-2">
                                                    AI suggestions were unavailable — showing suggestions based on your course, training, and work experience.
                                                </p>
                                                {visibleAiProfileSkills.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {visibleAiProfileSkills.map(skill => (
                                                            <button
                                                                key={`det-${skill}`}
                                                                type="button"
                                                                onClick={() => handleSuggestedSkillClick(skill, 'deterministic_fallback')}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border bg-white text-violet-700 border-violet-300 hover:bg-violet-100 transition-all"
                                                            >
                                                                <span className="text-[11px] leading-none">+</span>
                                                                <span>{skill}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-violet-600 italic mb-3">
                                                        No suggestions available. Add more education or work experience details and try again.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {!aiGenerated && (
                                            <p className="text-xs text-violet-700">
                                                Click the button to let AI review your education, training, and experience for skill suggestions. Nothing will be added automatically — you choose what to include.
                                            </p>
                                        )}

                                        {aiGenerated && aiSource === 'fallback' && showSuggestions && (
                                            <div>
                                                {companionRequired.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700/60 mb-1.5">Typically go together</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {companionRequired.map(skill => {
                                                                const selected = isSkillSelected(skill)
                                                                return (
                                                                    <button
                                                                        key={skill}
                                                                        type="button"
                                                                        onClick={() => handleSuggestedSkillClick(skill, 'deterministic')}
                                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                                            selected ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-700 border-violet-300 hover:bg-violet-50'
                                                                        }`}
                                                                    >
                                                                        {selected ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">+</span>}
                                                                        <span>{skill}</span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {companionPreferred.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-[11px] uppercase tracking-wide font-semibold text-violet-700/60 mb-1.5">Nice to have</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {companionPreferred.map(({ skill, reason }) => {
                                                                const selected = isSkillSelected(skill)
                                                                return (
                                                                    <button
                                                                        key={skill}
                                                                        type="button"
                                                                        onClick={() => handleSuggestedSkillClick(skill, 'ai_enrichment')}
                                                                        title={reason}
                                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                                            selected ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'
                                                                        }`}
                                                                    >
                                                                        {selected ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">+</span>}
                                                                        <span>{skill}</span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                {(companionRequired.length + companionPreferred.length) > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={addAllSuggestions}
                                                        className="mt-1 text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline"
                                                    >
                                                        Add all {companionRequired.length + companionPreferred.length} suggestions
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Employer-demand panel — kept separate from "skills you have" */}
                            {inferredCategory && demandSkills.length > 0 && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-semibold text-emerald-800">Commonly requested by employers in {inferredCategory}</span>
                                    </div>
                                    <p className="text-xs text-emerald-700 mb-3">Based on currently open job postings. Only add these if you actually have them.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {demandSkills.map(item => {
                                            const selected = isSkillSelected(item.requirement)
                                            return (
                                                <button
                                                    key={item.requirement}
                                                    type="button"
                                                    onClick={() => handleSuggestedSkillClick(item.requirement, 'demand_side')}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                        selected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                                    }`}
                                                    title={`Requested in ${item.demand_count} open job${item.demand_count > 1 ? 's' : ''}`}
                                                >
                                                    {selected ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] leading-none">+</span>}
                                                    {item.requirement}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="label">Common Skills</label>
                                <p className="text-sm text-gray-500 mb-2">Select skills you have or add your own below.</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {PREDEFINED_SKILLS.filter(skill => !new Set([...companionRequired, ...companionPreferred.map(p => p.skill)].map(s => s.toLowerCase())).has(skill.toLowerCase())).map(skill => (
                                        <label key={skill} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input type="checkbox" checked={(formData.predefined_skills || []).includes(skill)} onChange={() => togglePredefinedSkill(skill)}
                                                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                            <span className="text-sm text-gray-700">{skill}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Skills */}
                            <div>
                                <label className="label">Additional Skills *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                        className="input-field"
                                        placeholder="e.g. Microsoft Excel"
                                    />
                                    <button type="button" onClick={addSkill} className="btn-secondary flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                                {formData.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {formData.skills.map((skill, index) => (
                                            <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                                                {skill}
                                                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-primary-900">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Professional Licenses */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Professional Licenses</h3>
                                <p className="text-sm text-gray-500 mb-4">Optional -- add up to 2 licenses.</p>

                                {(formData.professional_licenses || []).map((lic, index) => (
                                    <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
                                        <button type="button" onClick={() => removeLicense(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                        <p className="text-sm font-medium text-gray-600 mb-3">License {index + 1}</p>
                                        <div className="space-y-3">
                                            <FloatingLabelInput label="License Name (PRC)" name={`lic_name_${index}`} value={lic.name} onChange={(e) => updateLicense(index, 'name', e.target.value)} icon={Award} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FloatingLabelInput label="License Number" name={`lic_num_${index}`} value={lic.number} onChange={(e) => updateLicense(index, 'number', e.target.value)} />
                                                <FloatingLabelInput label="Valid Until" name={`lic_valid_${index}`} value={lic.valid_until} onChange={(e) => updateLicense(index, 'valid_until', e.target.value)} type="date" icon={Calendar} />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(formData.professional_licenses || []).length < 2 && (
                                    <button type="button" onClick={addLicense} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
                                        <Plus className="w-4 h-4" /> Add License
                                    </button>
                                )}
                            </div>

                            {/* Civil Service Eligibility */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Civil Service Eligibility</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FloatingLabelInput label="Eligibility" name="civil_service_eligibility" value={formData.civil_service_eligibility} onChange={handleChange} icon={Shield} />
                                    <FloatingLabelInput label="Date Taken" name="civil_service_date" value={formData.civil_service_date} onChange={handleChange} type="date" icon={Calendar} />
                                </div>
                            </div>

                            {/* Work Experience */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Work Experience</h3>
                                <p className="text-sm text-gray-500 mb-4">Optional -- add up to 5 entries. Start with the most recent.</p>

                                {(formData.work_experiences || []).map((exp, index) => (
                                    <div key={index} className="relative p-4 bg-gray-50 rounded-xl mb-4 animate-scale-in">
                                        <button type="button" onClick={() => removeExperience(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                        <p className="text-sm font-medium text-gray-600 mb-3">Experience {index + 1}</p>
                                        <div className="space-y-3">
                                            <FloatingLabelInput label="Company Name" name={`exp_company_${index}`} value={exp.company} onChange={(e) => updateExperience(index, 'company', e.target.value)} icon={Briefcase} required />
                                            <FloatingLabelInput label="Address (City/Municipality)" name={`exp_address_${index}`} value={exp.address} onChange={(e) => updateExperience(index, 'address', e.target.value)} />
                                            <FloatingLabelInput label="Position" name={`exp_position_${index}`} value={exp.position} onChange={(e) => updateExperience(index, 'position', e.target.value)} required />
                                            {(() => {
                                                const positionSkills = getSkillsForPosition(exp.position).filter(skill => !isSkillSelected(skill))
                                                if (positionSkills.length === 0) return null
                                                return (
                                                    <div className="flex flex-wrap gap-1.5 -mt-1">
                                                        <span className="inline-flex items-center text-xs text-gray-500 mr-1">
                                                            <Sparkles className="w-3 h-3 mr-1 text-blue-500" />
                                                            Add skills:
                                                        </span>
                                                        {positionSkills.map(skill => (
                                                            <button
                                                                key={skill}
                                                                type="button"
                                                                onClick={() => {
                                                                    logSkillAcceptance(skill, 'ai_enrichment', inferredCategory || null, currentUser?.uid || null)
                                                                    addSuggestedSkill(skill)
                                                                }}
                                                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors"
                                                            >
                                                                + {skill}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )
                                            })()}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <FloatingLabelInput label="Year Started" name={`exp_year_started_${index}`} value={exp.year_started} onChange={(e) => updateExperience(index, 'year_started', e.target.value)} type="number" inputMode="numeric" min="1950" max={new Date().getFullYear()} placeholder="e.g. 2020" />
                                                <FloatingLabelInput label="Year Ended" name={`exp_year_ended_${index}`} value={exp.year_ended} onChange={(e) => updateExperience(index, 'year_ended', e.target.value)} type="number" inputMode="numeric" min="1950" max={new Date().getFullYear()} placeholder="e.g. 2023" />
                                                <SearchableSelect label="Employment Status" name={`exp_status_${index}`} value={exp.employment_status} onChange={(e) => updateExperience(index, 'employment_status', e.target.value)} options={WORK_EXPERIENCE_STATUSES} />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(formData.work_experiences || []).length < 5 && (
                                    <button type="button" onClick={addExperience} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
                                        <Plus className="w-4 h-4" /> Add Work Experience
                                    </button>
                                )}
                            </div>

                            {/* Portfolio URL */}
                            <div className="pt-4 border-t border-gray-200">
                                <FloatingLabelInput label="Portfolio URL" name="portfolio_url" value={formData.portfolio_url} onChange={handleChange} placeholder="https://..." />
                            </div>

                            {/* Certifications */}
                            <div>
                                <label className="label">Certifications (Optional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newCert}
                                        onChange={(e) => setNewCert(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                                        className="input-field"
                                        placeholder="e.g. PRC License"
                                    />
                                    <button type="button" onClick={addCertification} className="btn-secondary flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                                {formData.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {formData.certifications.map((cert, index) => (
                                            <span key={index} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2">
                                                {cert}
                                                <button type="button" onClick={() => removeCertification(cert)} className="hover:text-green-900">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 6. JOB PREFERENCES */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Job Preferences
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Preferred Job Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {JOB_TYPE_OPTIONS.map(type => {
                                        const isSelected = (formData.preferred_job_type || []).includes(type.id)
                                        return (
                                            <button key={type.id} type="button" onClick={() => handleJobTypeChange(type.id)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                                                    {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                </div>
                                                <span className={isSelected ? 'text-primary-700 font-medium' : 'text-gray-600'}>{type.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="label">Preferred Occupation</label>
                                <p className="text-sm text-gray-500 mb-2">Enter up to 3 job titles you're interested in.</p>
                                <div className="space-y-3">
                                    {[0, 1, 2].map(i => (
                                        <FloatingLabelInput key={i} label={`Occupation ${i + 1}`} name={`occupation_${i}`}
                                            value={(formData.preferred_occupations || ['', '', ''])[i] || ''} onChange={(e) => updateOccupation(i, e.target.value)} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label flex items-center gap-2"><MapPin className="w-4 h-4" /> Preferred Work Location (Local)</label>
                                <div className="space-y-3">
                                    {[0, 1, 2].map(i => (
                                        <FloatingLabelInput key={i} label={`City/Municipality ${i + 1}`} name={`local_loc_${i}`}
                                            value={(formData.preferred_local_locations || ['', '', ''])[i] || ''} onChange={(e) => updateLocalLocation(i, e.target.value)} />
                                    ))}
                                </div>
                            </div>

                            <button type="button" onClick={() => setShowOverseas(!showOverseas)}
                                className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
                                <Globe className="w-4 h-4" />
                                {showOverseas ? 'Hide Overseas Locations' : 'Add Overseas Locations'}
                            </button>

                            <AnimatedSection show={showOverseas}>
                                <div className="mt-4">
                                    <label className="label flex items-center gap-2"><Globe className="w-4 h-4" /> Preferred Work Location (Overseas)</label>
                                    <div className="space-y-3">
                                        {[0, 1, 2].map(i => (
                                            <FloatingLabelInput key={i} label={`Country ${i + 1}`} name={`overseas_loc_${i}`}
                                                value={(formData.preferred_overseas_locations || ['', '', ''])[i] || ''} onChange={(e) => updateOverseasLocation(i, e.target.value)} />
                                        ))}
                                    </div>
                                </div>
                            </AnimatedSection>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FloatingLabelInput label="Expected Salary (Min)" name="expected_salary_min" value={formData.expected_salary_min} onChange={handleChange} type="number" inputMode="numeric" min="0" placeholder="15000" />
                                <FloatingLabelInput label="Expected Salary (Max)" name="expected_salary_max" value={formData.expected_salary_max} onChange={handleChange} type="number" inputMode="numeric" min="0" placeholder="25000" />
                            </div>

                            <div>
                                <label className="label">Willing to Relocate</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['yes', 'no'].map(val => (
                                        <button key={val} type="button" onClick={() => handleChange({ target: { name: 'willing_to_relocate', value: val } })}
                                            className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${formData.willing_to_relocate === val ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                            {val === 'yes' ? 'Yes' : 'No'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 7. LANGUAGE PROFICIENCY */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Languages className="w-5 h-5 text-primary-600" />
                            Language Proficiency
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">Optional -- add languages you speak.</p>

                        {(formData.languages || []).map((lang, index) => (
                            <div key={index} className="flex items-start gap-3 mb-3 animate-scale-in">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FloatingLabelInput label="Language" name={`lang_name_${index}`} value={lang.language} onChange={(e) => updateLanguage(index, 'language', e.target.value)} required />
                                    <SearchableSelect label="Proficiency Level" name={`lang_prof_${index}`} value={lang.proficiency} onChange={(e) => updateLanguage(index, 'proficiency', e.target.value)} options={PROFICIENCY_LEVELS} required />
                                </div>
                                <button type="button" onClick={() => removeLanguage(index)} className="mt-3 p-1 text-gray-400 hover:text-red-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}

                        <button type="button" onClick={addLanguage} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors">
                            <Plus className="w-4 h-4" /> Add Language
                        </button>
                    </div>

                    {/* ============================================================ */}
                    {/* 8. DOCUMENTS */}
                    {/* ============================================================ */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            Documents
                        </h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Upload new documents only if you want to replace existing ones
                        </p>

                        <div className="space-y-4">
                            <ResumeUpload
                                userId={currentUser.uid}
                                storagePath={`${currentUser.uid}/resume.pdf`}
                                currentUrl={resumeUrl}
                                onUploaded={(url) => setResumeUrl(url)}
                                onRemoved={() => setResumeUrl('')}
                                label="Resume"
                                optional={true}
                            />

                            <div>
                                <label className="label">Supporting Documents (Certificates)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleCertificateUpload} className="hidden" id="cert-upload" />
                                    <label htmlFor="cert-upload" className="cursor-pointer">
                                        <Award className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Click to upload certificates</p>
                                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG -- max 2MB each</p>
                                    </label>
                                </div>
                                {(formData.certificate_urls || []).length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {formData.certificate_urls.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                                <button type="button" onClick={() => removeCertificateFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ============================================================ */}
                    {/* 9. EXPORT RESUME */}
                    {/* ============================================================ */}
                    <div className="pt-4">
                        <ExportResumeButton />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

        </div>
    )
}

export default JobseekerProfileEdit
