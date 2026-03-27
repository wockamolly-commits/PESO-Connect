import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import {
    User, Briefcase, MapPin, FileText, Loader2, AlertCircle,
    Plus, X, CheckCircle, GraduationCap,
    Award, Link as LinkIcon, Save, Sparkles
} from 'lucide-react'
import { analyzeResume, normalizeSkillName, deduplicateSkills, expandProfileAliases, clearSessionScores } from '../services/geminiService'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ResumeUpload from '../components/common/ResumeUpload'
import { compressAndEncode } from '../utils/fileUtils'
import ExportResumeButton from '../components/profile/ExportResumeButton'
import coursesData from '../data/courses.json'
import psgcData from '../data/psgc.json'

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent']
const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'III', 'IV', 'V']
const DISABILITY_OPTIONS = ['Visual', 'Hearing', 'Speech', 'Physical', 'Mental', 'Others']

const EDUCATION_LEVELS = [
    { value: 'Elementary', label: 'Elementary (Grade 1\u20136)' },
    { value: 'High School', label: 'High School (Non K-12)' },
    { value: 'Senior High School (K-12)', label: 'Senior High School (K-12)' },
    { value: 'College', label: 'College / University' },
    { value: 'Graduate Studies', label: 'Graduate Studies / Post-Graduate' },
]

const EDUCATION_SUB_LEVELS = {
    'Elementary': ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    'High School': ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    'Senior High School (K-12)': ['Grade 11', 'Grade 12'],
    'College': ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
    'Graduate Studies': ["Master's", 'Doctorate'],
}

const SHS_STRANDS = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Sports', 'Arts & Design']

const SELF_EMPLOYED_TYPES = [
    'Fisherman/Fisherfolk', 'Vendor/Retailer', 'Home-based Worker',
    'Transport', 'Domestic Worker', 'Freelancer', 'Artisan/Craft Worker', 'Others'
]

const UNEMPLOYMENT_REASONS = [
    'New Entrant/Fresh Graduate', 'Finished Contract', 'Resigned', 'Retired',
    'Terminated/Laid off (Local)', 'Terminated/Laid off (Abroad)',
    'Laid off due to Calamity', 'Others'
]

const ALL_COURSE_NAMES = new Set()
coursesData.categories.forEach(cat => cat.courses.forEach(c => ALL_COURSE_NAMES.add(c)))

const DEFAULT_LANGUAGES = [
    { language: 'English', read: false, write: false, speak: false, understand: false },
    { language: 'Filipino', read: false, write: false, speak: false, understand: false },
    { language: 'Mandarin', read: false, write: false, speak: false, understand: false },
]

