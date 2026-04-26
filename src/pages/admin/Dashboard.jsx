import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
    sendJobseekerVerifiedEmail,
    sendJobseekerRejectedEmail,
    sendEmployerApprovedEmail,
    sendEmployerRejectedEmail
} from '../../services/emailService'
import { insertNotification } from '../../services/notificationService'
import { Shield, Loader2, Lock } from 'lucide-react'
import SkillInsights from './SkillInsights'
import {
    hasAdminPermission,
    getVisibleAdminSections,
} from '../../utils/adminPermissions'
import { buildVerifiedSnapshot } from '../../utils/reverification'

import {
    AdminAccountSettings,
    AdminTopbar,
    AdminSidebar,
    AdminManagementSection,
    OverviewSection,
    EmployerVerificationSection,
    JobseekerVerificationSection,
    ReverificationQueue,
    UserManagementSection,
    JobseekerExportSection,
    DocumentViewer,
    RejectModal,
    EMPTY_FILTERS
} from '../../components/admin'
import {
    ADMIN_DIRECTORY_PAGE_SIZE,
    fetchAdminDirectoryPage,
} from '../../services/adminUserDirectoryService'
import { getVerificationMetadata } from '../../utils/verificationUtils'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'

const getNotificationTargetUserId = (notification) => {
    if (notification?.metadata?.user_id) return notification.metadata.user_id

    if (!notification?.reference_link) return null

    try {
        const url = new URL(notification.reference_link, window.location.origin)
        return url.searchParams.get('userId')
    } catch {
        return null
    }
}

const SetupPasswordModal = ({ onClose }) => {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
                data: { needs_password_setup: false }
            })
            if (updateError) throw updateError
            onClose()
        } catch (err) {
            console.error('Password setup error:', err)
            setError(err.message || 'Failed to set password. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-800 animate-fade-in">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500/20 rounded-2xl mb-4">
                        <Lock className="w-7 h-7 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Welcome, Admin!</h3>
                    <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                        Please set a secure password for your new sub-admin account so you can log in later.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Min. 6 characters"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Confirm your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Password & Continue'}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-full mt-3 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                    >
                        I'll do this later
                    </button>
                </form>
            </div>
        </div>
    )
}

