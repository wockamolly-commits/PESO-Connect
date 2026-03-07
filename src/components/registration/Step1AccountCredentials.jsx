import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'

const Step1AccountCredentials = ({
    formData,
    handleChange,
    showPassword,
    setShowPassword,
    handleBlur,
    touchedFields,
    fieldErrors,
    passwordStrength
}) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
                <p className="text-gray-600">Let's start with your login credentials</p>
            </div>

            {/* Email */}
            <div>
                <label className="label">Email Address *</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-field pl-12 ${touchedFields?.email && fieldErrors?.email ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                        placeholder="Enter your email"
                        required
                    />
                </div>
                {touchedFields?.email && fieldErrors?.email && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {fieldErrors.email}
                    </p>
                )}
            </div>

            {/* Password */}
            <div>
                <label className="label">Password *</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-field pl-12 pr-12 ${touchedFields?.password && fieldErrors?.password ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                        placeholder="Create a password (min. 6 characters)"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {touchedFields?.password && fieldErrors?.password && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {fieldErrors.password}
                    </p>
                )}
                {/* Password strength indicator */}
                {formData.password && passwordStrength && (
                    <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4, 5].map(level => (
                                <div
                                    key={level}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                                        level <= passwordStrength.score
                                            ? passwordStrength.color
                                            : 'bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>
                        <p className={`text-xs font-medium ${passwordStrength.textColor}`}>
                            {passwordStrength.label}
                        </p>
                    </div>
                )}
            </div>

            {/* Confirm Password */}
            <div>
                <label className="label">Confirm Password *</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-field pl-12 ${touchedFields?.confirmPassword && fieldErrors?.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
                        placeholder="Confirm your password"
                        required
                    />
                </div>
                {touchedFields?.confirmPassword && fieldErrors?.confirmPassword && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {fieldErrors.confirmPassword}
                    </p>
                )}
            </div>
        </div>
    )
}

export { Step1AccountCredentials }
export default Step1AccountCredentials
