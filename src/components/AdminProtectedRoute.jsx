import { createContext, useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { hasAdminPermission, isSuperAdmin } from '../utils/adminPermissions'

// ----------------------------------------------------------------
// AdminRBACContext
// Provides adminLevel, permissions[], hasPermission(), and isSuperAdmin
// to any component nested under AdminProtectedRoute.
// ----------------------------------------------------------------
const AdminRBACContext = createContext(null)

export const useAdminRBAC = () => {
    const ctx = useContext(AdminRBACContext)
    if (!ctx) throw new Error('useAdminRBAC must be used inside AdminProtectedRoute')
    return ctx
}

// ----------------------------------------------------------------
// AdminProtectedRoute
// Replaces the generic ProtectedRoute for all /admin/* routes.
// Guarantees:
//   1. User is authenticated
//   2. Email is verified
//   3. role === 'admin'
//   4. adminAccess row exists (fetched by AuthContext on login)
// Then mounts AdminRBACContext so child pages don't need to
// re-fetch or re-check their own permissions.
// ----------------------------------------------------------------
const AdminProtectedRoute = ({ children }) => {
    const { currentUser, userData, adminAccess, loading, isEmailVerified } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Loading admin panel...</p>
                </div>
            </div>
        )
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />
    }

    if (!isEmailVerified()) {
        return <Navigate to="/verify-email" state={{ email: currentUser.email }} replace />
    }

    if (userData?.role !== 'admin') {
        return <Navigate to="/unauthorized" replace />
    }

    // adminAccess may still be null if the admin_access row is missing.
    // Show a clear error rather than a silent blank screen.
    if (userData && !adminAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-sm text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No Access Record</h2>
                    <p className="text-slate-400 text-sm">
                        Your admin account exists but has no <code className="text-slate-300">admin_access</code> row.
                        Ask a super-admin to set up your permissions.
                    </p>
                </div>
            </div>
        )
    }

    const rbacValue = {
        adminLevel: adminAccess.admin_level,
        permissions: adminAccess.permissions || [],
        hasPermission: (perm) => hasAdminPermission(adminAccess, perm),
        isSuperAdmin: isSuperAdmin(adminAccess),
        adminAccess,
    }

    return (
        <AdminRBACContext.Provider value={rbacValue}>
            {children}
        </AdminRBACContext.Provider>
    )
}

export default AdminProtectedRoute
