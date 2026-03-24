import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { compressAndEncode } from '../utils/fileUtils'
import { getProfileTable, getStatusField, ROLES, SUBTYPES } from '../utils/roles'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null)
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(true)


    const BASE_FIELDS = new Set([
        'id', 'email', 'role', 'subtype', 'name', 'is_verified',
        'registration_complete', 'registration_step', 'profile_photo',
        'created_at', 'updated_at',
    ])

    const fetchUserData = async (userId) => {
        let timedOut = false
        const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => { timedOut = true; resolve(null) }, 8000)
        )

        const baseData = await Promise.race([
            supabase.from('users').select('*').eq('id', userId).maybeSingle()
                .then(({ data, error }) => {
                    if (error) { console.error('fetchUserData error:', error.message); return null }
                    return data
                }),
            timeoutPromise,
        ])

        if (timedOut) return 'timeout'
        if (!baseData) return null

        // Fetch role-specific profile
        const profileTable = getProfileTable(baseData.role, baseData.subtype)
        let profileData = {}
        if (profileTable) {
            const { data: profile } = await supabase
                .from(profileTable).select('*').eq('id', userId).maybeSingle()
            if (profile) profileData = profile
        }

        // Merge: start with baseData, overlay non-empty profile values
        // This ensures existing data in public.users shows as fallback
        const merged = { ...baseData }
        Object.entries(profileData).forEach(([key, val]) => {
            const isEmpty = val === null || val === '' ||
                (Array.isArray(val) && val.length === 0)
            if (!isEmpty) merged[key] = val
            else if (merged[key] === undefined) merged[key] = val
        })

        setUserData(merged)
        try { localStorage.setItem(`peso-profile-${userId}`, JSON.stringify(merged)) } catch {}
        return merged
    }

    const createAccount = async (email, password, role, subtype = null) => {
        await supabase.auth.signOut()
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role, subtype } },
        })
        if (error) throw error
        if (!data.user) throw new Error('Account creation failed. Please try again.')

        const user = data.user
        const minimalDoc = {
            id: user.id,
            email,
            role,
            subtype,
            name: '',
            registration_complete: false,
            registration_step: 1,
            is_verified: role === ROLES.USER && subtype === SUBTYPES.HOMEOWNER,
            skills: [],
            credentials_url: '',
        }

        try { localStorage.setItem(`peso-profile-${user.id}`, JSON.stringify(minimalDoc)) } catch {}

        return { user: { ...user, uid: user.id }, userData: minimalDoc }
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
        if (profileTable && Object.keys(profile).length > 0) {
            const { error: profileError } = await supabase
                .from(profileTable)
                .upsert({ id: currentUser.uid, ...profile, updated_at: now }, { onConflict: 'id' })
            if (profileError) throw profileError
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
        const { error } = await supabase
            .from('users')
            .update({ ...base, registration_complete: true, registration_step: null, updated_at: now })
            .eq('id', currentUser.uid)
        if (error) throw error

        const role = userData?.role || currentUser?.user_metadata?.role
        const subtype = userData?.subtype || currentUser?.user_metadata?.subtype
        const profileTable = getProfileTable(role, subtype)
        if (profileTable && Object.keys(profile).length > 0) {
            const { error: profileError } = await supabase
                .from(profileTable)
                .upsert({ id: currentUser.uid, ...profile, updated_at: now }, { onConflict: 'id' })
            if (profileError) throw profileError
        }

        setUserData(prev => {
            const next = { ...prev, ...finalData, registration_complete: true, registration_step: null }
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

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
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

    useEffect(() => {
        let mounted = true
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                if (session?.user) {
                    const user = session.user
                    setCurrentUser({ ...user, uid: user.id })
                    // Restore cached profile instantly so Navbar never shows "User"
                    try {
                        const cached = localStorage.getItem(`peso-profile-${user.id}`)
                        if (cached) setUserData(JSON.parse(cached))
                    } catch {}
                    // Fetch fresh data — DB may be slow/paused on free tier
                    const result = await fetchUserData(user.id)
                    if (result === 'timeout') {
                        // DB hung (e.g. Supabase project paused) — keep cached data, stay logged in
                    } else if (!result && mounted) {
                        // Null = no DB row → stale session, sign out
                        await supabase.auth.signOut()
                        localStorage.clear()
                        window.location.href = '/login'
                        return
                    }
                } else {
                    setCurrentUser(null)
                    setUserData(null)
                }
            } catch (err) {
                console.error('Auth state change error:', err)
            } finally {
                if (mounted) setLoading(false)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const value = {
        currentUser,
        userData,
        loading,
        register,
        createAccount,
        saveRegistrationStep,
        completeRegistration,
        compressAndEncode,
        login,
        logout,
        resetPassword,
        deleteAccount,
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
