import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../config/firebase'
import { seedAdminAccount } from '../../utils/seedAdmin'
import { Shield, Mail, Lock, Loader2, AlertCircle, ArrowLeft, UserPlus, CheckCircle } from 'lucide-react'

const AdminLogin = () => {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [loading, setLoading] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const [error, setError] = useState('')
    const [seedSuccess, setSeedSuccess] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSeedAdmin = async () => {
        setSeeding(true)
        setError('')
        setSeedSuccess(false)

        const result = await seedAdminAccount()

        if (result.success) {
            setSeedSuccess(true)
        } else {
            setError(result.message)
        }

        setSeeding(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            )

            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))

            if (!userDoc.exists()) {
                await auth.signOut()
                setError('Account not found in the system.')
                setLoading(false)
                return
            }

            const userData = userDoc.data()

            if (userData.role !== 'admin') {
                await auth.signOut()
                setError('Access denied. This login is for administrators only.')
                setLoading(false)
                return
            }

            navigate('/admin')
        } catch (err) {
            console.error('Login error:', err)
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password.')
            } else if (err.code === 'auth/invalid-credential') {
                setError('Invalid credentials. Please check your email and password.')
            } else {
                setError('Login failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to regular login
                </Link>

                <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
                    <div className="text-center mb-8">
                        <img
                            src="/peso-logo.png"
                            alt="PESO Admin Portal"
                            className="w-20 h-20 object-contain mb-4 mx-auto"
                        />
                        <h1 className="text-2xl font-bold text-white mb-2">Admin Portal</h1>
                        <p className="text-gray-400">PESO Connect Command Center</p>
                    </div>

                    {/* Seed Admin Button */}
                    {!seedSuccess && (
                        <button
                            onClick={handleSeedAdmin}
                            disabled={seeding}
                            className="w-full mb-6 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {seeding ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Admin Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Default Admin Account
                                </>
                            )}
                        </button>
                    )}

                    {seedSuccess && (
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 mb-6">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <p className="font-medium">Admin account created!</p>
                                <p className="text-sm text-green-300 mt-1">Credentials have been filled in. Click login to continue.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Admin Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    placeholder="admin@peso.gov.ph"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-3 px-6 rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5" />
                                    Access Admin Dashboard
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-700/50 text-center">
                        <p className="text-gray-500 text-sm">
                            Authorized personnel only. All access attempts are logged.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdminLogin

