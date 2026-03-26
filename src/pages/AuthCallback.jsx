import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../config/supabase'

const AuthCallback = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { currentUser, userData, loading } = useAuth()
    const [error, setError] = useState('')
    const [processing, setProcessing] = useState(true)

    useEffect(() => {
        // Check for error params from Supabase (expired/invalid link)
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const errorCode = searchParams.get('error_code')

        if (errorParam) {
            let message = 'Email verification failed.'
            if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
                message = 'This verification code has expired. Please request a new one.'
            } else if (errorDescription) {
                message = errorDescription.replace(/\+/g, ' ')
            }
            setError(message)
            setProcessing(false)
            return
        }

        // No manual exchangeCodeForSession — the Supabase client automatically
        // detects the ?code= param and exchanges it during onAuthStateChange init.
        // Calling it manually caused lock contention + 422 (double exchange).
    }, [searchParams])

    // Once auth state settles, redirect based on user state
    useEffect(() => {
        if (loading || error) return

        // Still waiting for session to be established
        if (!currentUser) {
            // Give it a moment — Supabase client processes hash tokens async
            const timeout = setTimeout(() => {
                if (!currentUser) {
                    setProcessing(false)
                    // If no session after waiting, tokens may have been processed already
                    // or the page was visited directly. Check if there's a valid session.
                    supabase.auth.getSession().then(({ data }) => {
                        if (!data.session) {
                            setError('No active session. Please sign in.')
                        }
                    })
                }
            }, 5000)
            return () => clearTimeout(timeout)
        }

        // Session exists — redirect based on registration state
        if (userData !== null) {
            // Clean up verification email from localStorage
            try { localStorage.removeItem('peso-verify-email') } catch {}

            if (userData.registration_complete === false) {
                navigate('/register/continue', { replace: true })
            } else {
                navigate('/dashboard', { replace: true })
            }
        }
        // If userData is null but currentUser exists, fetchUserData is still running
        // The AuthContext useEffect will populate userData
    }, [currentUser, userData, loading, error, navigate])

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <img
                            src="/peso-logo.png"
                            alt="PESO Connect"
                            className="w-20 h-20 mx-auto mb-4"
                        />
                    </div>

                    <div className="card text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Verification Failed
                        </h1>

                        <p className="text-gray-600 mb-6">{error}</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/verify-email')}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Request New Code
                            </button>

                            <button
                                onClick={() => navigate('/login')}
                                className="btn-secondary w-full"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Verifying your email...
                </h2>
                <p className="text-gray-600">Please wait while we confirm your account.</p>
            </div>
        </div>
    )
}

export default AuthCallback
