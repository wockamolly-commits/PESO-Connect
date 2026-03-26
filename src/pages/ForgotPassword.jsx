import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Loader2, AlertCircle, ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react'

const ForgotPassword = () => {
    const location = useLocation()
    const [email, setEmail] = useState(location.state?.email || '')
    const [code, setCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(location.state?.step === 2 ? 2 : 1)
    const [cooldown, setCooldown] = useState(location.state?.step === 2 ? 60 : 0)
    const fromSettings = location.state?.fromSettings || false
    const cooldownRef = useRef(null)
    const navigate = useNavigate()

    const { sendPasswordResetOtp, verifyPasswordResetOtp } = useAuth()

    // Countdown timer for resend button
    useEffect(() => {
        if (cooldown <= 0) {
            clearInterval(cooldownRef.current)
            return
        }
        cooldownRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(cooldownRef.current)
    }, [cooldown])

    const handleSendCode = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await sendPasswordResetOtp(email)
            setStep(2)
            setCooldown(60)
        } catch (err) {
            console.error('Send OTP error:', err)
            if (err.message?.includes('rate') || err.status === 429) {
                setError('Too many requests. Please wait a few minutes and try again.')
            } else {
                // Don't reveal whether the email exists
                setStep(2)
                setCooldown(60)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyCode = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await verifyPasswordResetOtp(email, code, newPassword, { keepSession: fromSettings })
            if (fromSettings) {
                navigate('/settings', { state: { message: 'Password changed successfully.' } })
            } else {
                navigate('/login', { state: { message: 'Password reset successfully. Please sign in with your new password.' } })
            }
        } catch (err) {
            console.error('Verify OTP error:', err)
            const msg = err.message?.toLowerCase() || ''
            if (msg.includes('expired') || msg.includes('otp_expired')) {
                setError('That code has expired. Please request a new one.')
            } else if (msg.includes('invalid') || msg.includes('otp_invalid') || msg.includes('token')) {
                setError('Incorrect code. Please check and try again.')
            } else {
                setError('Something went wrong. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (cooldown > 0) return
        setError('')
        try {
            await sendPasswordResetOtp(email)
            setCooldown(60)
        } catch {
            setError('Failed to resend code. Please try again.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
            <div className="w-full max-w-md">
                {/* Logo and Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <img
                        src="/peso-logo.png"
                        alt="PESO Connect"
                        className="w-20 h-20 mx-auto mb-4"
                    />
                    <h1 className="text-3xl font-bold gradient-text">
                        Reset Password
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {step === 1
                            ? 'Enter your email to receive a 6-digit code'
                            : `Enter the code we sent to ${email}`
                        }
                    </p>
                </div>

                <div className="card animate-slide-up">
                    <div className="flex items-center justify-center mb-6">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/25">
                            {step === 1 ? (
                                <KeyRound className="w-7 h-7 text-white" />
                            ) : (
                                <ShieldCheck className="w-7 h-7 text-white" />
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {step === 1 ? (
                        /* ─── Step 1: Email Input ─── */
                        <form onSubmit={handleSendCode} className="space-y-6">
                            <div>
                                <label className="label">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            setError('')
                                        }}
                                        className="input-field pl-12"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email.trim()}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending code...
                                    </>
                                ) : (
                                    'Send Reset Code'
                                )}
                            </button>
                        </form>
                    ) : (
                        /* ─── Step 2: Code + New Password ─── */
                        <form onSubmit={handleVerifyCode} className="space-y-6">
                            <div>
                                <label className="label">6-Digit Code</label>
                                <div className="relative">
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
                            </div>

                            <div>
                                <label className="label">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value)
                                            setError('')
                                        }}
                                        className="input-field pl-12"
                                        placeholder="Enter new password"
                                        minLength={6}
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6 || !newPassword.trim()}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Resetting password...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={cooldown > 0}
                                    className="text-primary-600 hover:text-primary-700 font-semibold text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-primary-600 hover:text-primary-700 font-semibold text-sm inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
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

export default ForgotPassword
