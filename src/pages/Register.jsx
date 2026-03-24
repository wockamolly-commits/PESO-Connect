import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Users, ArrowRight, ArrowLeft, Home, Search } from 'lucide-react'

const Register = () => {
    const [selectedPrimary, setSelectedPrimary] = useState(null)
    const navigate = useNavigate()

    const handlePrimarySelect = (role) => {
        setSelectedPrimary(role)
    }

    const handleBack = () => {
        setSelectedPrimary(null)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4 py-12">
            <div className="w-full max-w-2xl">
                {/* Logo and Header */}
                <div className="text-center mb-8 animate-fade-in">
                    <img
                        src="/peso-logo.png"
                        alt="PESO Connect"
                        className="w-20 h-20 mx-auto mb-4"
                    />
                    <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
                    <p className="text-gray-600 mt-2">Join PESO Connect today</p>
                </div>

                {/* Registration Flow */}
                <div className="card animate-slide-up">
                    <div className="space-y-6">

                        {/* Step 1: Primary Role Selection */}
                        {selectedPrimary === null && (
                            <div>
                                <label className="label">How will you use PESO Connect?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handlePrimarySelect('employer')}
                                        className="p-4 rounded-xl border-2 text-center transition-all duration-300 border-gray-200 hover:border-primary-300 hover:shadow-lg bg-white"
                                    >
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 bg-gray-100 text-gray-500">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <p className="font-semibold text-sm text-gray-700">Employer</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Hiring workers for your business</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePrimarySelect('user')}
                                        className="p-4 rounded-xl border-2 text-center transition-all duration-300 border-gray-200 hover:border-primary-300 hover:shadow-lg bg-white"
                                    >
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 bg-gray-100 text-gray-500">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <p className="font-semibold text-sm text-gray-700">User</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Looking for jobs or hiring for home</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Employer Info Card */}
                        {selectedPrimary === 'employer' && (
                            <div>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-xl p-6 text-center">
                                    <Briefcase className="w-10 h-10 text-primary-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Employer Registration</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Employers undergo a comprehensive registration process that includes
                                        business verification and PESO approval before activation.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register/employer')}
                                        className="btn-primary flex items-center gap-2 mx-auto"
                                    >
                                        Continue as Employer <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: User Sub-Role Selection */}
                        {selectedPrimary === 'user' && (
                            <div>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <label className="label">What are you looking for?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register/jobseeker')}
                                        className="p-4 rounded-xl border-2 text-center transition-all duration-300 border-gray-200 hover:border-primary-300 hover:shadow-lg bg-white"
                                    >
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 bg-gray-100 text-gray-500">
                                            <Search className="w-5 h-5" />
                                        </div>
                                        <p className="font-semibold text-sm text-gray-700">Jobseeker</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Looking for employment opportunities</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register/homeowner')}
                                        className="p-4 rounded-xl border-2 text-center transition-all duration-300 border-gray-200 hover:border-primary-300 hover:shadow-lg bg-white"
                                    >
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 bg-gray-100 text-gray-500">
                                            <Home className="w-5 h-5" />
                                        </div>
                                        <p className="font-semibold text-sm text-gray-700">Homeowner</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Find workers for household needs</p>
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Notice */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center animate-fade-in">
                    <p className="text-yellow-800 text-sm">
                        <strong>Note:</strong> Your account will require verification by the PESO administrator before you can post jobs or submit applications.
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    PESO Connect | San Carlos City, Negros Occidental
                </p>
            </div>
        </div>
    )
}

export default Register
