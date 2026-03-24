import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, requireVerified = false, allowedRoles = [] }) => {
    const { currentUser, userData, loading, isVerified } = useAuth()
    const location = useLocation()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading...</p>
                </div>
            </div>
        )
    }

    // Not authenticated
    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    // Check role if specified — match against both role and subtype.
    // Use subtype values ('jobseeker', 'homeowner') for subtype-specific routes.
    // Using 'user' grants access to ALL user subtypes.
    if (allowedRoles.length > 0 && userData &&
        !allowedRoles.some(allowed => allowed === userData.role || allowed === userData.subtype)) {
        return <Navigate to="/unauthorized" replace />
    }

    // Check verification if required
    if (requireVerified && !isVerified()) {
        const isRejected = userData?.employer_status === 'rejected'
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
                <div className="card max-w-md text-center">
                    <div className={`w-16 h-16 ${isRejected ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <svg className={`w-8 h-8 ${isRejected ? 'text-red-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {isRejected ? 'Registration Rejected' : 'Account Pending Verification'}
                    </h2>
                    <p className="text-gray-600 mb-4">
                        {isRejected
                            ? 'Your employer registration has been rejected by PESO personnel.'
                            : 'Your account is awaiting verification by the PESO administrator. You will be notified once your account has been verified.'
                        }
                    </p>
                    {isRejected && userData?.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
                            <p className="text-sm text-red-800">
                                <strong>Reason:</strong> {userData.rejection_reason}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="btn-secondary"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return children
}

export default ProtectedRoute
