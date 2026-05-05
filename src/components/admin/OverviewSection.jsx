import {
    Users, CheckCircle, XCircle, Clock,
    Building2, Activity, ChevronRight, AlertTriangle
} from 'lucide-react'
import { hasAdminPermission, isSuperAdmin } from '../../utils/adminPermissions'

const StatCard = ({ label, value, color, dotColor, icon: Icon }) => (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
        <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${color}`} />
        <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg opacity-90`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
    </div>
)

const ProgressBar = ({ label, count, color, total }) => (
    <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-slate-300">{label}</span>
            <span className="text-white font-semibold">{count}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
                className={`h-full ${color} rounded-full transition-all duration-700`}
                style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
            />
        </div>
    </div>
)

const OverviewSection = ({ allUsers: rawAllUsers, employers: rawEmployers, dashboardCounts = {}, employerCounts: rawEmployerCounts, jobseekerCounts: rawJobseekerCounts, setActiveSection, setActiveTab, adminAccess }) => {
    const isSuper = isSuperAdmin(adminAccess)

    // Granular overview permissions
    const canViewOverall = isSuper || hasAdminPermission(adminAccess, 'view_overall_overview')
    const canViewEmployerOverview = isSuper || hasAdminPermission(adminAccess, 'view_employer_overview')
    const canViewJobseekerOverview = isSuper || hasAdminPermission(adminAccess, 'view_jobseeker_overview')

    // ── Defensive data scoping ──
    // Strip anything outside this admin's overview permission scope.
    const ZERO_COUNTS = { pending: 0, approved: 0, verified: 0, rejected: 0, expired: 0, total: 0 }
    const employerCounts = (canViewOverall || canViewEmployerOverview) ? rawEmployerCounts : ZERO_COUNTS
    const jobseekerCounts = (canViewOverall || canViewJobseekerOverview) ? rawJobseekerCounts : ZERO_COUNTS

    const allUsers = isSuper
        ? rawAllUsers
        : rawAllUsers.filter(u => {
            if ((canViewOverall || canViewEmployerOverview) && u.role === 'employer') return true
            if ((canViewOverall || canViewJobseekerOverview) && u.role === 'user' && u.subtype === 'jobseeker') return true
            return false
        })
    const employers = (canViewOverall || canViewEmployerOverview) ? rawEmployers : []
    const totalUsers = dashboardCounts['users.total'] ?? allUsers.length
    const roleCounts = {
        jobseekers: dashboardCounts['jobseekers.total'] ?? allUsers.filter(u => u.role === 'user' && u.subtype === 'jobseeker').length,
        homeowners: dashboardCounts['users.homeowners'] ?? allUsers.filter(u => u.role === 'user' && u.subtype === 'homeowner').length,
        employers: dashboardCounts['employers.total'] ?? employers.length,
        admins: dashboardCounts['users.admins'] ?? allUsers.filter(u => u.role === 'admin').length,
    }

    // Build stat cards based on permissions
    const stats = []

    if (canViewOverall) {
        stats.push({ label: 'Total Users', value: totalUsers, color: 'from-indigo-500 to-indigo-600', dotColor: 'bg-indigo-400', icon: Users })
        stats.push({ label: 'Pending Review', value: employerCounts.pending + jobseekerCounts.pending, color: 'from-amber-500 to-orange-500', dotColor: 'bg-amber-400', icon: Clock })
        stats.push({ label: 'Verified', value: employerCounts.approved + jobseekerCounts.verified, color: 'from-emerald-500 to-green-500', dotColor: 'bg-emerald-400', icon: CheckCircle })
        stats.push({ label: 'Expired', value: (employerCounts.expired || 0) + (jobseekerCounts.expired || 0), color: 'from-orange-500 to-amber-500', dotColor: 'bg-orange-400', icon: AlertTriangle })
        stats.push({ label: 'Rejected', value: employerCounts.rejected + jobseekerCounts.rejected, color: 'from-red-500 to-rose-500', dotColor: 'bg-red-400', icon: XCircle })
    } else if (canViewEmployerOverview && !canViewJobseekerOverview) {
        stats.push({ label: 'Total Employers', value: employerCounts.total, color: 'from-violet-500 to-purple-500', dotColor: 'bg-violet-400', icon: Building2 })
        stats.push({ label: 'Pending', value: employerCounts.pending, color: 'from-amber-500 to-orange-500', dotColor: 'bg-amber-400', icon: Clock })
        stats.push({ label: 'Approved', value: employerCounts.approved, color: 'from-emerald-500 to-green-500', dotColor: 'bg-emerald-400', icon: CheckCircle })
        stats.push({ label: 'Expired', value: employerCounts.expired || 0, color: 'from-orange-500 to-amber-500', dotColor: 'bg-orange-400', icon: AlertTriangle })
        stats.push({ label: 'Rejected', value: employerCounts.rejected, color: 'from-red-500 to-rose-500', dotColor: 'bg-red-400', icon: XCircle })
    } else if (canViewJobseekerOverview && !canViewEmployerOverview) {
        stats.push({ label: 'Total Jobseekers', value: jobseekerCounts.total, color: 'from-blue-500 to-cyan-500', dotColor: 'bg-blue-400', icon: Users })
        stats.push({ label: 'Pending', value: jobseekerCounts.pending, color: 'from-amber-500 to-orange-500', dotColor: 'bg-amber-400', icon: Clock })
        stats.push({ label: 'Verified', value: jobseekerCounts.verified, color: 'from-emerald-500 to-green-500', dotColor: 'bg-emerald-400', icon: CheckCircle })
        stats.push({ label: 'Expired', value: jobseekerCounts.expired || 0, color: 'from-orange-500 to-amber-500', dotColor: 'bg-orange-400', icon: AlertTriangle })
        stats.push({ label: 'Rejected', value: jobseekerCounts.rejected, color: 'from-red-500 to-rose-500', dotColor: 'bg-red-400', icon: XCircle })
    } else if (canViewEmployerOverview && canViewJobseekerOverview) {
        // Both scoped permissions but NOT view_overall_overview — show scoped combined
        stats.push({ label: 'Employers', value: employerCounts.total, color: 'from-violet-500 to-purple-500', dotColor: 'bg-violet-400', icon: Building2 })
        stats.push({ label: 'Jobseekers', value: jobseekerCounts.total, color: 'from-blue-500 to-cyan-500', dotColor: 'bg-blue-400', icon: Users })
        stats.push({ label: 'Pending Review', value: employerCounts.pending + jobseekerCounts.pending, color: 'from-amber-500 to-orange-500', dotColor: 'bg-amber-400', icon: Clock })
        stats.push({ label: 'Verified', value: employerCounts.approved + (jobseekerCounts.verified || 0), color: 'from-emerald-500 to-green-500', dotColor: 'bg-emerald-400', icon: CheckCircle })
        stats.push({ label: 'Rejected', value: employerCounts.rejected + jobseekerCounts.rejected, color: 'from-red-500 to-rose-500', dotColor: 'bg-red-400', icon: XCircle })
    }

    const scopeLabel = canViewOverall
        ? 'Platform statistics and recent activity'
        : canViewEmployerOverview && canViewJobseekerOverview
            ? 'Employer & Jobseeker statistics for your assigned scope'
            : canViewEmployerOverview
                ? 'Employer statistics for your assigned scope'
                : 'Jobseeker statistics for your assigned scope'

    return (
        <div className="animate-fade-in">
            {/* Section header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h2>
                <p className="text-slate-400 text-sm">{scopeLabel}</p>
            </div>

            {/* Stat cards */}
            <div className={`grid grid-cols-2 ${stats.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 mb-8`}>
                {stats.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            {/* Role breakdown — only for view_overall_overview */}
            {canViewOverall && (
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            Users by Role
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Jobseekers', count: roleCounts.jobseekers, color: 'bg-blue-500' },
                                { label: 'Homeowners', count: roleCounts.homeowners, color: 'bg-emerald-500' },
                                { label: 'Employers', count: roleCounts.employers, color: 'bg-violet-500' },
                                { label: 'Admins', count: roleCounts.admins, color: 'bg-indigo-500' },
                            ].map((item, i) => (
                                <ProgressBar key={i} {...item} total={totalUsers} />
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <Building2 className="w-4 h-4 text-violet-400" />
                            Employer Status
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Pending', count: employerCounts.pending, color: 'bg-amber-500' },
                                { label: 'Approved', count: employerCounts.approved, color: 'bg-emerald-500' },
                                { label: 'Expired', count: employerCounts.expired || 0, color: 'bg-orange-500' },
                                { label: 'Rejected', count: employerCounts.rejected, color: 'bg-red-500' },
                            ].map((item, i) => (
                                <ProgressBar key={i} {...item} total={employerCounts.total} />
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                            <Users className="w-4 h-4 text-blue-400" />
                            Jobseeker Status
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Pending', count: jobseekerCounts.pending, color: 'bg-amber-500' },
                                { label: 'Verified', count: jobseekerCounts.verified, color: 'bg-emerald-500' },
                                { label: 'Expired', count: jobseekerCounts.expired || 0, color: 'bg-orange-500' },
                                { label: 'Rejected', count: jobseekerCounts.rejected, color: 'bg-red-500' },
                            ].map((item, i) => (
                                <ProgressBar key={i} {...item} total={jobseekerCounts.total} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Scoped breakdown — sub-admins without view_overall_overview */}
            {!canViewOverall && (
                <div className="grid md:grid-cols-1 gap-4 mb-8 max-w-lg">
                    {canViewEmployerOverview && (
                        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Building2 className="w-4 h-4 text-violet-400" />
                                Employer Status Breakdown
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Pending', count: employerCounts.pending, color: 'bg-amber-500' },
                                    { label: 'Approved', count: employerCounts.approved, color: 'bg-emerald-500' },
                                    { label: 'Expired', count: employerCounts.expired || 0, color: 'bg-orange-500' },
                                    { label: 'Rejected', count: employerCounts.rejected, color: 'bg-red-500' },
                                ].map((item, i) => (
                                    <ProgressBar key={i} {...item} total={employerCounts.total} />
                                ))}
                            </div>
                        </div>
                    )}
                    {canViewJobseekerOverview && (
                        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                <Users className="w-4 h-4 text-blue-400" />
                                Jobseeker Status Breakdown
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Pending', count: jobseekerCounts.pending, color: 'bg-amber-500' },
                                    { label: 'Verified', count: jobseekerCounts.verified, color: 'bg-emerald-500' },
                                    { label: 'Expired', count: jobseekerCounts.expired || 0, color: 'bg-orange-500' },
                                    { label: 'Rejected', count: jobseekerCounts.rejected, color: 'bg-red-500' },
                                ].map((item, i) => (
                                    <ProgressBar key={i} {...item} total={jobseekerCounts.total} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick actions — only show sections the admin has access to */}
            <div className="space-y-4">
                {(canViewOverall || canViewEmployerOverview) && employerCounts.pending > 0 && (
                    <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <p className="text-violet-200 font-medium text-sm">{employerCounts.pending} employer{employerCounts.pending !== 1 ? 's' : ''} awaiting review</p>
                                <p className="text-violet-300/60 text-xs">Review pending employer applications</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setActiveSection('employers'); setActiveTab('pending') }}
                            className="px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                            Review Now <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {(canViewOverall || canViewJobseekerOverview) && jobseekerCounts.pending > 0 && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-blue-200 font-medium text-sm">{jobseekerCounts.pending} jobseeker{jobseekerCounts.pending !== 1 ? 's' : ''} awaiting review</p>
                                <p className="text-blue-300/60 text-xs">Review pending jobseeker registrations</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setActiveSection('jobseekers'); setActiveTab('pending') }}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
                        >
                            Review Now <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export { OverviewSection }
export default OverviewSection
