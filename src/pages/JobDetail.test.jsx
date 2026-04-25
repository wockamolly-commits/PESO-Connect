import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JobDetail from './JobDetail'

const mockUseAuth = vi.fn()
const mockUseJobDetailMatch = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}))

vi.mock('../hooks/useJobMatching', () => ({
    useJobDetailMatch: (...args) => mockUseJobDetailMatch(...args),
}))

vi.mock('../components/common/ResumeUpload', () => ({
    default: () => <div>Resume upload</div>,
}))

vi.mock('../components/EmployerAvatar', () => ({
    default: () => <div data-testid="employer-avatar" />,
}))

vi.mock('../services/notificationService', () => ({
    insertNotification: vi.fn(),
}))

vi.mock('../services/emailService', () => ({
    sendApplicationReceivedEmail: vi.fn(),
    sendNewApplicantEmail: vi.fn(),
}))

const baseJob = {
    id: 'job-1',
    title: 'Junior Full Stack Developer',
    description: 'Build React apps and backend APIs.',
    location: 'San Carlos City',
    salary_range: 'PHP 35,000 - 45,000',
    created_at: '2026-04-19T00:00:00Z',
    deadline: '2026-05-20',
    requirements: ['React', 'API Development'],
    preferred_skills: ['TypeScript'],
    filter_mode: 'strict',
    status: 'open',
    vacancies: 1,
    employer_id: 'employer-1',
    employer: { name: 'John Cotter Doe' },
}

vi.mock('../config/supabase', () => ({
    supabase: {
        from: (table) => {
            if (table === 'job_postings') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: baseJob, error: null }),
                        }),
                    }),
                }
            }

            if (table === 'applications') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                neq: () => ({
                                    maybeSingle: async () => ({ data: null, error: null }),
                                }),
                            }),
                        }),
                    }),
                }
            }

            if (table === 'saved_jobs') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({ data: null, error: null }),
                            }),
                        }),
                    }),
                }
            }

            throw new Error(`Unexpected table: ${table}`)
        },
    },
}))

const renderPage = () => render(
    <MemoryRouter initialEntries={['/jobs/job-1']}>
        <Routes>
            <Route path="/jobs/:id" element={<JobDetail />} />
        </Routes>
    </MemoryRouter>,
)

const returnMatch = (matchData, overrides = {}) => ({
    matchData,
    loading: false,
    error: null,
    refetch: vi.fn(),
    loadingExplanation: false,
    loadExplanation: vi.fn(),
    ...overrides,
})

