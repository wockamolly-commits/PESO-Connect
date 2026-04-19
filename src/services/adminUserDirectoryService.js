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

export const fetchAdminDirectoryPage = async (options = {}) => {
    const params = buildAdminDirectoryParams(options)
    const { data, error } = await supabase.rpc('admin_search_users', params)

    if (error) throw error

    const rows = data || []
    const totalCount = rows[0]?.total_count ?? 0

    return {
        rows,
        totalCount,
        hasMore: params.p_offset + rows.length < totalCount,
    }
}
