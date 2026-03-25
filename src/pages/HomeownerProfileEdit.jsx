import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import {
    User, Phone, MapPin, FileText, Save, Loader2, CheckCircle, AlertCircle, Plus, X, Home
} from 'lucide-react'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'

const HomeownerProfileEdit = () => {
    const { userData, currentUser } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        full_name: '',
        contact_number: '',
        barangay: '',
        city: '',
        province: '',
        bio: '',
        service_preferences: [],
        profile_photo: ''
    })

    const [newService, setNewService] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const restoredRef = useRef(false)

    useEffect(() => {
        if (restoredRef.current) return
        if (userData) {
            restoredRef.current = true
            setFormData({
                full_name: userData.full_name || userData.name || '',
                contact_number: userData.contact_number || '',
                barangay: userData.barangay || '',
                city: userData.city || '',
                province: userData.province || '',
                bio: userData.bio || '',
                service_preferences: userData.service_preferences || [],
                profile_photo: userData.profile_photo || ''
            })
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const addService = () => {
        if (newService.trim() && !formData.service_preferences.includes(newService.trim())) {
            setFormData(prev => ({
                ...prev,
                service_preferences: [...prev.service_preferences, newService.trim()]
            }))
            setNewService('')
        }
    }

    const removeService = (service) => {
        setFormData(prev => ({
            ...prev,
            service_preferences: prev.service_preferences.filter(s => s !== service)
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (!formData.full_name) {
                throw new Error('Full name is required.')
            }

            const now = new Date().toISOString()

            // Fields that belong in public.users
            const { error: baseErr } = await supabase
                .from('users')
                .update({
                    name: formData.full_name,
                    profile_photo: formData.profile_photo,
                    updated_at: now,
                })
                .eq('id', currentUser.uid)
            if (baseErr) throw baseErr

            // All other fields go to homeowner_profiles
            const { profile_photo, ...profileFields } = formData
            const { error: profileErr } = await supabase
                .from('homeowner_profiles')
                .upsert({
                    id: currentUser.uid,
                    ...profileFields,
                    updated_at: now,
                }, { onConflict: 'id' })
            if (profileErr) throw profileErr

            setSuccess('Profile updated successfully!')
            setTimeout(() => navigate('/dashboard'), 2000)
        } catch (err) {
            setError(err.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const completion = calculateCompletion({ ...userData, ...formData })

    const suggestedServices = [
        'House Cleaning', 'Plumbing', 'Electrical Work', 'Carpentry',
        'Gardening', 'Tutoring', 'Painting', 'Cooking', 'Laundry', 'Driving'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold gradient-text mb-2">Edit Your Profile</h1>
                    <p className="text-gray-600 mb-6">Keep your information up to date</p>
                    <ProfilePhotoUpload
                        name={formData.full_name}
                        currentPhoto={formData.profile_photo}
                        onPhotoChange={(dataUrl) => setFormData(prev => ({ ...prev, profile_photo: dataUrl }))}
                    />
                </div>

                <div className="mb-6">
                    <ProfileCompletionBar
                        percentage={completion.percentage}
                        missing={completion.missing}
                        editPath="/profile/edit/homeowner"
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
                    {/* Personal Information */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-600" />
                            Personal Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">Full Name *</label>
                                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="input-field" required />
                            </div>
                            <div>
                                <label className="label">Contact Number</label>
                                <input type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} className="input-field" placeholder="09XX XXX XXXX" />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Home className="w-5 h-5 text-primary-600" />
                            Address
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="label">Barangay</label>
                                <input type="text" name="barangay" value={formData.barangay} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="label">Province</label>
                                <input type="text" name="province" value={formData.province} onChange={handleChange} className="input-field" />
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            About You
                        </h2>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            className="input-field resize-none"
                            rows="4"
                            placeholder="Tell us a bit about yourself and what services you're looking for..."
                        />
                    </div>

                    {/* Service Preferences */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Preferences</h2>
                        <p className="text-sm text-gray-500 mb-3">What kind of services are you looking for?</p>

                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newService}
                                onChange={(e) => setNewService(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                                className="input-field flex-1"
                                placeholder="e.g. House Cleaning"
                            />
                            <button type="button" onClick={addService} className="btn-secondary flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {/* Suggestions */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {suggestedServices
                                .filter(s => !formData.service_preferences.includes(s))
                                .map(suggestion => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            service_preferences: [...prev.service_preferences, suggestion]
                                        }))}
                                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-primary-100 hover:text-primary-700 transition-colors"
                                    >
                                        + {suggestion}
                                    </button>
                                ))}
                        </div>

                        {formData.service_preferences.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formData.service_preferences.map((service, index) => (
                                    <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                                        {service}
                                        <button type="button" onClick={() => removeService(service)} className="hover:text-primary-900">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
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

export default HomeownerProfileEdit
