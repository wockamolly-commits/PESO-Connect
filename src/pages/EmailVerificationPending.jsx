import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Mail, Loader2, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'

const EmailVerificationPending = () => {
    const location = useLocation()
    const [email, setEmail] = useState('')
    const [resending, setResending] = useState(false)
    const [resent, setResent] = useState(false)
    const [error, setError] = useState('')
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
        // Get email from navigation state or localStorage fallback
        const stateEmail = location.state?.email
        if (stateEmail) {
            setEmail(stateEmail)
            try { localStorage.setItem('peso-verify-email', stateEmail) } catch {}
        } else {
            try {
                const cached = localStorage.getItem('peso-verify-email')
                if (cached) setEmail(cached)
            } catch {}
        }
    }, [location.state])

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    const handleResend = async () => {
        if (!email || cooldown > 0) return
        setResending(true)
        setError('')
        setResent(false)

        try {
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (resendError) throw resendError
            setResent(true)
            setCooldown(60) // 60-second cooldown between resends
        } catch (err) {
            console.error('Resend error:', err)
            if (err.message?.includes('rate')) {
                setError('Too many requests. Please wait a few minutes before trying again.')
            } else {
                setError('Failed to resend verification email. Please try again.')
            }
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <img
                        src="/peso-logo.png"
                        alt="PESO Connect"
                        className="w-20 h-20 mx-auto mb-4"
                    />
                </div>

                <div className="card animate-slide-up">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-primary-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                        Check Your Email
                    </h1>

                    <p className="text-gray-600 text-center mb-6">
                        We sent a verification link to{' '}
                        {email ? (
                            <span className="font-semibold text-gray-900">{email}</span>
                        ) : (
                            'your email address'
                        )}
                        . Click the link to verify your account and continue registration.
                    </p>

                    {/* Success message */}
                    {resent && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 mb-4">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">Verification email resent successfully!</p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-4">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Tips */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-600 mb-2 font-medium">
                            Did not receive the email?
                        </p>
                        <ul className="text-sm text-gray-500 space-y-1">
                            <li>Check your spam or junk folder</li>
                            <li>Make sure you entered the correct email</li>
                            <li>The link expires in 24 hours</li>
                        </ul>
                    </div>

                    {/* Resend button */}
                    {email && (
                        <button
                            onClick={handleResend}
                            disabled={resending || cooldown > 0}
                            className="btn-secondary w-full flex items-center justify-center gap-2 mb-4"
                        >
                            {resending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : cooldown > 0 ? (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Resend in {cooldown}s
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>
                    )}

                    {/* Back to login */}
                    <div className="text-center">
                        <Link
                            to="/login"
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default EmailVerificationPending
