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
    return Array.isArray(adminAccess.permissions) && adminAccess.permissions.includes(permission)
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
        .filter(([, permission]) => hasAdminPermission(adminAccess, permission))
        .map(([sectionId]) => sectionId)
}
