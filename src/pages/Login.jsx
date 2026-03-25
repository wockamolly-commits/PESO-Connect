import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle, Info } from 'lucide-react'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailNotVerified, setEmailNotVerified] = useState(false)

    const { login, fetchUserData } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const user = await login(email, password)
            const profile = await fetchUserData(user.uid)
            if (profile?.registration_complete === false) {
                navigate('/register/continue')
            } else {
                navigate('/dashboard')
            }
        } catch (err) {
            console.error('Login error:', err)
            const msg = err.message?.toLowerCase() || ''
            if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
                setEmailNotVerified(true)
                setError('Your email has not been verified yet. Please check your inbox for the verification link.')
            } else if (err.code === 'auth/invalid-credential' || msg.includes('invalid login')) {
                setError('Invalid email or password. Please try again.')
            } else if (err.code === 'auth/user-not-found') {
                setError('No account found with this email.')
            } else if (err.code === 'auth/too-many-requests' || msg.includes('rate')) {
                setError('Too many failed attempts. Please try again later.')
            } else {
                setError('Failed to sign in. Please try again.')
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
                    <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
                    <p className="text-gray-600 mt-2">Sign in to PESO Connect</p>
                </div>

                {/* Login Form */}
                <div className="card animate-slide-up">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className={`flex items-start gap-3 p-4 ${emailNotVerified ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'} border rounded-xl`}>
                                {emailNotVerified ? <Info className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                                <div className="text-sm">
                                    <p>{error}</p>
                                    {emailNotVerified && (
                                        <button
                                            type="button"
                                            onClick={() => navigate('/verify-email', { state: { email } })}
                                            className="mt-2 text-primary-600 hover:text-primary-700 font-semibold underline"
                                        >
                                            Resend verification email
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="label">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-12 pr-12"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Do not have an account?{' '}
                            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                                Register here
                            </Link>
                        </p>
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

export default Login
