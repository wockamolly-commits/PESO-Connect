import { User, MapPin, Phone, Home, Building, Calendar } from 'lucide-react'

const CONTACT_METHODS = [
    { id: 'email', label: 'Email' },
    { id: 'sms', label: 'SMS/Text' },
    { id: 'call', label: 'Phone Call' }
]

const Step2PersonalInfo = ({ formData, handleChange, setFormData }) => {
    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal & Contact Information</h2>
                <p className="text-gray-600">Tell us about yourself</p>
            </div>

            {/* Full Name */}
            <div>
                <label className="label">Full Name *</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="input-field pl-12"
                        placeholder="Enter your full name"
                        required
                    />
                </div>
            </div>

            {/* Date of Birth */}
            <div>
                <label className="label">Date of Birth *</label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className="input-field pl-12"
                        required
                    />
                </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="label">Barangay *</label>
                    <div className="relative">
                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="barangay"
                            value={formData.barangay}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="Barangay"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="label">City *</label>
                    <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="City"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="label">Province *</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="province"
                            value={formData.province}
                            onChange={handleChange}
                            className="input-field pl-12"
                            placeholder="Province"
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Number */}
            <div>
                <label className="label">Mobile Number *</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="tel"
                        name="mobile_number"
                        value={formData.mobile_number}
                        onChange={handleChange}
                        className="input-field pl-12"
                        placeholder="e.g., 09123456789"
                        required
                    />
                </div>
            </div>

            {/* Preferred Contact Method */}
            <div>
                <label className="label">Preferred Communication Method *</label>
                <div className="grid grid-cols-3 gap-3">
                    {CONTACT_METHODS.map((method) => (
                        <button
                            key={method.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, preferred_contact_method: method.id }))}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                                formData.preferred_contact_method === method.id
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                            }`}
                        >
                            {method.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export { Step2PersonalInfo, CONTACT_METHODS }
export default Step2PersonalInfo