const AdminDashboard = ({ initialSection = 'overview' }) => {
    const { currentUser, userData, adminAccess, logout } = useAuth()
    const navigate = useNavigate()

    const {
        notifications,
        unreadCount,
        loading: notificationsLoading,
        markNotificationAsRead,
        markAllNotificationsAsRead,
    } = useAdminNotifications()

    const [dismissSetup, setDismissSetup] = useState(false)
    const showSetupPassword = currentUser?.user_metadata?.needs_password_setup && !dismissSetup

    const [employers, setEmployers] = useState([])
    const [jobseekers, setJobseekers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [loading, setLoading] = useState(true)

    const [activeSection, setActiveSection] = useState(initialSection)
    const [activeTab, setActiveTab] = useState('pending')
    const [expandedId, setExpandedId] = useState(null)
    const [actionLoading, setActionLoading] = useState('')
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectModal, setShowRejectModal] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState(EMPTY_FILTERS)
    const [sortOrder, setSortOrder] = useState('desc')

    const [documentViewer, setDocumentViewer] = useState(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [reverificationQueue, setReverificationQueue] = useState([])
    const [sectionRows, setSectionRows] = useState({
        employers: [],
        jobseekers: [],
        users: [],
    })
    const [sectionTotals, setSectionTotals] = useState({
        employers: 0,
        jobseekers: 0,
        users: 0,
    })
    const [sectionHasMore, setSectionHasMore] = useState({
        employers: false,
        jobseekers: false,
        users: false,
    })
    const [sectionLoading, setSectionLoading] = useState({
        employers: false,
        jobseekers: false,
        users: false,
    })
    const [sectionLoadingMore, setSectionLoadingMore] = useState({
        employers: false,
        jobseekers: false,
        users: false,
    })

    const canApproveEmployers = hasAdminPermission(adminAccess, 'approve_employers')
    const canRejectEmployers = hasAdminPermission(adminAccess, 'reject_employers')
    const canApproveJobseekers = hasAdminPermission(adminAccess, 'approve_jobseekers')
    const canRejectJobseekers = hasAdminPermission(adminAccess, 'reject_jobseekers')
    const canReverifyJobseekers = hasAdminPermission(adminAccess, 'reverify_jobseeker_profiles')
    const canReverifyEmployers = hasAdminPermission(adminAccess, 'reverify_employer_profiles')
    const canReverifyProfiles = canReverifyJobseekers || canReverifyEmployers
    const visibleSections = getVisibleAdminSections(adminAccess)
    const allowedReverificationRoles = [
        ...(canReverifyJobseekers ? ['jobseeker'] : []),
        ...(canReverifyEmployers ? ['employer'] : []),
    ]

    useEffect(() => { fetchData() }, [])

    const getSectionRoleFilter = useCallback((section) => {
        if (section === 'employers') return 'employer'
        if (section === 'jobseekers') return 'jobseeker'
        return filters.role
    }, [filters.role])

    const getSectionStatusFilter = useCallback((section) => {
        if (section === 'employers') {
            if (activeTab === 'all') return filters.verificationStatus
            return activeTab
        }

        if (section === 'jobseekers') {
            if (activeTab === 'verified') return 'approved'
            if (activeTab === 'all') return filters.verificationStatus
            return activeTab
        }

        return filters.verificationStatus
    }, [activeTab, filters.verificationStatus])

    const loadSectionData = useCallback(async (section, { append = false, offset = 0 } = {}) => {
        const setLoadingState = append ? setSectionLoadingMore : setSectionLoading

        setLoadingState(prev => ({ ...prev, [section]: true }))

        try {
            const { rows, totalCount, hasMore } = await fetchAdminDirectoryPage({
                role: getSectionRoleFilter(section),
                verificationStatus: getSectionStatusFilter(section),
                searchQuery,
                sortOrder,
                limit: ADMIN_DIRECTORY_PAGE_SIZE,
                offset: append ? offset : 0,
            })

            setSectionRows(prev => ({
                ...prev,
                [section]: append ? [...prev[section], ...rows] : rows,
            }))
            setSectionTotals(prev => ({ ...prev, [section]: totalCount }))
            setSectionHasMore(prev => ({ ...prev, [section]: hasMore }))
        } catch (error) {
            console.error(`Error fetching ${section}:`, error)
        } finally {
            setLoadingState(prev => ({ ...prev, [section]: false }))
        }
    }, [getSectionRoleFilter, getSectionStatusFilter, searchQuery, sortOrder])

    useEffect(() => {
        if (!['employers', 'jobseekers', 'users'].includes(activeSection)) return
        loadSectionData(activeSection)
    }, [activeSection, activeTab, filters.role, filters.verificationStatus, searchQuery, sortOrder, loadSectionData])

    useEffect(() => {
        if (!adminAccess) return
        if (visibleSections.length > 0 && !visibleSections.includes(activeSection) && activeSection !== 'account_settings') {
            setActiveSection(visibleSections[0])
        }
    }, [activeSection, adminAccess, visibleSections])

    useEffect(() => {
        setActiveSection(initialSection)
    }, [initialSection])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: users, error } = await supabase.from('users').select('*')
            if (error) throw error

            const [empRes, jsRes, hoRes] = await Promise.allSettled([
                supabase.from('employer_profiles').select('*'),
                supabase.from('jobseeker_profiles').select('*'),
                supabase.from('homeowner_profiles').select('*'),
            ])

            const pickRows = (res, label) => {
                if (res.status !== 'fulfilled') {
                    console.error(`[admin] ${label} fetch rejected:`, res.reason)
                    return []
                }
                if (res.value.error) {
                    console.error(`[admin] ${label} select error:`, res.value.error)
                    return []
                }
                return res.value.data || []
            }

            const empProfiles = pickRows(empRes, 'employer_profiles')
            const jsProfiles = pickRows(jsRes, 'jobseeker_profiles')
            const hoProfiles = pickRows(hoRes, 'homeowner_profiles')

            const profileMap = {}
            for (const p of [...empProfiles, ...jsProfiles, ...hoProfiles]) {
                profileMap[p.id] = p
            }

            const merged = users.map((u) => {
                const profile = profileMap[u.id] || {}
                const out = { ...u }
                for (const [key, val] of Object.entries(profile)) {
                    const isEmpty =
                        val === null ||
                        val === '' ||
                        (Array.isArray(val) && val.length === 0)
                    if (isEmpty) {
                        if (out[key] === undefined) out[key] = val
                    } else {
                        out[key] = val
                    }
                }
                return out
            }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())

            setAllUsers(merged)
            setEmployers(merged.filter(u => u.role === 'employer'))
            setJobseekers(merged.filter(u => u.role === 'user' && u.subtype === 'jobseeker'))

            if (currentUser) {
                try {
                    const { data: queueData, error: queueError } = await supabase.rpc('admin_get_reverification_queue')
                    if (queueError) throw queueError

                    const normalizedQueue = (queueData || []).map((item) => ({
                        id: item.id,
                        roleLabel: item.role_label,
                        email: item.email,
                        display_name: item.display_name,
                        company_name: item.company_name,
                        updated_at: item.updated_at,
                        is_verified: item.is_verified,
                        profile_modified_since_verification: item.profile_modified_since_verification,
                        verified_snapshot: item.verified_snapshot || {},
                        ...(item.profile_data || {}),
                    }))
                    setReverificationQueue(normalizedQueue)
                } catch (queueFetchError) {
                    console.error('Error fetching re-verification queue:', queueFetchError)
                    setReverificationQueue([])
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const PROFILE_TABLE = { employer: 'employer_profiles', jobseeker: 'jobseeker_profiles' }

    const getKnownUserById = (userId) => {
        const directoryRows = [
            ...sectionRows.employers,
            ...sectionRows.jobseekers,
            ...sectionRows.users,
        ]

        return directoryRows.find(u => u.id === userId) || allUsers.find(u => u.id === userId)
    }

    const updateProfileRobust = async (profileTable, fullPayload) => {
        const { id, ...payloadWithoutId } = fullPayload
        const { error } = await supabase.from(profileTable).update(payloadWithoutId).eq('id', id)
        if (!error) return

        const msg = (error.message || '').toLowerCase()
        const isMissingColumn =
            msg.includes('could not find') ||
            msg.includes('column') ||
            msg.includes('pgrst204') ||
            (error.code && (error.code === 'PGRST204' || error.code === '42703'))

        if (isMissingColumn) {
            console.warn('[updateProfileRobust] missing column in profile table - retrying without verification year fields:', error.message)
            const {
                verified_for_year: _verifiedForYear,
                verification_expires_at: _verificationExpiresAt,
                ...fallbackPayload
            } = payloadWithoutId
            const { error: fallbackErr } = await supabase.from(profileTable).update(fallbackPayload).eq('id', id)
            if (fallbackErr) throw fallbackErr
            return
        }

        throw error
    }

    const handleApprove = async (userId, userRole) => {
        if (userRole === 'employer' && !canApproveEmployers) {
            console.warn('[RBAC] approve_employers permission denied')
            return
        }
        if (userRole === 'jobseeker' && !canApproveJobseekers) {
            console.warn('[RBAC] approve_jobseekers permission denied')
            return
        }

        setActionLoading(userId)
        try {
            const now = new Date().toISOString()
            const verificationMeta = getVerificationMetadata()

            const { error: updateError } = await supabase
                .from('users')
                .update({ is_verified: true, ...verificationMeta, updated_at: now })
                .eq('id', userId)
            if (updateError) throw updateError

            const profileTable = PROFILE_TABLE[userRole]
            if (profileTable) {
                const existingUser = getKnownUserById(userId) || {}
                const profileUpdate = {
                    id: userId,
                    rejection_reason: '',
                    updated_at: now,
                    is_verified: true,
                    profile_modified_since_verification: false,
                    verified_snapshot: buildVerifiedSnapshot(userRole, existingUser),
                    ...verificationMeta,
                }
                if (userRole === 'employer') profileUpdate.employer_status = 'approved'
                else if (userRole === 'jobseeker') profileUpdate.jobseeker_status = 'verified'

                await updateProfileRobust(profileTable, profileUpdate)
            }

            try {
                const user = getKnownUserById(userId)
                if (user) {
                    if (userRole === 'employer') {
                        await sendEmployerApprovedEmail({
                            email: user.email,
                            representative_name: user.representative_name || user.name,
                            company_name: user.company_name
                        })
                        await insertNotification(
                            userId,
                            'account_status',
                            'Account Approved',
                            'Your employer account has been successfully verified! You can now post jobs.',
                            { status: 'approved' }
                        )
                    } else if (userRole === 'jobseeker') {
                        await sendJobseekerVerifiedEmail({
                            email: user.email,
                            full_name: user.display_name || user.full_name || user.name
                        })
                        await insertNotification(
                            userId,
                            'account_status',
                            'Account Verified',
                            'Your jobseeker account has been successfully verified! You can now apply for jobs.',
                            { status: 'verified' }
                        )
                    }
                }
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError)
            }
        } catch (error) {
            console.error('Error approving user:', error)
            toast.error('Failed to approve user', {
                description: error?.message || 'Please try again or contact a super-admin.',
            })
        } finally {
            setActionLoading('')
            await fetchData()
            if (['employers', 'jobseekers', 'users'].includes(activeSection)) {
                await loadSectionData(activeSection)
            }
        }
    }

    const handleReject = async (userId, userRole) => {
        if (userRole === 'employer' && !canRejectEmployers) {
            console.warn('[RBAC] reject_employers permission denied')
            return
        }
        if (userRole === 'jobseeker' && !canRejectJobseekers) {
            console.warn('[RBAC] reject_jobseekers permission denied')
            return
        }

        setActionLoading(userId)
        try {
            const now = new Date().toISOString()

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    is_verified: false,
                    verified_for_year: null,
                    verification_expires_at: null,
                    updated_at: now,
                })
                .eq('id', userId)
            if (updateError) throw updateError

            const profileTable = PROFILE_TABLE[userRole]
            if (profileTable) {
                const profileUpdate = {
                    id: userId,
                    rejection_reason: rejectReason,
                    updated_at: now,
                    is_verified: false,
                    verified_for_year: null,
                    verification_expires_at: null,
                }
                if (userRole === 'employer') profileUpdate.employer_status = 'rejected'
                else if (userRole === 'jobseeker') profileUpdate.jobseeker_status = 'rejected'

                await updateProfileRobust(profileTable, profileUpdate)
            }

            try {
                const user = getKnownUserById(userId)
                if (user) {
                    if (userRole === 'employer') {
                        await sendEmployerRejectedEmail({
                            email: user.email,
                            representative_name: user.representative_name || user.name,
                            company_name: user.company_name,
                            rejection_reason: rejectReason
                        })
                        await insertNotification(
                            userId,
                            'account_status',
                            'Account Rejected',
                            'Your employer registration was rejected.',
                            { status: 'rejected' }
                        )
                    } else if (userRole === 'jobseeker') {
                        await sendJobseekerRejectedEmail({
                            email: user.email,
                            full_name: user.display_name || user.full_name || user.name,
                            rejection_reason: rejectReason
                        })
                        await insertNotification(
                            userId,
                            'account_status',
                            'Account Rejected',
                            'Your jobseeker registration was rejected.',
                            { status: 'rejected' }
                        )
                    }
                }
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError)
            }

            setShowRejectModal(null)
            setRejectReason('')
        } catch (error) {
            console.error('Error rejecting user:', error)
            toast.error('Failed to reject user', {
                description: error?.message || 'Please try again or contact a super-admin.',
            })
        } finally {
            setActionLoading('')
            await fetchData()
            if (['employers', 'jobseekers', 'users'].includes(activeSection)) {
                await loadSectionData(activeSection)
            }
        }
    }

    const handleLogout = async () => {
        try {
            await logout()
            navigate('/admin/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const handleNotificationNavigate = useCallback((notification) => {
        const link = notification?.reference_link
        if (!link) return

        try {
            const url = new URL(link, window.location.origin)
            const section = url.searchParams.get('section')
            const tab = url.searchParams.get('tab')
            const targetUserId = getNotificationTargetUserId(notification)
            if (section) {
                setActiveSection(section)
                if (tab) setActiveTab(tab)
                setExpandedId(targetUserId || null)
                setSearchQuery('')
                setShowFilters(false)
                setFilters(EMPTY_FILTERS)
                setSortOrder('desc')
            } else {
                navigate(link)
            }
        } catch {
            navigate(link)
        }
    }, [navigate])

    const handleReverificationAction = async (item, action) => {
        if (!canReverifyProfiles) {
            console.warn('[RBAC] reverify role permission denied')
            return
        }
        if (item.roleLabel === 'jobseeker' && !canReverifyJobseekers) {
            console.warn('[RBAC] reverify_jobseeker_profiles permission denied')
            return
        }
        if (item.roleLabel === 'employer' && !canReverifyEmployers) {
            console.warn('[RBAC] reverify_employer_profiles permission denied')
            return
        }

        let reason = null
        if (action === 'reject') {
            reason = window.prompt('Why are you rejecting this profile update?')
            if (!reason || !reason.trim()) return
        }

        setActionLoading(item.id)
        try {
            const { error } = await supabase.rpc('admin_process_reverification', {
                p_user_id: item.id,
                p_role_label: item.roleLabel,
                p_action: action,
                p_reason: reason,
            })
            if (error) throw error
            await fetchData()
        } catch (rpcError) {
            console.error(`Error handling ${action} reverification:`, rpcError)
            toast.error(`Failed to ${action} profile`, {
                description: rpcError?.message || 'Please try again.',
            })
        } finally {
            setActionLoading('')
        }
    }

    const handleSectionChange = (sectionId) => {
        setActiveSection(sectionId)
        setSearchQuery('')
        setShowFilters(false)
        setFilters(EMPTY_FILTERS)
        setSortOrder('desc')
    }

    const handleViewDocument = (src, title) => {
        setDocumentViewer({ src, title })
    }

    const getFilteredEmployers = () => {
        let filtered = sectionRows.employers

        if (filters.location) {
            const loc = filters.location.toLowerCase()
            filtered = filtered.filter(e =>
                (e.business_address || '').toLowerCase().includes(loc) ||
                (e.city || '').toLowerCase().includes(loc) ||
                (e.province || '').toLowerCase().includes(loc)
            )
        }
        if (filters.dateFrom) {
            filtered = filtered.filter(e => {
                const createdDate = e.created_at ? new Date(e.created_at) : null
                return createdDate && createdDate >= new Date(filters.dateFrom)
            })
        }
        if (filters.dateTo) {
            filtered = filtered.filter(e => {
                const createdDate = e.created_at ? new Date(e.created_at) : null
                return createdDate && createdDate <= new Date(filters.dateTo + 'T23:59:59')
            })
        }

        return filtered
    }

    const employerCounts = {
        pending: employers.filter(e => (e.employer_status || 'pending') === 'pending').length,
        approved: employers.filter(e => e.employer_status === 'approved').length,
        rejected: employers.filter(e => e.employer_status === 'rejected').length,
        expired: employers.filter(e => e.employer_status === 'expired').length,
        total: employers.length,
    }

    const jobseekerCounts = {
        pending: jobseekers.filter(j => (j.jobseeker_status || 'pending') === 'pending').length,
        verified: jobseekers.filter(j => j.jobseeker_status === 'verified').length,
        rejected: jobseekers.filter(j => j.jobseeker_status === 'rejected').length,
        expired: jobseekers.filter(j => j.jobseeker_status === 'expired').length,
        total: jobseekers.length,
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Shield className="w-8 h-8 text-indigo-400" />
                    </div>
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Loading admin panel...</p>
                </div>
            </div>
        )
    }

    const filteredEmployers = getFilteredEmployers()
    const filteredUsers = sectionRows.users
    const displayedJobseekers = sectionRows.jobseekers
    const sectionBadges = {
        reverification: reverificationQueue.filter((item) => allowedReverificationRoles.includes(item.roleLabel)).length,
    }

    const renderUnauthorized = (sectionLabel) => (
        <div className="animate-fade-in flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 font-semibold text-lg mb-1">Access Restricted</p>
            <p className="text-slate-600 text-sm max-w-xs">
                You do not have permission to access {sectionLabel}. Contact a super-admin to request access.
            </p>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <AdminSidebar
                activeSection={activeSection}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                userData={userData}
                adminAccess={adminAccess}
                onLogout={handleLogout}
                onSectionChange={handleSectionChange}
                sectionBadges={sectionBadges}
            />

            <main className={`flex-1 min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>
                <AdminTopbar
                    userData={userData}
                    adminAccess={adminAccess}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    notificationsLoading={notificationsLoading}
                    onMarkAsRead={markNotificationAsRead}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onNotificationNavigate={handleNotificationNavigate}
                />
                <div className="p-6 lg:p-8 max-w-7xl">
                    {activeSection === 'overview' && (
                        hasAdminPermission(adminAccess, 'view_overview')
                            ? <OverviewSection
                                allUsers={allUsers}
                                employers={employers}
                                employerCounts={employerCounts}
                                jobseekerCounts={jobseekerCounts}
                                setActiveSection={setActiveSection}
                                setActiveTab={setActiveTab}
                            />
                            : renderUnauthorized('Overview')
                    )}

                    {activeSection === 'employers' && (
                        hasAdminPermission(adminAccess, 'view_employers')
                            ? <EmployerVerificationSection
                                filteredEmployers={filteredEmployers}
                                totalCount={sectionTotals.employers}
                                hasMore={sectionHasMore.employers}
                                isFetching={sectionLoading.employers}
                                isLoadingMore={sectionLoadingMore.employers}
                                onLoadMore={() => loadSectionData('employers', { append: true, offset: sectionRows.employers.length })}
                                employerCounts={employerCounts}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showFilters={showFilters}
                                setShowFilters={setShowFilters}
                                filters={filters}
                                setFilters={setFilters}
                                sortOrder={sortOrder}
                                setSortOrder={setSortOrder}
                                expandedId={expandedId}
                                setExpandedId={setExpandedId}
                                actionLoading={actionLoading}
                                onApprove={handleApprove}
                                onReject={setShowRejectModal}
                                onViewDocument={handleViewDocument}
                                canApprove={canApproveEmployers}
                                canReject={canRejectEmployers}
                            />
                            : renderUnauthorized('Employer Verification')
                    )}

                    {activeSection === 'jobseekers' && (
                        hasAdminPermission(adminAccess, 'view_jobseekers')
                            ? <JobseekerVerificationSection
                                jobseekers={displayedJobseekers}
                                totalCount={sectionTotals.jobseekers}
                                hasMore={sectionHasMore.jobseekers}
                                isFetching={sectionLoading.jobseekers}
                                isLoadingMore={sectionLoadingMore.jobseekers}
                                onLoadMore={() => loadSectionData('jobseekers', { append: true, offset: sectionRows.jobseekers.length })}
                                jobseekerCounts={jobseekerCounts}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showFilters={showFilters}
                                setShowFilters={setShowFilters}
                                filters={filters}
                                setFilters={setFilters}
                                sortOrder={sortOrder}
                                setSortOrder={setSortOrder}
                                expandedId={expandedId}
                                setExpandedId={setExpandedId}
                                actionLoading={actionLoading}
                                onApprove={handleApprove}
                                onReject={setShowRejectModal}
                                onViewDocument={handleViewDocument}
                                canApprove={canApproveJobseekers}
                                canReject={canRejectJobseekers}
                            />
                            : renderUnauthorized('Jobseeker Verification')
                    )}

                    {activeSection === 'users' && (
                        hasAdminPermission(adminAccess, 'view_users')
                            ? <UserManagementSection
                                allUsers={filteredUsers}
                                totalCount={sectionTotals.users}
                                hasMore={sectionHasMore.users}
                                isFetching={sectionLoading.users}
                                isLoadingMore={sectionLoadingMore.users}
                                onLoadMore={() => loadSectionData('users', { append: true, offset: sectionRows.users.length })}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showFilters={showFilters}
                                setShowFilters={setShowFilters}
                                filters={filters}
                                setFilters={setFilters}
                                sortOrder={sortOrder}
                                setSortOrder={setSortOrder}
                            />
                            : renderUnauthorized('User Management')
                    )}

                    {activeSection === 'reverification' && (
                        canReverifyProfiles
                            ? <ReverificationQueue
                                queueItems={reverificationQueue.filter((item) => allowedReverificationRoles.includes(item.roleLabel))}
                                actionLoading={actionLoading}
                                onApprove={(item) => handleReverificationAction(item, 'approve')}
                                onReject={(item) => handleReverificationAction(item, 'reject')}
                                onRevoke={(item) => handleReverificationAction(item, 'revoke')}
                            />
                            : renderUnauthorized('Re-verification Queue')
                    )}

                    {activeSection === 'jobseeker_export' && (
                        hasAdminPermission(adminAccess, 'export_jobseekers')
                            ? <JobseekerExportSection
                                jobseekers={jobseekers}
                                adminId={currentUser?.uid ?? currentUser?.id}
                            />
                            : renderUnauthorized('Jobseeker Export')
                    )}

                    {activeSection === 'skill_insights' && (
                        hasAdminPermission(adminAccess, 'view_skill_insights')
                            ? <SkillInsights />
                            : renderUnauthorized('Skill Insights')
                    )}

                    {activeSection === 'admin_management' && (
                        hasAdminPermission(adminAccess, 'manage_admins')
                            ? <AdminManagementSection adminAccess={adminAccess} />
                            : renderUnauthorized('Admin Management')
                    )}

                    {activeSection === 'account_settings' && (
                        <AdminAccountSettings />
                    )}
                </div>
            </main>

            <DocumentViewer
                documentViewer={documentViewer}
                onClose={() => setDocumentViewer(null)}
            />

            <RejectModal
                showRejectModal={showRejectModal}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                onReject={handleReject}
                onClose={() => { setShowRejectModal(null); setRejectReason('') }}
                actionLoading={actionLoading}
            />

            {showSetupPassword && (
                <SetupPasswordModal onClose={() => setDismissSetup(true)} />
            )}
        </div>
    )
}

export default AdminDashboard
