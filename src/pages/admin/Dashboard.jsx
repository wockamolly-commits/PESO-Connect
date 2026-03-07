import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../../config/firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../../contexts/AuthContext'
import {
    sendJobseekerVerifiedEmail,
    sendJobseekerRejectedEmail,
    sendEmployerApprovedEmail,
    sendEmployerRejectedEmail
} from '../../services/emailService'
import { Shield, Loader2 } from 'lucide-react'

import {
    AdminSidebar,
    OverviewSection,
    EmployerVerificationSection,
    JobseekerVerificationSection,
    UserManagementSection,
    DocumentViewer,
    RejectModal,
    EMPTY_FILTERS
} from '../../components/admin'

const AdminDashboard = () => {
    const { userData } = useAuth()
    const navigate = useNavigate()

    // Data
    const [employers, setEmployers] = useState([])
    const [jobseekers, setJobseekers] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [loading, setLoading] = useState(true)

    // UI state
    const [activeSection, setActiveSection] = useState('overview')
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

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'))
            const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setAllUsers(usersData)
            setEmployers(usersData.filter(u => u.role === 'employer'))
            setJobseekers(usersData.filter(u => u.role === 'jobseeker'))
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (userId, userRole) => {
        setActionLoading(userId)
        try {
            const updateData = {
                is_verified: true,
                rejection_reason: '',
                updated_at: new Date().toISOString()
            }

            if (userRole === 'employer') {
                updateData.employer_status = 'approved'
            } else if (userRole === 'jobseeker') {
                updateData.jobseeker_status = 'verified'
            }

            await updateDoc(doc(db, 'users', userId), updateData)

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
                            full_name: user.full_name || user.name
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
        setActionLoading(userId)
        try {
            const updateData = {
                is_verified: false,
                rejection_reason: rejectReason,
                updated_at: new Date().toISOString()
            }

            if (userRole === 'employer') {
                updateData.employer_status = 'rejected'
            } else if (userRole === 'jobseeker') {
                updateData.jobseeker_status = 'rejected'
            }

            await updateDoc(doc(db, 'users', userId), updateData)

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
                            full_name: user.full_name || user.name,
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
            await signOut(auth)
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

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <AdminSidebar
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                userData={userData}
                onLogout={handleLogout}
                onSectionChange={handleSectionChange}
            />

            <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-20'}`}>
                <div className="p-6 lg:p-8 max-w-7xl">
                    {activeSection === 'overview' && (
                        <OverviewSection
                            allUsers={allUsers}
                            employers={employers}
                            employerCounts={employerCounts}
                            jobseekerCounts={jobseekerCounts}
                            setActiveSection={setActiveSection}
                            setActiveTab={setActiveTab}
                        />
                    )}

                    {activeSection === 'employers' && (
                        <EmployerVerificationSection
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
                        />
                    )}

                    {activeSection === 'jobseekers' && (
                        <JobseekerVerificationSection
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
                        />
                    )}

                    {activeSection === 'users' && (
                        <UserManagementSection
                            allUsers={allUsers}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />
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
        </div>
    )
}

export default AdminDashboard
