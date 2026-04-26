// XSS posture: notification title/message are rendered as React text
// children ({n.title}, {n.message}) so any HTML in the payload is
// escaped. Do NOT introduce dangerouslySetInnerHTML here or accept a
// "rich content" field without a sanitizer (DOMPurify) — admin
// notifications carry fields authored by triggers that interpolate
// user-supplied values (company names, rejection reasons, etc.) and
// are a prime XSS sink.
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Bell, CheckCheck, Building2, Users, AlertTriangle,
    ShieldAlert, Flag, UserCog, Loader2,
} from 'lucide-react'

const CATEGORY_CONFIG = {
    user_verification_pending: { icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    job_posting_approval: { icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    system_alert: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
    user_report: { icon: Flag, color: 'text-orange-400', bg: 'bg-orange-500/15' },
    application_flagged: { icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/15' },
    admin_account_event: { icon: UserCog, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
}

const PRIORITY_BORDER = {
    critical: 'border-l-red-500',
    high: 'border-l-amber-500',
    medium: 'border-l-slate-600',
    low: 'border-l-slate-700',
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

const AdminNotificationBell = ({
    notifications = [],
    unreadCount = 0,
    loading,
    onMarkAsRead,
    onMarkAllAsRead,
    onNavigate,
}) => {
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef(null)
    const navigate = useNavigate()

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const handleClick = async (notification) => {
        if (!notification.is_read) {
            await onMarkAsRead(notification.id)
        }
        setOpen(false)

        // Use reference_link for navigation
        if (notification.reference_link) {
            // reference_link is a relative path like /admin?section=employers&tab=pending
            // Parse query params to drive the admin dashboard section/tab
            if (onNavigate) {
                onNavigate(notification)
            } else {
                navigate(notification.reference_link)
            }
        }
    }

    const getIcon = (type) => {
        const config = CATEGORY_CONFIG[type]
        if (!config) return <Bell className="w-4 h-4 text-slate-400" />
        const Icon = config.icon
        return <Icon className={`w-4 h-4 ${config.color}`} />
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in"
                    role="menu"
                    aria-label="Admin notifications"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => { onMarkAllAsRead(); }}
                                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => {
                                const config = CATEGORY_CONFIG[n.type]
                                const borderClass = PRIORITY_BORDER[n.priority] || PRIORITY_BORDER.medium
                                return (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClick(n)}
                                        role="menuitem"
                                        className={`w-full text-left px-4 py-3 flex gap-3 border-l-2 transition-colors ${borderClass} ${
                                            !n.is_read
                                                ? 'bg-indigo-500/5 hover:bg-indigo-500/10'
                                                : 'hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config?.bg || 'bg-slate-800'}`}>
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                {timeAgo(n.created_at)}
                                            </p>
                                        </div>
                                        {!n.is_read && (
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export { AdminNotificationBell }
export default AdminNotificationBell
