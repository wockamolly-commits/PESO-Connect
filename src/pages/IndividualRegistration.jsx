import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    Home,
    User,
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    CheckCircle,
    ArrowLeft,
    Loader2,
    Shield,
    Zap,
    ChevronRight,
    ChevronLeft
} from 'lucide-react'

const IndividualRegistration = () => {
    const navigate = useNavigate()
    const { createAccount, completeRegistration, currentUser, userData } = useAuth()

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        contactNumber: '',
        password: '',
        confirmPassword: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [accountCreated, setAccountCreated] = useState(false)

    useEffect(() => {
        if (userData && userData.registration_complete === false && userData.role === 'individual') {
            setAccountCreated(true)
            setFormData(prev => ({
                ...prev,
                email: userData.email || '',
                fullName: userData.full_name || '',
                contactNumber: userData.contact_number || '',
            }))
            setCurrentStep(2)
        }
    }, [userData])

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
    }

    const validateStep1 = () => {
        if (!formData.email.trim()) return 'Email is required.'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email.'
        if (formData.password.length < 6) return 'Password must be at least 6 characters.'
        if (formData.password !== formData.confirmPassword) return 'Passwords do not match.'
        return null
    }

    const validateStep2 = () => {
        if (!formData.fullName.trim()) return 'Full name is required.'
        if (!formData.contactNumber.trim()) return 'Contact number is required.'
        return null
    }

    const handleStep1 = async () => {
        const validationError = validateStep1()
        if (validationError) { setError(validationError); return }

        setLoading(true)
        setError('')
        try {
            await createAccount(formData.email.trim().toLowerCase(), formData.password, 'individual')
            setAccountCreated(true)
            setCurrentStep(2)
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Try signing in instead.')
            } else {
                setError(err.message || 'Registration failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleStep2 = async (e) => {
        e.preventDefault()
        const validationError = validateStep2()
        if (validationError) { setError(validationError); return }

        setLoading(true)
        setError('')
        try {
            await completeRegistration({
                full_name: formData.fullName.trim(),
                name: formData.fullName.trim(),
                contact_number: formData.contactNumber.trim(),
                individual_status: 'active',
            })
            setSuccess(true)
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Success screen
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
                <div className="w-full max-w-md text-center">
                    <div className="relative">
                        {/* Glassmorphic card */}
                        <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl shadow-emerald-500/10 rounded-3xl p-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                                <CheckCircle className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
                            <p className="text-gray-600 mb-6">
                                Your account is ready. You can now find and message verified workers for your household needs.
                            </p>
                            <button
                                onClick={() => navigate('/diagnostic')}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                            >
                                <Zap className="w-5 h-5" />
                                Find a Worker Now
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full mt-3 text-gray-600 hover:text-gray-900 font-medium py-2 transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 py-12">
            <div className="w-full max-w-md">
                {/* Back link */}
                <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to role selection
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/25 mb-4">
                        <Home className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Homeowner Sign-Up</h1>
                    <p className="text-gray-500 mt-2">
                        Step {currentStep} of 2 — {currentStep === 1 ? 'Create Account' : 'Your Details'}
                    </p>
                </div>

                {/* Glassmorphic form card */}
                <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-2xl shadow-emerald-500/10 rounded-3xl p-8">
                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 mb-6 pb-6 border-b border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                            No documents needed
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Zap className="w-3.5 h-3.5 text-emerald-500" />
                            Instant activation
                        </div>
                    </div>

                    <form onSubmit={handleStep2} className="space-y-5">
                        {currentStep === 1 && (
                            <>
                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@email.com"
                                            className="w-full pl-11 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="At least 6 characters"
                                            className="w-full pl-11 pr-12 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="Re-enter your password"
                                            className="w-full pl-11 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {currentStep === 2 && (
                            <>
                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            placeholder="Juan Dela Cruz"
                                            className="w-full pl-11 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Contact Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="tel"
                                            name="contactNumber"
                                            value={formData.contactNumber}
                                            onChange={handleChange}
                                            placeholder="09XX XXX XXXX"
                                            className="w-full pl-11 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        {currentStep === 1 ? (
                            <button
                                type="button"
                                onClick={handleStep1}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Completing Registration...
                                    </>
                                ) : (
                                    <>
                                        Complete Registration
                                        <Zap className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-sm mt-8">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default IndividualRegistration
