import { supabase } from '../config/supabase'

export const ADMIN_DIRECTORY_PAGE_SIZE = 20

const normalizeFilterValue = (value) => {
    if (!value || value === 'all') return null
    return value
}

export const buildAdminDirectoryParams = ({
    role = 'all',
    verificationStatus = 'all',
    searchQuery = '',
    sortOrder = 'desc',
    limit = ADMIN_DIRECTORY_PAGE_SIZE,
    offset = 0,
} = {}) => ({
    p_role: normalizeFilterValue(role),
    p_verification_status: normalizeFilterValue(verificationStatus),
    p_search: searchQuery?.trim() || null,
    p_sort_order: sortOrder === 'asc' ? 'asc' : 'desc',
    p_limit: limit,
    p_offset: offset,
})

const isEmptyValue = (value) =>
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

const mergeProfileData = (row, profile) => {
    if (!profile) return row

    const merged = { ...row }
    for (const [key, value] of Object.entries(profile)) {
        if (!isEmptyValue(value) || merged[key] === undefined) {
            merged[key] = value
        }
    }

    return merged
}

const joinNameParts = (...parts) =>
    parts
        .map(part => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ')

const firstPresentValue = (...values) =>
    values
        .map(value => String(value ?? '').trim())
        .find(Boolean) || ''

const getJobseekerDisplayName = (row) =>
    firstPresentValue(
        row.display_name,
        row.full_name,
        joinNameParts(row.first_name, row.middle_name, row.surname),
        joinNameParts(row.first_name, row.last_name),
        row.name
    )

const fetchProfilesById = async (table, ids) => {
    if (!ids.length) return []

    const { data, error } = await supabase
        .from(table)
        .select('*')
        .in('id', ids)

    if (error) {
        console.warn(`[adminUserDirectory] Could not hydrate ${table}:`, error.message || error)
        return []
    }

    return data || []
}

const hydrateAdminDirectoryRows = async (rows) => {
    const employerIds = rows
        .filter(row => row.role === 'employer')
        .map(row => row.id)
        .filter(Boolean)

    const jobseekerIds = rows
        .filter(row => row.role === 'user' && row.subtype === 'jobseeker')
        .map(row => row.id)
        .filter(Boolean)

    const [employerProfiles, jobseekerProfiles] = await Promise.all([
        fetchProfilesById('employer_profiles', employerIds),
        fetchProfilesById('jobseeker_profiles', jobseekerIds),
    ])

    const employerById = new Map(employerProfiles.map(profile => [profile.id, profile]))
    const jobseekerById = new Map(jobseekerProfiles.map(profile => [profile.id, profile]))

    return rows.map(row => {
        if (row.role === 'employer') {
            const hydrated = mergeProfileData(row, employerById.get(row.id))
            return {
                ...hydrated,
                rejection_reason: hydrated.rejection_reason || hydrated.employer_rejection_reason || '',
            }
        }

        if (row.role === 'user' && row.subtype === 'jobseeker') {
            const hydrated = mergeProfileData(row, jobseekerById.get(row.id))
            const displayName = getJobseekerDisplayName(hydrated)
            return {
                ...hydrated,
                display_name: displayName,
                full_name: firstPresentValue(hydrated.full_name, displayName),
                rejection_reason: hydrated.rejection_reason || hydrated.jobseeker_rejection_reason || '',
            }
        }

        return row
    })
}

export const fetchAdminDirectoryPage = async (options = {}) => {
    const params = buildAdminDirectoryParams(options)
    const { data, error } = await supabase.rpc('admin_search_users', params)

    if (error) throw error

    const rows = data || []
    const totalCount = rows[0]?.total_count ?? 0
    const hydratedRows = await hydrateAdminDirectoryRows(rows)

    return {
        rows: hydratedRows,
        totalCount,
        hasMore: params.p_offset + hydratedRows.length < totalCount,
    }
}
