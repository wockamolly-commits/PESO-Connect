import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
    Briefcase,
    Plus,
    Edit,
    Trash2,
    Eye,
    Users,
    Clock,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Calendar,
    Save,
    X,
    MessageSquare
} from 'lucide-react'
import { JobListingSkeleton } from '../../components/LoadingSkeletons'

const MyListings = () => {
    const { currentUser } = useAuth()
    const [jobs, setJobs] = useState([])
    const [applications, setApplications] = useState({})
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)

    // Edit states
    const [editingDeadline, setEditingDeadline] = useState(null)
    const [newDeadline, setNewDeadline] = useState('')

    useEffect(() => {
        fetchMyJobs()
    }, [currentUser])

    const fetchMyJobs = async () => {
        if (!currentUser) return

        try {
            const { data: jobsData, error: jobsError } = await supabase
                .from('job_postings')
                .select('*')
                .eq('employer_id', currentUser.uid)
                .order('created_at', { ascending: false })
            if (jobsError) throw jobsError

            setJobs(jobsData || [])

            const jobIds = (jobsData || []).map(j => j.id)
            const appsData = {}
            if (jobIds.length > 0) {
                const { data: appsRows, error: appsError } = await supabase
                    .from('applications')
                    .select('*')
                    .in('job_id', jobIds)
                if (appsError) console.error('Error fetching applications:', appsError)
                if (appsRows) {
                    appsRows.forEach(app => {
                        if (!appsData[app.job_id]) appsData[app.job_id] = []
                        appsData[app.job_id].push(app)
                    })
                }
            }
            setApplications(appsData)
        } catch (error) {
            console.error('Error fetching jobs:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateJobStatus = async (jobId, newStatus) => {
        setActionLoading(jobId)
        try {
            const { error } = await supabase
                .from('job_postings')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', jobId)
            if (error) throw error
            setJobs(jobs.map(job =>
                job.id === jobId ? { ...job, status: newStatus } : job
            ))
        } catch (error) {
            console.error('Error updating job status:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const startEditingDeadline = (job) => {
        setEditingDeadline(job.id)
        setNewDeadline(job.deadline || '')
    }

    const saveDeadline = async (jobId) => {
        setActionLoading(jobId)
        try {
            const { error } = await supabase
                .from('job_postings')
                .update({ deadline: newDeadline, updated_at: new Date().toISOString() })
                .eq('id', jobId)
            if (error) throw error
            setJobs(jobs.map(job =>
                job.id === jobId ? { ...job, deadline: newDeadline } : job
            ))
            setEditingDeadline(null)
        } catch (error) {
            console.error('Error updating deadline:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const deleteJob = async (jobId) => {
        if (!confirm('Are you sure you want to delete this job listing? This cannot be undone.')) return

        setActionLoading(jobId)
        try {
            const { error } = await supabase
                .from('job_postings')
                .delete()
                .eq('id', jobId)
            if (error) throw error
            setJobs(jobs.filter(job => job.id !== jobId))
        } catch (error) {
            console.error('Error deleting job:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const formatDate = (dateString, isDeadline = false) => {
        if (!dateString) return isDeadline ? 'No deadline' : 'N/A'
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-700 border-green-200'
            case 'filled': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Job Listings</h1>
                        <p className="text-gray-600">Manage your job postings, track applications, and hire candidates.</p>
                    </div>
                    <Link to="/post-job" className="btn-primary flex items-center gap-2 mt-4 md:mt-0 shadow-lg shadow-primary-500/30">
                        <Plus className="w-5 h-5" />
                        Post New Job
                    </Link>
                </div>

                {/* Job Cards */}
                {loading ? (
                    <JobListingSkeleton count={3} />
                ) : jobs.length === 0 ? (
                    <div className="card text-center py-12 border-2 border-dashed border-gray-200">
                        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">You have not posted any jobs yet</p>
                        <Link to="/post-job" className="btn-primary inline-flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Post Your First Job
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {jobs.map((job) => (
                            <div key={job.id} className="card hover:shadow-lg transition-shadow duration-300">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Left: Job Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary-500/20 flex-shrink-0">
                                                {job.title?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>

                                                    {/* Status Dropdown */}
                                                    <div className="relative inline-block">
                                                        <select
                                                            value={job.status}
                                                            onChange={(e) => updateJobStatus(job.id, e.target.value)}
                                                            disabled={actionLoading === job.id}
                                                            className={`appearance-none pl-3 pr-8 py-1 rounded-full text-sm font-semibold border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 capitalize ${getStatusColor(job.status)}`}
                                                        >
                                                            <option value="open">Open</option>
                                                            <option value="filled">Filled</option>
                                                            <option value="closed">Closed</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
                                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                        </div>
                                                    </div>

                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${job.filter_mode === 'strict'
                                                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                            : 'bg-orange-100 text-orange-700 border-orange-200'
                                                        }`}>
                                                        {job.filter_mode === 'strict' ? 'Strict Match' : 'Flexible Match'}
                                                    </span>
                                                </div>

                                                <div className="text-sm text-gray-500 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        <span>Posted {formatDate(job.created_at)}</span>
                                                    </div>

                                                    {/* Inline Deadline Editor */}
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        {editingDeadline === job.id ? (
                                                            <div className="flex items-center gap-2 animate-fade-in">
                                                                <input
                                                                    type="date"
                                                                    value={newDeadline}
                                                                    onChange={(e) => setNewDeadline(e.target.value)}
                                                                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => saveDeadline(job.id)}
                                                                    disabled={actionLoading === job.id}
                                                                    className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingDeadline(null)}
                                                                    className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 group">
                                                                <span className={!job.deadline ? 'text-gray-400 italic' : ''}>
                                                                    Deadline: {formatDate(job.deadline, true)}
                                                                </span>
                                                                <button
                                                                    onClick={() => startEditingDeadline(job)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-opacity"
                                                                    title="Edit deadline"
                                                                >
                                                                    <Edit className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions & Stats */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">

                                        {/* Application Stats */}
                                        <div className="flex items-center gap-4 text-center">
                                            <div className="px-4">
                                                <p className="text-2xl font-bold text-gray-900">{applications[job.id]?.length || 0}</p>
                                                <p className="text-xs text-gray-500 uppercase font-semibold">Applicants</p>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200"></div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-2">
                                            <Link
                                                to={`/employer/jobs/${job.id}/applicants`}
                                                className="btn-secondary text-sm py-2"
                                            >
                                                <Users className="w-4 h-4 mr-2" />
                                                View Applicants
                                            </Link>
                                            <Link
                                                to={`/edit-job/${job.id}`}
                                                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                                title="Edit Posting"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </Link>
                                            <Link
                                                to={`/jobs/${job.id}`}
                                                className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                                                title="View Public Posting"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => deleteJob(job.id)}
                                                disabled={actionLoading === job.id}
                                                className="p-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                title="Delete Posting"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Applicant Preview */}
                                {applications[job.id] && applications[job.id].length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold text-gray-700">Recent Applications</p>
                                            <Link to={`/employer/jobs/${job.id}/applicants`} className="text-sm text-primary-600 hover:underline">
                                                View All →
                                            </Link>
                                        </div>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {applications[job.id].slice(0, 3).map((app) => (
                                                <div key={app.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs">
                                                            {app.applicant_name?.charAt(0).toUpperCase() || 'A'}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-medium text-gray-900 truncate w-32">{app.applicant_name}</p>
                                                            <p className="text-xs text-gray-500 truncate">{app.applicant_email}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`shrink-0 w-2 h-2 rounded-full ${app.status === 'pending' ? 'bg-yellow-400' :
                                                            app.status === 'shortlisted' ? 'bg-blue-400' :
                                                                app.status === 'hired' ? 'bg-green-400' : 'bg-red-400'
                                                        }`} title={app.status}></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MyListings
