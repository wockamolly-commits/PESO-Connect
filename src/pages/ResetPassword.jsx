import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, KeyRound } from 'lucide-react'

const ResetPassword = () => {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            })
            if (updateError) throw updateError
            setSuccess(true)
        } catch (err) {
            console.error('Password reset error:', err)
            setError(err.message || 'Failed to reset password. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <img src="/peso-logo.png" alt="PESO Connect" className="w-20 h-20 mx-auto mb-4" />
                    </div>
                    <div className="card text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Updated</h1>
                        <p className="text-gray-600 mb-6">Your password has been reset successfully.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn-primary w-full"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <img src="/peso-logo.png" alt="PESO Connect" className="w-20 h-20 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold gradient-text">Set New Password</h1>
                    <p className="text-gray-600 mt-2">Enter your new password below</p>
                </div>

                <div className="card animate-slide-up">
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
                            <label className="label">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-12 pr-12"
                                    placeholder="Enter new password"
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

                        <div>
                            <label className="label">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-gray-500 text-sm mt-8">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default ResetPassword
