import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    Home,
    Briefcase,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    Search,
    Shield,
    MessageSquare,
    Bookmark
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getTotalUnreadCount } from '../services/messagingService'
import NotificationBell from './common/NotificationBell'
import PendingReverificationBadge from './common/PendingReverificationBadge'

const Navbar = () => {
    const { currentUser, userData, logout, isAdmin, isEmployer, isJobseeker, isHomeowner } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const shouldLoadRealtimeCounts = !!currentUser && userData?.registration_complete !== false

    useEffect(() => {
        if (!shouldLoadRealtimeCounts) {
            setUnreadCount(0)
            return
        }
        const unsubscribe = getTotalUnreadCount(currentUser.uid, setUnreadCount)
        return () => unsubscribe()
    }, [currentUser, shouldLoadRealtimeCounts])

    const handleLogout = async () => {
        try {
            await logout()
            navigate('/login')
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    const navLinks = [
        { path: '/', label: 'Home', icon: Home, public: true },
        { path: '/jobs', label: 'Job Listings', icon: Briefcase, public: true },
        { path: '/diagnostic', label: 'Find Workers', icon: Search, public: true },
    ]

    const protectedLinks = [
        ...(isJobseeker() ? [
            { path: '/my-applications', label: 'My Applications', icon: Users },
            { path: '/saved-jobs', label: 'Saved Jobs', icon: Bookmark },
        ] : []),
        ...(isEmployer() ? [
            { path: '/post-job', label: 'Post Job', icon: Briefcase },
            { path: '/my-listings', label: 'My Listings', icon: Users },
        ] : []),
        ...(isAdmin() ? [
            { path: '/admin', label: 'Admin Panel', icon: Shield },
        ] : []),
    ]

    const isActive = (path) => location.pathname === path

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-3">
                            <img
                                src="/peso-logo.png"
                                alt="PESO Connect"
                                className="h-10 w-auto"
                            />
                            <span className="text-xl font-bold gradient-text hidden sm:block">PESO Connect</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.path)
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {currentUser && protectedLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.path)
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {currentUser ? (
                            <>
                                {/* Messages */}
                                <Link to="/messages" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
                                    <MessageSquare className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Link>

                                {/* Notification Bell */}
                                {shouldLoadRealtimeCounts && <NotificationBell />}

                                {/* User Menu */}
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:block text-right">
                                        <p className="text-sm font-medium text-gray-900">{userData?.display_name || userData?.full_name || userData?.name || 'User'}</p>
                                        <div className="text-xs text-gray-500 capitalize flex items-center justify-end gap-1 flex-wrap">
                                            {userData?.subtype || userData?.role}
                                            {userData?.is_verified && (
                                                userData?.profile_modified_since_verification
                                                    ? <PendingReverificationBadge variant="compact" />
                                                    : <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Verified"></span>
                                            )}
                                        </div>
                                    </div>
                                    <Link
                                        to="/dashboard"
                                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/25 overflow-hidden"
                                    >
                                        {userData?.profile_photo ? (
                                            <img
                                                src={userData.profile_photo}
                                                alt="Profile"
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                {(userData?.display_name || userData?.full_name || userData?.name)?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </Link>
                                    <Link
                                        to="/settings"
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Settings"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link to="/login" className="btn-secondary text-sm py-2 px-4">
                                    Sign In
                                </Link>
                                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                                    Register
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100">
                        <div className="space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <link.icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            ))}
                            {currentUser && protectedLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                        ? 'bg-primary-100 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <link.icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}

export default Navbar
