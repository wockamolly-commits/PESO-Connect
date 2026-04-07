import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'
import { getProfileTable, getStatusField } from '../utils/roles'
import {
    Briefcase,
    Users,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    ArrowRight,
    Search,
    Plus,
    Eye,
    MessageSquare,
    RefreshCw,
    Mail
} from 'lucide-react'

const Dashboard = () => {
    const { userData, currentUser, fetchUserData, isVerified, isEmailVerified, isEmployer, isJobseeker, isAdmin, isHomeowner } = useAuth()
    const [resubmitting, setResubmitting] = useState(false)
    const [employerStats, setEmployerStats] = useState({ activeJobs: 0, totalApplications: 0, loading: true })

    // Fetch employer stats
    useEffect(() => {
        if (!isEmployer() || !currentUser) return
        const fetchStats = async () => {
            try {
                const { count: jobCount } = await supabase
                    .from('job_postings')
                    .select('*', { count: 'exact', head: true })
                    .eq('employer_id', currentUser.uid)
                    .eq('status', 'open')

                const { data: jobs } = await supabase
                    .from('job_postings')
                    .select('id')
                    .eq('employer_id', currentUser.uid)

                let appCount = 0
                if (jobs && jobs.length > 0) {
                    const jobIds = jobs.map(j => j.id)
                    const { count } = await supabase
                        .from('applications')
                        .select('*', { count: 'exact', head: true })
                        .in('job_id', jobIds)
                    appCount = count || 0
                }

                setEmployerStats({ activeJobs: jobCount || 0, totalApplications: appCount, loading: false })
            } catch (err) {
                console.error('Failed to fetch employer stats:', err)
                setEmployerStats(prev => ({ ...prev, loading: false }))
            }
        }
        fetchStats()
    }, [currentUser, isEmployer])

    const jobseekerQuickActions = [
        { path: '/jobs', label: 'Browse Jobs', icon: Search, color: 'bg-blue-500' },
        { path: '/my-applications', label: 'My Applications', icon: FileText, color: 'bg-purple-500' },
        { path: '/diagnostic', label: 'Find Workers', icon: Users, color: 'bg-green-500' },
        { path: '/messages', label: 'Messages', icon: MessageSquare, color: 'bg-indigo-500' },
    ]

    const employerQuickActions = [
        { path: '/post-job', label: 'Post New Job', icon: Plus, color: 'bg-green-500' },
        { path: '/my-listings', label: 'My Job Listings', icon: Briefcase, color: 'bg-blue-500' },
        { path: '/diagnostic', label: 'Find Workers', icon: Search, color: 'bg-purple-500' },
        { path: '/messages', label: 'Messages', icon: MessageSquare, color: 'bg-indigo-500' },
    ]

    const homeownerQuickActions = [
        { path: '/diagnostic', label: 'Find Workers', icon: Search, color: 'bg-emerald-500' },
        { path: '/messages', label: 'Messages', icon: MessageSquare, color: 'bg-indigo-500' },
    ]

    const quickActions = isHomeowner()
        ? homeownerQuickActions
        : isEmployer()
            ? employerQuickActions
            : jobseekerQuickActions

    const completion = userData ? calculateCompletion(userData) : { percentage: 0, missing: [] }
    const editPath = isEmployer() ? '/profile/edit/employer'
        : isHomeowner() ? '/profile/edit/homeowner'
        : '/profile/edit'

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome back, {userData?.name?.split(' ')[0] || 'User'}!
                    </h1>
                    <p className="text-gray-600">
                        Here is what is happening with your PESO Connect account.
                    </p>
                </div>

                {/* Incomplete Registration Banner */}
                {userData?.registration_complete === false && (
                    <div className="card mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-800 mb-1">Complete Your Registration</h3>
                                <p className="text-blue-700 text-sm mb-3">
                                    Your registration is not yet complete. Finish setting up your profile to unlock all platform features.
                                </p>
                                <Link to="/register/continue" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
                                    Continue Registration <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Verification Status Banner (not shown for homeowner accounts) */}
                {!isVerified() && !isHomeowner() && (() => {
                    const verificationStatus = isJobseeker() ? userData?.jobseeker_status : userData?.employer_status;
                    const isRejected = verificationStatus === 'rejected';
                    return (
                    <div className={`card mb-8 ${isRejected
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                        : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                        }`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 ${isRejected ? 'bg-red-100' : 'bg-yellow-100'
                                } rounded-xl flex items-center justify-center flex-shrink-0`}>
                                {isRejected
                                    ? <AlertCircle className="w-6 h-6 text-red-600" />
                                    : <Clock className="w-6 h-6 text-yellow-600" />
                                }
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-semibold mb-1 ${isRejected ? 'text-red-800' : 'text-yellow-800'
                                    }`}>
                                    {isRejected
                                        ? 'Registration Rejected'
                                        : 'Account Pending Review'
                                    }
                                </h3>
                                <p className={`text-sm ${isRejected ? 'text-red-700' : 'text-yellow-700'
                                    }`}>
                                    {isRejected
                                        ? `Your ${isJobseeker() ? 'jobseeker' : 'employer'} registration was not approved by PESO.`
                                        : `Your account is awaiting verification by the PESO administrator. Once verified, you will be able to ${isEmployer() ? 'post jobs' : 'apply to jobs'}.`
                                    }
                                </p>
                                {isRejected && userData?.rejection_reason && (
                                    <div className="mt-2 p-3 bg-red-100/50 rounded-lg">
                                        <p className="text-sm text-red-800">
                                            <strong>Reason:</strong> {userData.rejection_reason}
                                        </p>
                                    </div>
                                )}
                                {isRejected && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Link to="/profile" className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2">
                                            Edit Profile <ArrowRight className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={async () => {
                                                setResubmitting(true)
                                                try {
                                                    const profileTable = getProfileTable(userData.role, userData.subtype)
                                                    const statusField = getStatusField(userData.role, userData.subtype)
                                                    await supabase.from(profileTable).update({
                                                        [statusField]: 'pending',
                                                        rejection_reason: null
                                                    }).eq('id', currentUser.uid)
                                                    await fetchUserData(currentUser.uid)
                                                } catch (err) {
                                                    console.error('Re-review request failed:', err)
                                                } finally {
                                                    setResubmitting(false)
                                                }
                                            }}
                                            disabled={resubmitting}
                                            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${resubmitting ? 'animate-spin' : ''}`} />
                                            {resubmitting ? 'Requesting...' : 'Request Re-Review'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                })()}

                {currentUser && !isEmailVerified() && !isAdmin() && (
                    <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Mail className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-800 mb-1">Verify Your Email</h3>
                                <p className="text-blue-700 text-sm">
                                    Please verify your email (<strong>{currentUser?.email}</strong>) using the 6-digit code we sent you. You won't be able to apply for jobs until your email is verified.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isVerified() && (
                    <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-green-800 mb-1">Account Verified</h3>
                                <p className="text-green-700 text-sm">
                                    Your account has been verified by PESO. You have full access to all platform features.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Profile Completion */}
                {completion.percentage < 100 && (
                    <div className="mb-8">
                        <ProfileCompletionBar
                            percentage={completion.percentage}
                            missing={completion.missing}
                            editPath={editPath}
                        />
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => (
                            <Link
                                key={index}
                                to={action.path}
                                className="card card-hover text-center group"
                            >
                                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                                    <action.icon className="w-6 h-6 text-white" />
                                </div>
                                <p className="font-medium text-gray-900">{action.label}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Profile Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Name</span>
                                <span className="font-medium text-gray-900">{userData?.name || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Email</span>
                                <span className="font-medium text-gray-900">{userData?.email || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Role</span>
                                <span className="font-medium text-gray-900 capitalize">{userData?.subtype || userData?.role || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status</span>
                                {(() => {
                                    const sf = getStatusField(userData?.role, userData?.subtype)
                                    const status = sf ? userData?.[sf] : null;
                                    if (isVerified()) return <span className="badge badge-success">Verified</span>;
                                    if (status === 'rejected') return <span className="badge badge-error">Rejected</span>;
                                    return <span className="badge badge-warning">Pending</span>;
                                })()}
                            </div>
                        </div>
                        <Link to="/profile" className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
                            Edit Profile <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Skills (Jobseekers) */}
                    {isJobseeker() && (
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Skills</h3>
                            {(() => {
                                const allSkills = [...(userData?.predefined_skills || []), ...(userData?.skills || [])]
                                return allSkills.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {allSkills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No skills added yet.</p>
                                )
                            })()}
                            <Link to="/profile" className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
                                Update Skills <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}

                    {/* Quick Stats (Employers) */}
                    {isEmployer() && (
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {employerStats.loading ? '–' : employerStats.activeJobs}
                                    </p>
                                    <p className="text-sm text-blue-700">Active Jobs</p>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {employerStats.loading ? '–' : employerStats.totalApplications}
                                    </p>
                                    <p className="text-sm text-green-700">Applications</p>
                                </div>
                            </div>
                            <Link to="/my-listings" className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Admin Link */}
                {isAdmin() && (
                    <div className="mt-6">
                        <Link to="/admin" className="card bg-gradient-to-r from-purple-500 to-indigo-600 text-white block hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Eye className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Admin Dashboard</h3>
                                        <p className="text-purple-100 text-sm">Manage users, jobs, and platform settings</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-6 h-6" />
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Dashboard
