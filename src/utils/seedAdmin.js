import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const getAdminCredentials = () => {
    const email = import.meta.env.VITE_ADMIN_EMAIL
    const password = import.meta.env.VITE_ADMIN_PASSWORD
    if (!email || !password) {
        return null
    }
    return { email, password }
}

export const seedAdminAccount = async () => {
    const credentials = getAdminCredentials()
    if (!credentials) {
        return { success: false, message: 'Admin credentials not configured. Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in your .env file.' }
    }

    try {
        // Check if admin already exists in Firestore
        const adminQuery = await getDoc(doc(db, 'admins', 'default'))
        if (adminQuery.exists()) {
            return { success: true, message: 'Admin already exists' }
        }

        // Create admin account in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
        )

        // Create user document with admin role
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: credentials.email,
            name: 'PESO Administrator',
            role: 'admin',
            is_verified: true,
            skills: [],
            credentials_url: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })

        // Mark admin as seeded
        await setDoc(doc(db, 'admins', 'default'), {
            seeded: true,
            seeded_at: new Date().toISOString()
        })

        return { success: true, message: 'Admin account created successfully' }
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            return { success: true, message: 'Admin email already registered' }
        }
        console.error('Error seeding admin:', error)
        return { success: false, message: error.message }
    }
}

export default { seedAdminAccount }
