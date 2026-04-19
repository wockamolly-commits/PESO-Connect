import {
    Shield, User, LogOut, ChevronRight,
    LayoutDashboard, ClipboardList, Building2, Users, UserCog, RefreshCw
} from 'lucide-react'
import { getVisibleAdminSections, isSuperAdmin } from '../../utils/adminPermissions'

const ALL_NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'employers', label: 'Employer Verification', icon: Building2 },
    { id: 'jobseekers', label: 'Jobseeker Verification', icon: Users },
    { id: 'reverification', label: 'Re-verification', icon: RefreshCw },
    { id: 'users', label: 'All Users', icon: ClipboardList },
    { id: 'admin_management', label: 'Admin Management', icon: UserCog },
]

const AdminSidebar = ({ activeSection, sidebarOpen, setSidebarOpen, userData, adminAccess, onLogout, onSectionChange, sectionBadges = {} }) => {
    const visibleSectionIds = getVisibleAdminSections(adminAccess)
    const navItems = ALL_NAV_ITEMS.filter(item => visibleSectionIds.includes(item.id))
    const isSuper = isSuperAdmin(adminAccess)

    return (
        <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 fixed inset-y-0 left-0 z-40`}>
            {/* Brand */}
            <div className="p-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <img
                        src="/peso-logo.png"
                        alt="PESO Connect"
                        className="w-12 h-12 flex-shrink-0 object-contain"
                    />
                    {sidebarOpen && (
                        <div className="animate-fade-in">
                            <h1 className="font-bold text-white text-sm tracking-wide">PESO CONNECT</h1>
                            <p className="text-[11px] text-indigo-400 font-medium tracking-widest uppercase">Admin Panel</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeSection === item.id
                                ? 'bg-indigo-500/15 text-indigo-400 shadow-lg shadow-indigo-500/5'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                            }`} />
                        {sidebarOpen && (
                            <span className="text-sm font-medium">{item.label}</span>
                        )}
                        {sidebarOpen && sectionBadges[item.id] > 0 && (
                            <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                                {sectionBadges[item.id]}
                            </span>
                        )}
                        {sidebarOpen && activeSection === item.id && !sectionBadges[item.id] && (
                            <ChevronRight className="w-4 h-4 ml-auto text-indigo-500" />
                        )}
                    </button>
                ))}

                {navItems.length === 0 && sidebarOpen && (
                    <p className="px-3 py-4 text-xs text-slate-600 text-center">No sections accessible</p>
                )}
            </nav>

            {/* Sidebar toggle */}
            <div className="p-3 border-t border-slate-800">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors text-xs"
                >
                    {sidebarOpen ? '\u2190 Collapse' : '\u2192'}
                </button>
            </div>

            {/* Admin info & logout */}
            <div className="p-4 border-t border-slate-800">
                {sidebarOpen ? (
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{userData?.name || 'Admin'}</p>
                            <p className="text-xs text-slate-500 truncate">
                                {isSuper ? 'Super Admin' : (adminAccess ? 'Sub Admin' : 'Admin')}
                            </p>
                        </div>
                        <button onClick={onLogout} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button onClick={onLogout} className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors" title="Logout">
                        <LogOut className="w-4 h-4" />
                    </button>
                )}
            </div>
        </aside>
    )
}

export { AdminSidebar }
export default AdminSidebar