const JobseekerProfileEdit = () => {
    const { userData, currentUser, fetchUserData, isVerified } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        // Personal Information
        surname: '', first_name: '', middle_name: '', suffix: '',
        full_name: '',
        date_of_birth: '',
        sex: '',
        civil_status: '',
        religion: '', tin: '', height: '',
        disability: [], disability_other: '',

        // Address & Contact
        house_street: '',
        province: '', city: '', barangay: '',
        mobile_number: '',

        // Employment Status
        employment_status: '',
        employment_type: '',
        self_employed_type: '', self_employed_other: '',
        unemployment_months: '', unemployment_reason: '', unemployment_reason_other: '',
        terminated_abroad_country: '',
        is_ofw: false, ofw_country: '',
        is_former_ofw: false, former_ofw_country: '', former_ofw_return_date: '',
        is_4ps: false, household_id: '',

        // Job Preferences
        preferred_occupations: ['', '', ''],
        work_type: [],
        work_location_type: '',
        preferred_local_locations: [''],
        preferred_overseas_locations: [''],
        preferred_job_type: [],
        preferred_job_location: '',
        expected_salary_min: '',
        expected_salary_max: '',
        willing_to_relocate: 'no',

        // Education
        highest_education: '',
        currently_in_school: 'no',
        currently_enrolled: false,
        senior_high_strand: '',
        course_or_field: '',
        year_graduated: '',
        level_reached: '',
        year_last_attended: '',
        school_name: '',

        // Skills & Experience
        skills: [],
        work_experiences: [],
        certifications: [],
        portfolio_url: '',
        profile_photo: '',

        // Language
        languages: [],

        // Other Skills
        other_skills: [],
        other_skills_other: '',

        // TVET Certification
        tvet_certification_level: '',
        tvet_certification_title: '',

        // PWD (legacy)
        is_pwd: false,
        pwd_id_number: '',
    })

    const [newSkill, setNewSkill] = useState('')
    const [newCert, setNewCert] = useState('')
    const [newExp, setNewExp] = useState({ company: '', position: '', duration: '' })
    const [newLanguage, setNewLanguage] = useState('')
    const [isCustomCourse, setIsCustomCourse] = useState(false)
    const [resumeUrl, setResumeUrl] = useState(userData?.resume_url || '')
    const [resumeFile, setResumeFile] = useState(null)
    const [certificateFiles, setCertificateFiles] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isDirty, setIsDirty] = useState(false)
    const initialFormDataRef = useRef(null)

    // AI Analysis State
    const [showAIModal, setShowAIModal] = useState(false)
    const [aiInputText, setAiInputText] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisError, setAnalysisError] = useState('')

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

            // Normalize languages from old format {language, proficiency} to new {language, read, write, speak, understand}
            let langs = userData.languages || []
            if (langs.length > 0 && 'proficiency' in langs[0] && !('read' in langs[0])) {
                langs = langs.map(l => ({
                    language: l.language,
                    read: true, write: true, speak: true, understand: true,
                }))
            }

            const initial = {
                // Personal
                surname: userData.surname || '',
                first_name: userData.first_name || '',
                middle_name: userData.middle_name || '',
                suffix: userData.suffix || '',
                full_name: userData.full_name || '',
                date_of_birth: userData.date_of_birth || '',
                sex: userData.sex || userData.gender || '',
                civil_status: userData.civil_status || '',
                religion: userData.religion || '',
                tin: userData.tin || '',
                height: userData.height || '',
                disability: userData.disability || [],
                disability_other: userData.disability_other || '',

                // Address & Contact
                house_street: userData.house_street || '',
                province: userData.province || '',
                city: userData.city || '',
                barangay: userData.barangay || '',
                mobile_number: userData.mobile_number || '',

                // Employment
                employment_status: userData.employment_status || '',
                employment_type: userData.employment_type || '',
                self_employed_type: userData.self_employed_type || '',
                self_employed_other: userData.self_employed_other || '',
                unemployment_months: userData.unemployment_months || '',
                unemployment_reason: userData.unemployment_reason || '',
                unemployment_reason_other: userData.unemployment_reason_other || '',
                terminated_abroad_country: userData.terminated_abroad_country || '',
                is_ofw: userData.is_ofw || false,
                ofw_country: userData.ofw_country || '',
                is_former_ofw: userData.is_former_ofw || false,
                former_ofw_country: userData.former_ofw_country || '',
                former_ofw_return_date: userData.former_ofw_return_date || '',
                is_4ps: userData.is_4ps || false,
                household_id: userData.household_id || '',

                // Job Preferences
                preferred_occupations: userData.preferred_occupations || ['', '', ''],
                work_type: userData.work_type || [],
                work_location_type: userData.work_location_type || '',
                preferred_local_locations: userData.preferred_local_locations || [''],
                preferred_overseas_locations: userData.preferred_overseas_locations || [''],
                preferred_job_type: userData.preferred_job_type || [],
                preferred_job_location: userData.preferred_job_location || '',
                expected_salary_min: userData.expected_salary_min || '',
                expected_salary_max: userData.expected_salary_max || '',
                willing_to_relocate: userData.willing_to_relocate || 'no',

                // Education
                highest_education: userData.highest_education || '',
                currently_in_school: userData.currently_in_school || 'no',
                currently_enrolled: userData.currently_enrolled || false,
                senior_high_strand: userData.senior_high_strand || '',
                course_or_field: userData.course_or_field || '',
                year_graduated: userData.year_graduated || '',
                level_reached: userData.level_reached || '',
                year_last_attended: userData.year_last_attended || '',
                school_name: userData.school_name || '',

                // Skills & Experience
                skills: userData.skills || [],
                work_experiences: userData.work_experiences || [],
                certifications: userData.certifications || [],
                portfolio_url: userData.portfolio_url || '',
                profile_photo: userData.profile_photo || '',

                // Language
                languages: langs,

                // Other Skills
                other_skills: userData.other_skills || [],
                other_skills_other: userData.other_skills_other || '',
                tvet_certification_level: userData.tvet_certification_level || '',
                tvet_certification_title: userData.tvet_certification_title || '',

                // PWD (legacy)
                is_pwd: userData.is_pwd || false,
                pwd_id_number: userData.pwd_id_number || '',
            }
            setFormData(initial)
            setIsCustomCourse(!!initial.course_or_field && !ALL_COURSE_NAMES.has(initial.course_or_field))
            initialFormDataRef.current = JSON.stringify(initial)
            setIsDirty(false)
        }
    }, [userData])

    // Track dirty state
    useEffect(() => {
        if (initialFormDataRef.current === null) return
        const dirty = JSON.stringify(formData) !== initialFormDataRef.current
        setIsDirty(dirty)
    }, [formData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Skills
    const addSkill = () => {
        if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
            setNewSkill('')
        }
    }
    const removeSkill = (skill) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
    }

    // Certifications
    const addCertification = () => {
        if (newCert.trim() && !formData.certifications.includes(newCert.trim())) {
            setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }))
            setNewCert('')
        }
    }
    const removeCertification = (cert) => {
        setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== cert) }))
    }

    // Work Experience
    const addWorkExperience = () => {
        if (newExp.company && newExp.position && newExp.duration) {
            setFormData(prev => ({
                ...prev,
                work_experiences: [...prev.work_experiences, { ...newExp }]
            }))
            setNewExp({ company: '', position: '', duration: '' })
        }
    }
    const removeWorkExperience = (index) => {
        setFormData(prev => ({
            ...prev,
            work_experiences: prev.work_experiences.filter((_, i) => i !== index)
        }))
    }

    // Language helpers (grid format)
    const languages = formData.languages && formData.languages.length > 0
        ? formData.languages
        : DEFAULT_LANGUAGES

    const toggleLangSkill = (langIndex, skill) => {
        const updated = languages.map((lang, i) => {
            if (i !== langIndex) return lang
            return { ...lang, [skill]: !lang[skill] }
        })
        setFormData(prev => ({ ...prev, languages: updated }))
    }

    const addLanguage = () => {
        if (!newLanguage.trim()) return
        const updated = [...languages, { language: newLanguage.trim(), read: false, write: false, speak: false, understand: false }]
        setFormData(prev => ({ ...prev, languages: updated }))
        setNewLanguage('')
    }

    const removeLanguage = (index) => {
        if (index < 3) return
        const updated = languages.filter((_, i) => i !== index)
        setFormData(prev => ({ ...prev, languages: updated }))
    }

    // Disability toggle
    const handleDisabilityToggle = (type) => {
        setFormData(prev => {
            const current = prev.disability || []
            if (type === 'None') return { ...prev, disability: [], disability_other: '' }
            const updated = current.includes(type)
                ? current.filter(d => d !== type)
                : [...current, type]
            const newData = { ...prev, disability: updated }
            if (!updated.includes('Others')) newData.disability_other = ''
            return newData
        })
    }

    // Employment helpers
    const handleEmploymentStatusChange = (status) => {
        setFormData(prev => ({
            ...prev,
            employment_status: status,
            ...(status !== 'Employed' ? { employment_type: '' } : {}),
            ...(status !== 'Self-Employed' ? { self_employed_type: '', self_employed_other: '' } : {}),
            ...(status !== 'Unemployed' ? { unemployment_months: '', unemployment_reason: '', unemployment_reason_other: '' } : {}),
        }))
    }

    // Preferred occupations
    const handleOccupationChange = (index, value) => {
        setFormData(prev => {
            const updated = [...(prev.preferred_occupations || ['', '', ''])]
            updated[index] = value
            return { ...prev, preferred_occupations: updated }
        })
    }

    // Work type toggle
    const handleWorkTypeToggle = (type) => {
        setFormData(prev => {
            const current = prev.work_type || []
            return {
                ...prev,
                work_type: current.includes(type)
                    ? current.filter(t => t !== type)
                    : [...current, type]
            }
        })
    }

    // Course select
    const handleCourseSelect = (e) => {
        const val = e.target.value
        if (val === '__other__') {
            setIsCustomCourse(true)
            setFormData(prev => ({ ...prev, course_or_field: '' }))
        } else {
            setIsCustomCourse(false)
            setFormData(prev => ({ ...prev, course_or_field: val }))
        }
    }

    // Education change
    const handleEducationChange = (value) => {
        setFormData(prev => ({
            ...prev,
            highest_education: value,
            senior_high_strand: '',
            level_reached: '',
            course_or_field: value === prev.highest_education ? prev.course_or_field : '',
        }))
        setIsCustomCourse(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            // Compose full_name from split fields
            const fullName = [formData.first_name, formData.middle_name, formData.surname]
                .filter(Boolean).join(' ')

            // Validation
            if ((!formData.surname && !formData.full_name) || !formData.mobile_number || formData.skills.length === 0) {
                throw new Error('Please fill in all required fields (name, mobile, at least one skill)')
            }
            if (formData.portfolio_url && !/^https?:\/\//i.test(formData.portfolio_url.trim())) {
                throw new Error('Portfolio URL must start with https:// or http://')
            }

            const updateData = {
                ...formData,
                full_name: fullName || formData.full_name,
                name: fullName || formData.full_name,
                languages: languages,
                updated_at: new Date().toISOString()
            }

            // Use Supabase Storage URL for resume
            updateData.resume_url = resumeUrl

            // Handle certificate updates if new files uploaded
            if (certificateFiles.length > 0) {
                const existingCerts = userData.certificate_urls || []
                const newCertsData = []
                for (const file of certificateFiles) {
                    const encoded = await compressAndEncode(file)
                    newCertsData.push({ name: file.name, data: encoded, type: file.type })
                }
                updateData.certificate_urls = [...existingCerts, ...newCertsData]
            }

            const now = new Date().toISOString()

            // Fields that belong in public.users
            const { error: baseErr } = await supabase
                .from('users')
                .update({
                    name: updateData.full_name || updateData.name,
                    profile_photo: updateData.profile_photo,
                    updated_at: now,
                })
                .eq('id', currentUser.uid)
            if (baseErr) throw baseErr

            // Flag profile for re-verification if critical fields changed on a verified user
            const CRITICAL_FIELDS = ['full_name', 'highest_education', 'school_name', 'resume_url', 'certifications']
            if (isVerified() && initialFormDataRef.current) {
                const initial = JSON.parse(initialFormDataRef.current)
                const criticalChanged = CRITICAL_FIELDS.some(
                    field => JSON.stringify(updateData[field]) !== JSON.stringify(initial[field])
                )
                if (criticalChanged) {
                    updateData.profile_modified_since_verification = true
                }
            }

            // All other fields go to jobseeker_profiles
            const { profile_photo, ...profileFields } = updateData
            const { error: profileErr } = await supabase
                .from('jobseeker_profiles')
                .upsert({
                    id: currentUser.uid,
                    ...profileFields,
                    updated_at: now,
                }, { onConflict: 'id' })
            if (profileErr) throw profileErr

            // Expand skill aliases for deterministic match scoring (non-blocking)
            try {
                const aliasData = await expandProfileAliases(updateData.skills, updateData.work_experiences)
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

            // Refresh AuthContext + localStorage cache with saved data
            await fetchUserData(currentUser.uid)

            setSuccess('Profile updated successfully!')
        } catch (err) {
            setError(err.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const handleAnalyzeResume = async () => {
        if (!aiInputText.trim()) {
            setAnalysisError('Please paste your resume text first.')
            return
        }

        setIsAnalyzing(true)
        setAnalysisError('')

        try {
            const result = await analyzeResume(aiInputText)

            setFormData(prev => {
                const newData = { ...prev }

                if (result.skills && Array.isArray(result.skills)) {
                    const aiSkills = result.skills.map(s => normalizeSkillName(s.name || s)).filter(Boolean)
                    const merged = [...prev.skills, ...aiSkills]
                    newData.skills = deduplicateSkills(merged)
                }

                if (result.experience && Array.isArray(result.experience)) {
                    const newExps = result.experience.map(exp => ({
                        company: (exp.company || '').trim() || 'Unknown',
                        position: (exp.title || '').trim() || 'Unknown',
                        duration: (exp.duration || '').trim()
                    })).filter(exp => exp.company !== 'Unknown' || exp.position !== 'Unknown')
                    newData.work_experiences = [...prev.work_experiences, ...newExps]
                }

                if (result.education && Array.isArray(result.education) && result.education.length > 0) {
                    const edu = result.education[0]
                    if (!prev.highest_education && edu.normalizedLevel) {
                        newData.highest_education = edu.normalizedLevel
                    }
                    if (!prev.school_name && edu.school) newData.school_name = edu.school.trim()
                    if (!prev.course_or_field && edu.degree) newData.course_or_field = edu.degree.trim()
                    if (!prev.year_graduated && edu.year) newData.year_graduated = edu.year.toString().trim()
                }

                return newData
            })

            setShowAIModal(false)
            setSuccess('Profile updated with AI analysis! Please review the changes.')
            setTimeout(() => setSuccess(''), 5000)
        } catch (err) {
            console.error(err)
            setAnalysisError(err.message || 'Failed to analyze resume.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    // PSGC cascading dropdowns
    const provinces = useMemo(() => psgcData.map(p => p.name).sort(), [])
    const cities = useMemo(() => {
        if (!formData.province) return []
        const prov = psgcData.find(p => p.name === formData.province)
        return prov ? prov.cities.map(c => c.name).sort() : []
    }, [formData.province])
    const barangays = useMemo(() => {
        if (!formData.province || !formData.city) return []
        const prov = psgcData.find(p => p.name === formData.province)
        if (!prov) return []
        const city = prov.cities.find(c => c.name === formData.city)
        return city ? city.barangays.sort() : []
    }, [formData.province, formData.city])

    const showCourseField = ['College', 'Graduate Studies'].includes(formData.highest_education)
    const isK12 = formData.highest_education === 'Senior High School (K-12)'
    const isCurrentlyEnrolled = formData.currently_in_school === 'yes'
    const subLevels = EDUCATION_SUB_LEVELS[formData.highest_education] || []
    const hasNoDisability = !formData.disability || formData.disability.length === 0
    const occupations = formData.preferred_occupations || ['', '', '']

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Your Profile</h1>
                    <p className="text-gray-600 mb-6">Update your information to keep your profile current</p>

                    <div className="mb-6">
                        <ProfilePhotoUpload
                            name={formData.full_name || [formData.first_name, formData.surname].filter(Boolean).join(' ')}
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

                    {/* ─── Personal Information ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Personal Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Surname *</label>
                                <input type="text" name="surname" value={formData.surname} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">First Name *</label>
                                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Middle Name</label>
                                <input type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Suffix</label>
                                <select name="suffix" value={formData.suffix} onChange={handleChange} className="input-field">
                                    <option value="">None</option>
                                    {SUFFIX_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Date of Birth</label>
                                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Sex</label>
                                <select name="sex" value={formData.sex} onChange={handleChange} className="input-field">
                                    <option value="">Select...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Civil Status</label>
                                <select name="civil_status" value={formData.civil_status} onChange={handleChange} className="input-field">
                                    <option value="">Select...</option>
                                    {CIVIL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Religion</label>
                                <input type="text" name="religion" value={formData.religion} onChange={handleChange} className="input-field" placeholder="e.g. Roman Catholic" />
                            </div>
                            <div>
                                <label className="label">TIN</label>
                                <input type="text" name="tin" value={formData.tin} onChange={handleChange} className="input-field" placeholder="000-000-000-000" />
                            </div>
                            <div>
                                <label className="label">Height</label>
                                <input type="text" name="height" value={formData.height} onChange={handleChange} className="input-field" placeholder={`e.g. 5'7"`} />
                            </div>
                        </div>

                        {/* Disability */}
                        <div className="mt-4">
                            <label className="label mb-2">Disability</label>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => handleDisabilityToggle('None')}
                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${hasNoDisability ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    None
                                </button>
                                {DISABILITY_OPTIONS.map(option => {
                                    const isSelected = (formData.disability || []).includes(option)
                                    return (
                                        <button key={option} type="button" onClick={() => handleDisabilityToggle(option)}
                                            className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {option}
                                        </button>
                                    )
                                })}
                            </div>
                            {(formData.disability || []).includes('Others') && (
                                <input type="text" name="disability_other" value={formData.disability_other} onChange={handleChange}
                                    placeholder="Please specify" className="input-field mt-2" />
                            )}
                        </div>
                    </div>

                    {/* ─── Address & Contact ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-600" />
                            Address & Contact
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">House No. / Street / Village</label>
                                <input type="text" name="house_street" value={formData.house_street} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Province</label>
                                <select value={formData.province} onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value, city: '', barangay: '' }))} className="input-field">
                                    <option value="">Select province...</option>
                                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">City / Municipality</label>
                                <select value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value, barangay: '' }))} className="input-field" disabled={!formData.province}>
                                    <option value="">Select city...</option>
                                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Barangay</label>
                                <select name="barangay" value={formData.barangay} onChange={handleChange} className="input-field" disabled={!formData.city}>
                                    <option value="">Select barangay...</option>
                                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Mobile Number *</label>
                                <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} className="input-field" required />
                            </div>
                        </div>
                    </div>

                    {/* ─── Employment Status ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Employment Status
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Current Employment Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Employed', 'Unemployed', 'Self-Employed'].map(status => (
                                        <button key={status} type="button" onClick={() => handleEmploymentStatusChange(status)}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${formData.employment_status === status ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formData.employment_status === 'Employed' && (
                                <div>
                                    <label className="label">Employment Type</label>
                                    <select name="employment_type" value={formData.employment_type} onChange={handleChange} className="input-field">
                                        <option value="">Select...</option>
                                        <option value="Private">Private</option>
                                        <option value="Government">Government</option>
                                    </select>
                                </div>
                            )}

                            {formData.employment_status === 'Self-Employed' && (
                                <div>
                                    <label className="label">Type of Self-Employment</label>
                                    <select name="self_employed_type" value={formData.self_employed_type} onChange={handleChange} className="input-field">
                                        <option value="">Select...</option>
                                        {SELF_EMPLOYED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    {formData.self_employed_type === 'Others' && (
                                        <input type="text" name="self_employed_other" value={formData.self_employed_other} onChange={handleChange}
                                            placeholder="Please specify" className="input-field mt-2" />
                                    )}
                                </div>
                            )}

                            {formData.employment_status === 'Unemployed' && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Months Looking for Work</label>
                                        <input type="number" name="unemployment_months" value={formData.unemployment_months} onChange={handleChange}
                                            className="input-field" placeholder="e.g. 6" min="0" />
                                    </div>
                                    <div>
                                        <label className="label">Reason</label>
                                        <select name="unemployment_reason" value={formData.unemployment_reason} onChange={handleChange} className="input-field">
                                            <option value="">Select...</option>
                                            {UNEMPLOYMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        {formData.unemployment_reason === 'Others' && (
                                            <input type="text" name="unemployment_reason_other" value={formData.unemployment_reason_other} onChange={handleChange}
                                                placeholder="Please specify" className="input-field mt-2" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* OFW / 4Ps */}
                            <div className="grid md:grid-cols-2 gap-4 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                                    <input type="checkbox" checked={formData.is_ofw}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_ofw: e.target.checked, ...(!e.target.checked ? { ofw_country: '' } : {}) }))}
                                        className="w-4 h-4 text-primary-600 rounded" />
                                    <span className="text-sm font-medium text-gray-700">OFW (Overseas Filipino Worker)</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                                    <input type="checkbox" checked={formData.is_former_ofw}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_former_ofw: e.target.checked, ...(!e.target.checked ? { former_ofw_country: '', former_ofw_return_date: '' } : {}) }))}
                                        className="w-4 h-4 text-primary-600 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Former OFW</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                                    <input type="checkbox" checked={formData.is_4ps}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_4ps: e.target.checked, ...(!e.target.checked ? { household_id: '' } : {}) }))}
                                        className="w-4 h-4 text-primary-600 rounded" />
                                    <span className="text-sm font-medium text-gray-700">4Ps Beneficiary</span>
                                </label>
                            </div>

                            {formData.is_ofw && (
                                <div>
                                    <label className="label">OFW Country</label>
                                    <input type="text" name="ofw_country" value={formData.ofw_country} onChange={handleChange} className="input-field" />
                                </div>
                            )}
                            {formData.is_former_ofw && (
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Former OFW Country</label>
                                        <input type="text" name="former_ofw_country" value={formData.former_ofw_country} onChange={handleChange} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Date of Return</label>
                                        <input type="date" name="former_ofw_return_date" value={formData.former_ofw_return_date} onChange={handleChange} className="input-field" />
                                    </div>
                                </div>
                            )}
                            {formData.is_4ps && (
                                <div>
                                    <label className="label">Household ID</label>
                                    <input type="text" name="household_id" value={formData.household_id} onChange={handleChange} className="input-field" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Job Preferences ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Job Preferences
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Preferred Occupation(s)</label>
                                <div className="space-y-2">
                                    {[0, 1, 2].map(i => (
                                        <input key={i} type="text" value={occupations[i] || ''} onChange={(e) => handleOccupationChange(i, e.target.value)}
                                            className="input-field" placeholder={`${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} choice`} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Work Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Part-time', 'Full-time'].map(type => (
                                        <button key={type} type="button" onClick={() => handleWorkTypeToggle(type)}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${(formData.work_type || []).includes(type) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Preferred Work Location</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Local', 'Overseas'].map(type => (
                                        <button key={type} type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, work_location_type: prev.work_location_type === type ? '' : type }))}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${formData.work_location_type === type ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Expected Salary (Min)</label>
                                    <input type="number" name="expected_salary_min" value={formData.expected_salary_min} onChange={handleChange} className="input-field" placeholder="15000" />
                                </div>
                                <div>
                                    <label className="label">Expected Salary (Max)</label>
                                    <input type="number" name="expected_salary_max" value={formData.expected_salary_max} onChange={handleChange} className="input-field" placeholder="25000" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Educational Background ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-primary-600" />
                            Educational Background
                        </h2>
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Highest Educational Attainment</label>
                                    <select value={formData.highest_education} onChange={(e) => handleEducationChange(e.target.value)} className="input-field">
                                        <option value="">Select...</option>
                                        {EDUCATION_LEVELS.map(level => (
                                            <option key={level.value} value={level.value}>{level.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {subLevels.length > 0 && (
                                    <div>
                                        <label className="label">Grade / Year Level</label>
                                        <select name="level_reached" value={formData.level_reached} onChange={handleChange} className="input-field">
                                            <option value="">Select level...</option>
                                            {subLevels.map(level => <option key={level} value={level}>{level}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {formData.highest_education && (
                                <div>
                                    <label className="label">Currently in school?</label>
                                    <div className="flex gap-2">
                                        {['yes', 'no'].map(val => (
                                            <button key={val} type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    currently_in_school: val,
                                                    currently_enrolled: val === 'yes',
                                                    ...(val === 'yes' ? { year_graduated: '' } : { year_last_attended: '' }),
                                                }))}
                                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${formData.currently_in_school === val ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                {val === 'yes' ? 'Yes' : 'No'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isK12 && (
                                <div>
                                    <label className="label">Senior High Strand</label>
                                    <select name="senior_high_strand" value={formData.senior_high_strand} onChange={handleChange} className="input-field">
                                        <option value="">Select strand...</option>
                                        {SHS_STRANDS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}

                            {showCourseField && (
                                <div>
                                    <label className="label">Course / Field of Study</label>
                                    <select value={isCustomCourse ? '__other__' : (formData.course_or_field || '')} onChange={handleCourseSelect} className="input-field">
                                        <option value="">Select course...</option>
                                        {coursesData.categories.map(cat => (
                                            <optgroup key={cat.name} label={cat.name}>
                                                {cat.courses.map(course => (
                                                    <option key={course} value={course}>{course}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                        <option value="__other__">Others (please specify)</option>
                                    </select>
                                    {isCustomCourse && (
                                        <input type="text" value={formData.course_or_field}
                                            onChange={(e) => setFormData(prev => ({ ...prev, course_or_field: e.target.value }))}
                                            placeholder="Enter your course..." className="input-field mt-2" />
                                    )}
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">School / Institution</label>
                                    <input type="text" name="school_name" value={formData.school_name} onChange={handleChange} className="input-field" />
                                </div>
                                {formData.highest_education && !isCurrentlyEnrolled && (
                                    <div>
                                        <label className="label">Year Graduated</label>
                                        <input type="number" name="year_graduated" value={formData.year_graduated} onChange={handleChange}
                                            className="input-field" placeholder="e.g. 2020" min="1950" max={new Date().getFullYear()} />
                                    </div>
                                )}
                                {formData.highest_education && isCurrentlyEnrolled && (
                                    <div>
                                        <label className="label">Year Last Attended</label>
                                        <input type="number" name="year_last_attended" value={formData.year_last_attended} onChange={handleChange}
                                            className="input-field" placeholder="e.g. 2024" min="1950" max={new Date().getFullYear()} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── Language Proficiency ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Language Proficiency</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="text-xs font-semibold text-gray-500 uppercase text-left py-2 pr-2">Language</th>
                                        {['Read', 'Write', 'Speak', 'Understand'].map(skill => (
                                            <th key={skill} className="text-xs font-semibold text-gray-500 uppercase text-center py-2 px-1">{skill}</th>
                                        ))}
                                        <th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {languages.map((lang, i) => (
                                        <tr key={i} className="border-t border-gray-100">
                                            <td className="py-2 pr-2 text-sm font-medium text-gray-800">{lang.language}</td>
                                            {['read', 'write', 'speak', 'understand'].map(skill => (
                                                <td key={skill} className="text-center py-2 px-1">
                                                    <button type="button" onClick={() => toggleLangSkill(i, skill)}
                                                        className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center text-xs transition-all ${lang[skill] ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300 hover:border-gray-400'}`}>
                                                        {lang[skill] && '\u2713'}
                                                    </button>
                                                </td>
                                            ))}
                                            <td className="py-2 pl-1">
                                                {i >= 3 && (
                                                    <button type="button" onClick={() => removeLanguage(i)} className="text-gray-400 hover:text-red-500">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <input type="text" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLanguage() } }}
                                placeholder="Add another language..." className="input-field flex-1" />
                            <button type="button" onClick={addLanguage} disabled={!newLanguage.trim()}
                                className="btn-secondary flex items-center gap-2 disabled:opacity-40">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                    </div>

                    {/* ─── Other Skills (Without Certificate) ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary-600" />
                            Other Skills (Without Certificate)
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {['Auto Mechanic', 'Beautician', 'Carpentry Work', 'Computer Literate',
                              'Domestic Chores', 'Driver', 'Electrician', 'Embroidery',
                              'Gardening', 'Masonry', 'Painter/Artist', 'Painting Jobs',
                              'Photography', 'Plumbing', 'Sewing Dresses', 'Stenography',
                              'Tailoring', 'Others'].map(skill => {
                                const isSelected = (formData.other_skills || []).includes(skill)
                                return (
                                    <button key={skill} type="button"
                                        onClick={() => setFormData(prev => {
                                            const current = prev.other_skills || []
                                            const updated = current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill]
                                            const newData = { ...prev, other_skills: updated }
                                            if (!updated.includes('Others')) newData.other_skills_other = ''
                                            return newData
                                        })}
                                        className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                        {skill}
                                    </button>
                                )
                            })}
                        </div>
                        {(formData.other_skills || []).includes('Others') && (
                            <input type="text" name="other_skills_other" value={formData.other_skills_other} onChange={handleChange}
                                placeholder="Please specify" className="input-field mt-3" />
                        )}
                    </div>

                    {/* TVET / TESDA Certification */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-500" />
                        TVET / TESDA Certification
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Highest TVET Certification
                          </label>
                          <select
                            name="tvet_certification_level"
                            value={formData.tvet_certification_level || ''}
                            onChange={handleChange}
                            className="input-field w-full"
                          >
                            <option value="">None</option>
                            {['NC I', 'NC II', 'NC III', 'NC IV'].map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </div>
                        {formData.tvet_certification_level && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">
                              Certification Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="tvet_certification_title"
                              value={formData.tvet_certification_title || ''}
                              onChange={handleChange}
                              placeholder="e.g. Shielded Metal Arc Welding NC II"
                              className="input-field w-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ─── Skills & Certifications ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary-600" />
                            Skills & Certifications
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Skills *</label>
                                <div className="flex gap-2">
                                    <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                        className="input-field" placeholder="e.g. Microsoft Excel" />
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

                            <div>
                                <label className="label">Certifications (Optional)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={newCert} onChange={(e) => setNewCert(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                                        className="input-field" placeholder="e.g. PRC License" />
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

                            <div>
                                <label className="label">Portfolio URL (Optional)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="url" name="portfolio_url" value={formData.portfolio_url} onChange={handleChange}
                                        onBlur={(e) => { const val = e.target.value.trim(); if (val && !/^https?:\/\//i.test(val)) setError('Portfolio URL must start with https:// or http://') }}
                                        className="input-field pl-12" placeholder="https://yourportfolio.com" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Work Experience ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Experience (Optional)</h2>
                        <div className="space-y-3">
                            <div className="grid md:grid-cols-3 gap-3">
                                <input type="text" value={newExp.company} onChange={(e) => setNewExp(prev => ({ ...prev, company: e.target.value }))}
                                    className="input-field" placeholder="Company name" />
                                <input type="text" value={newExp.position} onChange={(e) => setNewExp(prev => ({ ...prev, position: e.target.value }))}
                                    className="input-field" placeholder="Position" />
                                <input type="text" value={newExp.duration} onChange={(e) => setNewExp(prev => ({ ...prev, duration: e.target.value }))}
                                    className="input-field" placeholder="Duration (e.g. 2020-2022)" />
                            </div>
                            <button type="button" onClick={addWorkExperience} className="btn-secondary flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Experience
                            </button>

                            {formData.work_experiences.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    {formData.work_experiences.map((exp, index) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-lg flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{exp.position}</p>
                                                <p className="text-sm text-gray-600">{exp.company}</p>
                                                <p className="text-xs text-gray-500">{exp.duration}</p>
                                            </div>
                                            <button type="button" onClick={() => removeWorkExperience(index)} className="text-red-600 hover:text-red-800">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Documents ─── */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            Documents (Optional)
                        </h2>
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
                                <label className="label">Additional Certificates</label>
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple
                                    onChange={(e) => setCertificateFiles(Array.from(e.target.files))} className="input-field" />
                                {certificateFiles.length > 0 && (
                                    <p className="text-sm text-green-600 mt-1">{certificateFiles.length} file(s) selected</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Export Resume */}
                    <div className="pt-4">
                        <ExportResumeButton />
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

            {/* AI Analysis Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-primary-50 to-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary-600" />
                            <h3 className="font-semibold text-gray-900">Auto-fill with AI</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <p className="text-sm text-gray-600 mb-4">
                            Paste your resume text below. Our AI will analyze it and extract your skills, education, and work experience to fill out your profile automatically.
                        </p>
                        <textarea value={aiInputText} onChange={(e) => setAiInputText(e.target.value)}
                            className="w-full h-48 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                            placeholder="Paste your resume content here..." />
                        {analysisError && (
                            <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {analysisError}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                        <button onClick={() => setShowAIModal(false)} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={handleAnalyzeResume} disabled={isAnalyzing || !aiInputText.trim()}
                            className="btn-primary flex items-center gap-2 text-sm">
                            {isAnalyzing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Analyze & Auto-fill</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
    )
}

export default JobseekerProfileEdit
