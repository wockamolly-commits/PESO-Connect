import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Briefcase,
    MapPin,
    Clock,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Loader2,
    Send,
    Info,
    User,
    MessageSquare,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    Target,
    BookOpen,
    Award,
    ArrowUpRight
} from 'lucide-react'
import geminiService from '../services/geminiService'
import ResumeUpload from '../components/common/ResumeUpload'
import { insertNotification } from '../services/notificationService'
import { XCircle } from 'lucide-react'

const JobDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentUser, userData, isVerified, isJobseeker } = useAuth()

    const [job, setJob] = useState(null)
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)
    const [hasApplied, setHasApplied] = useState(false)
    const [showApplyForm, setShowApplyForm] = useState(false)
    const [justification, setJustification] = useState('')
    const [applicationResumeUrl, setApplicationResumeUrl] = useState('')
    const [useProfileResume, setUseProfileResume] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [matchData, setMatchData] = useState(null)
    const [calculatingMatch, setCalculatingMatch] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    useEffect(() => {
        fetchJob()
        if (currentUser) {
            checkExistingApplication()
        }
    }, [id, currentUser])

    const calculateMatch = async () => {
        if (!job || !userData) return
        setCalculatingMatch(true)
        try {
            const result = await geminiService.calculateJobMatch(job, userData)
            setMatchData(result)
        } catch {
            setMatchData({ error: true })
        } finally {
            setCalculatingMatch(false)
        }
    }

    const fetchJob = async () => {
        try {
            const { data, error } = await supabase
                .from('job_postings')
                .select('*')
                .eq('id', id)
                .maybeSingle()
            if (error) throw error
            if (data) setJob(data)
        } catch (error) {
            console.error('Error fetching job:', error)
        } finally {
            setLoading(false)
        }
    }

    const checkExistingApplication = async () => {
        try {
            const { data, error } = await supabase
                .from('applications')
                .select('id')
                .eq('job_id', id)
                .eq('user_id', currentUser.uid)
                .maybeSingle()
            if (error) throw error
            setHasApplied(!!data)
        } catch (error) {
            console.error('Error checking application:', error)
        }
    }

    // Smart skill matching — handles word roots (editing ↔ editor ↔ edit)
    const skillMatchesRequirement = (skill, requirement) => {
        const s = skill.toLowerCase().trim()
        const r = requirement.toLowerCase().trim()

        // Direct substring match
        if (s.includes(r) || r.includes(s)) return true

        // Word-root matching: split into words and compare roots
        const sWords = s.split(/\s+/)
        const rWords = r.split(/\s+/)

        // Strip common suffixes to get word roots
        const getRoot = (word) => {
            return word
                .replace(/(ing|er|or|tion|sion|ment|ist|ist|ness|ity|able|ible|ful|less|ous|ive|al|ly|ed|es|s)$/i, '')
                .replace(/(.)\1$/, '$1') // double letter: "programm" → "program"
        }

        // Check if enough word roots overlap
        let matchedWords = 0
        for (const sw of sWords) {
            const sRoot = getRoot(sw)
            if (sRoot.length < 2) continue
            for (const rw of rWords) {
                const rRoot = getRoot(rw)
                if (rRoot.length < 2) continue
                if (sRoot === rRoot || sRoot.startsWith(rRoot) || rRoot.startsWith(sRoot)) {
                    matchedWords++
                    break
                }
            }
        }

        // Match if at least one significant word root overlaps
        return matchedWords > 0 && matchedWords >= Math.min(sWords.length, rWords.length) * 0.5
    }

    const checkSkillMatch = () => {
        if (!job?.requirements || !userData?.skills) return false
        return job.requirements.some(req =>
            userData.skills.some(skill => skillMatchesRequirement(skill, req))
        )
    }

    const needsJustification = () => {
        return job?.filter_mode === 'flexible' && !checkSkillMatch()
    }

    // Compute skill gap for inline display
    const getSkillGap = () => {
        if (!job?.requirements || !userData?.skills) return { matched: [], missing: [] }
        const matched = []
        const missing = []
        for (const req of job.requirements) {
            const hasMatch = userData.skills.some(skill => skillMatchesRequirement(skill, req))
            if (hasMatch) matched.push(req)
            else missing.push(req)
        }
        return { matched, missing }
    }

    const handleApply = async () => {
        setError('')

        if (!isVerified()) {
            setError('Your account must be verified to apply for jobs.')
            return
        }

        if (job?.filter_mode === 'strict' && !checkSkillMatch()) {
            setError('Your skills do not match the requirements for this position.')
            return
        }

        if (needsJustification() && !justification.trim()) {
            setError('Please provide a justification for applying without matching skills.')
            return
        }

        setApplying(true)

        try {
            const { error: insertError } = await supabase
                .from('applications')
                .insert({
                    job_id: id,
                    job_title: job.title,
                    user_id: currentUser.uid,
                    applicant_name: userData?.full_name || userData?.name || 'Unknown',
                    applicant_email: userData?.email || '',
                    applicant_skills: userData?.skills || [],
                    justification_text: justification || null,
                    resume_url: useProfileResume
                        ? (userData?.resume_url || null)
                        : (applicationResumeUrl || null),
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
            if (insertError) throw insertError

            setSuccess(true)
            setHasApplied(true)
            setShowApplyForm(false)
            setShowConfirmModal(false)
            setApplicationResumeUrl('')
            setUseProfileResume(true)

            // Send application confirmation notification
            try {
                await insertNotification(
                    currentUser.uid,
                    'application_submitted',
                    `Application submitted for ${job.title}`,
                    `Your application for ${job.title} has been submitted successfully. You'll be notified when the employer reviews it.`,
                    { job_id: id, job_title: job.title }
                )
            } catch (err) {
                console.error('Failed to send confirmation notification:', err)
            }
        } catch (err) {
            console.error('Error applying:', err)
            setError('Failed to submit application. Please try again.')
        } finally {
            setApplying(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Recently'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-6" />
                    <div className="card animate-pulse">
                        <div className="h-8 w-3/4 bg-gray-200 rounded mb-4" />
                        <div className="flex gap-4 mb-6">
                            <div className="h-5 w-32 bg-gray-200 rounded" />
                            <div className="h-5 w-24 bg-gray-200 rounded" />
                            <div className="h-5 w-28 bg-gray-200 rounded" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="h-4 w-5/6 bg-gray-200 rounded" />
                            <div className="h-4 w-4/6 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
                <div className="card max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
                    <p className="text-gray-600 mb-4">This job listing may have been removed or does not exist.</p>
                    <Link to="/jobs" className="btn-primary">Browse Jobs</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to listings
                </button>

                {/* Success Message */}
                {success && (
                    <div className="card bg-green-50 border-green-200 mb-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                                <p className="font-semibold text-green-800">Application Submitted!</p>
                                <p className="text-green-700 text-sm">Your application has been sent to the employer.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Job Header */}
                <div className="card mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                {job.title?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">{job.title}</h1>
                                {job.employer_id ? (
                                    <Link to={`/profile/${job.employer_id}`} className="text-gray-600 mb-3 hover:text-primary-600 transition-colors inline-block">
                                        {job.employer_name || 'Employer'}
                                    </Link>
                                ) : (
                                    <p className="text-gray-600 mb-3">{job.employer_name || 'Employer'}</p>
                                )}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {job.location}
                                    </span>
                                    {job.salary_range && (
                                        <span className="flex items-center gap-1">
                                            <span className="w-4 h-4 flex items-center justify-center text-sm font-bold">₱</span>
                                            {job.salary_range}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        Posted {formatDate(job.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`badge ${job.filter_mode === 'strict' ? 'badge-info' : 'badge-success'}`}>
                                {job.filter_mode} matching
                            </span>
                            <span className={`badge ${job.status === 'open' ? 'badge-success' : 'badge-error'}`}>
                                {job.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Description</h2>
                            <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
                        </div>

                        {/* Requirements */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
                            <div className="flex flex-wrap gap-2">
                                {job.requirements?.map((req, i) => (
                                    <span
                                        key={i}
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${userData?.skills?.some(s =>
                                            skillMatchesRequirement(s, req)
                                        )
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {req}
                                    </span>
                                ))}
                            </div>
                            {currentUser && userData?.skills && (
                                <p className="text-sm text-gray-500 mt-4">
                                    <span className="inline-block w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                                    Skills highlighted in green match your profile
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* AI Match Analysis - Premium */}
                        {isJobseeker() && (
                            <div className="card overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 p-0">
                                {/* Header */}
                                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm">AI Match Analysis</h3>
                                            <p className="text-[10px] text-gray-400">Powered by AI</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 pb-5">
                                    {!matchData && !calculatingMatch ? (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-gray-500 mb-3">See how well your profile matches this job</p>
                                            <button
                                                onClick={calculateMatch}
                                                disabled={!job || !userData}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                Analyze Match
                                            </button>
                                        </div>
                                    ) : calculatingMatch ? (

                                        <div className="space-y-4 animate-pulse py-2">
                                            <div className="flex justify-center">
                                                <div className="w-20 h-20 bg-gray-200 rounded-full" />
                                            </div>
                                            <div className="h-3 bg-gray-200 rounded w-full" />
                                            <div className="h-3 bg-gray-200 rounded w-5/6" />
                                            <div className="space-y-2">
                                                <div className="h-2 bg-gray-200 rounded w-full" />
                                                <div className="h-2 bg-gray-200 rounded w-4/5" />
                                                <div className="h-2 bg-gray-200 rounded w-3/5" />
                                            </div>
                                        </div>
                                    ) : matchData && !matchData.error ? (
                                        <div className="space-y-4">
                                            {/* Score Ring */}
                                            <div className="flex flex-col items-center py-2">
                                                <div className="relative w-24 h-24">
                                                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                                                        <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                                                        <circle
                                                            cx="50" cy="50" r="42" fill="none"
                                                            strokeWidth="8"
                                                            strokeLinecap="round"
                                                            strokeDasharray={`${matchData.matchScore * 2.64} 264`}
                                                            className={
                                                                matchData.matchScore >= 80 ? 'stroke-green-500' :
                                                                matchData.matchScore >= 60 ? 'stroke-blue-500' :
                                                                matchData.matchScore >= 40 ? 'stroke-yellow-500' :
                                                                'stroke-gray-400'
                                                            }
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-2xl font-black text-gray-900">{matchData.matchScore}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium -mt-0.5">/ 100</span>
                                                    </div>
                                                </div>
                                                <span className={`mt-2 text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                                                    matchData.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                                                    matchData.matchScore >= 60 ? 'bg-blue-100 text-blue-700' :
                                                    matchData.matchScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {matchData.matchLevel} Match
                                                </span>
                                            </div>

                                            {/* Explanation */}
                                            <p className="text-xs text-gray-600 leading-relaxed text-center">
                                                {matchData.explanation}
                                            </p>

                                            {/* Skill Breakdown Progress Bars */}
                                            {matchData.skillBreakdown?.length > 0 && (
                                                <div className="pt-3 border-t border-gray-100">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Skill Breakdown</p>
                                                    <div className="space-y-2.5">
                                                        {matchData.skillBreakdown.map((sb, i) => {
                                                            const Icon = sb.category.toLowerCase().includes('technical') ? Target :
                                                                         sb.category.toLowerCase().includes('experience') ? Briefcase :
                                                                         sb.category.toLowerCase().includes('education') ? BookOpen : TrendingUp
                                                            return (
                                                                <div key={i}>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Icon className="w-3 h-3 text-indigo-500" />
                                                                            <span className="text-[11px] font-semibold text-gray-700">{sb.category}</span>
                                                                        </div>
                                                                        <span className={`text-[11px] font-bold ${
                                                                            sb.score >= 70 ? 'text-green-600' :
                                                                            sb.score >= 40 ? 'text-yellow-600' :
                                                                            'text-red-500'
                                                                        }`}>{sb.score}%</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-700 ${
                                                                                sb.score >= 70 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                                                                sb.score >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                                                                'bg-gradient-to-r from-red-400 to-red-500'
                                                                            }`}
                                                                            style={{ width: `${sb.score}%` }}
                                                                        />
                                                                    </div>
                                                                    {sb.detail && (
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">{sb.detail}</p>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Matching Skills */}
                                            {matchData.matchingSkills?.length > 0 && (
                                                <div className="pt-3 border-t border-gray-100">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Strengths</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {matchData.matchingSkills.map((skill, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium border border-green-200">
                                                                <CheckCircle className="w-2.5 h-2.5" />
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Missing Skills */}
                                            {matchData.missingSkills?.length > 0 && (
                                                <div className="pt-3 border-t border-gray-100">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Skill Gaps</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {matchData.missingSkills.map((skill, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-medium border border-red-200">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Career Action Items */}
                                            {matchData.actionItems?.length > 0 && (
                                                <div className="pt-3 border-t border-gray-100">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Career Coach</p>
                                                    <div className="space-y-2">
                                                        {matchData.actionItems.map((item, i) => {
                                                            const typeIcon = item.type === 'course' ? BookOpen :
                                                                             item.type === 'certification' ? Award :
                                                                             item.type === 'portfolio' ? ArrowUpRight : Briefcase
                                                            const TypeIcon = typeIcon
                                                            return (
                                                                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${
                                                                    item.priority === 'high' ? 'bg-orange-50 border border-orange-100' :
                                                                    'bg-gray-50 border border-gray-100'
                                                                }`}>
                                                                    <TypeIcon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                                                                        item.priority === 'high' ? 'text-orange-500' : 'text-indigo-400'
                                                                    }`} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[11px] text-gray-700 leading-relaxed">{item.action}</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className="text-[9px] font-medium text-gray-400 uppercase">{item.type}</span>
                                                                            {item.priority === 'high' && (
                                                                                <span className="text-[9px] font-bold text-orange-600 uppercase">Priority</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
                                            <p className="text-xs text-red-500 font-medium mb-1">Gemini API quota exceeded</p>
                                            <p className="text-[10px] text-gray-400 mb-3">Create a new API key in a NEW Google Cloud project</p>
                                            <button
                                                onClick={calculateMatch}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Skill Gap Analysis */}
                        {currentUser && isJobseeker() && job?.requirements?.length > 0 && userData?.skills?.length > 0 && !hasApplied && (() => {
                            const { matched, missing } = getSkillGap()
                            return (
                                <div className="card">
                                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Skill Match</h3>
                                    <div className="space-y-2">
                                        {matched.map((skill, i) => (
                                            <div key={`m-${i}`} className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <span className="text-gray-700">{skill}</span>
                                            </div>
                                        ))}
                                        {missing.map((skill, i) => (
                                            <div key={`x-${i}`} className="flex items-center gap-2 text-sm">
                                                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                <span className="text-gray-500">{skill}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3">
                                        {matched.length} of {matched.length + missing.length} requirements matched
                                    </p>
                                </div>
                            )
                        })()}

                        {/* Apply Card */}
                        <div className="card">
                            {!currentUser ? (
                                <div className="text-center">
                                    <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-600 mb-4">Sign in to apply for this job</p>
                                    <Link to="/login" className="btn-primary w-full">Sign In</Link>
                                </div>
                            ) : !isJobseeker() ? (
                                <div className="text-center">
                                    <Info className="w-10 h-10 text-blue-300 mx-auto mb-3" />
                                    <p className="text-gray-600">Only jobseekers can apply for jobs</p>
                                </div>
                            ) : hasApplied ? (
                                <div className="text-center">
                                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                                    <p className="text-green-700 font-medium">You have already applied</p>
                                    <Link to="/my-applications" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
                                        View your applications
                                    </Link>
                                </div>
                            ) : job.status !== 'open' ? (
                                <div className="text-center">
                                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-600">This position is no longer accepting applications</p>
                                </div>
                            ) : showApplyForm ? (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4">Apply for this position</h3>

                                    {error && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                                            {error}
                                        </div>
                                    )}

                                    {needsJustification() && (
                                        <div className="mb-4">
                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                                                <p className="text-yellow-800 text-sm">
                                                    Your skills do not match all requirements. Please explain why you are suitable for this position.
                                                </p>
                                            </div>
                                            <label className="label">Justification</label>
                                            <textarea
                                                value={justification}
                                                onChange={(e) => setJustification(e.target.value)}
                                                className="input-field min-h-[100px]"
                                                placeholder="Explain your relevant experience or why you are a good fit..."
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Resume Section */}
                                    <div className="mb-4">
                                        {userData?.resume_url && useProfileResume ? (
                                            <div>
                                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                    <span className="text-sm text-green-700 flex-1">Using your saved resume</span>
                                                    <a
                                                        href={userData.resume_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-primary-600 hover:underline"
                                                    >
                                                        View
                                                    </a>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseProfileResume(false)}
                                                    className="text-sm text-primary-600 hover:text-primary-700 mt-2"
                                                >
                                                    Upload a different resume
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                {userData?.resume_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUseProfileResume(true)
                                                            setApplicationResumeUrl('')
                                                        }}
                                                        className="text-sm text-primary-600 hover:text-primary-700 mb-2"
                                                    >
                                                        Use saved resume instead
                                                    </button>
                                                )}
                                                <ResumeUpload
                                                    userId={currentUser.uid}
                                                    storagePath={`${currentUser.uid}/${id}.pdf`}
                                                    currentUrl={applicationResumeUrl}
                                                    onUploaded={(url) => setApplicationResumeUrl(url)}
                                                    onRemoved={() => setApplicationResumeUrl('')}
                                                    label={userData?.resume_url ? 'Upload different resume' : 'Resume'}
                                                    optional={true}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowApplyForm(false)
                                                setApplicationResumeUrl('')
                                                setUseProfileResume(true)
                                            }}
                                            className="btn-secondary flex-1"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setError('')
                                                if (!isVerified()) {
                                                    setError('Your account must be verified to apply for jobs.')
                                                    return
                                                }
                                                if (job?.filter_mode === 'strict' && !checkSkillMatch()) {
                                                    setError('Your skills do not match the requirements for this position.')
                                                    return
                                                }
                                                if (needsJustification() && !justification.trim()) {
                                                    setError('Please provide a justification for applying without matching skills.')
                                                    return
                                                }
                                                setShowConfirmModal(true)
                                            }}
                                            disabled={applying}
                                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                                        >
                                            <Send className="w-4 h-4" />
                                            Review & Submit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {!isVerified() && (
                                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm mb-4">
                                            Your account must be verified to apply
                                        </div>
                                    )}
                                    {job.filter_mode === 'strict' && !checkSkillMatch() && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                                            Your skills do not match the requirements
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowApplyForm(true)}
                                        disabled={!isVerified() || (job.filter_mode === 'strict' && !checkSkillMatch())}
                                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-5 h-5" />
                                        Apply Now
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Message Employer */}
                        {currentUser && isJobseeker() && isVerified() && job?.employer_id && (
                            <div className="card">
                                <Link
                                    to={`/messages?startWith=${job.employer_id}&jobId=${id}&jobTitle=${encodeURIComponent(job.title)}`}
                                    className="btn-secondary w-full flex items-center justify-center gap-2"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    Message Employer
                                </Link>
                            </div>
                        )}

                        {/* Your Skills */}
                        {currentUser && userData?.skills && userData.skills.length > 0 && (
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-3">Your Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {userData.skills.map((skill, i) => (
                                        <span key={i} className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Application</h3>

                            <div className="space-y-3 mb-6">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Position</p>
                                    <p className="font-medium text-gray-900">{job.title}</p>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Applicant</p>
                                    <p className="font-medium text-gray-900">{userData?.full_name || userData?.name}</p>
                                    <p className="text-sm text-gray-600">{userData?.email}</p>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">Resume</p>
                                    <p className="font-medium text-gray-900">
                                        {useProfileResume && userData?.resume_url
                                            ? 'Profile resume'
                                            : applicationResumeUrl
                                                ? 'Uploaded resume'
                                                : 'No resume attached'}
                                    </p>
                                </div>

                                {userData?.skills?.length > 0 && (
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">Skills being shared</p>
                                        <div className="flex flex-wrap gap-1">
                                            {userData.skills.map((skill, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {justification && (
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Justification</p>
                                        <p className="text-sm text-gray-700">{justification}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={applying}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {applying ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Confirm & Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sticky Mobile Apply Button */}
                {currentUser && isJobseeker() && !hasApplied && job?.status === 'open' && !showApplyForm && !showConfirmModal && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden z-40">
                        <button
                            onClick={() => setShowApplyForm(true)}
                            disabled={!isVerified() || (job.filter_mode === 'strict' && !checkSkillMatch())}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                            Apply Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default JobDetail
