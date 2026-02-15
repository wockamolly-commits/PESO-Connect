import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const { resetPassword } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await resetPassword(email)
            setSent(true)
        } catch (err) {
            console.error('Password reset error:', err)
            if (err.code === 'auth/user-not-found') {
                // Security: don't reveal whether the email exists
                setSent(true)
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many requests. Please wait a few minutes and try again.')
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.')
            } else {
                setError('Something went wrong. Please try again.')
            }
        } finally {
            setLoading(false)
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
                        {sent ? 'Check Your Email' : 'Reset Password'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {sent
                            ? 'We sent you a password reset link'
                            : 'Enter your email to receive a reset link'
                        }
                    </p>
                </div>

                <div className="card animate-slide-up">
                    {sent ? (
                        /* ─── Success State ─── */
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">Email Sent!</h2>
                            <p className="text-gray-600 text-sm mb-2">
                                If an account exists for <span className="font-semibold text-gray-800">{email}</span>,
                                you'll receive a password reset link shortly.
                            </p>
                            <p className="text-gray-500 text-xs mb-6">
                                Don't see it? Check your spam or junk folder.
                            </p>

                            <div className="space-y-3">
                                <Link
                                    to="/login"
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Sign In
                                </Link>
                                <button
                                    onClick={() => {
                                        setSent(false)
                                        setEmail('')
                                    }}
                                    className="btn-secondary w-full"
                                >
                                    Try a different email
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ─── Form State ─── */
                        <>
                            <div className="flex items-center justify-center mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/25">
                                    <KeyRound className="w-7 h-7 text-white" />
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p className="text-sm">{error}</p>
                                    </div>
                                )}

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
                                            Sending reset link...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="text-primary-600 hover:text-primary-700 font-semibold text-sm inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </>
                    )}
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
