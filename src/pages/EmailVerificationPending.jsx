import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Loader2, CheckCircle, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react'

const EmailVerificationPending = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { sendSignupOtp, verifySignupOtp } = useAuth()
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [resending, setResending] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [resent, setResent] = useState(false)
    const [error, setError] = useState('')
    const [cooldown, setCooldown] = useState(0)

    useEffect(() => {
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
            await sendSignupOtp(email)
            setResent(true)
            setCooldown(60)
        } catch (err) {
            console.error('Resend error:', err)
            if (err.message?.includes('rate')) {
                setError('Too many requests. Please wait a few minutes before trying again.')
            } else {
                setError('Failed to resend verification code. Please try again.')
            }
        } finally {
            setResending(false)
        }
    }

    const handleVerify = async (e) => {
        e.preventDefault()
        setError('')
        setVerifying(true)

        try {
            await verifySignupOtp(email, code)
            try { localStorage.removeItem('peso-verify-email') } catch {}
            navigate('/register/continue', { replace: true })
        } catch (err) {
            console.error('Verify OTP error:', err)
            const msg = err.message?.toLowerCase() || ''
            if (msg.includes('expired') || msg.includes('otp_expired')) {
                setError('That code has expired. Please request a new one.')
            } else if (msg.includes('invalid') || msg.includes('otp_invalid') || msg.includes('token')) {
                setError('Incorrect code. Please check and try again.')
            } else {
                setError('Verification failed. Please try again.')
            }
        } finally {
            setVerifying(false)
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
                        Verify Your Email
                    </h1>

                    <p className="text-gray-600 text-center mb-6">
                        We sent a 6-digit code to{' '}
                        {email ? (
                            <span className="font-semibold text-gray-900">{email}</span>
                        ) : (
                            'your email address'
                        )}
                        . Enter the code below to verify your account.
                    </p>

                    {/* Success message */}
                    {resent && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 mb-4">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">Verification code resent successfully!</p>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-4">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* OTP input form */}
                    <form onSubmit={handleVerify} className="mb-6">
                        <label className="label">6-Digit Code</label>
                        <div className="relative mb-4">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    setCode(val)
                                    setError('')
                                }}
                                className="input-field pl-12 text-center tracking-[0.3em] text-lg font-mono"
                                placeholder="000000"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={verifying || code.length !== 6}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {verifying ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify Email'
                            )}
                        </button>
                    </form>

                    {/* Tips */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-600 mb-2 font-medium">
                            Did not receive the code?
                        </p>
                        <ul className="text-sm text-gray-500 space-y-1">
                            <li>Check your spam or junk folder</li>
                            <li>Make sure you entered the correct email</li>
                            <li>The code expires in 60 minutes</li>
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
                                    Resend Code
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
