import { createContext, useContext, useState, useEffect } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth'
import { doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { sendJobseekerRegistrationEmail, sendEmployerRegistrationEmail } from '../services/emailService'

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

    // Register new jobseeker with comprehensive profile
    const registerJobseeker = async (jobseekerData) => {
        const { email, password, resumeFile, certificateFiles, ...profileData } = jobseekerData
        let user = null

        try {
            // 1. Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            user = userCredential.user

            // 2. Convert resume to Base64
            let resumeData = ''
            if (resumeFile) {
                resumeData = await compressAndEncode(resumeFile)
            }

            // 3. Convert certificate files to Base64 array
            let certificatesData = []
            if (certificateFiles && certificateFiles.length > 0) {
                for (const file of certificateFiles) {
                    const encoded = await compressAndEncode(file)
                    certificatesData.push({
                        name: file.name,
                        data: encoded,
                        type: file.type
                    })
                }
            }

            // 4. Create jobseeker document in Firestore
            const userDoc = {
                uid: user.uid,
                email: email,
                name: profileData.full_name || '',
                role: 'jobseeker',

                // Personal Information
                full_name: profileData.full_name || '',
                date_of_birth: profileData.date_of_birth || '',
                barangay: profileData.barangay || '',
                city: profileData.city || '',
                province: profileData.province || '',

                // Contact Information
                mobile_number: profileData.mobile_number || '',
                preferred_contact_method: profileData.preferred_contact_method || 'email',

                // Employment Preferences
                preferred_job_type: profileData.preferred_job_type || [],
                preferred_job_location: profileData.preferred_job_location || '',
                expected_salary_min: profileData.expected_salary_min || '',
                expected_salary_max: profileData.expected_salary_max || '',
                willing_to_relocate: profileData.willing_to_relocate || 'no',

                // Educational Background
                highest_education: profileData.highest_education || '',
                school_name: profileData.school_name || '',
                course_or_field: profileData.course_or_field || '',
                year_graduated: profileData.year_graduated || '',

                // Skills and Work Experience
                skills: profileData.skills || [],
                work_experiences: profileData.work_experiences || [],
                certifications: profileData.certifications || [],
                portfolio_url: profileData.portfolio_url || '',

                // Documents
                resume_url: resumeData,
                certificate_urls: certificatesData,

                // Status and Verification
                is_verified: false,
                jobseeker_status: 'pending', // pending | verified | rejected
                rejection_reason: '',

                // Consent
                terms_accepted: profileData.terms_accepted || false,
                data_processing_consent: profileData.data_processing_consent || false,
                peso_verification_consent: profileData.peso_verification_consent || false,
                info_accuracy_confirmation: profileData.info_accuracy_confirmation || false,

                // Meta (legacy fields for compatibility)
                credentials_url: '',

                // Timestamps
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            await setDoc(doc(db, 'users', user.uid), userDoc)

            // 5. Send registration confirmation email
            try {
                await sendJobseekerRegistrationEmail({
                    email: userDoc.email,
                    full_name: userDoc.full_name
                })
            } catch (emailError) {
                // Don't fail registration if email fails
                console.error('Failed to send registration email:', emailError)
            }

            return { user, userData: userDoc }
        } catch (error) {
            // If auth account was created but Firestore write failed, clean up
            if (user && error.code !== 'auth/email-already-in-use') {
                try {
                    await user.delete()
                } catch (deleteErr) {
                    console.error('Failed to rollback auth account:', deleteErr)
                }
            }
            throw error
        }
    }

    // Register individual/homeowner with minimal fields (no business verification)
    const registerIndividual = async (individualData) => {
        const { email, password, fullName, contactNumber } = individualData
        let user = null

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            user = userCredential.user

            const userDoc = {
                uid: user.uid,
                email: email,
                name: fullName,
                role: 'individual',
                full_name: fullName,
                contact_number: contactNumber,
                // Individuals are auto-verified — no PESO review needed
                is_verified: true,
                individual_status: 'active',
                // Empty legacy fields for compatibility
                skills: [],
                credentials_url: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            await setDoc(doc(db, 'users', user.uid), userDoc)
            return { user, userData: userDoc }
        } catch (error) {
            if (user && error.code !== 'auth/email-already-in-use') {
                try {
                    await user.delete()
                } catch (deleteErr) {
                    console.error('Failed to rollback auth account:', deleteErr)
                }
            }
            throw error
        }
    }

    // Register new employer with full verification data
    const registerEmployer = async (employerData) => {
        const { email, password, govIdFile, businessPermitFile, ...profileData } = employerData
        let user = null

        try {
            // 1. Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            user = userCredential.user

            // 2. Convert documents to Base64 (stored in Firestore, no Storage needed)
            let govIdData = ''
            let businessPermitData = ''

            if (govIdFile) {
                govIdData = await compressAndEncode(govIdFile)
            }
            if (businessPermitFile) {
                businessPermitData = await compressAndEncode(businessPermitFile)
            }

            // 3. Create employer document in Firestore
            const userDoc = {
                uid: user.uid,
                email: email,
                name: profileData.representative_name,
                role: 'employer',
                // Business Information
                company_name: profileData.company_name || '',
                employer_type: profileData.employer_type || '',
                business_reg_number: profileData.business_reg_number || '',
                business_address: profileData.business_address || '',
                nature_of_business: profileData.nature_of_business || '',
                // Authorized Representative
                representative_name: profileData.representative_name || '',
                representative_position: profileData.representative_position || '',
                gov_id_url: govIdData,
                // Contact Information
                contact_email: profileData.contact_email || email,
                contact_number: profileData.contact_number || '',
                preferred_contact_method: profileData.preferred_contact_method || 'email',
                // Verification Documents
                business_permit_url: businessPermitData,
                // Status
                is_verified: false,
                employer_status: 'pending', // pending | approved | rejected
                rejection_reason: '',
                // Agreements
                terms_accepted: profileData.terms_accepted || false,
                peso_consent: profileData.peso_consent || false,
                labor_compliance: profileData.labor_compliance || false,
                // Meta
                skills: [],
                credentials_url: '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            await setDoc(doc(db, 'users', user.uid), userDoc)

            // 4. Send registration confirmation email
            try {
                await sendEmployerRegistrationEmail({
                    email: userDoc.email,
                    representative_name: userDoc.representative_name,
                    company_name: userDoc.company_name
                })
            } catch (emailError) {
                // Don't fail registration if email fails
                console.error('Failed to send registration email:', emailError)
            }

            return { user, userData: userDoc }
        } catch (error) {
            // If auth account was created but Firestore write failed, clean up
            if (user && error.code !== 'auth/email-already-in-use') {
                try {
                    await user.delete()
                } catch (deleteErr) {
                    console.error('Failed to rollback auth account:', deleteErr)
                }
            }
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
        registerJobseeker,
        registerEmployer,
        registerIndividual,
        createAccount,
        saveRegistrationStep,
        completeRegistration,
        compressAndEncode,
        login,
        logout,
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
