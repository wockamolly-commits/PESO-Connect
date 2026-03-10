import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Briefcase,
    ArrowRight,
    Star
} from 'lucide-react'
import { ApplicationsSkeleton, StatCardSkeleton } from '../components/LoadingSkeletons'

const MyApplications = () => {
    const { currentUser } = useAuth()
    const [applications, setApplications] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchApplications()
    }, [currentUser])

    const fetchApplications = async () => {
        if (!currentUser) return

        try {
            const { data, error } = await supabase
                .from('applications')
                .select('*')
                .eq('user_id', currentUser.uid)
                .order('created_at', { ascending: false })
            if (error) throw error
            setApplications(data || [])
        } catch (error) {
            console.error('Error fetching applications:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-500" />
            case 'shortlisted':
                return <Star className="w-5 h-5 text-blue-500" />
            case 'hired':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'rejected':
                return <XCircle className="w-5 h-5 text-red-500" />
            default:
                return <Clock className="w-5 h-5 text-gray-400" />
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            shortlisted: 'badge-info',
            hired: 'badge-success',
            rejected: 'badge-error'
        }
        return badges[status] || 'badge-warning'
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        hired: applications.filter(a => a.status === 'hired').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
                    <p className="text-gray-600">Track the status of your job applications</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        <p className="text-sm text-gray-600">Total Applied</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        <p className="text-sm text-gray-600">Pending</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.shortlisted}</p>
                        <p className="text-sm text-gray-600">Shortlisted</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
                        <p className="text-sm text-gray-600">Hired</p>
                    </div>
                </div>

                {/* Applications List */}
                {loading ? (
                    <ApplicationsSkeleton count={3} />
                ) : applications.length === 0 ? (
                    <div className="card text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">You have not applied to any jobs yet</p>
                        <Link to="/jobs" className="btn-primary inline-flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Browse Jobs
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app) => (
                            <div key={app.id} className="card card-hover">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                                            {app.job_title?.charAt(0).toUpperCase() || 'J'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{app.job_title}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    Applied {formatDate(app.created_at)}
                                                </span>
                                            </div>
                                            {app.justification_text && (
                                                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Your justification:</p>
                                                    <p className="text-sm text-gray-700">{app.justification_text}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(app.status)}
                                            <span className={`badge ${getStatusBadge(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <Link
                                            to={`/jobs/${app.job_id}`}
                                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MyApplications
