import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, XCircle, Briefcase, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
    subscribeToNotifications,
    getNotifications,
    markAsRead,
    markAllAsRead
} from '../../services/notificationService'

const STATUS_CONFIG = {
    shortlisted: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    hired: { icon: Briefcase, color: 'text-green-500', bg: 'bg-green-50' },
    rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
}

function timeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
}

export default function NotificationBell() {
    const { currentUser } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef(null)

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!currentUser) return

        const unsubscribe = subscribeToNotifications(
            currentUser.uid,
            (newNotification) => {
                setNotifications(prev => [newNotification, ...prev].slice(0, 20))
            },
            (count) => {
                setUnreadCount(count)
            }
        )

        return () => unsubscribe()
    }, [currentUser])

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (open && currentUser) {
            setLoading(true)
            getNotifications(currentUser.uid, 10).then(data => {
                setNotifications(data)
                setLoading(false)
            })
        }
    }, [open, currentUser])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
        setOpen(false)

        // Navigate based on notification type
        if (notification.type === 'application_status_change') {
            navigate('/my-applications')
        }
    }

    const handleMarkAllRead = async () => {
        if (!currentUser) return
        await markAllAsRead(currentUser.uid)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    const getNotificationIcon = (notification) => {
        const status = notification.data?.status
        const config = STATUS_CONFIG[status]
        if (config) {
            const Icon = config.icon
            return <Icon className={`w-5 h-5 ${config.color}`} />
        }
        return <Bell className="w-5 h-5 text-gray-400" />
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden" role="menu" aria-label="Notifications">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    role="menuitem"
                                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                                        !notification.is_read ? 'bg-primary-50/50' : ''
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        STATUS_CONFIG[notification.data?.status]?.bg || 'bg-gray-100'
                                    }`}>
                                        {getNotificationIcon(notification)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {timeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
