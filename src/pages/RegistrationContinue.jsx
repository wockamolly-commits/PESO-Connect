import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

const RegistrationContinue = () => {
    const { userData, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (loading) return

        if (!userData) {
            navigate('/login', { replace: true })
            return
        }

        if (userData.registration_complete !== false) {
            navigate('/dashboard', { replace: true })
            return
        }

        // Route by role for employer, by subtype for user accounts
        if (userData.role === 'employer') {
            navigate('/register/employer', { replace: true })
        } else if (userData.subtype === 'jobseeker') {
            navigate('/register/jobseeker', { replace: true })
        } else if (userData.subtype === 'homeowner') {
            navigate('/register/homeowner', { replace: true })
        } else {
            navigate('/dashboard', { replace: true })
        }
    }, [userData, loading, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
    )
}

export default RegistrationContinue
