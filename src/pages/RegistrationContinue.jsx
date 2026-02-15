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

        switch (userData.role) {
            case 'jobseeker':
                navigate('/register/jobseeker', { replace: true })
                break
            case 'employer':
                navigate('/register/employer', { replace: true })
                break
            case 'individual':
                navigate('/register/individual', { replace: true })
                break
            default:
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
