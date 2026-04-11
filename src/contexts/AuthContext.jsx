import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../config/supabase'
import { compressAndEncode } from '../utils/fileUtils'
import { getProfileTable, getStatusField, ROLES, SUBTYPES } from '../utils/roles'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null)
    const [userData, setUserData] = useState(null)
    const [adminAccess, setAdminAccess] = useState(null)
    const [loading, setLoading] = useState(true)
    const passwordResetInProgressRef = useRef(false)
    const userDataFetchesRef = useRef(new Map())
    const authEventSequenceRef = useRef(0)

    const BASE_FIELDS = new Set([
        'id', 'email', 'role', 'subtype', 'name',
        'surname', 'first_name', 'middle_name', 'suffix',
        'is_verified', 'registration_complete', 'registration_step',
        'profile_photo', 'created_at', 'updated_at',
    ])

    const fetchUserData = async (userId, { force = false } = {}) => {
        if (!force) {
            const existingRequest = userDataFetchesRef.current.get(userId)
            if (existingRequest) return existingRequest
        }

        const request = (async () => {
            let timedOut = false
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => { timedOut = true; resolve(null) }, 8000)
            )

            const baseData = await Promise.race([
                supabase.from('users').select('*').eq('id', userId).maybeSingle()
                    .then(({ data, error }) => {
                        if (error) {
                            if (error.name === 'AbortError') return 'timeout'
                            console.error('fetchUserData error:', error.message)
                            return null
                        }
                        return data
                    }),
                timeoutPromise,
            ])

            if (timedOut || baseData === 'timeout') return 'timeout'
            if (!baseData) return null

            // Fetch role-specific profile
            const profileTable = getProfileTable(baseData.role, baseData.subtype)
            let profileData = {}
            if (profileTable) {
                const { data: profile, error: profileError } = await supabase
                    .from(profileTable).select('*').eq('id', userId).maybeSingle()
                if (profileError) {
                    if (profileError.name === 'AbortError') return 'timeout'
                    console.error('fetchUserData profile error:', profileError.message)
                } else if (profile) {
                    profileData = profile
                }
            }

            // Merge: start with baseData, overlay profile values.
            // Booleans (false), numbers (0), and objects are always kept.
            // Only null, empty string, and empty arrays are treated as "empty"
            // and only used as fallback when baseData lacks the key.
            const merged = { ...baseData }
            Object.entries(profileData).forEach(([key, val]) => {
                if (val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                    // Empty value — only use if base doesn't have this key at all
                    if (merged[key] === undefined) merged[key] = val
                } else {
                    // Non-empty value (includes false, 0, objects) — always overlay
                    merged[key] = val
                }
            })

            // Normalize boolean fields that may come back as strings from DB
            const BOOL_FIELDS = ['currently_in_school', 'did_not_graduate', 'is_pwd',
                'terms_accepted', 'data_processing_consent', 'peso_verification_consent',
                'info_accuracy_confirmation', 'dole_authorization', 'registration_complete',
                'is_verified', 'profile_modified_since_verification']
            for (const f of BOOL_FIELDS) {
                if (f in merged) {
                    merged[f] = merged[f] === true || merged[f] === 'true'
                }
            }

            // Compose display_name from split name fields (with full_name fallback)
            if (merged.first_name || merged.surname) {
                merged.display_name = [merged.first_name, merged.surname].filter(Boolean).join(' ')
            } else if (merged.full_name) {
                merged.display_name = merged.full_name
            }

            // Fetch admin_access for admin users so permission helpers work immediately.
            if (baseData.role === 'admin') {
                const { data: accessRow } = await supabase
                    .from('admin_access')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle()
                const access = accessRow || null
                setAdminAccess(access)
                try { localStorage.setItem(`peso-admin-access-${userId}`, JSON.stringify(access)) } catch {}
            }

            setUserData(merged)
            try { localStorage.setItem(`peso-profile-${userId}`, JSON.stringify(merged)) } catch {}
            return merged
        })()

        userDataFetchesRef.current.set(userId, request)

        try {
            return await request
        } finally {
            userDataFetchesRef.current.delete(userId)
        }
    }

    const createAccount = async (email, password, role, subtype = null) => {
        await supabase.auth.signOut()
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role, subtype },
            },
        })
        if (error) throw error
        if (!data.user) throw new Error('Account creation failed. Please try again.')

        console.log('[createAccount] signUp response:', {
            session: data.session,
            user_id: data.user?.id,
            email_confirmed_at: data.user?.email_confirmed_at,
            confirmed_at: data.user?.confirmed_at,
            identities: data.user?.identities?.length,
        })

        const user = data.user
        const emailVerificationRequired = !data.session

        const minimalDoc = {
            id: user.id,
            email,
            role,
            subtype,
            name: '',
            surname: '',
            first_name: '',
            middle_name: '',
            suffix: '',
            display_name: '',
            registration_complete: false,
            registration_step: 1,
            is_verified: role === ROLES.USER && subtype === SUBTYPES.HOMEOWNER,
            skills: [],
            credentials_url: '',
        }

        try { localStorage.setItem(`peso-profile-${user.id}`, JSON.stringify(minimalDoc)) } catch {}

        return { user: { ...user, uid: user.id }, userData: minimalDoc, emailVerificationRequired }
    }

    const sendSignupOtp = async (email) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email })
        if (error) throw error
    }

    const verifySignupOtp = async (email, token) => {
        const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
        if (error) throw error
        return data
    }

    const sendPasswordResetOtp = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
    }

    const verifyPasswordResetOtp = async (email, token, newPassword, { keepSession = false } = {}) => {
        passwordResetInProgressRef.current = true
        try {
            const { error: otpError } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })
            if (otpError) throw otpError
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
            if (updateError) throw updateError
            if (!keepSession) await supabase.auth.signOut({ scope: 'local' })
        } finally {
            // Delay clearing the flag — onAuthStateChange fires asynchronously
            // after verifyOtp resolves, so the guard must still be up when it arrives.
            setTimeout(() => { passwordResetInProgressRef.current = false }, 2000)
        }
    }

    // Split stepData into base (public.users) and profile-specific fields
    const splitFields = (data) => {
        const base = {}
        const profile = {}
        Object.entries(data).forEach(([key, val]) => {
            if (BASE_FIELDS.has(key)) base[key] = val
            else profile[key] = val
        })
        return { base, profile }
    }

    const toSupabaseErrorMessage = (error) => {
        if (!error) return ''
        return [
            error.message,
            error.details,
            error.hint,
            error.code
        ].filter(Boolean).join(' ')
    }

    const getArrayCompatibleValue = (value) => {
        if (Array.isArray(value)) return value
        if (typeof value === 'string' && value.trim()) return [value]
        if (value === '' || value == null) return []
        return value
    }

    // Fields that are TEXT[] in the live database and need wrapping
    // when the client sends a bare string instead of an array.
    const REAL_ARRAY_FIELDS = new Set([
        'disability_type',
        'predefined_skills',
        'skills',
        'certifications',
        'preferred_job_type',
        'preferred_occupations',
        'preferred_local_locations',
        'preferred_overseas_locations',
    ])

    const buildAllArraysPayload = (profile) => {
        const converted = { ...profile }
        for (const field of REAL_ARRAY_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(converted, field)) {
                converted[field] = getArrayCompatibleValue(converted[field])
            }
        }
        return converted
    }

    const getMissingProfileColumn = (error) => {
        const errorMessage = toSupabaseErrorMessage(error)
        if (!errorMessage) return null

        const postgrestMatch = errorMessage.match(/Could not find the '([^']+)' column/i)
        if (postgrestMatch?.[1]) return postgrestMatch[1]

        const postgresMatch = errorMessage.match(/column "([^"]+)" of relation/i)
        if (postgresMatch?.[1]) return postgresMatch[1]

        return null
    }

    const getCheckConstraintField = (error) => {
        const errorMessage = toSupabaseErrorMessage(error)
        if (!errorMessage) return null

        // e.g.  new row for relation "jobseeker_profiles" violates check constraint "..."
        const match = errorMessage.match(/violates check constraint/i)
        return match ? errorMessage : null
    }

    const upsertProfileWithCompatibility = async (profileTable, profileData) => {
        const attemptUpsert = async (payload) => {
            const { error } = await supabase
                .from(profileTable)
                .upsert(payload, { onConflict: 'id' })
            return error
        }

        // Pre-convert known array fields so the first attempt succeeds
        let payload = buildAllArraysPayload({ ...profileData })
        let triedArrayConversion = false
        let lastError = null

        for (let attempt = 0; attempt < 15; attempt += 1) {
            const profileError = await attemptUpsert(payload)
            if (!profileError) return

            lastError = profileError
            const profileErrorMessage = toSupabaseErrorMessage(profileError).toLowerCase()

            console.error(
                `[upsertProfile] attempt ${attempt + 1} failed on ${profileTable}:`,
                profileErrorMessage,
                '| payload keys:', Object.keys(payload)
            )

            const isArrayError =
                profileErrorMessage.includes('malformed array literal') ||
                profileErrorMessage.includes('array value must start with "{"')

            if (isArrayError && !triedArrayConversion) {
                triedArrayConversion = true
                payload = buildAllArraysPayload(payload)
                continue
            }

            const missingColumn = getMissingProfileColumn(profileError)
            if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
                console.warn(`[upsertProfile] dropping missing column: ${missingColumn}`)
                const { [missingColumn]: _ignored, ...nextPayload } = payload
                payload = nextPayload
                continue
            }

            // Check constraint violations are not recoverable by dropping fields
            if (getCheckConstraintField(profileError)) {
                console.error('[upsertProfile] check constraint violation — payload:', JSON.stringify(payload, null, 2))
                throw profileError
            }

            throw profileError
        }

        if (lastError) throw lastError
    }

    // Save registration step data to Supabase
    const saveRegistrationStep = async (stepData, stepNumber) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { base, profile } = splitFields(stepData)

        const now = new Date().toISOString()
        const { error } = await supabase
            .from('users')
            .update({ ...base, registration_step: stepNumber, updated_at: now })
            .eq('id', currentUser.uid)
        if (error) throw error

        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype
        const profileTable = getProfileTable(role, subtype)
        if (profileTable) {
            // Write profile-specific fields + mirror registration_step in a single upsert
            await upsertProfileWithCompatibility(profileTable, {
                id: currentUser.uid,
                ...profile,
                registration_step: stepNumber,
                updated_at: now,
            })
        }

        setUserData(prev => {
            const next = { ...prev, ...stepData, registration_step: stepNumber }
            try { localStorage.setItem(`peso-profile-${currentUser.uid}`, JSON.stringify(next)) } catch {}
            return next
        })
    }

    // Mark registration as complete
    const completeRegistration = async (finalData = {}) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { base, profile } = splitFields(finalData)

        const now = new Date().toISOString()
        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype

        // Build users update — homeowners get is_verified synced to true
        const usersUpdate = { ...base, registration_complete: true, registration_step: null, updated_at: now }
        if (subtype === SUBTYPES.HOMEOWNER) {
            usersUpdate.is_verified = true
        }
        const { error } = await supabase
            .from('users')
            .update(usersUpdate)
            .eq('id', currentUser.uid)
        if (error) throw error

        const profileTable = getProfileTable(role, subtype)
        if (profileTable) {
            // Write profile-specific fields + mirror registration state in a single upsert
            const profileUpsert = {
                id: currentUser.uid,
                ...profile,
                registration_complete: true,
                registration_step: null,
                updated_at: now,
            }
            // Homeowners are always auto-verified on registration completion
            if (subtype === SUBTYPES.HOMEOWNER) {
                profileUpsert.is_verified = true
            }
            await upsertProfileWithCompatibility(profileTable, profileUpsert)
        }

        setUserData(prev => {
            const next = { ...prev, ...finalData, registration_complete: true, registration_step: null }
            if (subtype === SUBTYPES.HOMEOWNER) next.is_verified = true
            try { localStorage.setItem(`peso-profile-${currentUser.uid}`, JSON.stringify(next)) } catch {}
            return next
        })
    }

    // Register new user — legacy function kept for backward compatibility
    const register = async (email, password, role, name, skills = []) => {
        await supabase.auth.signOut()
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role } },
        })
        if (error) throw error

        const user = data.user
        const userDoc = {
            id: user.id,
            email,
            name,
            role,
            is_verified: false,
            skills,
            credentials_url: '',
        }

        return { user: { ...user, uid: user.id }, userData: userDoc }
    }

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return { ...data.user, uid: data.user.id }
    }

    const logout = async () => {
        // scope: 'local' clears the session from localStorage instantly
        // with no network round-trip, eliminating the 1-3s delay on free tier.
        // The access token expires naturally on the server (~1 hour).
        await supabase.auth.signOut({ scope: 'local' })
        // Don't clear the profile cache — it's keyed by user ID and helps
        // the navbar load instantly on the user's next login
        window.location.href = '/login'
    }

    // Delete account — re-authenticates then calls a Postgres RPC that
    // deletes from auth.users (cascades to public.users)
    const deleteAccount = async (password) => {
        if (!currentUser) throw new Error('No authenticated user')

        const { error: reAuthError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password,
        })
        if (reAuthError) {
            const err = new Error('Incorrect password. Please try again.')
            err.code = 'auth/wrong-password'
            throw err
        }

        const { error } = await supabase.rpc('delete_user')
        if (error) throw error

        setCurrentUser(null)
        setUserData(null)
    }

    const isVerified = () => userData?.is_verified === true
    const isEmailVerified = () => !!(currentUser?.email_confirmed_at || currentUser?.confirmed_at)
    const hasRole = (role) => userData?.role === role
    const isAdmin = () => userData?.role === ROLES.ADMIN
    const isEmployer = () => userData?.role === ROLES.EMPLOYER
    const isUser = () => userData?.role === ROLES.USER
    const isJobseeker = () => userData?.role === ROLES.USER && userData?.subtype === SUBTYPES.JOBSEEKER
    const isHomeowner = () => userData?.role === ROLES.USER && userData?.subtype === SUBTYPES.HOMEOWNER

    // Ref prevents React 18 Strict Mode from subscribing twice.
    // Double-subscribe triggers two Supabase _initialize() calls that fight
    // over the navigator lock, breaking every auth-dependent request.
    const authInitRef = useRef(false)

    const handleAuthSession = async (session, sequenceNumber) => {
        try {
            // Password reset creates a temporary session for updateUser -
            // don't treat it as a real login.
            if (passwordResetInProgressRef.current) {
                setLoading(false)
                return
            }

            if (session?.user) {
                const user = session.user
                setCurrentUser({ ...user, uid: user.id })
                // Restore cached profile instantly so Navbar never shows "User"
                try {
                    const cached = localStorage.getItem(`peso-profile-${user.id}`)
                    if (cached) setUserData(JSON.parse(cached))
                } catch {}
                // Restore cached adminAccess so permission helpers work on reload
                try {
                    const cachedAccess = localStorage.getItem(`peso-admin-access-${user.id}`)
                    if (cachedAccess) setAdminAccess(JSON.parse(cachedAccess))
                } catch {}
                // Fetch fresh data outside the auth callback to avoid
                // competing for Supabase's navigator lock.
                const result = await fetchUserData(user.id)
                if (authEventSequenceRef.current !== sequenceNumber) return

                if (result === 'timeout') {
                    // DB hung (e.g. Supabase project paused) - keep cached data, stay logged in
                } else if (!result) {
                    // Null = no DB row -> stale session, sign out locally
                    await supabase.auth.signOut({ scope: 'local' })
                    localStorage.clear()
                    window.location.href = '/login'
                    return
                }
            } else {
                setCurrentUser(null)
                setUserData(null)
                setAdminAccess(null)
            }
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('Auth state change error:', err)
            }
        } finally {
            if (authEventSequenceRef.current === sequenceNumber) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        // Only subscribe once — skip on Strict Mode's second mount
        if (authInitRef.current) return
        authInitRef.current = true

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const sequenceNumber = ++authEventSequenceRef.current
            window.setTimeout(() => {
                handleAuthSession(session, sequenceNumber)
            }, 0)
        })

        // Intentionally no cleanup — AuthProvider is the app root and never
        // unmounts. Returning subscription.unsubscribe() here would cause
        // Strict Mode to unsubscribe then resubscribe, triggering two
        // Supabase _initialize() calls that fight over the navigator lock.
    }, [])

    const value = {
        currentUser,
        userData,
        adminAccess,
        loading,
        register,
        createAccount,
        saveRegistrationStep,
        completeRegistration,
        compressAndEncode,
        login,
        logout,
        deleteAccount,
        sendSignupOtp,
        verifySignupOtp,
        sendPasswordResetOtp,
        verifyPasswordResetOtp,
        isVerified,
        isEmailVerified,
        hasRole,
        isAdmin,
        isEmployer,
        isUser,
        isJobseeker,
        isHomeowner,
        fetchUserData,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
