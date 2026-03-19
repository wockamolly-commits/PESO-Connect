import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    Bookmark,
    Briefcase,
    MapPin,
    Clock,
    Loader2,
    Trash2
} from 'lucide-react'

const SavedJobs = () => {
    const { currentUser } = useAuth()
    const [savedJobs, setSavedJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [removingId, setRemovingId] = useState(null)

    useEffect(() => {
        if (currentUser) fetchSavedJobs()
    }, [currentUser])

    const fetchSavedJobs = async () => {
        try {
            const { data, error } = await supabase
                .from('saved_jobs')
                .select('*, job_postings(*)')
                .eq('user_id', currentUser.uid)
                .order('created_at', { ascending: false })
            if (error) throw error
            setSavedJobs(data || [])
        } catch (error) {
            console.error('Error fetching saved jobs:', error)
        } finally {
            setLoading(false)
        }
    }

    const removeSavedJob = async (savedJobId) => {
        setRemovingId(savedJobId)
        try {
            const { error } = await supabase
                .from('saved_jobs')
                .delete()
                .eq('id', savedJobId)
            if (error) throw error
            setSavedJobs(prev => prev.filter(s => s.id !== savedJobId))
        } catch (error) {
            console.error('Error removing saved job:', error)
        } finally {
            setRemovingId(null)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        })
    }

    const formatSalary = (min, max) => {
        if (!min && !max) return 'Negotiable'
        return `₱${Number(min).toLocaleString()} - ₱${Number(max).toLocaleString()}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Jobs</h1>
                    <p className="text-gray-600">Jobs you've bookmarked for later</p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card animate-pulse">
                                <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
                                <div className="h-4 w-32 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>
                ) : savedJobs.length === 0 ? (
                    <div className="card text-center py-12">
                        <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">You haven't saved any jobs yet</p>
                        <Link to="/jobs" className="btn-primary inline-flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Browse Jobs
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {savedJobs.map((saved) => {
                            const job = saved.job_postings
                            if (!job) return null
                            return (
                                <div key={saved.id} className="card card-hover">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <Link to={`/jobs/${job.id}`} className="flex-1 flex items-start gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg flex-shrink-0">
                                                {job.title?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                                                    {job.title}
                                                </h3>
                                                <p className="text-sm text-gray-600">{job.employer_name}</p>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        {job.location}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="w-3.5 h-3.5" />
                                                        <span className="capitalize">{job.type?.replace('-', ' ')}</span>
                                                    </span>
                                                    <span>₱ {formatSalary(job.salary_min, job.salary_max)}</span>
                                                </div>
                                            </div>
                                        </Link>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {job.status !== 'open' && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    Closed
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-400">
                                                Saved {formatDate(saved.created_at)}
                                            </span>
                                            <button
                                                onClick={() => removeSavedJob(saved.id)}
                                                disabled={removingId === saved.id}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove from saved"
                                            >
                                                {removingId === saved.id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <Trash2 className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SavedJobs
