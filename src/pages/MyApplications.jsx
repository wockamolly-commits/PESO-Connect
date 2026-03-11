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
    Star,
    Ban
} from 'lucide-react'
import { ApplicationsSkeleton, StatCardSkeleton } from '../components/LoadingSkeletons'

const MyApplications = () => {
    const { currentUser } = useAuth()
    const [applications, setApplications] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('all')
    const [withdrawingId, setWithdrawingId] = useState(null)
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(null)

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

    const handleWithdraw = async (appId) => {
        setWithdrawingId(appId)
        try {
            const { error } = await supabase
                .from('applications')
                .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
                .eq('id', appId)
            if (error) throw error
            setApplications(applications.map(app =>
                app.id === appId ? { ...app, status: 'withdrawn' } : app
            ))
        } catch (error) {
            console.error('Error withdrawing application:', error)
        } finally {
            setWithdrawingId(null)
            setShowWithdrawConfirm(null)
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
            case 'withdrawn':
                return <Ban className="w-5 h-5 text-gray-400" />
            default:
                return <Clock className="w-5 h-5 text-gray-400" />
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            shortlisted: 'badge-info',
            hired: 'badge-success',
            rejected: 'badge-error',
            withdrawn: 'bg-gray-100 text-gray-600 border border-gray-200'
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

    const filteredApplications = filterStatus === 'all'
        ? applications
        : applications.filter(app => app.status === filterStatus)

    const filterTabs = ['all', 'pending', 'shortlisted', 'hired', 'rejected', 'withdrawn']

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

                {/* Filter Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto" role="tablist" aria-label="Filter applications by status">
                    {filterTabs.map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            role="tab"
                            aria-selected={filterStatus === status}
                            aria-current={filterStatus === status ? 'true' : undefined}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize whitespace-nowrap ${
                                filterStatus === status
                                    ? 'bg-white text-primary-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {status}
                            {status !== 'all' && (
                                <span className="ml-1.5 text-xs">
                                    ({applications.filter(a => a.status === status).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Applications List */}
                {loading ? (
                    <ApplicationsSkeleton count={3} />
                ) : filteredApplications.length === 0 ? (
                    <div className="card text-center py-12">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">
                            {filterStatus === 'all'
                                ? 'You have not applied to any jobs yet'
                                : `No ${filterStatus} applications`}
                        </p>
                        {filterStatus === 'all' && (
                            <Link to="/jobs" className="btn-primary inline-flex items-center gap-2">
                                <Briefcase className="w-5 h-5" />
                                Browse Jobs
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredApplications.map((app) => (
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

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(app.status)}
                                            <span className={`badge ${getStatusBadge(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </div>

                                        {/* Withdraw Button */}
                                        {app.status === 'pending' && (
                                            showWithdrawConfirm === app.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleWithdraw(app.id)}
                                                        disabled={withdrawingId === app.id}
                                                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                                                    >
                                                        {withdrawingId === app.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={() => setShowWithdrawConfirm(null)}
                                                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowWithdrawConfirm(app.id)}
                                                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                                >
                                                    Withdraw
                                                </button>
                                            )
                                        )}

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
