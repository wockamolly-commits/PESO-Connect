import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { isVerificationExpired } from '../utils/verificationUtils'

const ProtectedRoute = ({ children, requireVerified = false, allowedRoles = [] }) => {
    const { currentUser, userData, loading, isVerified, isEmailVerified } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

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

    // Email not verified — redirect to verification pending page
    if (!isEmailVerified()) {
        return <Navigate to="/verify-email" state={{ email: currentUser.email }} replace />
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
        const employerStatus = userData?.employer_status
        const jobseekerStatus = userData?.jobseeker_status
        const isRejected = employerStatus === 'rejected' || jobseekerStatus === 'rejected'
        // The DB cron flips status to 'expired' annually; until it runs, the
        // client also flags users whose verified_for_year is stale.
        const isExpired =
            employerStatus === 'expired'
            || jobseekerStatus === 'expired'
            || isVerificationExpired(userData)

        let heading, body, iconColor, bgColor
        if (isExpired) {
            heading = 'Annual Verification Expired'
            body = 'Your PESO verification from the previous year has expired. Annual re-verification is required. Please contact your local PESO office to renew your verification for this year.'
            iconColor = 'text-orange-500'
            bgColor = 'bg-orange-100'
        } else if (isRejected) {
            heading = 'Registration Rejected'
            body = 'Your registration has been rejected by PESO personnel.'
            iconColor = 'text-red-600'
            bgColor = 'bg-red-100'
        } else {
            heading = 'Account Pending Verification'
            body = 'Your account is awaiting verification by the PESO administrator. You will be notified once your account has been verified.'
            iconColor = 'text-yellow-600'
            bgColor = 'bg-yellow-100'
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
                <div className="card max-w-md text-center">
                    <div className={`w-16 h-16 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{heading}</h2>
                    <p className="text-gray-600 mb-4">{body}</p>
                    {isRejected && userData?.rejection_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
                            <p className="text-sm text-red-800">
                                <strong>Reason:</strong> {userData.rejection_reason}
                            </p>
                        </div>
                    )}
                    {/*
                      Rejected users can update their submission from the
                      profile page; expired/pending users have nothing to
                      self-service so they go to the dashboard. Using
                      react-router navigate (not window.location.href)
                      avoids a full page reload and preserves auth state.
                      Neither destination is gated by requireVerified, so
                      there is no redirect loop back into this screen.
                    */}
                    <button
                        onClick={() => navigate(isRejected ? '/profile' : '/dashboard')}
                        className="btn-secondary"
                    >
                        {isRejected ? 'Update Profile' : 'Return to Dashboard'}
                    </button>
                </div>
            </div>
        )
    }

    return children
}

export default ProtectedRoute
