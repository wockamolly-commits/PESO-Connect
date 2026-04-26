import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JobListings from './JobListings'

const mockUseAuth = vi.fn()
const mockUseJobListingsMatches = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useJobMatching', () => ({
    useJobListingsMatches: (...args) => mockUseJobListingsMatches(...args),
}))

vi.mock('../components/LoadingSkeletons', () => ({
    JobListingSkeleton: () => <div>Loading jobs...</div>,
}))

vi.mock('../components/EmployerAvatar', () => ({
    default: () => <div data-testid="employer-avatar" />,
}))

vi.mock('../components/common/Select', () => ({
    default: ({ value, onChange, options = [] }) => (
        <select
            data-testid="mock-select"
            value={value}
            onChange={(event) => onChange(event.target.value)}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}))

const jobs = [
    {
        id: 'job-1',
        title: 'Junior Full Stack Developer',
        description: 'Build apps with React and APIs.',
        location: 'San Carlos City',
        category: 'Information Technology',
        type: 'full-time',
        created_at: '2026-04-20T00:00:00Z',
        salary_min: 35000,
        salary_max: 45000,
        status: 'open',
        vacancies: 1,
        employer_id: 'employer-1',
        employer: { name: 'John Cotter Doe' },
    },
]

vi.mock('../config/supabase', () => ({
    supabase: {
        from: (table) => {
            if (table === 'job_postings') {
                return {
                    select: () => ({
                        eq: () => ({
                            gt: () => ({
                                or: () => ({
                                    order: () => ({
                                        range: async () => ({ data: jobs, error: null }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }
            }

            if (table === 'applications') {
                return {
                    select: () => ({
                        eq: () => ({
                            neq: async () => ({ data: [], error: null }),
                        }),
                    }),
                }
            }

            if (table === 'saved_jobs') {
                return {
                    select: () => ({
                        eq: () => ({ data: [], error: null }),
                    }),
                }
            }

            throw new Error(`Unexpected table: ${table}`)
        },
    },
}))

describe('JobListings', () => {
    beforeEach(() => {
        mockUseAuth.mockReturnValue({
            currentUser: { uid: 'user-1' },
            userData: { skills: ['React'] },
            isJobseeker: () => true,
        })

        mockUseJobListingsMatches.mockReturnValue({
            matchScores: {
                'job-1': {
                    matchScore: 82,
                    matchingSkills: ['React'],
                },
            },
            loadingMatchScores: false,
        })
    })

    it('renders the shared match badge from the shared listings hook', async () => {
        render(
            <MemoryRouter>
                <JobListings />
            </MemoryRouter>,
        )

        expect(await screen.findAllByText('82% Match')).toHaveLength(2)
        expect(screen.getByText('Recommended for You')).toBeInTheDocument()

        await waitFor(() => {
            expect(mockUseJobListingsMatches).toHaveBeenCalled()
        })

        const latestCall = mockUseJobListingsMatches.mock.calls.at(-1)[0]
        expect(latestCall.jobs).toEqual(jobs)
    })
})
