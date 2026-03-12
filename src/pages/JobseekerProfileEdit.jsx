import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import {
    User, Briefcase, MapPin, Phone, FileText, Loader2, AlertCircle,
    Plus, X, ChevronRight, CheckCircle, Upload, Home, GraduationCap,
    Award, Calendar, Building, Link as LinkIcon, Save, Sparkles
} from 'lucide-react'
import { analyzeResume, normalizeSkillName, deduplicateSkills, expandProfileAliases, clearSessionScores } from '../services/geminiService'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ResumeUpload from '../components/common/ResumeUpload'
import Select from '../components/common/Select'

const JobseekerProfileEdit = () => {
    const { userData, currentUser, fetchUserData } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
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
        profile_photo: '',
        gender: '',
        civil_status: '',
        is_pwd: false,
        pwd_id_number: '',
        languages: [],
    })

    const [newSkill, setNewSkill] = useState('')
    const [newCert, setNewCert] = useState('')
    const [newExp, setNewExp] = useState({ company: '', position: '', duration: '' })
    const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Conversational' })

    const addLanguage = () => {
        if (newLanguage.language.trim() && !formData.languages.some(l => l.language === newLanguage.language.trim())) {
            setFormData(prev => ({
                ...prev,
                languages: [...prev.languages, { language: newLanguage.language.trim(), proficiency: newLanguage.proficiency }]
            }))
            setNewLanguage({ language: '', proficiency: 'Conversational' })
        }
    }

    const removeLanguage = (lang) => {
        setFormData(prev => ({
            ...prev,
            languages: prev.languages.filter(l => l.language !== lang)
        }))
    }
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

    // Import AI Service
    // Note: We need to dynamically import this or move the import to the top if possible. 
    // Since we are editing an existing file, let's assume imports are handled at the top.
    // However, I will add the import statement in a separate replacement chunk at the top of the file.

    // Warn user about unsaved changes
    useEffect(() => {
        if (!isDirty) return
        const handleBeforeUnload = (e) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    const restoredRef = useRef(false)

    // Pre-populate form with existing user data (only once)
    useEffect(() => {
        if (restoredRef.current) return
        if (userData) {
            restoredRef.current = true
            const initial = {
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
                profile_photo: userData.profile_photo || '',
                gender: userData.gender || '',
                civil_status: userData.civil_status || '',
                is_pwd: userData.is_pwd || false,
                pwd_id_number: userData.pwd_id_number || '',
                languages: userData.languages || [],
            }
            setFormData(initial)
            initialFormDataRef.current = JSON.stringify(initial)
            setIsDirty(false)
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleJobTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            preferred_job_type: prev.preferred_job_type.includes(type)
                ? prev.preferred_job_type.filter(t => t !== type)
                : [...prev.preferred_job_type, type]
        }))
    }

    const addSkill = () => {
        if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
            setNewSkill('')
        }
    }

    const removeSkill = (skill) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
    }

    const addCertification = () => {
        if (newCert.trim() && !formData.certifications.includes(newCert.trim())) {
            setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }))
            setNewCert('')
        }
    }

    const removeCertification = (cert) => {
        setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== cert) }))
    }

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

    // Compress image/document helper
    const compressAndEncode = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) return resolve('')

            if (!file.type.startsWith('image/')) {
                if (file.size > 400 * 1024) {
                    return reject(new Error('PDF must be under 400KB.'))
                }
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = (err) => reject(err)
                reader.readAsDataURL(file)
                return
            }

            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                URL.revokeObjectURL(url)
                const MAX_DIM = 800
                let { width, height } = img

                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round(height * (MAX_DIM / width))
                        width = MAX_DIM
                    } else {
                        width = Math.round(width * (MAX_DIM / height))
                        height = MAX_DIM
                    }
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)

                const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
                resolve(dataUrl)
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                reject(new Error('Failed to load image for compression.'))
            }

            img.src = url
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            // Validation
            if (!formData.full_name || !formData.mobile_number || formData.skills.length === 0) {
                throw new Error('Please fill in all required fields (name, mobile, at least one skill)')
            }

            const updateData = {
                ...formData,
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
                    newCertsData.push({
                        name: file.name,
                        data: encoded,
                        type: file.type
                    })
                }

                updateData.certificate_urls = [...existingCerts, ...newCertsData]
            }

            const now = new Date().toISOString()

            // Fields that belong in public.users
            const { error: baseErr } = await supabase
                .from('users')
                .update({
                    name: updateData.full_name,
                    profile_photo: updateData.profile_photo,
                    updated_at: now,
                })
                .eq('id', currentUser.uid)
            if (baseErr) throw baseErr

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
            setTimeout(() => {
                navigate('/dashboard')
            }, 2000)
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

            // Map AI result to form data using normalized output
            setFormData(prev => {
                const newData = { ...prev }

                // 1. Skills (Merge with existing, normalized & deduplicated)
                if (result.skills && Array.isArray(result.skills)) {
                    const aiSkills = result.skills.map(s => normalizeSkillName(s.name || s)).filter(Boolean)
                    const merged = [...prev.skills, ...aiSkills]
                    newData.skills = deduplicateSkills(merged)
                }

                // 2. Work Experience (Append, cleaned)
                if (result.experience && Array.isArray(result.experience)) {
                    const newExp = result.experience.map(exp => ({
                        company: (exp.company || '').trim() || 'Unknown',
                        position: (exp.title || '').trim() || 'Unknown',
                        duration: (exp.duration || '').trim()
                    })).filter(exp => exp.company !== 'Unknown' || exp.position !== 'Unknown')
                    newData.work_experiences = [...prev.work_experiences, ...newExp]
                }

                // 3. Education (Use pre-normalized level from geminiService)
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

    const jobTypes = [
        { id: 'full-time', label: 'Full-time' },
        { id: 'part-time', label: 'Part-time' },
        { id: 'contractual', label: 'Contractual' },
        { id: 'on-demand', label: 'On-demand' }
    ]

    const educationLevels = [
        'Elementary Graduate',
        'High School Graduate',
        'Senior High School Graduate',
        'Vocational/Technical Graduate',
        'College Undergraduate',
        'College Graduate',
        'Masteral Degree',
        'Doctoral Degree'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Your Profile</h1>
                    <p className="text-gray-600 mb-6">Update your information to keep your profile current</p>

                    <div className="mb-6">
                        <ProfilePhotoUpload
                            name={formData.full_name}
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
                        <p className="text-green-700 text-sm">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card space-y-8">
                    {/* Personal Information */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Personal Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Full Name *</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Date of Birth</label>
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    value={formData.date_of_birth}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Barangay</label>
                                <input
                                    type="text"
                                    name="barangay"
                                    value={formData.barangay}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Province</label>
                                <input
                                    type="text"
                                    name="province"
                                    value={formData.province}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Mobile Number *</label>
                                <input
                                    type="tel"
                                    name="mobile_number"
                                    value={formData.mobile_number}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Personal Details */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Additional Details
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Gender</label>
                                <Select
                                    options={[
                                        { value: '', label: 'Select gender' },
                                        { value: 'Male', label: 'Male' },
                                        { value: 'Female', label: 'Female' },
                                        { value: 'Prefer not to say', label: 'Prefer not to say' },
                                    ]}
                                    value={formData.gender}
                                    onChange={(val) => handleChange({ target: { name: 'gender', value: val } })}
                                    placeholder="Select gender"
                                />
                            </div>
                            <div>
                                <label className="label">Civil Status</label>
                                <Select
                                    options={[
                                        { value: '', label: 'Select civil status' },
                                        { value: 'Single', label: 'Single' },
                                        { value: 'Married', label: 'Married' },
                                        { value: 'Widowed', label: 'Widowed' },
                                        { value: 'Separated', label: 'Separated' },
                                    ]}
                                    value={formData.civil_status}
                                    onChange={(val) => handleChange({ target: { name: 'civil_status', value: val } })}
                                    placeholder="Select civil status"
                                />
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_pwd}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_pwd: e.target.checked }))}
                                    className="w-4 h-4 text-primary-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Person with Disability (PWD)</span>
                            </label>
                            {formData.is_pwd && (
                                <div className="mt-3">
                                    <label className="label">PWD ID Number (Optional)</label>
                                    <input
                                        type="text"
                                        name="pwd_id_number"
                                        value={formData.pwd_id_number}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="PWD ID number"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Language Proficiency */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Language Proficiency</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newLanguage.language}
                                onChange={(e) => setNewLanguage(prev => ({ ...prev, language: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                                className="input-field flex-1"
                                placeholder="e.g. Filipino, English"
                            />
                            <Select
                                options={[
                                    { value: 'Basic', label: 'Basic' },
                                    { value: 'Conversational', label: 'Conversational' },
                                    { value: 'Fluent', label: 'Fluent' },
                                ]}
                                value={newLanguage.proficiency}
                                onChange={(val) => setNewLanguage(prev => ({ ...prev, proficiency: val }))}
                                placeholder="Proficiency"
                                className="w-40"
                            />
                            <button
                                type="button"
                                onClick={addLanguage}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                        {formData.languages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {formData.languages.map((lang, index) => (
                                    <span
                                        key={index}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                                    >
                                        {lang.language} ({lang.proficiency})
                                        <button
                                            type="button"
                                            onClick={() => removeLanguage(lang.language)}
                                            className="hover:text-blue-900"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Employment Preferences */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Employment Preferences
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Preferred Job Type(s)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {jobTypes.map(type => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => handleJobTypeChange(type.id)}
                                            className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${formData.preferred_job_type.includes(type.id)
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="label">Preferred Job Location</label>
                                <input
                                    type="text"
                                    name="preferred_job_location"
                                    value={formData.preferred_job_location}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Expected Salary (Min)</label>
                                    <input
                                        type="number"
                                        name="expected_salary_min"
                                        value={formData.expected_salary_min}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="15000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Expected Salary (Max)</label>
                                    <input
                                        type="number"
                                        name="expected_salary_max"
                                        value={formData.expected_salary_max}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="25000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Willing to Relocate?</label>
                                <Select
                                    options={[
                                        { value: 'no', label: 'No' },
                                        { value: 'yes', label: 'Yes' },
                                    ]}
                                    value={formData.willing_to_relocate}
                                    onChange={(val) => handleChange({ target: { name: 'willing_to_relocate', value: val } })}
                                    placeholder="Select"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Educational Background */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-primary-600" />
                            Educational Background
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Highest Educational Attainment</label>
                                <Select
                                    options={[{ value: '', label: 'Select education level' }, ...educationLevels.map(level => ({ value: level, label: level }))]}
                                    value={formData.highest_education}
                                    onChange={(val) => handleChange({ target: { name: 'highest_education', value: val } })}
                                    placeholder="Select education level"
                                />
                            </div>
                            <div>
                                <label className="label">School/Institution</label>
                                <input
                                    type="text"
                                    name="school_name"
                                    value={formData.school_name}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Course/Field of Study</label>
                                <input
                                    type="text"
                                    name="course_or_field"
                                    value={formData.course_or_field}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="label">Year Graduated</label>
                                <input
                                    type="text"
                                    name="year_graduated"
                                    value={formData.year_graduated}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="2020"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-primary-600" />
                            Skills & Certifications
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Skills *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSkill}
                                        onChange={(e) => setNewSkill(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                        className="input-field"
                                        placeholder="e.g. Microsoft Excel"
                                    />
                                    <button
                                        type="button"
                                        onClick={addSkill}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                                {formData.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {formData.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2"
                                            >
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(skill)}
                                                    className="hover:text-primary-900"
                                                >
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
                                    <input
                                        type="text"
                                        value={newCert}
                                        onChange={(e) => setNewCert(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                                        className="input-field"
                                        placeholder="e.g. PRC License"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCertification}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                                {formData.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {formData.certifications.map((cert, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2"
                                            >
                                                {cert}
                                                <button
                                                    type="button"
                                                    onClick={() => removeCertification(cert)}
                                                    className="hover:text-green-900"
                                                >
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
                                    <input
                                        type="url"
                                        name="portfolio_url"
                                        value={formData.portfolio_url}
                                        onChange={handleChange}
                                        className="input-field pl-12"
                                        placeholder="https://yourportfolio.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Work Experience */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Experience (Optional)</h2>
                        <div className="space-y-3">
                            <div className="grid md:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    value={newExp.company}
                                    onChange={(e) => setNewExp(prev => ({ ...prev, company: e.target.value }))}
                                    className="input-field"
                                    placeholder="Company name"
                                />
                                <input
                                    type="text"
                                    value={newExp.position}
                                    onChange={(e) => setNewExp(prev => ({ ...prev, position: e.target.value }))}
                                    className="input-field"
                                    placeholder="Position"
                                />
                                <input
                                    type="text"
                                    value={newExp.duration}
                                    onChange={(e) => setNewExp(prev => ({ ...prev, duration: e.target.value }))}
                                    className="input-field"
                                    placeholder="Duration (e.g. 2020-2022)"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={addWorkExperience}
                                className="btn-secondary flex items-center gap-2"
                            >
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
                                            <button
                                                type="button"
                                                onClick={() => removeWorkExperience(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Document Updates */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            Update Documents (Optional)
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
                                <label className="label">Additional Certificates</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                    onChange={(e) => setCertificateFiles(Array.from(e.target.files))}
                                    className="input-field"
                                />
                                {certificateFiles.length > 0 && (
                                    <p className="text-sm text-green-600 mt-1">
                                        ✓ {certificateFiles.length} file(s) selected
                                    </p>
                                )}
                            </div>
                        </div>
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

            {/* AI Analysis Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-primary-50 to-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary-600" />
                            <h3 className="font-semibold text-gray-900">Auto-fill with AI</h3>
                        </div>
                        <button
                            onClick={() => setShowAIModal(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <p className="text-sm text-gray-600 mb-4">
                            Paste your resume text below. Our AI will analyze it and extract your skills, education, and work experience to fill out your profile automatically.
                        </p>

                        <textarea
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                            className="w-full h-48 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                            placeholder="Paste your resume content here..."
                        />

                        {analysisError && (
                            <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {analysisError}
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                        <button
                            onClick={() => setShowAIModal(false)}
                            className="btn-secondary text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAnalyzeResume}
                            disabled={isAnalyzing || !aiInputText.trim()}
                            className="btn-primary flex items-center gap-2 text-sm"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Analyze & Auto-fill
                                </>
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
