import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuth } from '../contexts/AuthContext'
import { SUBTYPES, ROLES, getProfileTable, getRegistrationRoute } from '../utils/roles'
import { RefreshCw, Search, Home, AlertCircle } from 'lucide-react'

const SubtypeSwitcher = () => {
    const { currentUser, userData, isUser, fetchUserData } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [targetProfileComplete, setTargetProfileComplete] = useState(null)

    // Only render for user role with completed registration
    if (!isUser() || !userData?.registration_complete) return null

    const currentSubtype = userData.subtype
    const targetSubtype = currentSubtype === SUBTYPES.JOBSEEKER
        ? SUBTYPES.HOMEOWNER
        : SUBTYPES.JOBSEEKER

    const targetLabel = targetSubtype === SUBTYPES.JOBSEEKER ? 'Jobseeker' : 'Homeowner'
    const TargetIcon = targetSubtype === SUBTYPES.JOBSEEKER ? Search : Home

    // Check target profile state before showing confirm dialog
    const handleShowConfirm = async () => {
        const targetTable = getProfileTable(ROLES.USER, targetSubtype)
        const { data, error } = await supabase
            .from(targetTable)
            .select('registration_complete')
            .eq('id', currentUser.uid)
            .maybeSingle()
        if (error) {
            console.error('Failed to check target profile:', error)
            return
        }
        setTargetProfileComplete(data?.registration_complete === true)
        setShowConfirm(true)
    }

    const handleSwitch = async () => {
        setLoading(true)
        try {
            const now = new Date().toISOString()
            const targetTable = getProfileTable(ROLES.USER, targetSubtype)

            // Read target profile to determine state
            const { data: targetProfile } = await supabase
                .from(targetTable)
                .select('is_verified, registration_complete, registration_step')
                .eq('id', currentUser.uid)
                .maybeSingle()

            const isComplete = targetProfile?.registration_complete === true

            if (isComplete) {
                // Restore previously completed profile
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        subtype: targetSubtype,
                        is_verified: targetProfile.is_verified,
                        registration_complete: true,
                        registration_step: null,
                        updated_at: now,
                    })
                    .eq('id', currentUser.uid)
                if (updateError) throw updateError
            } else {
                // First time or abandoned — create profile row if needed
                await supabase
                    .from(targetTable)
                    .upsert({ id: currentUser.uid }, { onConflict: 'id', ignoreDuplicates: true })

                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        subtype: targetSubtype,
                        is_verified: false,
                        registration_complete: false,
                        registration_step: targetProfile?.registration_step || 1,
                        updated_at: now,
                    })
                    .eq('id', currentUser.uid)
                if (updateError) throw updateError
            }

            // Refresh auth context
            await fetchUserData(currentUser.uid)

            setShowConfirm(false)
            if (isComplete) {
                navigate('/dashboard')
            } else {
                navigate(getRegistrationRoute(ROLES.USER, targetSubtype))
            }
        } catch (err) {
            console.error('Subtype switch failed:', err)
        } finally {
            setLoading(false)
        }
    }

    const confirmMessage = targetProfileComplete
        ? `Your ${targetLabel.toLowerCase()} profile will be restored.`
        : `You'll need to complete the ${targetLabel.toLowerCase()} registration process.`

    return (
        <div className="border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Account Type</h3>
            <p className="text-sm text-gray-600 mb-4">
                You are currently registered as a <strong className="capitalize">{currentSubtype}</strong>.
                You can switch to {targetLabel} to access different features.
            </p>

            {!showConfirm ? (
                <button
                    onClick={handleShowConfirm}
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
                                {confirmMessage} Your {currentSubtype} profile data will be preserved.
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
                            onClick={() => { setShowConfirm(false); setTargetProfileComplete(null) }}
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
