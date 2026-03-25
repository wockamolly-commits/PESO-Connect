import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { SUBTYPES } from '../utils/roles'
import { RefreshCw, Search, Home, AlertCircle } from 'lucide-react'

const SubtypeSwitcher = () => {
    const { currentUser, userData, isUser, fetchUserData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // Only render for user role with completed registration
    if (!isUser() || !userData?.registration_complete) return null

    const currentSubtype = userData.subtype
    const targetSubtype = currentSubtype === SUBTYPES.JOBSEEKER
        ? SUBTYPES.HOMEOWNER
        : SUBTYPES.JOBSEEKER

    const targetLabel = targetSubtype === SUBTYPES.JOBSEEKER ? 'Jobseeker' : 'Homeowner'
    const TargetIcon = targetSubtype === SUBTYPES.JOBSEEKER ? Search : Home

    const handleSwitch = async () => {
        setLoading(true)
        try {
            // Update subtype
            const { error } = await supabase
                .from('users')
                .update({ subtype: targetSubtype, updated_at: new Date().toISOString() })
                .eq('id', currentUser.uid)
            if (error) throw error

            // Create empty target profile if it doesn't exist
            const targetTable = targetSubtype === SUBTYPES.JOBSEEKER
                ? 'jobseeker_profiles'
                : 'homeowner_profiles'

            await supabase
                .from(targetTable)
                .upsert({ id: currentUser.uid }, { onConflict: 'id', ignoreDuplicates: true })

            // Refresh auth context
            await fetchUserData(currentUser.uid)

            setShowConfirm(false)
            navigate('/dashboard')
        } catch (err) {
            console.error('Subtype switch failed:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Account Type</h3>
            <p className="text-sm text-gray-600 mb-4">
                You are currently registered as a <strong className="capitalize">{currentSubtype}</strong>.
                You can switch to {targetLabel} to access different features.
            </p>

            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
                >
                    <TargetIcon className="w-4 h-4" />
                    Switch to {targetLabel}
                </button>
            ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-yellow-800">
                                Switch to {targetLabel}?
                            </p>
                            <p className="text-sm text-yellow-700 mt-1">
                                Your {currentSubtype} profile data will be preserved.
                                You can switch back anytime.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSwitch}
                            disabled={loading}
                            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Switching...' : 'Confirm Switch'}
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={loading}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SubtypeSwitcher
