import { Shield, Building2, User, Loader2 } from 'lucide-react'
import { SearchAndFilters } from './SearchAndFilters'

const UserManagementSection = ({
    allUsers,
    totalCount,
    hasMore,
    isFetching,
    isLoadingMore,
    onLoadMore,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    sortOrder,
    setSortOrder,
}) => {
    const getDisplayName = (user) => user.company_name || user.representative_name || user.full_name || user.name
    const getRoleLabel = (user) => user.role_label || user.subtype || user.role
    const getStatusLabel = (user) => {
        if (user.verification_status === 'approved') {
            return getRoleLabel(user) === 'jobseeker' ? 'Verified' : 'Approved'
        }

        if (user.verification_status === 'rejected') return 'Rejected'
        if (user.verification_status === 'expired') return 'Expired'
        return 'Pending'
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">User Management</h2>
                <p className="text-slate-400 text-sm">All registered users on the platform</p>
            </div>

            <SearchAndFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchPlaceholder="Search by name, email, or company..."
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filters={filters}
                setFilters={setFilters}
                filterType="users"
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                showRoleFilter
            />

            <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <p>Showing {allUsers.length} of {totalCount} users</p>
                <p>Sorted by Created Date {sortOrder === 'desc' ? '(latest first)' : '(oldest first)'}</p>
            </div>

            {/* Users table */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">User</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Role</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Status</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {!isLoadingMore && isFetching && allUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-5 py-10 text-center text-sm text-slate-500">Loading users...</td>
                                </tr>
                            ) : allUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-5 py-10 text-center text-sm text-slate-500">No users found.</td>
                                </tr>
                            ) : allUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${user.role === 'admin' ? 'bg-indigo-500/15' : user.role === 'employer' ? 'bg-violet-500/15' : 'bg-blue-500/15'
                                                }`}>
                                                {user.role === 'admin'
                                                    ? <Shield className="w-4 h-4 text-indigo-400" />
                                                    : user.role === 'employer'
                                                        ? <Building2 className="w-4 h-4 text-violet-400" />
                                                        : <User className="w-4 h-4 text-blue-400" />
                                                }
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{getDisplayName(user) || '\u2014'}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${user.role === 'admin' ? 'bg-indigo-500/15 text-indigo-400'
                                                : user.role === 'employer' ? 'bg-violet-500/15 text-violet-400'
                                                    : 'bg-blue-500/15 text-blue-400'
                                            }`}>
                                            {getRoleLabel(user)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-medium ${user.verification_status === 'approved' ? 'text-emerald-400' : user.verification_status === 'rejected' ? 'text-red-400' : user.verification_status === 'expired' ? 'text-orange-400' : 'text-amber-400'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.verification_status === 'approved' ? 'bg-emerald-400' : user.verification_status === 'rejected' ? 'bg-red-400' : user.verification_status === 'expired' ? 'bg-orange-400' : 'bg-amber-400'
                                                }`} />
                                            {getStatusLabel(user)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '\u2014'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {hasMore && (
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 text-sm font-medium hover:bg-slate-800/60 disabled:opacity-60 transition-colors"
                    >
                        {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLoadingMore ? 'Loading more...' : 'Load more users'}
                    </button>
                </div>
            )}
        </div>
    )
}

export { UserManagementSection }
export default UserManagementSection
