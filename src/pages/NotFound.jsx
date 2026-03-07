import { Link } from 'react-router-dom'
import { FileQuestion, Home, Search } from 'lucide-react'

const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
            <div className="card max-w-md text-center">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileQuestion className="w-10 h-10 text-primary-600" />
                </div>
                <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
                <p className="text-gray-600 mb-8">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/" className="btn-primary flex items-center justify-center gap-2">
                        <Home className="w-5 h-5" />
                        Go Home
                    </Link>
                    <Link to="/jobs" className="btn-secondary flex items-center justify-center gap-2">
                        <Search className="w-5 h-5" />
                        Browse Jobs
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default NotFound
