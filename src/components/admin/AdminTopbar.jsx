import { Shield } from 'lucide-react'
import { isSuperAdmin } from '../../utils/adminPermissions'
import { AdminNotificationBell } from './AdminNotificationBell'

const AdminTopbar = ({
    userData,
    adminAccess,
    notifications,
    unreadCount,
    notificationsLoading,
    onMarkAsRead,
    onMarkAllAsRead,
    onNotificationNavigate,
}) => {
    const isSuper = isSuperAdmin(adminAccess)

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-slate-950/80 backdrop-blur border-b border-slate-800">
            <div />

            <div className="flex items-center gap-4">
                <AdminNotificationBell
                    notifications={notifications}
                    unreadCount={unreadCount}
                    loading={notificationsLoading}
                    onMarkAsRead={onMarkAsRead}
                    onMarkAllAsRead={onMarkAllAsRead}
                    onNavigate={onNotificationNavigate}
                />

                <div
                    className="flex items-center gap-2 pl-3 border-l border-slate-800"
                    role="group"
                    aria-label={`Signed in as ${userData?.name || 'Admin'}, ${isSuper ? 'Super Admin' : 'Sub Admin'}`}
                >
                    <div className="w-7 h-7 bg-indigo-500/15 rounded-lg flex items-center justify-center" aria-hidden="true">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-medium text-slate-300 leading-tight">
                            {userData?.name || 'Admin'}
                        </p>
                        <p className="text-[10px] text-slate-500 leading-tight">
                            {isSuper ? 'Super Admin' : 'Sub Admin'}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    )
}

export { AdminTopbar }
export default AdminTopbar
