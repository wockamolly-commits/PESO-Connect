import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null)
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(true)

    // Compress an image file via Canvas and return a Base64 data URL.
    // Images are resized to max 800px and compressed as JPEG (quality 0.6).
    // Non-image files (PDF) fall back to raw base64 with a 400KB size cap.
    const compressAndEncode = (file) => {
        return new Promise((resolve, reject) => {
            if (!file) return resolve('')

            if (!file.type.startsWith('image/')) {
                if (file.size > 400 * 1024) {
                    return reject(new Error('PDF must be under 400KB.'))
                }
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = (err) => reject(err)
                reader.readAsDataURL(file)
                return
            }

            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                URL.revokeObjectURL(url)
                const MAX_DIM = 800
                let { width, height } = img

                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round(height * (MAX_DIM / width))
                        width = MAX_DIM
                    } else {
                        width = Math.round(width * (MAX_DIM / height))
                        height = MAX_DIM
                    }
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
                resolve(dataUrl)
            }

            img.onerror = () => {
                URL.revokeObjectURL(url)
                reject(new Error('Failed to load image for compression.'))
            }

            img.src = url
        })
    }

    const fetchUserData = async (userId) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()
        if (error) {
            console.error('Failed to fetch user profile:', error)
            return
        }
        if (data) {
            setUserData(data)
        }
    }

    // Create Supabase Auth account and insert minimal users row (Step 1 of registration)
    const createAccount = async (email, password, role) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        const user = data.user
        const minimalDoc = {
            id: user.id,
            email,
            role,
            name: '',
            registration_complete: false,
            registration_step: 1,
            is_verified: role === 'individual',
            skills: [],
            credentials_url: '',
        }

        const { error: insertError } = await supabase.from('users').insert(minimalDoc)
        if (insertError) throw insertError

        return { user: { ...user, uid: user.id }, userData: minimalDoc }
    }

    // Save registration step data to Supabase
    const saveRegistrationStep = async (stepData, stepNumber) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { error } = await supabase
            .from('users')
            .update({ ...stepData, registration_step: stepNumber, updated_at: new Date().toISOString() })
            .eq('id', currentUser.uid)
        if (error) throw error
        setUserData(prev => ({ ...prev, ...stepData, registration_step: stepNumber }))
    }

    // Mark registration as complete
    const completeRegistration = async (finalData = {}) => {
        if (!currentUser) throw new Error('No authenticated user')
        const { error } = await supabase
            .from('users')
            .update({ ...finalData, registration_complete: true, registration_step: null, updated_at: new Date().toISOString() })
            .eq('id', currentUser.uid)
        if (error) throw error
        setUserData(prev => ({ ...prev, ...finalData, registration_complete: true, registration_step: null }))
    }

    // Register new user — legacy function kept for backward compatibility
    const register = async (email, password, role, name, skills = []) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
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

        const { error: insertError } = await supabase.from('users').insert(userDoc)
        if (insertError) throw insertError

        return { user: { ...user, uid: user.id }, userData: userDoc }
    }

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return { ...data.user, uid: data.user.id }
    }

    const logout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setCurrentUser(null)
        setUserData(null)
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
    const hasRole = (role) => userData?.role === role
    const isAdmin = () => userData?.role === 'admin'
    const isEmployer = () => userData?.role === 'employer'
    const isJobseeker = () => userData?.role === 'jobseeker'
    const isIndividual = () => userData?.role === 'individual'

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const user = session.user
                // uid shim: all consumers use currentUser.uid — Supabase uses .id
                setCurrentUser({ ...user, uid: user.id })
                await fetchUserData(user.id)
            } else {
                setCurrentUser(null)
                setUserData(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
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
        hasRole,
        isAdmin,
        isEmployer,
        isJobseeker,
        isIndividual,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
