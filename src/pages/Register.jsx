import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Users, ArrowRight, Home } from 'lucide-react'

const Register = () => {
    const [formData, setFormData] = useState({
        role: 'jobseeker'
    })

    const navigate = useNavigate()

    const roleOptions = [
        { id: 'jobseeker', label: 'Jobseeker', icon: Users, description: 'Looking for employment opportunities' },
        { id: 'employer', label: 'Employer', icon: Briefcase, description: 'Hiring workers for your business' },
        { id: 'individual', label: 'Homeowner', icon: Home, description: 'Find workers for household needs' }
    ]

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

                {/* Registration Form */}
                <div className="card animate-slide-up">
                    <div className="space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="label">I am registering as</label>
                            <div className="grid grid-cols-3 gap-3">
                                {roleOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, role: option.id }))}
                                        className={`p-4 rounded-xl border-2 text-center transition-all duration-300 ${formData.role === option.id
                                            ? 'border-primary-500 bg-primary-50 shadow-lg shadow-primary-100'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 ${formData.role === option.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            <option.icon className="w-5 h-5" />
                                        </div>
                                        <p className={`font-semibold text-sm ${formData.role === option.id ? 'text-primary-700' : 'text-gray-700'}`}>
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jobseeker Redirect */}
                        {formData.role === 'jobseeker' && (
                            <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-xl p-6 text-center">
                                <Users className="w-10 h-10 text-primary-600 mx-auto mb-3" />
                                <h3 className="font-semibold text-gray-900 mb-2">Jobseeker Registration</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Complete your profile with personal information, employment preferences,
                                    educational background, and skills. Your account will be verified by PESO before activation.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/register/jobseeker')}
                                    className="btn-primary flex items-center gap-2 mx-auto"
                                >
                                    Continue as Jobseeker <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Employer Redirect */}
                        {formData.role === 'employer' && (
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
                        )}

                        {/* Individual/Homeowner Redirect */}
                        {formData.role === 'individual' && (
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 text-center">
                                <Home className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                                <h3 className="font-semibold text-gray-900 mb-2">Homeowner Registration</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    Quick sign-up to find and message verified workers for your household needs.
                                    No business documents required.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/register/individual')}
                                    className="btn-primary flex items-center gap-2 mx-auto"
                                >
                                    Continue as Homeowner <ArrowRight className="w-5 h-5" />
                                </button>
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
