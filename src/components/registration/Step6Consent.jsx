import { CheckCircle, AlertCircle } from 'lucide-react'

const Step6Consent = ({ formData, handleChange, resumeFile }) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms & Verification</h2>
                <p className="text-gray-600">Please review and accept the following</p>
            </div>

            <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
                {/* Terms Acceptance */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        name="terms_accepted"
                        checked={formData.terms_accepted}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        I accept the <span className="font-semibold text-primary-600">Terms and Conditions</span> of PESO Connect
                    </span>
                </label>

                {/* Data Processing Consent */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        name="data_processing_consent"
                        checked={formData.data_processing_consent}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        I consent to the collection, processing, and storage of my personal data by PESO for employment matching purposes
                    </span>
                </label>

                {/* PESO Verification Consent */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        name="peso_verification_consent"
                        checked={formData.peso_verification_consent}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        I understand that my account requires <span className="font-semibold">verification and approval by PESO personnel</span> before I can apply for jobs
                    </span>
                </label>

                {/* Information Accuracy */}
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        name="info_accuracy_confirmation"
                        checked={formData.info_accuracy_confirmation}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        I confirm that all information provided is <span className="font-semibold">accurate and truthful</span>
                    </span>
                </label>
            </div>

            {/* Summary Preview */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-6">
                <h3 className="font-semibold text-primary-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Registration Summary
                </h3>
                <div className="space-y-2 text-sm text-primary-800">
                    <p><span className="font-medium">Name:</span> {formData.full_name || 'Not provided'}</p>
                    <p><span className="font-medium">Email:</span> {formData.email}</p>
                    <p><span className="font-medium">Location:</span> {formData.barangay}, {formData.city}, {formData.province}</p>
                    <p><span className="font-medium">Education:</span> {formData.highest_education || 'Not provided'}</p>
                    <p><span className="font-medium">Skills:</span> {formData.skills.length} skill(s) listed</p>
                    {formData.portfolio_url && (
                        <p><span className="font-medium">Portfolio:</span> {formData.portfolio_url}</p>
                    )}
                    <p><span className="font-medium">Resume:</span> {resumeFile ? 'Uploaded' : 'Not uploaded'}</p>
                </div>
            </div>

            {/* Important Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">Account Verification Required</p>
                        <p>After registration, your account will be in <strong>pending status</strong>. PESO personnel will review your information and documents. You will be notified once verified and can then apply for jobs.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export { Step6Consent }
export default Step6Consent
