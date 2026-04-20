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
    'reverify_profiles',
    'reverify_jobseeker_profiles',
    'reverify_employer_profiles',
    'view_skill_insights',
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

// Map each dashboard section ID to the permission that gates it.
export const SECTION_PERMISSIONS = {
    overview: 'view_overview',
    employers: 'view_employers',
    jobseekers: 'view_jobseekers',
    users: 'view_users',
    reverification: 'reverify_profiles',
    jobseeker_export: 'export_jobseekers',
    skill_insights: 'view_skill_insights',
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
    if (!Array.isArray(adminAccess.permissions)) return false
    if (SUPER_ADMIN_ONLY_PERMISSIONS.includes(permission)) return false

    if (permission === 'reverify_profiles') {
        return (
            adminAccess.permissions.includes('reverify_profiles')
            || adminAccess.permissions.includes('reverify_jobseeker_profiles')
            || adminAccess.permissions.includes('reverify_employer_profiles')
        )
    }

    if (
        (permission === 'reverify_jobseeker_profiles' || permission === 'reverify_employer_profiles')
        && adminAccess.permissions.includes('reverify_profiles')
    ) {
        return true
    }

    return adminAccess.permissions.includes(permission)
}

/**
 * Converts a permission key to a human-readable label.
 * e.g. 'manage_system_settings' → 'Manage System Settings'
 *
 * @param {string} permission - One of ALL_PERMISSIONS.
 */
export const getPermissionLabel = (permission) =>
    permission
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

/**
 * Returns the list of section IDs the current admin is allowed to see.
 *
 * @param {object|null} adminAccess - Row from public.admin_access, or null.
 * @returns {string[]} Array of section IDs from SECTION_PERMISSIONS.
 */
export const getVisibleAdminSections = (adminAccess) => {
    if (!adminAccess) return []
    return Object.entries(SECTION_PERMISSIONS)
        .filter(([, permission]) => hasAdminPermission(adminAccess, permission))
        .map(([sectionId]) => sectionId)
}

export const formatPermissionList = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) return ''
    return permissions.map(getPermissionLabel).join(', ')
}
