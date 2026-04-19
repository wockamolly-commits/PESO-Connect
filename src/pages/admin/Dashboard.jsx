import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
    sendJobseekerVerifiedEmail,
    sendJobseekerRejectedEmail,
    sendEmployerApprovedEmail,
    sendEmployerRejectedEmail
} from '../../services/emailService'
import { Shield, Loader2, Lock } from 'lucide-react'
import {
    hasAdminPermission,
    getVisibleAdminSections,
} from '../../utils/adminPermissions'
import { buildVerifiedSnapshot } from '../../utils/reverification'

import {
    AdminSidebar,
    AdminManagementSection,
    OverviewSection,
    EmployerVerificationSection,
    JobseekerVerificationSection,
    ReverificationQueue,
    UserManagementSection,
    DocumentViewer,
    RejectModal,
    EMPTY_FILTERS
} from '../../components/admin'

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
    
    // Setup Password logic based on JWT claims (secure)
    const [dismissSetup, setDismissSetup] = useState(false)
    const showSetupPassword = currentUser?.user_metadata?.needs_password_setup && !dismissSetup

    // Data
    const [employers, setEmployers] = useState([])
    const [jobseekers, setJobseekers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [loading, setLoading] = useState(true)

    // UI state
    const [activeSection, setActiveSection] = useState(initialSection)
    const [activeTab, setActiveTab] = useState('pending')
    const [expandedId, setExpandedId] = useState(null)
    const [actionLoading, setActionLoading] = useState('')
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectModal, setShowRejectModal] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Advanced filters
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState(EMPTY_FILTERS)

    const [documentViewer, setDocumentViewer] = useState(null)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [reverificationQueue, setReverificationQueue] = useState([])

    // Derived permissions
    const canApproveEmployers = hasAdminPermission(adminAccess, 'approve_employers')
    const canRejectEmployers = hasAdminPermission(adminAccess, 'reject_employers')
    const canApproveJobseekers = hasAdminPermission(adminAccess, 'approve_jobseekers')
    const canRejectJobseekers = hasAdminPermission(adminAccess, 'reject_jobseekers')
    const canReverifyProfiles = hasAdminPermission(adminAccess, 'reverify_profiles')
    const visibleSections = getVisibleAdminSections(adminAccess)

    useEffect(() => { fetchData() }, [])

    // Redirect to the first accessible section when adminAccess loads or changes.
    useEffect(() => {
        if (!adminAccess) return
        if (visibleSections.length > 0 && !visibleSections.includes(activeSection)) {
            setActiveSection(visibleSections[0])
        }
    }, [adminAccess]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setActiveSection(initialSection)
    }, [initialSection])

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: users, error } = await supabase.from('users').select('*')
            if (error) throw error

            // Fetch all profile tables in parallel
            const [
                { data: empProfiles },
                { data: jsProfiles },
                { data: hoProfiles },
            ] = await Promise.all([
                supabase.from('employer_profiles').select('*'),
                supabase.from('jobseeker_profiles').select('*'),
                supabase.from('homeowner_profiles').select('*'),
            ])

            // Index profiles by id for fast lookup
            const profileMap = {}
            for (const p of [...(empProfiles || []), ...(jsProfiles || []), ...(hoProfiles || [])]) {
                profileMap[p.id] = p
            }

            // Merge each user with their profile
            const merged = users.map(u => ({ ...u, ...(profileMap[u.id] || {}) }))

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

    // NOTE: 'jobseeker' here is the subtype value, not the DB role field.
    // JobseekerCard passes 'jobseeker' explicitly; do not change to user.role.
    const PROFILE_TABLE = { employer: 'employer_profiles', jobseeker: 'jobseeker_profiles' }

    const handleApprove = async (userId, userRole) => {
        // Permission guard — checked client-side before any DB write.
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

            // Update base user record
            const { error: updateError } = await supabase
                .from('users')
                .update({ is_verified: true, updated_at: now })
                .eq('id', userId)
            if (updateError) throw updateError

            // Update role-specific profile
            const profileTable = PROFILE_TABLE[userRole]
            if (profileTable) {
                const existingUser = allUsers.find(u => u.id === userId) || {}
                const profileUpdate = {
                    rejection_reason: '',
                    updated_at: now,
                    is_verified: true,
                    profile_modified_since_verification: false,
                    verified_snapshot: buildVerifiedSnapshot(userRole, existingUser),
                }
                if (userRole === 'employer') profileUpdate.employer_status = 'approved'
                else if (userRole === 'jobseeker') profileUpdate.jobseeker_status = 'verified'

                const { error: profileErr } = await supabase
                    .from(profileTable)
                    .update(profileUpdate)
                    .eq('id', userId)
                if (profileErr) throw profileErr
            }

            try {
                const user = allUsers.find(u => u.id === userId)
                if (user) {
                    if (userRole === 'employer') {
                        await sendEmployerApprovedEmail({
                            email: user.email,
                            representative_name: user.representative_name || user.name,
                            company_name: user.company_name
                        })
                    } else if (userRole === 'jobseeker') {
                        await sendJobseekerVerifiedEmail({
                            email: user.email,
                            full_name: user.display_name || user.full_name || user.name
                        })
                    }
                }
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError)
            }

            await fetchData()
        } catch (error) {
            console.error('Error approving user:', error)
        } finally {
            setActionLoading('')
        }
    }

    const handleReject = async (userId, userRole) => {
        // Permission guard — checked client-side before any DB write.
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

            // Update base user record
            const { error: updateError } = await supabase
                .from('users')
                .update({ is_verified: false, updated_at: now })
                .eq('id', userId)
            if (updateError) throw updateError

            // Update role-specific profile
            const profileTable = PROFILE_TABLE[userRole]
            if (profileTable) {
                const profileUpdate = { rejection_reason: rejectReason, updated_at: now, is_verified: false }
                if (userRole === 'employer') profileUpdate.employer_status = 'rejected'
                else if (userRole === 'jobseeker') profileUpdate.jobseeker_status = 'rejected'

                const { error: profileErr } = await supabase
                    .from(profileTable)
                    .update(profileUpdate)
                    .eq('id', userId)
                if (profileErr) throw profileErr
            }

            try {
                const user = allUsers.find(u => u.id === userId)
                if (user) {
                    if (userRole === 'employer') {
                        await sendEmployerRejectedEmail({
                            email: user.email,
                            representative_name: user.representative_name || user.name,
                            company_name: user.company_name,
                            rejection_reason: rejectReason
                        })
                    } else if (userRole === 'jobseeker') {
                        await sendJobseekerRejectedEmail({
                            email: user.email,
                            full_name: user.display_name || user.full_name || user.name,
                            rejection_reason: rejectReason
                        })
                    }
                }
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError)
            }

            setShowRejectModal(null)
            setRejectReason('')
            await fetchData()
        } catch (error) {
            console.error('Error rejecting user:', error)
        } finally {
            setActionLoading('')
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

    const handleSectionChange = (sectionId) => {
        setActiveSection(sectionId)
        setSearchQuery('')
        setShowFilters(false)
        setFilters(EMPTY_FILTERS)
    }

    const handleViewDocument = (src, title) => {
        setDocumentViewer({ src, title })
    }

    const handleReverificationAction = async (item, action) => {
        if (!canReverifyProfiles) {
            console.warn('[RBAC] reverify_profiles permission denied')
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
        } finally {
            setActionLoading('')
        }
    }

    const getFilteredEmployers = () => {
        let filtered = employers
        if (activeTab === 'pending') filtered = employers.filter(e => (e.employer_status || 'pending') === 'pending')
        else if (activeTab === 'approved') filtered = employers.filter(e => e.employer_status === 'approved')
        else if (activeTab === 'rejected') filtered = employers.filter(e => e.employer_status === 'rejected')

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(e =>
                (e.company_name || '').toLowerCase().includes(q) ||
                (e.representative_name || e.name || '').toLowerCase().includes(q) ||
                (e.email || '').toLowerCase().includes(q)
            )
        }

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
        total: employers.length,
    }

    const jobseekerCounts = {
        pending: jobseekers.filter(j => (j.jobseeker_status || 'pending') === 'pending').length,
        verified: jobseekers.filter(j => j.jobseeker_status === 'verified').length,
        rejected: jobseekers.filter(j => j.jobseeker_status === 'rejected').length,
        total: jobseekers.length,
    }
    const sectionBadges = {
        reverification: reverificationQueue.length,
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

    // Render a locked-section message for sections the current admin cannot access.
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

            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>
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
                                employerCounts={employerCounts}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showFilters={showFilters}
                                setShowFilters={setShowFilters}
                                filters={filters}
                                setFilters={setFilters}
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
                                jobseekers={jobseekers}
                                jobseekerCounts={jobseekerCounts}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showFilters={showFilters}
                                setShowFilters={setShowFilters}
                                filters={filters}
                                setFilters={setFilters}
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
                                allUsers={allUsers}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                            />
                            : renderUnauthorized('User Management')
                    )}

                    {activeSection === 'reverification' && (
                        hasAdminPermission(adminAccess, 'reverify_profiles')
                            ? <ReverificationQueue
                                queueItems={reverificationQueue}
                                actionLoading={actionLoading}
                                onApprove={(item) => handleReverificationAction(item, 'approve')}
                                onReject={(item) => handleReverificationAction(item, 'reject')}
                                onRevoke={(item) => handleReverificationAction(item, 'revoke')}
                            />
                            : renderUnauthorized('Re-verification Queue')
                    )}

                    {activeSection === 'admin_management' && (
                        hasAdminPermission(adminAccess, 'manage_admins')
                            ? <AdminManagementSection adminAccess={adminAccess} />
                            : renderUnauthorized('Admin Management')
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
