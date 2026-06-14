import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JobListings from './JobListings'

const mockUseAuth = vi.fn()
const mockUseJobListingsMatches = vi.fn()
const { queryCalls } = vi.hoisted(() => ({
    queryCalls: [],
}))
let jobQueryResult

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
                const chain = {}
                const track = method => (...args) => {
                    queryCalls.push([method, ...args])
                    return chain
                }

                chain.select = track('select')
                chain.eq = track('eq')
                chain.gt = track('gt')
                chain.gte = track('gte')
                chain.lte = track('lte')
                chain.or = track('or')
                chain.order = track('order')
                chain.range = async (...args) => {
                    queryCalls.push(['range', ...args])
                    return jobQueryResult
                }

                return chain
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
        queryCalls.length = 0
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
        jobQueryResult = { data: jobs, error: null }
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

    it('pushes listings filters into the Supabase query before pagination', async () => {
        const user = userEvent.setup()

        render(
            <MemoryRouter>
                <JobListings />
            </MemoryRouter>,
        )

        await screen.findByText('Junior Full Stack Developer')
        queryCalls.length = 0

        await user.type(screen.getByLabelText('Search jobs by title or description'), 'developer')
        await user.selectOptions(screen.getAllByTestId('mock-select')[0], 'Information Technology')
        await user.selectOptions(screen.getAllByTestId('mock-select')[1], 'full-time')
        await user.type(screen.getByLabelText('Minimum salary'), '30000')
        await user.type(screen.getByLabelText('Maximum salary'), '50000')

        await waitFor(() => {
            expect(queryCalls).toContainEqual(['eq', 'category', 'Information Technology'])
            expect(queryCalls).toContainEqual(['eq', 'type', 'full-time'])
            expect(queryCalls).toContainEqual(['gte', 'salary_max', 30000])
            expect(queryCalls).toContainEqual(['lte', 'salary_min', 50000])
            expect(queryCalls).toEqual(expect.arrayContaining([
                ['or', expect.stringContaining('title.ilike.%developer%')],
                ['range', 0, 19],
            ]))
        })
    })

    it('shows a retryable error instead of an empty listings state when fetching fails', async () => {
        jobQueryResult = {
            data: null,
            error: { message: 'permission denied for table job_postings' },
        }

        render(
            <MemoryRouter>
                <JobListings />
            </MemoryRouter>,
        )

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Job listings could not be loaded. Please try again.',
        )
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
        expect(screen.queryByText('No jobs found matching your criteria')).not.toBeInTheDocument()
    })
})
