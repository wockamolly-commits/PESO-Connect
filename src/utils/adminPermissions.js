// Admin RBAC permission helpers.
//
// Design notes:
// - Both super-admins and sub-admins have role = 'admin' in public.users.
// - The admin_access table holds admin_level ('admin' | 'sub-admin') and a
//   permissions text[] for sub-admins.
// - Super-admins receive ALL permissions implicitly; no array check is needed.
// - Sub-admins only have the permissions listed in their permissions column.

export const ALL_PERMISSIONS = [
    'view_overview',
    'view_employers',
    'approve_employers',
    'reject_employers',
    'view_jobseekers',
    'approve_jobseekers',
    'reject_jobseekers',
    'view_users',
    'export_jobseekers',
    'reverify_jobseeker_profiles',
    'reverify_employer_profiles',
    'manage_admins',
    'manage_system_settings',
    'delete_users',
]

// Permissions that are always super-admin-only regardless of grants.
export const SUPER_ADMIN_ONLY_PERMISSIONS = [
    'manage_admins',
    'manage_system_settings',
    'delete_users',
]

export const PERMISSION_LABELS = {
    view_overview: 'View Overview',
    view_employers: 'View Employers',
    approve_employers: 'Approve Employers',
    reject_employers: 'Reject Employers',
    view_jobseekers: 'View Jobseekers',
    approve_jobseekers: 'Approve Jobseekers',
    reject_jobseekers: 'Reject Jobseekers',
    view_users: 'View All Users',
    export_jobseekers: 'Export Jobseekers',
    reverify_jobseeker_profiles: 'Reverify Jobseeker Profiles',
    reverify_employer_profiles: 'Reverify Employer Profiles',
    manage_admins: 'Manage Admins',
    manage_system_settings: 'Manage System Settings',
    delete_users: 'Delete Users',
}

// Map each dashboard section ID to the permission that gates it.
export const SECTION_PERMISSIONS = {
    overview: 'view_overview',
    employers: 'view_employers',
    jobseekers: 'view_jobseekers',
    reverification: ['reverify_jobseeker_profiles', 'reverify_employer_profiles', 'reverify_profiles'],
    users: 'view_users',
    jobseeker_export: 'export_jobseekers',
    admin_management: 'manage_admins',
}

/**
 * Returns true when the given adminAccess record belongs to a super-admin.
 * Returns false for null/undefined (e.g. admin user whose access row is missing).
 *
 * @param {object|null} adminAccess - Row from public.admin_access, or null.
 */
export const isSuperAdmin = (adminAccess) => {
    if (!adminAccess) return false
    return adminAccess.admin_level === 'admin'
}

/**
 * Returns true when the current admin is allowed to perform the named action.
 *
 * Super-admins pass every check. Sub-admins pass only for permissions listed in
 * their permissions array. A missing adminAccess record (null) always returns false.
 *
 * @param {object|null} adminAccess - Row from public.admin_access, or null.
 * @param {string} permission - One of ALL_PERMISSIONS.
 */
export const hasAdminPermission = (adminAccess, permission) => {
    if (!adminAccess) return false
    if (adminAccess.admin_level === 'admin') return true
    // Defense-in-depth: super-admin-only permissions must never be
    // honored for sub-admins, even if those strings somehow end up in
    // their permissions array (bad backfill, compromised super-admin
    // writing a rogue grant, etc.). The DB should not store these for
    // sub-admins either, but the client refuses to act on them regardless.
    if (SUPER_ADMIN_ONLY_PERMISSIONS.includes(permission)) return false
    if (!Array.isArray(adminAccess.permissions)) return false

    // Legacy compatibility: older rows may still carry the combined
    // reverify_profiles grant. Treat it as permission for either role.
    if (
        (permission === 'reverify_jobseeker_profiles' || permission === 'reverify_employer_profiles') &&
        adminAccess.permissions.includes('reverify_profiles')
    ) {
        return true
    }

    return adminAccess.permissions.includes(permission)
}

/**
 * Returns the list of section IDs the current admin is allowed to see.
 *
 * @param {object|null} adminAccess - Row from public.admin_access, or null.
 * @returns {string[]} Array of section IDs from SECTION_PERMISSIONS.
 */
export const getVisibleAdminSections = (adminAccess) => {
    if (!adminAccess) return []
    return Object.entries(SECTION_PERMISSIONS)
        .filter(([, permission]) =>
            Array.isArray(permission)
                ? permission.some((perm) => hasAdminPermission(adminAccess, perm))
                : hasAdminPermission(adminAccess, permission)
        )
        .map(([sectionId]) => sectionId)
}

/**
 * Returns a user-facing label for a permission key.
 *
 * @param {string} permission - One of ALL_PERMISSIONS.
 * @returns {string} Human-readable permission label.
 */
export const getPermissionLabel = (permission) => {
    if (PERMISSION_LABELS[permission]) return PERMISSION_LABELS[permission]
    return String(permission || '')
        .split('_')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Returns a comma-separated list of user-facing permission labels.
 *
 * @param {string[]} permissions - Permission keys.
 * @returns {string} Comma-separated human-readable permission labels.
 */
export const formatPermissionList = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return ''
    return permissions.map(getPermissionLabel).join(', ')
}
