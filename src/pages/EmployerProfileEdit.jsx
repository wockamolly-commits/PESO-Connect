// src/pages/EmployerProfileEdit.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import {
    Building, Phone, Mail, MapPin, Briefcase, Globe, Save,
    Loader2, CheckCircle, AlertCircle, Users, Calendar, FileText, Link as LinkIcon
} from 'lucide-react'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'

const EmployerProfileEdit = () => {
    const { userData, currentUser } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        company_name: '',
        employer_type: '',
        business_reg_number: '',
        business_address: '',
        nature_of_business: '',
        representative_name: '',
        representative_position: '',
        contact_email: '',
        contact_number: '',
        preferred_contact_method: 'email',
        company_description: '',
        company_website: '',
        company_size: '',
        year_established: '',
        facebook_url: '',
        linkedin_url: '',
        profile_photo: ''
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        if (userData) {
            setFormData({
                company_name: userData.company_name || '',
                employer_type: userData.employer_type || '',
                business_reg_number: userData.business_reg_number || '',
                business_address: userData.business_address || '',
                nature_of_business: userData.nature_of_business || '',
                representative_name: userData.representative_name || '',
                representative_position: userData.representative_position || '',
                contact_email: userData.contact_email || '',
                contact_number: userData.contact_number || '',
                preferred_contact_method: userData.preferred_contact_method || 'email',
                company_description: userData.company_description || '',
                company_website: userData.company_website || '',
                company_size: userData.company_size || '',
                year_established: userData.year_established || '',
                facebook_url: userData.facebook_url || '',
                linkedin_url: userData.linkedin_url || '',
                profile_photo: userData.profile_photo || ''
            })
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (!formData.company_name || !formData.contact_email) {
                throw new Error('Company name and contact email are required.')
            }

            await updateDoc(doc(db, 'users', currentUser.uid), {
                ...formData,
                updated_at: new Date().toISOString()
            })

            setSuccess('Profile updated successfully!')
            setTimeout(() => navigate('/dashboard'), 2000)
        } catch (err) {
            setError(err.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const completion = calculateCompletion({ ...userData, ...formData })

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Company Profile</h1>
                    <p className="text-gray-600 mb-6">Keep your business information up to date</p>
                    <ProfilePhotoUpload
                        name={formData.company_name}
                        currentPhoto={formData.profile_photo}
                        onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
                    />
                </div>

                <div className="mb-6">
                    <ProfileCompletionBar
                        percentage={completion.percentage}
                        missing={completion.missing}
                        editPath="/profile/edit/employer"
                    />
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-green-700 text-sm">{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card space-y-8">
                    {/* Company Information */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary-600" />
                            Company Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Company Name *</label>
                                <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Employer Type</label>
                                <select name="employer_type" value={formData.employer_type} onChange={handleChange} className="input-select">
                                    <option value="">Select type</option>
                                    <option value="company">Company</option>
                                    <option value="small_business">Small Business</option>
                                    <option value="individual">Individual</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Business Registration No. (DTI/SEC)</label>
                                <input type="text" name="business_reg_number" value={formData.business_reg_number} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Nature of Business</label>
                                <input type="text" name="nature_of_business" value={formData.nature_of_business} onChange={handleChange} className="input-field" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Business Address</label>
                                <textarea name="business_address" value={formData.business_address} onChange={handleChange} className="input-field resize-none" rows="2" />
                            </div>
                        </div>
                    </div>

                    {/* Company Details */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Company Details
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Company Size</label>
                                <select name="company_size" value={formData.company_size} onChange={handleChange} className="input-select">
                                    <option value="">Select size</option>
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-500">201-500 employees</option>
                                    <option value="500+">500+ employees</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Year Established</label>
                                <input type="number" name="year_established" value={formData.year_established} onChange={handleChange} className="input-field" placeholder="2010" min="1900" max={new Date().getFullYear()} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Company Description</label>
                                <textarea name="company_description" value={formData.company_description} onChange={handleChange} className="input-field resize-none" rows="4" placeholder="Tell jobseekers about your company..." />
                            </div>
                        </div>
                    </div>

                    {/* Representative */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary-600" />
                            Authorized Representative
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Representative Name</label>
                                <input type="text" name="representative_name" value={formData.representative_name} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Position</label>
                                <input type="text" name="representative_position" value={formData.representative_position} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-primary-600" />
                            Contact Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Contact Email *</label>
                                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Contact Number</label>
                                <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                    </div>

                    {/* Web Presence */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary-600" />
                            Web Presence
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">Company Website</label>
                                <input type="url" name="company_website" value={formData.company_website} onChange={handleChange} className="input-field" placeholder="https://yourcompany.com" />
                            </div>
                            <div>
                                <label className="label">Facebook Page</label>
                                <input type="url" name="facebook_url" value={formData.facebook_url} onChange={handleChange} className="input-field" placeholder="https://facebook.com/yourcompany" />
                            </div>
                            <div>
                                <label className="label">LinkedIn</label>
                                <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className="input-field" placeholder="https://linkedin.com/company/yourcompany" />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-5 h-5" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default EmployerProfileEdit
