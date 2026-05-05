import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JobFairs from './JobFairs'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}))

vi.mock('../services/jobFairService', () => ({
    listEvents: vi.fn(),
    listBookmarks: vi.fn(),
    toggleBookmark: vi.fn(),
    deriveStatus: vi.fn(ev => {
        const now = new Date()
        if (ev.end_date && new Date(ev.end_date) < now) return 'closed'
        if (!ev.is_registration_open) return 'closed'
        if (new Date(ev.event_date) > now) return 'upcoming'
        return 'open'
    }),
}))

import { listEvents, listBookmarks } from '../services/jobFairService'

const futureDate = new Date(Date.now() + 86400000 * 30).toISOString()
const pastDate = new Date(Date.now() - 86400000 * 5).toISOString()

const mockEvents = [
    {
        id: 'ev-1',
        title: 'Mega Job Fair 2026',
        description: 'Connect with top employers.',
        event_date: futureDate,
        end_date: null,
        location: 'San Carlos City',
        companies: ['ACME Corp', 'TechCo', 'GreenBuild', 'DataSoft'],
        is_registration_open: true,
        is_highlighted: true,
        banner_url: null,
        created_at: new Date().toISOString(),
    },
    {
        id: 'ev-2',
        title: 'IT Careers Expo',
        description: 'Focus on IT roles.',
        event_date: pastDate,
        end_date: null,
        location: 'Bacolod City',
        companies: ['DevShop'],
        is_registration_open: true,
        is_highlighted: false,
        banner_url: null,
        created_at: new Date().toISOString(),
    },
]

const renderPage = () =>
    render(
        <MemoryRouter>
            <JobFairs />
        </MemoryRouter>
    )

describe('JobFairs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseAuth.mockReturnValue({ currentUser: null })
        listEvents.mockResolvedValue(mockEvents)
        listBookmarks.mockResolvedValue(new Set())
    })

    it('shows a loading spinner initially', () => {
        listEvents.mockReturnValue(new Promise(() => {}))
        const { container } = renderPage()
        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders event cards after loading', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Mega Job Fair 2026')).toBeInTheDocument()
            expect(screen.getByText('IT Careers Expo')).toBeInTheDocument()
        })
    })

    it('shows Featured ribbon for highlighted events', async () => {
        renderPage()
        await waitFor(() => {
            expect(screen.getByText('Featured')).toBeInTheDocument()
        })
    })

    it('shows empty state when no events match search', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Mega Job Fair 2026'))
        fireEvent.change(screen.getByPlaceholderText(/search/i), {
            target: { value: 'zzznomatch' },
        })
        expect(screen.getByText('No events found')).toBeInTheDocument()
    })

    it('shows company list truncated at 3', async () => {
        renderPage()
        await waitFor(() => screen.getByText('Mega Job Fair 2026'))
        expect(screen.getByText('+1 more')).toBeInTheDocument()
    })

    it('shows error state when fetch fails', async () => {
        listEvents.mockRejectedValue(new Error('network error'))
        renderPage()
        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })
})
