import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    MapPin, Briefcase, GraduationCap, Award, Globe, Calendar, Users,
    ExternalLink, MessageSquare, ArrowLeft, Loader2, Building
} from 'lucide-react'

const PublicProfile = () => {
    const { userId } = useParams()
    const navigate = useNavigate()
    const { currentUser, userData } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const PROFILE_TABLE = {
                    jobseeker: 'jobseeker_profiles',
                    employer: 'employer_profiles',
                    individual: 'individual_profiles',
                }

                // Fetch base user row
                const { data: baseData, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle()

                if (error) throw error
                if (!baseData) return // profile not found — setProfile stays null

                // Fetch role-specific profile
                const profileTable = PROFILE_TABLE[baseData.role]
                let profileData = {}
                if (profileTable) {
                    const { data: roleProfile } = await supabase
                        .from(profileTable)
                        .select('*')
                        .eq('id', userId)
                        .maybeSingle()
                    if (roleProfile) profileData = roleProfile
                }

                // Merge: base fields first, then overlay non-empty profile fields
                const merged = { ...baseData }
                Object.entries(profileData).forEach(([key, val]) => {
                    const isEmpty = val === null || val === '' ||
                        (Array.isArray(val) && val.length === 0)
                    if (!isEmpty) merged[key] = val
                })

                setProfile(merged)
            } catch (error) {
                console.error('Error fetching profile:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [userId])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
                    <p className="text-gray-600 mb-4">This user profile does not exist or has been removed.</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
                </div>
            </div>
        )
    }

    const isOwn = currentUser?.uid === userId
    const initial = (profile.full_name || profile.company_name || profile.name || '?').charAt(0).toUpperCase()

    // Privacy: check profile visibility settings
    const isRestricted = !isOwn
        && profile.privacy_settings?.profile_visibility === 'verified_only'
        && !userData?.is_verified

    if (isRestricted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Restricted Profile</h2>
                    <p className="text-gray-600 mb-4">This profile is only visible to verified users.</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>

                {/* Profile Header */}
                <div className="card mb-6">
                    <div className="flex flex-col items-center text-center">
                        {profile.profile_photo ? (
                            <img src={profile.profile_photo} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-lg mb-4" />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                                {initial}
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {profile.role === 'employer' ? profile.company_name : (profile.full_name || profile.name)}
                        </h1>
                        {profile.role === 'employer' && profile.nature_of_business && (
                            <p className="text-gray-500 mt-1">{profile.nature_of_business}</p>
                        )}
                        {(profile.city || profile.province || profile.business_address) && (
                            <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {profile.role === 'employer'
                                    ? profile.business_address
                                    : [profile.city, profile.province].filter(Boolean).join(', ')}
                            </p>
                        )}
                        <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                            {profile.role}
                        </span>
                    </div>
                </div>

                {/* Role-specific content */}
                {profile.role === 'jobseeker' && <JobseekerProfile profile={profile} />}
                {profile.role === 'employer' && <EmployerProfile profile={profile} />}
                {profile.role === 'individual' && <IndividualProfile profile={profile} />}

                {/* Actions */}
                {currentUser && !isOwn && (
                    <div className="card mt-6">
                        <Link
                            to={`/messages?startWith=${userId}`}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-5 h-5" /> Send Message
                        </Link>
                    </div>
                )}
                {isOwn && (
                    <div className="card mt-6">
                        <Link to="/profile" className="btn-secondary w-full flex items-center justify-center gap-2">
                            Edit Profile
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

const JobseekerProfile = ({ profile }) => (
    <div className="space-y-6">
        {profile.bio && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
        )}
        {profile.privacy_settings?.show_skills !== false && profile.skills?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                        <span key={i} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">{skill}</span>
                    ))}
                </div>
            </div>
        )}
        {(profile.highest_education || profile.school_name) && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary-600" /> Education
                </h2>
                <p className="font-medium text-gray-900">{profile.highest_education}</p>
                {profile.school_name && <p className="text-gray-600">{profile.school_name}</p>}
                {profile.course_or_field && <p className="text-gray-500 text-sm">{profile.course_or_field}</p>}
                {profile.year_graduated && <p className="text-gray-400 text-sm">Graduated {profile.year_graduated}</p>}
            </div>
        )}
        {profile.work_experiences?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary-600" /> Work Experience
                </h2>
                <div className="space-y-4">
                    {profile.work_experiences.map((exp, i) => (
                        <div key={i} className="border-l-2 border-primary-200 pl-4">
                            <p className="font-medium text-gray-900">{exp.position}</p>
                            <p className="text-gray-600 text-sm">{exp.company}</p>
                            <p className="text-gray-400 text-xs">{exp.duration}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
        {profile.certifications?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary-600" /> Certifications
                </h2>
                <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((cert, i) => (
                        <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{cert}</span>
                    ))}
                </div>
            </div>
        )}
        {profile.languages?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Languages</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.languages.map((lang, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                            {lang.language} — {lang.proficiency}
                        </span>
                    ))}
                </div>
            </div>
        )}
        {profile.portfolio_url && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Portfolio</h2>
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline flex items-center gap-1">
                    {profile.portfolio_url} <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        )}
    </div>
)

const EmployerProfile = ({ profile }) => (
    <div className="space-y-6">
        {profile.company_description && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About the Company</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.company_description}</p>
            </div>
        )}
        <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary-600" /> Company Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                {profile.company_size && (
                    <div>
                        <p className="text-gray-500">Company Size</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1"><Users className="w-4 h-4" /> {profile.company_size}</p>
                    </div>
                )}
                {profile.year_established && (
                    <div>
                        <p className="text-gray-500">Established</p>
                        <p className="font-medium text-gray-900 flex items-center gap-1"><Calendar className="w-4 h-4" /> {profile.year_established}</p>
                    </div>
                )}
                {profile.employer_type && (
                    <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-medium text-gray-900 capitalize">{profile.employer_type.replace('_', ' ')}</p>
                    </div>
                )}
            </div>
        </div>
        {(profile.company_website || profile.facebook_url || profile.linkedin_url) && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-600" /> Links
                </h2>
                <div className="space-y-2">
                    {profile.company_website && (
                        <a href={profile.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                            <Globe className="w-4 h-4" /> Website <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    {profile.facebook_url && (
                        <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                            Facebook <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                    {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                            LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        )}
        <div className="card">
            <Link to={`/jobs?employer=${profile.id}`} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Briefcase className="w-5 h-5" /> View Job Listings
            </Link>
        </div>
    </div>
)

const IndividualProfile = ({ profile }) => (
    <div className="space-y-6">
        {profile.bio && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
        )}
        {profile.service_preferences?.length > 0 && (
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Looking For</h2>
                <div className="flex flex-wrap gap-2">
                    {profile.service_preferences.map((service, i) => (
                        <span key={i} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">{service}</span>
                    ))}
                </div>
            </div>
        )}
    </div>
)

export default PublicProfile
