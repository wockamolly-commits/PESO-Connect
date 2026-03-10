import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import {
    User,
    Mail,
    Phone,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Briefcase,
    ChevronLeft,
    Loader2,
    MessageSquare,
    AlertTriangle,
    Download,
    ExternalLink
} from 'lucide-react'
import { ApplicationsSkeleton } from '../../components/LoadingSkeletons'

const JobApplicants = () => {
    const { jobId } = useParams()
    const [job, setJob] = useState(null)
    const [applicants, setApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all')

    useEffect(() => {
        fetchJobAndApplicants()
    }, [jobId])

    const fetchJobAndApplicants = async () => {
        try {
            const [{ data: jobData, error: jobError }, { data: appsData, error: appsError }] = await Promise.all([
                supabase.from('job_postings').select('*').eq('id', jobId).maybeSingle(),
                supabase.from('applications').select('*').eq('job_id', jobId).order('created_at', { ascending: false })
            ])
            if (jobError) throw jobError
            if (appsError) throw appsError
            if (jobData) setJob(jobData)
            setApplicants(appsData || [])
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (appId, newStatus) => {
        setActionLoading(appId)
        try {
            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', appId)
            if (error) throw error
            setApplicants(applicants.map(app =>
                app.id === appId ? { ...app, status: newStatus } : app
            ))
        } catch (error) {
            console.error('Error updating status:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filteredApplicants = filterStatus === 'all'
        ? applicants
        : applicants.filter(app => app.status === filterStatus)

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'shortlisted': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'hired': return 'bg-green-100 text-green-700 border-green-200'
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <ApplicationsSkeleton count={3} />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/my-listings" className="inline-flex items-center text-gray-500 hover:text-primary-600 mb-4 transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to My Listings
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1">
                                Applicants for {job?.title}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className={`px-2 py-0.5 rounded-full border ${job?.filter_mode === 'strict'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                    {job?.filter_mode === 'strict' ? 'Strict Match' : 'Flexible Match'}
                                </span>
                                <span>•</span>
                                <span>{applicants.length} Total Applications</span>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {['all', 'pending', 'shortlisted', 'hired', 'rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${filterStatus === status
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Applicants List */}
                {filteredApplicants.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No applicants found</h3>
                        <p className="text-gray-500">
                            {filterStatus === 'all'
                                ? "You haven't received any applications for this job yet."
                                : `No applicants with status "${filterStatus}".`
                            }
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {filteredApplicants.map((app) => (
                            <div key={app.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                            <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center text-primary-700 text-2xl font-bold">
                                                {app.applicant_name?.charAt(0).toUpperCase()}
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                                                <div>
                                                    <Link to={`/profile/${app.user_id}`} className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
                                                        {app.applicant_name}
                                                    </Link>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-4 h-4" />
                                                            {app.applicant_email}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            Applied {formatDate(app.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-2 mt-4 md:mt-0">
                                                    <button
                                                        onClick={() => updateStatus(app.id, 'shortlisted')}
                                                        disabled={actionLoading === app.id || app.status === 'shortlisted'}
                                                        className={`p-2 rounded-lg border transition-colors ${app.status === 'shortlisted' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-gray-500'}`}
                                                        title="Shortlist"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(app.id, 'rejected')}
                                                        disabled={actionLoading === app.id || app.status === 'rejected'}
                                                        className={`p-2 rounded-lg border transition-colors ${app.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-500'}`}
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(app.id, 'hired')}
                                                        disabled={actionLoading === app.id || app.status === 'hired'}
                                                        className={`p-2 rounded-lg border transition-colors ${app.status === 'hired' ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 text-gray-500'}`}
                                                        title="Hire"
                                                    >
                                                        <Briefcase className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Justification Text (if flexible mode) */}
                                            {app.justification_text && (
                                                <div className="mb-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                                                    <div className="flex items-center gap-2 text-orange-800 font-semibold mb-2">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        Skill Gap Justification
                                                    </div>
                                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{app.justification_text}</p>
                                                </div>
                                            )}

                                            {/* Resume Link */}
                                            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                                                {app.resume_url ? (
                                                    <a
                                                        href={app.resume_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium text-sm"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        View Resume
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-sm flex items-center gap-2">
                                                        <FileText className="w-4 h-4" />
                                                        No resume uploaded
                                                    </span>
                                                )}

                                                <Link
                                                    to={`/messages?startWith=${app.user_id}&jobId=${jobId}&jobTitle=${encodeURIComponent(job?.title)}`}
                                                    className="flex items-center gap-2 text-gray-500 hover:text-primary-600 font-medium text-sm ml-auto"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    Message Applicant
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`h-1 w-full ${app.status === 'pending' ? 'bg-yellow-400' :
                                    app.status === 'shortlisted' ? 'bg-blue-500' :
                                        app.status === 'hired' ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default JobApplicants
