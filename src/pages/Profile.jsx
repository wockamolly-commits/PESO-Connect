import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getProfileTable } from '../utils/roles'
import {
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Save,
    Loader2,
    CheckCircle,
    Camera
} from 'lucide-react'
import PendingReverificationBadge from '../components/common/PendingReverificationBadge'

const Profile = () => {
    const { currentUser, userData, isJobseeker } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
        bio: '',
        skills: []
    })

    // Redirect all roles to their comprehensive profile edit pages
    useEffect(() => {
        if (userData?.role === 'employer') {
            navigate('/profile/edit/employer', { replace: true })
        } else if (userData?.subtype === 'homeowner') {
            navigate('/profile/edit/homeowner', { replace: true })
        } else if (userData?.subtype === 'jobseeker') {
            navigate('/profile/edit', { replace: true })
        }
    }, [userData?.role, userData?.subtype, navigate])

    useEffect(() => {
        if (userData) {
            setFormData({
                full_name: userData.full_name || '',
                phone: userData.phone || '',
                address: userData.address || '',
                bio: userData.bio || '',
                skills: userData.skills || []
            })
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setSaved(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const now = new Date().toISOString()
            const { error: baseErr } = await supabase
                .from('users')
                .update({ name: formData.full_name, updated_at: now })
                .eq('id', currentUser.uid)
            if (baseErr) throw baseErr

            const profileTable = getProfileTable(userData?.role, userData?.subtype)

            if (profileTable) {
                const { error: profileErr } = await supabase
                    .from(profileTable)
                    .upsert({
                        id: currentUser.uid,
                        full_name: formData.full_name,
                        updated_at: now,
                    }, { onConflict: 'id' })
                if (profileErr) throw profileErr
            }
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (error) {
            console.error('Error updating profile:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
                    <p className="text-gray-600">Manage your account information</p>
                </div>

                {/* Profile Card */}
                <div className="card">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-100">
                        <div className="relative mb-4">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {formData.full_name?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{formData.full_name || 'User'}</h2>
                        <p className="text-gray-500">{currentUser?.email}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${userData?.is_verified
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {userData?.is_verified ? 'Verified' : 'Pending Verification'}
                            </span>
                            {userData?.is_verified && userData?.profile_modified_since_verification && (
                                <PendingReverificationBadge />
                            )}
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="label">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="input pl-12 w-full"
                                    placeholder="Your full name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={currentUser?.email}
                                    className="input pl-12 w-full bg-gray-50"
                                    disabled
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="input pl-12 w-full"
                                    placeholder="09XX XXX XXXX"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="input pl-12 w-full resize-none"
                                    rows="2"
                                    placeholder="Your address"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                className="input w-full resize-none"
                                rows="4"
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : saved ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Profile
