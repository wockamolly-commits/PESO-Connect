import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../config/supabase'
import {
    Search,
    MapPin,
    Briefcase,
    Clock,
    Sparkles,
    AlertCircle,
    Bookmark
} from 'lucide-react'
import { JobListingSkeleton } from '../components/LoadingSkeletons'
import Select from '../components/common/Select'
import { useAuth } from '../contexts/AuthContext'
import { calculateDeterministicScore } from '../services/geminiService'
import { getJobMatchesForUser } from '../services/matchingService'
import { calculateCompletion } from '../utils/profileCompletion'

const JobListings = () => {
    const { currentUser, userData, isJobseeker } = useAuth()
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const [matchScores, setMatchScores] = useState({})
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [sortByMatch, setSortByMatch] = useState(false)
    const [appliedJobIds, setAppliedJobIds] = useState(new Set())
    const [locationFilter, setLocationFilter] = useState('')
    const [salaryMin, setSalaryMin] = useState('')
    const [salaryMax, setSalaryMax] = useState('')
    const [savedJobIds, setSavedJobIds] = useState(new Set())
    const [loadingMatchScores, setLoadingMatchScores] = useState(false)
    const PAGE_SIZE = 20

    // Calculate profile completeness for jobseekers (shared utility)
    const profileCompleteness = (() => {
        if (!currentUser || !isJobseeker() || !userData) return 100
        return calculateCompletion(userData).percentage
    })()

    const categories = [
        'Agriculture',
        'Energy & Utilities',
        'Retail & Service',
        'Information Technology',
        'Skilled Trades',
        'Hospitality'
    ]

    const jobTypes = ['full-time', 'part-time', 'contract', 'temporary']

    useEffect(() => {
        fetchJobs()
    }, [])

    // Fetch user's applied job IDs
    useEffect(() => {
        if (!currentUser) return
        const fetchAppliedJobs = async () => {
            const { data } = await supabase
                .from('applications')
                .select('job_id')
                .eq('user_id', currentUser.uid)
                .neq('status', 'withdrawn')
            if (data) setAppliedJobIds(new Set(data.map(a => a.job_id)))
        }
        fetchAppliedJobs()
    }, [currentUser])

    // Fetch user's saved job IDs
    useEffect(() => {
        if (!currentUser || !isJobseeker()) return
        const fetchSavedJobs = async () => {
            const { data } = await supabase
                .from('saved_jobs')
                .select('job_id')
                .eq('user_id', currentUser.uid)
            if (data) setSavedJobIds(new Set(data.map(s => s.job_id)))
        }
        fetchSavedJobs()
    }, [currentUser])

    const toggleSaveJob = async (e, jobId) => {
        e.preventDefault()
        e.stopPropagation()
        if (!currentUser) return
        if (savedJobIds.has(jobId)) {
            setSavedJobIds(prev => { const next = new Set(prev); next.delete(jobId); return next })
            await supabase.from('saved_jobs').delete().eq('user_id', currentUser.uid).eq('job_id', jobId)
        } else {
            setSavedJobIds(prev => new Set(prev).add(jobId))
            await supabase.from('saved_jobs').insert({ user_id: currentUser.uid, job_id: jobId })
        }
    }

    const fetchJobs = async (loadMore = false) => {
        try {
            const from = loadMore ? jobs.length : 0
            const to = from + PAGE_SIZE - 1
            const today = new Date().toISOString().split('T')[0]
            const { data: jobsData, error } = await supabase
                .from('job_postings')
                .select('*')
                .eq('status', 'open')
                .or(`deadline.is.null,deadline.gte.${today}`)
                .order('created_at', { ascending: false })
                .range(from, to)
            if (error) throw error
            const newJobs = jobsData || []
            setJobs(prev => loadMore ? [...prev, ...newJobs] : newJobs)
            setHasMore(newJobs.length === PAGE_SIZE)
        } catch (error) {
            console.error('Error fetching jobs:', error)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => {
        setLoadingMore(true)
        fetchJobs(true)
    }

    // Use backend hybrid matching when available, with deterministic fallback.
    useEffect(() => {
        if (!jobs.length || !currentUser || !isJobseeker() || ![...(userData?.predefined_skills || []), ...(userData?.skills || [])].length) {
            return
        }

        let isCancelled = false

        const fallbackScores = {}
        for (const job of jobs) {
            fallbackScores[job.id] = calculateDeterministicScore(job, userData)
        }
        setLoadingMatchScores(true)

        const loadHybridScores = async () => {
            try {
                const { results } = await getJobMatchesForUser({
                    userId: currentUser.uid,
                    filters: {
                        category: categoryFilter || undefined,
                        location: locationFilter || undefined,
                        type: typeFilter || undefined,
                        salaryMin: salaryMin || undefined,
                        salaryMax: salaryMax || undefined,
                    },
                    limit: Math.max(jobs.length, 20),
                })

                if (isCancelled) return

                const hybridById = {}
                for (const result of results) {
                    if (!result?.jobId) continue
                    hybridById[result.jobId] = result.normalized || result
                }

                const mergedScores = {}
                for (const job of jobs) {
                    mergedScores[job.id] = hybridById[job.id] || fallbackScores[job.id]
                }

                setMatchScores(mergedScores)
                setLoadingMatchScores(false)
            } catch (hybridError) {
                console.warn('Hybrid job match fetch failed, using deterministic fallback:', hybridError.message)
                if (!isCancelled) {
                    setMatchScores(fallbackScores)
                    setLoadingMatchScores(false)
                }
            }
        }

        loadHybridScores()

        return () => {
            isCancelled = true
        }
    }, [jobs, currentUser, userData, categoryFilter, typeFilter, locationFilter, salaryMin, salaryMax, isJobseeker])

    const locations = [...new Set(jobs.map(j => j.location).filter(Boolean))].sort()

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = !categoryFilter || job.category === categoryFilter
        const matchesType = !typeFilter || job.type === typeFilter
        const matchesLocation = !locationFilter || job.location === locationFilter
        const minVal = salaryMin ? Number(salaryMin) : null
        const maxVal = salaryMax ? Number(salaryMax) : null
        const matchesSalary =
            (!minVal || (job.salary_max && job.salary_max >= minVal)) &&
            (!maxVal || (job.salary_min && job.salary_min <= maxVal))
        return matchesSearch && matchesCategory && matchesType && matchesLocation && matchesSalary
    }).sort((a, b) => {
        if (!sortByMatch) return 0
        const scoreA = matchScores[a.id]?.matchScore || 0
        const scoreB = matchScores[b.id]?.matchScore || 0
        return scoreB - scoreA
    })

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Negotiable'
        return `₱${Number(min).toLocaleString()} - ₱${Number(max).toLocaleString()}`
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Job Listings</h1>
                    <p className="text-gray-600">Find your perfect job opportunity in San Carlos City</p>
                </div>

                {/* Search & Filters */}
                <div className="card mb-8 relative z-10">
                    <div className="grid md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search jobs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-12 w-full"
                                aria-label="Search jobs by title or description"
                            />
                        </div>

                        {/* Category Filter */}
                        <Select
                            options={[{ value: '', label: 'All Categories' }, ...categories.map(cat => ({ value: cat, label: cat }))]}
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            placeholder="All Categories"
                            aria-label="Filter by job category"
                        />

                        {/* Type Filter */}
                        <Select
                            options={[{ value: '', label: 'All Types' }, ...jobTypes.map(type => ({ value: type, label: type.replace('-', ' ') }))]}
                            value={typeFilter}
                            onChange={setTypeFilter}
                            placeholder="All Types"
                            aria-label="Filter by job type"
                        />
                    </div>

                    {/* Second row: Location + Salary */}
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <Select
                            options={[{ value: '', label: 'All Locations' }, ...locations.map(loc => ({ value: loc, label: loc }))]}
                            value={locationFilter}
                            onChange={setLocationFilter}
                            placeholder="All Locations"
                            aria-label="Filter by location"
                        />
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱ Min</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={salaryMin}
                                onChange={(e) => setSalaryMin(e.target.value)}
                                className="input-field pl-16 w-full"
                                aria-label="Minimum salary"
                                min="0"
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₱ Max</span>
                            <input
                                type="number"
                                placeholder="0"
                                value={salaryMax}
                                onChange={(e) => setSalaryMax(e.target.value)}
                                className="input-field pl-16 w-full"
                                aria-label="Maximum salary"
                                min="0"
                            />
                        </div>
                    </div>
                </div>

                {/* Results Count & Sort */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{filteredJobs.length}</span>{hasMore ? '+' : ''} jobs
                    </p>
                    {currentUser && isJobseeker() && [...(userData?.predefined_skills || []), ...(userData?.skills || [])].length > 0 && !loadingMatchScores && Object.keys(matchScores).length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSortByMatch(!sortByMatch)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    sortByMatch
                                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                                }`}
                                aria-label={sortByMatch ? 'Disable sort by match score' : 'Sort jobs by match score'}
                                aria-pressed={sortByMatch}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {sortByMatch ? 'Sorted by Match' : 'Sort by Match'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Completeness Nudge */}
                {currentUser && isJobseeker() && profileCompleteness < 80 && (
                    <Link
                        to="/profile/edit"
                        className="flex items-center gap-3 p-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800">
                                Your profile is {profileCompleteness}% complete
                            </p>
                            <p className="text-xs text-amber-600">
                                Complete your profile to improve your match scores and stand out to employers.
                            </p>
                        </div>
                        <div className="w-16 h-2 bg-amber-200 rounded-full overflow-hidden flex-shrink-0">
                            <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${profileCompleteness}%` }}
                            />
                        </div>
                    </Link>
                )}

                {/* Recommended Jobs */}
                {currentUser && isJobseeker() && !loadingMatchScores && Object.keys(matchScores).length > 0 && !searchTerm && !categoryFilter && !typeFilter && !locationFilter && !salaryMin && !salaryMax && (() => {
                    const recommended = jobs
                        .filter(j => matchScores[j.id]?.matchScore >= 30 && !appliedJobIds.has(j.id))
                        .sort((a, b) => (matchScores[b.id]?.matchScore || 0) - (matchScores[a.id]?.matchScore || 0))
                        .slice(0, 5)
                    if (recommended.length === 0) return null
                    return (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary-500" />
                                Recommended for You
                            </h2>
                            <div className="grid gap-3">
                                {recommended.map(job => (
                                    <Link
                                        key={`rec-${job.id}`}
                                        to={`/jobs/${job.id}`}
                                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50 to-white border border-primary-100 rounded-xl hover:shadow-md transition-shadow"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {job.title?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                                            <p className="text-sm text-gray-500 truncate">{job.employer_name} · {job.location}</p>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${
                                            matchScores[job.id].matchScore >= 80
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : matchScores[job.id].matchScore >= 60
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {matchScores[job.id].matchScore}% Match
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )
                })()}

                {/* Job Cards */}
                {loading ? (
                    <JobListingSkeleton count={4} />
                ) : filteredJobs.length === 0 ? (
                    <div className="card text-center py-12">
                        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No jobs found matching your criteria</p>
                    </div>
                ) : (
                    <div className="grid gap-4" role="list" aria-label="Job listings">
                        {filteredJobs.map((job) => (
                            <Link
                                key={job.id}
                                to={`/jobs/${job.id}`}
                                className="card card-hover block"
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-500/20 flex-shrink-0">
                                        {job.title?.charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.filter_mode === 'strict'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {job.filter_mode === 'strict' ? 'Strict' : 'Flexible'}
                                            </span>
                                            {appliedJobIds.has(job.id) && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                    Applied
                                                </span>
                                            )}
                                            {job.deadline && new Date(job.deadline) < new Date(new Date().toDateString()) && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                    Deadline Passed
                                                </span>
                                            )}

                                            {/* Match Badge */}
                                            {isJobseeker() && matchScores[job.id] && (
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ml-auto md:ml-0 ${matchScores[job.id].matchScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                                                        matchScores[job.id].matchScore >= 60 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            matchScores[job.id].matchScore >= 40 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`} title={`Skills: ${matchScores[job.id].matchingSkills.join(', ') || 'None'}`}>
                                                    <Sparkles className="w-3 h-3" />
                                                    {matchScores[job.id].matchScore}% Match
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {job.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-4 h-4" />
                                                <span className="capitalize">{job.type?.replace('-', ' ')}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="w-4 h-4 flex items-center justify-center text-sm font-bold">₱</span>
                                                {formatSalary(job.salary_min, job.salary_max)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {formatDate(job.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="badge badge-info capitalize">{job.category}</span>
                                        {currentUser && isJobseeker() && (
                                            <button
                                                onClick={(e) => toggleSaveJob(e, job.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${
                                                    savedJobIds.has(job.id)
                                                        ? 'text-primary-600 bg-primary-50'
                                                        : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                                                }`}
                                                title={savedJobIds.has(job.id) ? 'Remove from saved' : 'Save job'}
                                            >
                                                <Bookmark className={`w-4 h-4 ${savedJobIds.has(job.id) ? 'fill-current' : ''}`} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Load More */}
                {!loading && hasMore && filteredJobs.length > 0 && (
                    <div className="text-center mt-6">
                        <button
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="btn-secondary px-8 py-2.5"
                        >
                            {loadingMore ? 'Loading...' : 'Load More Jobs'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default JobListings
