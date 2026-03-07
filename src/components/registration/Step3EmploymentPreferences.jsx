import { MapPin, CheckCircle } from 'lucide-react'

const JOB_TYPE_OPTIONS = [
    { id: 'full-time', label: 'Full-time' },
    { id: 'part-time', label: 'Part-time' },
    { id: 'contractual', label: 'Contractual' },
    { id: 'on-demand', label: 'On-demand' }
]

const Step3EmploymentPreferences = ({ formData, handleChange, setFormData, handleJobTypeToggle }) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Employment Preferences</h2>
                <p className="text-gray-600">What kind of work are you looking for?</p>
            </div>

            {/* Preferred Job Type */}
            <div>
                <label className="label">Preferred Job Type (Select all that apply) *</label>
                <div className="grid grid-cols-2 gap-3">
                    {JOB_TYPE_OPTIONS.map((type) => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => handleJobTypeToggle(type.id)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                                formData.preferred_job_type.includes(type.id)
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    formData.preferred_job_type.includes(type.id)
                                        ? 'border-primary-500 bg-primary-500'
                                        : 'border-gray-300'
                                }`}>
                                    {formData.preferred_job_type.includes(type.id) && (
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    )}
                                </div>
                                <span className={`font-medium ${
                                    formData.preferred_job_type.includes(type.id) ? 'text-primary-700' : 'text-gray-700'
                                }`}>
                                    {type.label}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Preferred Job Location */}
            <div>
                <label className="label">Preferred Job Location *</label>
                <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        name="preferred_job_location"
                        value={formData.preferred_job_location}
                        onChange={handleChange}
                        className="input-field pl-12"
                        placeholder="e.g., San Carlos City, Metro Manila"
                        required
                    />
                </div>
            </div>

            {/* Expected Salary Range */}
            <div>
                <label className="label">Expected Salary Range (Optional)</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">₱</span>
                        <input
                            type="number"
                            name="expected_salary_min"
                            value={formData.expected_salary_min}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="Min (\u20B1)"
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">₱</span>
                        <input
                            type="number"
                            name="expected_salary_max"
                            value={formData.expected_salary_max}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="Max (\u20B1)"
                        />
                    </div>
                </div>
            </div>

            {/* Willingness to Relocate */}
            <div>
                <label className="label">Willingness to Relocate *</label>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'yes', label: 'Yes, I am willing' },
                        { id: 'no', label: 'No, prefer local only' }
                    ].map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, willing_to_relocate: option.id }))}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                formData.willing_to_relocate === option.id
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export { Step3EmploymentPreferences, JOB_TYPE_OPTIONS }
export default Step3EmploymentPreferences
