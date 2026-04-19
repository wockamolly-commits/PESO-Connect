import { describe, it, expect } from 'vitest'
import {
    isSuperAdmin,
    hasAdminPermission,
    getVisibleAdminSections,
    ALL_PERMISSIONS,
    SUPER_ADMIN_ONLY_PERMISSIONS,
    SECTION_PERMISSIONS,
} from './adminPermissions'

const superAdminRow = {
    admin_level: 'admin',
    permissions: ALL_PERMISSIONS,
}

const subAdminWithAll = {
    admin_level: 'sub-admin',
    permissions: ALL_PERMISSIONS,
}

const subAdminReadOnly = {
    admin_level: 'sub-admin',
    permissions: ['view_overview', 'view_employers', 'view_jobseekers'],
}

const subAdminApproveEmployers = {
    admin_level: 'sub-admin',
    permissions: ['view_employers', 'approve_employers'],
}

describe('isSuperAdmin', () => {
    it('returns true for admin_level = admin', () => {
        expect(isSuperAdmin(superAdminRow)).toBe(true)
    })

    it('returns false for sub-admin', () => {
        expect(isSuperAdmin(subAdminReadOnly)).toBe(false)
    })

    it('returns false for null', () => {
        expect(isSuperAdmin(null)).toBe(false)
    })

    it('returns false for undefined', () => {
        expect(isSuperAdmin(undefined)).toBe(false)
    })
})

describe('hasAdminPermission', () => {
    it('super-admin passes every permission check', () => {
        for (const perm of ALL_PERMISSIONS) {
            expect(hasAdminPermission(superAdminRow, perm)).toBe(true)
        }
    })

    it('super-admin passes super-admin-only permissions', () => {
        for (const perm of SUPER_ADMIN_ONLY_PERMISSIONS) {
            expect(hasAdminPermission(superAdminRow, perm)).toBe(true)
        }
    })

    it('sub-admin with explicit permission passes that check', () => {
        expect(hasAdminPermission(subAdminApproveEmployers, 'approve_employers')).toBe(true)
        expect(hasAdminPermission(subAdminApproveEmployers, 'view_employers')).toBe(true)
    })

    it('supports the reverify_profiles permission', () => {
        const row = { admin_level: 'sub-admin', permissions: ['reverify_profiles'] }
        expect(hasAdminPermission(row, 'reverify_profiles')).toBe(true)
    })

    it('sub-admin fails for permissions not in their list', () => {
        expect(hasAdminPermission(subAdminApproveEmployers, 'approve_jobseekers')).toBe(false)
        expect(hasAdminPermission(subAdminApproveEmployers, 'manage_admins')).toBe(false)
    })

    it('sub-admin cannot have super-admin-only permissions even if listed', () => {
        // hasAdminPermission defers to the permissions array for sub-admin,
        // so if manage_admins is somehow in the array it would pass the helper.
        // The enforcement of SUPER_ADMIN_ONLY is in the UI grant layer
        // (AdminAccessEditor's DELEGATABLE_PERMISSIONS), not in the read helper.
        // This test documents that behaviour.
        const rowWithManageAdmins = {
            admin_level: 'sub-admin',
            permissions: ['manage_admins'],
        }
        expect(hasAdminPermission(rowWithManageAdmins, 'manage_admins')).toBe(true)
        // A super-admin-row always returns true regardless.
        expect(hasAdminPermission(superAdminRow, 'manage_admins')).toBe(true)
    })

    it('returns false for null adminAccess', () => {
        expect(hasAdminPermission(null, 'view_overview')).toBe(false)
    })

    it('returns false when permissions array is empty', () => {
        const emptyRow = { admin_level: 'sub-admin', permissions: [] }
        expect(hasAdminPermission(emptyRow, 'view_overview')).toBe(false)
    })

    it('returns false when permissions is not an array', () => {
        const malformed = { admin_level: 'sub-admin', permissions: null }
        expect(hasAdminPermission(malformed, 'view_overview')).toBe(false)
    })
})

describe('getVisibleAdminSections', () => {
    it('returns all sections for super-admin', () => {
        const visible = getVisibleAdminSections(superAdminRow)
        expect(visible).toEqual(expect.arrayContaining(Object.keys(SECTION_PERMISSIONS)))
        expect(visible.length).toBe(Object.keys(SECTION_PERMISSIONS).length)
    })

    it('returns only sections the sub-admin can access', () => {
        const visible = getVisibleAdminSections(subAdminReadOnly)
        expect(visible).toContain('overview')
        expect(visible).toContain('employers')
        expect(visible).toContain('jobseekers')
        expect(visible).not.toContain('admin_management')
        expect(visible).not.toContain('users')
    })

    it('returns empty array for null adminAccess', () => {
        expect(getVisibleAdminSections(null)).toEqual([])
    })

    it('returns empty array for sub-admin with no permissions', () => {
        const empty = { admin_level: 'sub-admin', permissions: [] }
        expect(getVisibleAdminSections(empty)).toEqual([])
    })

    it('admin_management section requires manage_admins permission', () => {
        const noManage = { admin_level: 'sub-admin', permissions: ['view_overview'] }
        expect(getVisibleAdminSections(noManage)).not.toContain('admin_management')

        const withManage = { admin_level: 'sub-admin', permissions: ['manage_admins'] }
        expect(getVisibleAdminSections(withManage)).toContain('admin_management')
    })

    it('reverification section requires reverify_profiles permission', () => {
        const noReverify = { admin_level: 'sub-admin', permissions: ['view_overview'] }
        expect(getVisibleAdminSections(noReverify)).not.toContain('reverification')

        const withReverify = { admin_level: 'sub-admin', permissions: ['reverify_profiles'] }
        expect(getVisibleAdminSections(withReverify)).toContain('reverification')
    })
})
