// src/pages/EmployerProfileEdit.jsx
import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import {
    Building2, Phone, Mail, MapPin, Briefcase, Globe, Save,
    Loader2, CheckCircle, AlertCircle, Users, Calendar, Hash, Home, User
} from 'lucide-react'
import ProfilePhotoUpload from '../components/profile/ProfilePhotoUpload'
import ProfileCompletionBar from '../components/profile/ProfileCompletionBar'
import { calculateCompletion } from '../utils/profileCompletion'
import psgcData from '../data/psgc.json'
import { SearchableSelect } from '../components/forms/SearchableSelect'

// --- Constants (must match EmployerRegistration.jsx) ---
const OFFICE_TYPES = [
    { value: 'main_office', label: 'Main Office' },
    { value: 'branch', label: 'Branch' },
]
const PRIVATE_TYPES = [
    { value: 'direct_hire', label: 'Direct Hire' },
    { value: 'local_recruitment_agency', label: 'Local Recruitment Agency' },
    { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency' },
    { value: 'do_174', label: 'D.O. 174' },
]
const PUBLIC_TYPES = [
    { value: 'nga', label: 'National Government Agency' },
    { value: 'lgu', label: 'Local Government Unit' },
    { value: 'gocc', label: 'Government-owned and Controlled Corporation' },
    { value: 'suc', label: 'State/Local University or College' },
]
const WORKFORCE_SIZES = [
    { value: 'micro', label: 'Micro (1-9)' },
    { value: 'small', label: 'Small (10-99)' },
    { value: 'medium', label: 'Medium (100-199)' },
    { value: 'large', label: 'Large (200 and up)' },
]

// --- PSGC helpers (mirrors EmployerRegistration.jsx) ---
const CITY_OR_MUNICIPALITY_SUFFIX = /\b(city|municipality)\b/gi
function normalizeLocationName(value = '') {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\bsta\b\.?/g, 'santa')
        .replace(/\bsto\b\.?/g, 'santo')
        .replace(/\bof\b/g, '')
        .replace(CITY_OR_MUNICIPALITY_SUFFIX, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}
function sortNames(values = []) {
    return [...values].sort((a, b) => a.localeCompare(b))
}
function findProvinceByName(provinceName) {
    if (!provinceName) return null
    return psgcData.provinces.find((p) =>
        p.name === provinceName || normalizeLocationName(p.name) === normalizeLocationName(provinceName)
    ) || null
}
function findMunicipalityByName(province, municipalityName) {
    if (!province || !municipalityName) return null
    return province.municipalities.find((m) =>
        m.name === municipalityName || normalizeLocationName(m.name) === normalizeLocationName(municipalityName)
    ) || null
}

const EmployerProfileEdit = () => {
    const { userData, currentUser, fetchUserData } = useAuth()
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        // Establishment
        company_name: '',
        trade_name: '',
        acronym: '',
        office_type: '',
        employer_sector: '',
        employer_type_specific: '',
        nature_of_business: '',
        total_work_force: '',
        tin: '',
        business_reg_number: '',
        // Address
        province: '',
        city: '',
        barangay: '',
        street: '',
        // Contact & Representative
        owner_name: '',
        same_as_owner: false,
        representative_name: '',
        representative_position: '',
        contact_email: '',
        contact_number: '',
        telephone_number: '',
        preferred_contact_method: 'email',
        // Profile-only extras
        company_description: '',
        company_website: '',
        company_size: '',          // legacy — kept so existing data isn't lost
        year_established: '',
        facebook_url: '',
        linkedin_url: '',
        profile_photo: '',
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const restoredRef = useRef(false)

    useEffect(() => {
        if (restoredRef.current) return
        if (userData) {
            restoredRef.current = true
            setFormData({
                company_name: userData.company_name || '',
                trade_name: userData.trade_name || '',
                acronym: userData.acronym || '',
                office_type: userData.office_type || '',
                employer_sector: userData.employer_sector || '',
                employer_type_specific: userData.employer_type_specific || '',
                nature_of_business: userData.nature_of_business || '',
                total_work_force: userData.total_work_force || '',
                tin: userData.tin || '',
                business_reg_number: userData.business_reg_number || '',
                province: userData.province || '',
                city: userData.city || '',
                barangay: userData.barangay || '',
                street: userData.street || '',
                owner_name: userData.owner_name || '',
                same_as_owner: userData.same_as_owner || false,
                representative_name: userData.representative_name || '',
                representative_position: userData.representative_position || '',
                contact_email: userData.contact_email || '',
                contact_number: userData.contact_number || '',
                telephone_number: userData.telephone_number || '',
                preferred_contact_method: userData.preferred_contact_method || 'email',
                company_description: userData.company_description || '',
                company_website: userData.company_website || '',
                company_size: userData.company_size || '',
                year_established: userData.year_established || '',
                facebook_url: userData.facebook_url || '',
                linkedin_url: userData.linkedin_url || '',
                profile_photo: userData.profile_photo || '',
            })
        }
    }, [userData])

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value }
            if (name === 'employer_sector') next.employer_type_specific = ''
            if (name === 'same_as_owner' && checked) next.representative_name = prev.owner_name
            if (name === 'owner_name' && prev.same_as_owner) next.representative_name = value
            return next
        })
    }

    const resolvedProvince = useMemo(() => findProvinceByName(formData.province), [formData.province])
    const resolvedProvinceName = resolvedProvince?.name ?? formData.province
    const resolvedCity = useMemo(() => findMunicipalityByName(resolvedProvince, formData.city), [resolvedProvince, formData.city])
    const resolvedCityName = resolvedCity?.name ?? formData.city

    const provinceOptions = useMemo(() => sortNames(psgcData.provinces.map(p => p.name)), [])
    const cityOptions = useMemo(() => {
        if (!resolvedProvince) return []
        return sortNames(resolvedProvince.municipalities.map(m => m.name))
    }, [resolvedProvince])
    const barangayOptions = useMemo(() => {
        if (!resolvedCity) return []
        return sortNames(resolvedCity.barangays)
    }, [resolvedCity])

    const handleProvinceChange = (e) => {
        setFormData(prev => ({ ...prev, province: e.target.value, city: '', barangay: '' }))
    }
    const handleCityChange = (e) => {
        setFormData(prev => ({ ...prev, city: e.target.value, barangay: '' }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            if (!formData.company_name.trim()) throw new Error('Company name is required.')
            if (!formData.contact_email.trim()) throw new Error('Contact email is required.')

            const now = new Date().toISOString()

            const { error: baseErr } = await supabase
                .from('users')
                .update({ name: formData.company_name, profile_photo: formData.profile_photo, updated_at: now })
                .eq('id', currentUser.uid)
            if (baseErr) throw baseErr

            const { profile_photo, ...profileFields } = formData
            const { error: profileErr } = await supabase
                .from('employer_profiles')
                .upsert({ id: currentUser.uid, ...profileFields, updated_at: now }, { onConflict: 'id' })
            if (profileErr) throw profileErr

            setSuccess('Profile updated successfully!')
            await fetchUserData(currentUser.uid)
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
                    {userData?.is_verified && userData?.verified_for_year && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-green-700">
                                Verified for {userData.verified_for_year}
                            </span>
                            {userData.verification_expires_at && (
                                <span className="text-xs text-green-600">
                                    &middot; Valid until {new Date(userData.verification_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                    )}
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

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* ── Section 1: Establishment Details ── */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary-600" />
                            Establishment Details
                        </h2>
                        <div className="space-y-4">

                            <div>
                                <label className="label">Business Name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="company_name" value={formData.company_name}
                                        onChange={handleChange} className="input-field pl-12" required />
                                </div>
                            </div>

                            <div>
                                <label className="label">Trade Name</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="trade_name" value={formData.trade_name}
                                        onChange={handleChange} className="input-field pl-12" placeholder="Optional" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Acronym / Abbreviation</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="acronym" value={formData.acronym}
                                        onChange={handleChange} className="input-field pl-12" placeholder="Optional" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Office Classification</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {OFFICE_TYPES.map((opt) => (
                                        <label key={opt.value}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.office_type === opt.value
                                                ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                            <input type="radio" name="office_type" value={opt.value}
                                                checked={formData.office_type === opt.value}
                                                onChange={handleChange} className="sr-only" />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.office_type === opt.value ? 'border-primary-500' : 'border-gray-300'}`}>
                                                {formData.office_type === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                                            </div>
                                            <span className="font-medium text-gray-900">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Employer Sector</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ value: 'private', label: 'Private' }, { value: 'public', label: 'Public' }].map((opt) => (
                                        <label key={opt.value}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.employer_sector === opt.value
                                                ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                            <input type="radio" name="employer_sector" value={opt.value}
                                                checked={formData.employer_sector === opt.value}
                                                onChange={handleChange} className="sr-only" />
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.employer_sector === opt.value ? 'border-primary-500' : 'border-gray-300'}`}>
                                                {formData.employer_sector === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                                            </div>
                                            <span className="font-medium text-gray-900">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {formData.employer_sector && (
                                <div>
                                    <label className="label">
                                        {formData.employer_sector === 'public'
                                            ? 'Type of Public Establishment'
                                            : 'Type of Private Establishment'}
                                    </label>
                                    <div className="space-y-2">
                                        {(formData.employer_sector === 'public' ? PUBLIC_TYPES : PRIVATE_TYPES).map((opt) => (
                                            <label key={opt.value}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.employer_type_specific === opt.value
                                                    ? 'border-primary-500 bg-primary-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                                                <input type="radio" name="employer_type_specific" value={opt.value}
                                                    checked={formData.employer_type_specific === opt.value}
                                                    onChange={handleChange} className="sr-only" />
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.employer_type_specific === opt.value ? 'border-primary-500' : 'border-gray-300'}`}>
                                                    {formData.employer_type_specific === opt.value && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                                                </div>
                                                <span className="text-sm text-gray-800">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="label">Line of Business / Industry</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="nature_of_business" value={formData.nature_of_business}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="e.g. Retail, Manufacturing, IT Services" />
                                </div>
                            </div>

                            <SearchableSelect
                                label="Total Work Force"
                                name="total_work_force"
                                value={WORKFORCE_SIZES.find(o => o.value === formData.total_work_force)?.label || ''}
                                onChange={(e) => {
                                    const match = WORKFORCE_SIZES.find(o => o.label === e.target.value)
                                    handleChange({ target: { name: 'total_work_force', value: match?.value || '' } })
                                }}
                                options={WORKFORCE_SIZES.map(o => o.label)}
                                icon={Users}
                            />

                            <div>
                                <label className="label">TIN (Tax Identification Number)</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="tin" value={formData.tin}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="e.g. 123-456-789-000" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Business Registration Number (DTI / SEC)</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="business_reg_number" value={formData.business_reg_number}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="If applicable" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: Business Address ── */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-600" />
                            Business Address
                        </h2>
                        <div className="space-y-4">
                            <SearchableSelect
                                label="Province"
                                name="province"
                                value={resolvedProvinceName || ''}
                                onChange={handleProvinceChange}
                                options={provinceOptions}
                                icon={MapPin}
                            />
                            <SearchableSelect
                                label="City / Municipality"
                                name="city"
                                value={resolvedCityName || ''}
                                onChange={handleCityChange}
                                options={cityOptions}
                                icon={MapPin}
                            />
                            <SearchableSelect
                                label="Barangay"
                                name="barangay"
                                value={formData.barangay || ''}
                                onChange={handleChange}
                                options={barangayOptions}
                                icon={MapPin}
                            />
                            <div>
                                <label className="label">Street / Village / Bldg Number</label>
                                <div className="relative">
                                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="street" value={formData.street}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="Optional" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 3: Contact & Representative ── */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary-600" />
                            Contact &amp; Representative
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Name of Owner / President</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="owner_name" value={formData.owner_name}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="Full name of owner or president" />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" name="same_as_owner" checked={formData.same_as_owner}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                    Contact person is the same as Owner / President
                                </span>
                            </label>

                            <div>
                                <label className="label">Contact Person Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="representative_name" value={formData.representative_name}
                                        onChange={handleChange}
                                        disabled={formData.same_as_owner}
                                        className="input-field pl-12 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="Authorized representative's full name" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Position</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="text" name="representative_position" value={formData.representative_position}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="e.g. Owner, HR Manager, Director" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 4: Contact Information ── */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-primary-600" />
                            Contact Information
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Official Contact Email <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="email" name="contact_email" value={formData.contact_email}
                                        onChange={handleChange} className="input-field pl-12" required />
                                </div>
                            </div>
                            <div>
                                <label className="label">Mobile Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="tel" name="contact_number" value={formData.contact_number}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="e.g. 09XX-XXX-XXXX" />
                                </div>
                            </div>
                            <div>
                                <label className="label">Telephone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="tel" name="telephone_number" value={formData.telephone_number}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="e.g. (02) 8XXX-XXXX" />
                                </div>
                            </div>
                            <div>
                                <label className="label">Preferred Contact Method</label>
                                <select name="preferred_contact_method" value={formData.preferred_contact_method}
                                    onChange={handleChange} className="input-field">
                                    <option value="email">Email</option>
                                    <option value="phone">Phone</option>
                                    <option value="either">Either</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 5: Company Profile ── */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary-600" />
                            Company Profile
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="label">Year Established</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input type="number" name="year_established" value={formData.year_established}
                                        onChange={handleChange} className="input-field pl-12"
                                        placeholder="e.g. 2010" min="1900" max={new Date().getFullYear()} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Company Description</label>
                                <textarea name="company_description" value={formData.company_description}
                                    onChange={handleChange} className="input-field resize-none" rows="4"
                                    placeholder="Tell jobseekers about your company..." />
                            </div>
                        </div>
                    </div>

                    {/* ── Section 6: Web Presence ── */}
                    <div className="card">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary-600" />
                            Web Presence
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label">Company Website</label>
                                <input type="url" name="company_website" value={formData.company_website}
                                    onChange={handleChange} className="input-field"
                                    placeholder="https://yourcompany.com" />
                            </div>
                            <div>
                                <label className="label">Facebook Page</label>
                                <input type="url" name="facebook_url" value={formData.facebook_url}
                                    onChange={handleChange} className="input-field"
                                    placeholder="https://facebook.com/yourcompany" />
                            </div>
                            <div>
                                <label className="label">LinkedIn</label>
                                <input type="url" name="linkedin_url" value={formData.linkedin_url}
                                    onChange={handleChange} className="input-field"
                                    placeholder="https://linkedin.com/company/yourcompany" />
                            </div>
                        </div>
                    </div>

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
