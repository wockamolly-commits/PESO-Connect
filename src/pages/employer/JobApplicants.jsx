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
    ExternalLink,
    StickyNote,
    Save,
    CheckSquare,
    Square
} from 'lucide-react'
import { ApplicationsSkeleton } from '../../components/LoadingSkeletons'
import { useAuth } from '../../contexts/AuthContext'
import { insertNotification } from '../../services/notificationService'
import { sendApplicationStatusEmail } from '../../services/emailService'

const JobApplicants = () => {
    const { jobId } = useParams()
    const { currentUser } = useAuth()
    const [job, setJob] = useState(null)
    const [applicants, setApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [editingNotes, setEditingNotes] = useState({})
    const [savingNotes, setSavingNotes] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [bulkLoading, setBulkLoading] = useState(false)

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

    const NOTIFICATION_CONFIG = {
        shortlisted: {
            title: (jobTitle) => `You've been shortlisted for ${jobTitle}`,
            message: (employerName, jobTitle) =>
                `${employerName} has shortlisted your application for ${jobTitle}. Log in to view details.`,
        },
        hired: {
            title: (jobTitle) => `Congratulations! You've been hired for ${jobTitle}`,
            message: (employerName, jobTitle) =>
                `${employerName} has accepted your application for ${jobTitle}!`,
        },
        rejected: {
            title: (jobTitle) => `Update on your application for ${jobTitle}`,
            message: (employerName, jobTitle) =>
                `Unfortunately, your application for ${jobTitle} was not selected at this time. Keep applying!`,
        },
    }

    const sendStatusNotification = async (applicant, newStatus) => {
        const config = NOTIFICATION_CONFIG[newStatus]
        if (!config || !job) return

        const employerName = job.company_name || 'An employer'

        try {
            await insertNotification(
                applicant.user_id,
                'application_status_change',
                config.title(job.title),
                config.message(employerName, job.title),
                {
                    application_id: applicant.id,
                    job_id: jobId,
                    job_title: job.title,
                    status: newStatus,
                    employer_name: employerName,
                }
            )
        } catch (err) {
            console.error('Failed to send notification:', err)
        }

        // Send status change email (fail-silent)
        try {
            if (applicant.applicant_email) {
                await sendApplicationStatusEmail(
                    applicant.applicant_email,
                    applicant.applicant_name || 'Applicant',
                    job.title,
                    newStatus,
                    employerName
                )
            }
        } catch (err) {
            console.error('Failed to send status email:', err)
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

            // Insert status history row
            try {
                await supabase.from('application_status_history').insert({
                    application_id: appId,
                    status: newStatus,
                    changed_by: currentUser?.uid || null
                })
            } catch (err) {
                console.error('Failed to insert status history:', err)
            }

            // Send notification for key status changes
            if (['shortlisted', 'hired', 'rejected'].includes(newStatus)) {
                const applicant = applicants.find(app => app.id === appId)
                if (applicant) sendStatusNotification(applicant, newStatus)
            }
        } catch (error) {
            console.error('Error updating status:', error)
        } finally {
            setActionLoading(null)
        }
    }

    const toggleSelect = (appId) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(appId)) next.delete(appId)
            else next.add(appId)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredApplicants.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredApplicants.map(a => a.id)))
        }
    }

    const bulkUpdateStatus = async (newStatus) => {
        if (selectedIds.size === 0) return
        setBulkLoading(true)
        try {
            const ids = [...selectedIds]
            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .in('id', ids)
            if (error) throw error

            setApplicants(prev => prev.map(app =>
                ids.includes(app.id) ? { ...app, status: newStatus } : app
            ))

            // Insert history rows and send notifications for each
            for (const appId of ids) {
                try {
                    await supabase.from('application_status_history').insert({
                        application_id: appId,
                        status: newStatus,
                        changed_by: currentUser?.uid || null
                    })
                } catch (err) {
                    console.error('Failed to insert bulk history:', err)
                }

                if (['shortlisted', 'hired', 'rejected'].includes(newStatus)) {
                    const applicant = applicants.find(a => a.id === appId)
                    if (applicant) sendStatusNotification(applicant, newStatus)
                }
            }

            setSelectedIds(new Set())
        } catch (error) {
            console.error('Error bulk updating status:', error)
        } finally {
            setBulkLoading(false)
        }
    }

    const saveNotes = async (appId) => {
        const notes = editingNotes[appId]
        if (notes === undefined) return
        setSavingNotes(appId)
        try {
            const { error } = await supabase
                .from('applications')
                .update({ employer_notes: notes || null })
                .eq('id', appId)
            if (error) throw error
            setApplicants(prev => prev.map(app =>
                app.id === appId ? { ...app, employer_notes: notes || null } : app
            ))
            setEditingNotes(prev => { const next = { ...prev }; delete next[appId]; return next })
        } catch (error) {
            console.error('Error saving notes:', error)
        } finally {
            setSavingNotes(null)
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

                {/* Bulk Action Bar */}
                {filteredApplicants.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-gray-200">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors"
                        >
                            {selectedIds.size === filteredApplicants.length && filteredApplicants.length > 0
                                ? <CheckSquare className="w-4 h-4 text-primary-600" />
                                : <Square className="w-4 h-4" />
                            }
                            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                        </button>
                        {selectedIds.size > 0 && (
                            <>
                                <div className="w-px h-5 bg-gray-200" />
                                <button
                                    onClick={() => bulkUpdateStatus('shortlisted')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    Shortlist
                                </button>
                                <button
                                    onClick={() => bulkUpdateStatus('rejected')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => bulkUpdateStatus('hired')}
                                    disabled={bulkLoading}
                                    className="px-3 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    Hire
                                </button>
                                {bulkLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                            </>
                        )}
                    </div>
                )}

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
                                        {/* Checkbox + Avatar */}
                                        <div className="flex-shrink-0 flex items-start gap-3">
                                            <button
                                                onClick={() => toggleSelect(app.id)}
                                                className="mt-4 text-gray-400 hover:text-primary-600 transition-colors"
                                            >
                                                {selectedIds.has(app.id)
                                                    ? <CheckSquare className="w-5 h-5 text-primary-600" />
                                                    : <Square className="w-5 h-5" />
                                                }
                                            </button>
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

                                            {/* Cover Letter */}
                                            {app.cover_letter && (
                                                <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                                    <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                                                        <FileText className="w-4 h-4" />
                                                        Cover Letter
                                                    </div>
                                                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{app.cover_letter}</p>
                                                </div>
                                            )}

                                            {/* Employer Notes */}
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 text-gray-700 font-semibold mb-2 text-sm">
                                                    <StickyNote className="w-4 h-4" />
                                                    Private Notes
                                                </div>
                                                <div className="flex gap-2">
                                                    <textarea
                                                        value={editingNotes[app.id] !== undefined ? editingNotes[app.id] : (app.employer_notes || '')}
                                                        onChange={(e) => setEditingNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                                        onBlur={() => { if (editingNotes[app.id] !== undefined) saveNotes(app.id) }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(app.id) } }}
                                                        placeholder="Add private notes about this applicant..."
                                                        className="input-field text-sm min-h-[60px] flex-1 resize-none"
                                                        rows={2}
                                                    />
                                                    {editingNotes[app.id] !== undefined && (
                                                        <button
                                                            onClick={() => saveNotes(app.id)}
                                                            disabled={savingNotes === app.id}
                                                            className="p-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors self-end"
                                                            title="Save notes"
                                                        >
                                                            {savingNotes === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

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