describe('JobDetail', () => {
    beforeEach(() => {
        baseJob.filter_mode = 'strict'
        baseJob.preferred_skills = ['TypeScript']
        mockUseAuth.mockReturnValue({
            currentUser: { uid: 'user-1' },
            userData: {
                skills: ['Graphic Design'],
                email: 'jobseeker@example.com',
                display_name: 'Jobseeker One',
            },
            isVerified: () => true,
            isEmailVerified: () => true,
            isJobseeker: () => true,
        })
    })

    it('renders the server match score and blocks strict apply when every requirement is a gap', async () => {
        mockUseJobDetailMatch.mockReturnValue(returnMatch({
            matchScore: 18,
            matchLevel: 'Low',
            skillBreakdown: [
                { label: 'React', kind: 'skill', tier: 'required', status: 'gap', score: 0.1 },
                { label: 'API Development', kind: 'skill', tier: 'required', status: 'gap', score: 0.1 },
            ],
            preferredSkillBonus: 0,
        }))

        renderPage()

        expect(await screen.findByText('18')).toBeInTheDocument()
        expect(screen.getByText('Low Match')).toBeInTheDocument()

        const buttons = await screen.findAllByRole('button', { name: /apply now for junior full stack developer/i })
        buttons.forEach(button => expect(button).toBeDisabled())

        expect(screen.getByText('Your profile does not currently match the requirements for this position.')).toBeInTheDocument()
    })

    it('colors requirement pills from the server skill breakdown status', async () => {
        mockUseJobDetailMatch.mockReturnValue(returnMatch({
            matchScore: 72,
            matchLevel: 'Good',
            skillBreakdown: [
                { label: 'React', kind: 'skill', tier: 'required', status: 'match', score: 1 },
                { label: 'API Development', kind: 'skill', tier: 'required', status: 'partial', score: 0.6, matchedSkill: 'REST APIs', reason: 'REST APIs supports API Development.' },
            ],
            preferredSkillBonus: 0,
        }))

        renderPage()

        const reactPills = await screen.findAllByText('React')
        const reactRequirementPill = reactPills.find(el => el.className.includes('rounded-full'))
        expect(reactRequirementPill.className).toContain('bg-green-100')

        const apiPills = screen.getAllByText('API Development')
        const apiRequirementPill = apiPills.find(el => el.className.includes('rounded-full'))
        expect(apiRequirementPill.className).toContain('bg-yellow-100')
    })

    it('surfaces a partial match in the "Related Skills That Count" section', async () => {
        mockUseJobDetailMatch.mockReturnValue(returnMatch({
            matchScore: 68,
            matchLevel: 'Good',
            skillBreakdown: [
                {
                    label: 'Problem Solving',
                    kind: 'skill',
                    tier: 'required',
                    status: 'partial',
                    score: 0.6,
                    matchType: 'related',
                    matchedSkill: 'Hardware Troubleshooting',
                    reason: 'Hardware Troubleshooting supports the broader requirement Problem Solving.',
                },
            ],
            preferredSkillBonus: 0,
        }))

        renderPage()

        expect(await screen.findByText('Related Skills That Count')).toBeInTheDocument()
        expect(screen.getByText(/Hardware Troubleshooting supports the broader requirement Problem Solving\./)).toBeInTheDocument()
    })

    it('requires justification on flexible jobs with no direct positive match', async () => {
        baseJob.filter_mode = 'flexible'

        mockUseJobDetailMatch.mockReturnValue(returnMatch({
            matchScore: 42,
            matchLevel: 'Fair',
            skillBreakdown: [
                { label: 'React', kind: 'skill', tier: 'required', status: 'gap', score: 0.1 },
                { label: 'API Development', kind: 'skill', tier: 'required', status: 'gap', score: 0.1 },
            ],
            preferredSkillBonus: 0,
        }))

        renderPage()

        await waitFor(() => {
            expect(screen.getByText('Junior Full Stack Developer')).toBeInTheDocument()
        })

        fireEvent.click(screen.getAllByRole('button', { name: /apply now for junior full stack developer/i })[0])

        expect(await screen.findByText('Justification')).toBeInTheDocument()
    })

    it('shows an error card with Retry when the server match fails', async () => {
        const refetch = vi.fn()
        mockUseJobDetailMatch.mockReturnValue(returnMatch(null, {
            error: new Error('edge function down'),
            refetch,
        }))

        renderPage()

        await waitFor(() => {
            expect(screen.getByText(/We couldn't compute a match right now\./)).toBeInTheDocument()
        })
        const retry = screen.getByRole('button', { name: /retry/i })
        fireEvent.click(retry)
        expect(refetch).toHaveBeenCalled()
    })

    it('shows the preferred-skill bonus from the breakdown', async () => {
        mockUseJobDetailMatch.mockReturnValue(returnMatch({
            matchScore: 74,
            matchLevel: 'Good',
            preferredSkillBonus: 3,
            skillBreakdown: [
                { label: 'React', kind: 'skill', tier: 'required', status: 'match', score: 1 },
                { label: 'API Development', kind: 'skill', tier: 'required', status: 'match', score: 1 },
                { label: 'TypeScript', kind: 'skill', tier: 'preferred', status: 'match', score: 0.95 },
            ],
        }))

        renderPage()

        expect(await screen.findByText(/Matched: TypeScript/)).toBeInTheDocument()
        expect(screen.getByText(/\+3 pts/)).toBeInTheDocument()
    })
})
