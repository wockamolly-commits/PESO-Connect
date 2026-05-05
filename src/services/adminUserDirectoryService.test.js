import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminDirectoryPage } from './adminUserDirectoryService'

const rpcMock = vi.fn()
const fromMock = vi.fn()

vi.mock('../config/supabase', () => ({
    supabase: {
        rpc: (...args) => rpcMock(...args),
        from: (...args) => fromMock(...args),
    },
}))

describe('adminUserDirectoryService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('hydrates skinny admin_search_users rows with role profile details by returned IDs', async () => {
        rpcMock.mockResolvedValue({
            data: [
                {
                    id: 'jobseeker-1',
                    email: 'jobseeker@example.com',
                    name: 'Base Jobseeker',
                    role: 'user',
                    subtype: 'jobseeker',
                    total_count: 2,
                },
                {
                    id: 'employer-1',
                    email: 'employer@example.com',
                    name: 'Base Employer',
                    role: 'employer',
                    subtype: null,
                    total_count: 2,
                },
            ],
            error: null,
        })

        fromMock.mockImplementation((table) => ({
            select: () => ({
                in: async (_column, ids) => {
                    if (table === 'jobseeker_profiles') {
                        expect(ids).toEqual(['jobseeker-1'])
                        return {
                            data: [{
                                id: 'jobseeker-1',
                                full_name: 'Hydrated Jobseeker',
                                highest_education: 'College Graduate',
                                mobile_number: '09170000000',
                                skills: ['React'],
                            }],
                            error: null,
                        }
                    }

                    if (table === 'employer_profiles') {
                        expect(ids).toEqual(['employer-1'])
                        return {
                            data: [{
                                id: 'employer-1',
                                company_name: 'Hydrated Company',
                                representative_name: 'Rep Name',
                                business_reg_number: 'REG-1',
                            }],
                            error: null,
                        }
                    }

                    throw new Error(`Unexpected table ${table}`)
                },
            }),
        }))

        const result = await fetchAdminDirectoryPage({ role: 'all' })

        expect(result.totalCount).toBe(2)
        expect(result.rows[0]).toMatchObject({
            id: 'jobseeker-1',
            display_name: 'Hydrated Jobseeker',
            highest_education: 'College Graduate',
            mobile_number: '09170000000',
            skills: ['React'],
        })
        expect(result.rows[1]).toMatchObject({
            id: 'employer-1',
            company_name: 'Hydrated Company',
            representative_name: 'Rep Name',
            business_reg_number: 'REG-1',
        })
    })
})
