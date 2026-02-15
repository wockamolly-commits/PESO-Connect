import { createContext, useContext, useState, useEffect } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'firebase/auth'
import { doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

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

            // For non-image files (e.g. PDF), do raw base64 with size cap
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

            // For images: load → resize → compress via Canvas
            const img = new Image()
            const url = URL.createObjectURL(file)

            img.onload = () => {
                URL.revokeObjectURL(url)
                const MAX_DIM = 800
                let { width, height } = img

                // Scale down if needed
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

                // Output as JPEG at 0.6 quality (~30-80KB typical)
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

    // Create Firebase Auth account and minimal Firestore doc (Step 1 of registration)
    const createAccount = async (email, password, role) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        const minimalDoc = {
            uid: user.uid,
            email: email,
            role: role,
            name: '',
            registration_complete: false,
            registration_step: 1,
            is_verified: role === 'individual',
            skills: [],
            credentials_url: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        await setDoc(doc(db, 'users', user.uid), minimalDoc)
        return { user, userData: minimalDoc }
    }

    // Save registration step data to Firestore
    const saveRegistrationStep = async (stepData, stepNumber) => {
        if (!currentUser) throw new Error('No authenticated user')
        await updateDoc(doc(db, 'users', currentUser.uid), {
            ...stepData,
            registration_step: stepNumber,
            updated_at: new Date().toISOString()
        })
    }

    // Mark registration as complete
    const completeRegistration = async (finalData = {}) => {
        if (!currentUser) throw new Error('No authenticated user')
        await updateDoc(doc(db, 'users', currentUser.uid), {
            ...finalData,
            registration_complete: true,
            registration_step: null,
            updated_at: new Date().toISOString()
        })
    }

    // Register new jobseeker user (legacy - kept for backward compatibility)
    const register = async (email, password, role, name, skills = []) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Create user document in Firestore with is_verified defaulting to false
            const userDoc = {
                uid: user.uid,
                email: email,
                name: name,
                role: role,
                is_verified: false,
                skills: skills,
                credentials_url: '',
                created_at: new Date().toISOString()
            }

            await setDoc(doc(db, 'users', user.uid), userDoc)
            return { user, userData: userDoc }
        } catch (error) {
            throw error
        }
    }

    // Login user
    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            return userCredential.user
        } catch (error) {
            throw error
        }
    }

    // Logout user
    const logout = async () => {
        try {
            await signOut(auth)
            setCurrentUser(null)
            setUserData(null)
        } catch (error) {
            throw error
        }
    }

    // Send password reset email
    const resetPassword = async (email) => {
        await sendPasswordResetEmail(auth, email)
    }

    // Delete user account (requires re-authentication)
    const deleteAccount = async (password) => {
        if (!currentUser) throw new Error('No authenticated user')

        const credential = EmailAuthProvider.credential(currentUser.email, password)
        await reauthenticateWithCredential(currentUser, credential)

        await deleteDoc(doc(db, 'users', currentUser.uid))
        await deleteUser(currentUser)

        setCurrentUser(null)
        setUserData(null)
    }

    // Check if user is verified
    const isVerified = () => {
        return userData?.is_verified === true
    }

    // Check user role
    const hasRole = (role) => {
        return userData?.role === role
    }

    // Check if user is admin
    const isAdmin = () => {
        return userData?.role === 'admin'
    }

    // Check if user is employer
    const isEmployer = () => {
        return userData?.role === 'employer'
    }

    // Check if user is jobseeker
    const isJobseeker = () => {
        return userData?.role === 'jobseeker'
    }

    // Check if user is individual/homeowner
    const isIndividual = () => {
        return userData?.role === 'individual'
    }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user)

            if (user) {
                try {
                    // Verify the user still exists by reloading their profile
                    await user.reload()
                } catch (err) {
                    // User was deleted or token is invalid — clear the stale session
                    console.warn('Stale auth session detected, signing out:', err.message)
                    await signOut(auth)
                    setCurrentUser(null)
                    setUserData(null)
                    setLoading(false)
                    return
                }

                // Subscribe to user data changes
                const userDocRef = doc(db, 'users', user.uid)
                const unsubscribeUserData = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setUserData(doc.data())
                    }
                    setLoading(false)
                }, (error) => {
                    console.error('Error fetching user data:', error)
                    setLoading(false)
                })

                return () => unsubscribeUserData()
            } else {
                setUserData(null)
                setLoading(false)
            }
        })

        return () => unsubscribeAuth()
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
        isIndividual
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
