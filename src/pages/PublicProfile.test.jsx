import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublicProfile from './PublicProfile'

const mockRpc = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../config/supabase', () => ({
    supabase: {
        rpc: (...args) => mockRpc(...args),
    },
}))

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}))

const renderPage = (route = '/profile/user-1') =>
    render(
        <MemoryRouter initialEntries={[route]}>
            <Routes>
                <Route path="/profile/:userId" element={<PublicProfile />} />
            </Routes>
        </MemoryRouter>
    )

describe('PublicProfile', () => {
    beforeEach(() => {
        mockRpc.mockReset()
        mockUseAuth.mockReturnValue({ currentUser: null })
    })

    it('loads public profile data through the safe RPC', async () => {
        mockRpc.mockResolvedValue({
            data: [{
                id: 'user-1',
                role: 'user',
                subtype: 'jobseeker',
                display_name: 'Juan Dela Cruz',
                city: 'San Carlos City',
                province: 'Negros Occidental',
                is_verified: true,
                is_restricted: false,
                skills: ['Welding'],
                languages: [],
                certifications: [],
                work_experiences: [],
            }],
            error: null,
        })

        renderPage()

        await waitFor(() => {
            expect(mockRpc).toHaveBeenCalledWith('get_public_profile', { p_user_id: 'user-1' })
            expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument()
            expect(screen.getByText('Welding')).toBeInTheDocument()
        })
    })

    it('does not render sensitive fields even if a stale response contains them', async () => {
        mockRpc.mockResolvedValue({
            data: [{
                id: 'user-1',
                role: 'user',
                subtype: 'jobseeker',
                display_name: 'Juan Dela Cruz',
                email: 'juan@example.com',
                mobile_number: '09171234567',
                resume_url: 'https://example.test/resume.pdf',
                certificate_urls: [{ url: 'https://example.test/cert.pdf' }],
                is_verified: false,
                is_restricted: false,
                skills: [],
                languages: [],
                certifications: [],
                work_experiences: [],
            }],
            error: null,
        })

        renderPage()

        await waitFor(() => expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument())
        expect(screen.queryByText('juan@example.com')).not.toBeInTheDocument()
        expect(screen.queryByText('09171234567')).not.toBeInTheDocument()
        expect(screen.queryByText(/resume\.pdf/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/cert\.pdf/i)).not.toBeInTheDocument()
    })

    it('shows restricted state from the RPC without rendering profile details', async () => {
        mockRpc.mockResolvedValue({
            data: [{
                id: 'user-1',
                role: 'user',
                subtype: 'jobseeker',
                display_name: null,
                is_restricted: true,
                is_verified: true,
            }],
            error: null,
        })

        renderPage()

        await waitFor(() => expect(screen.getByText('Restricted Profile')).toBeInTheDocument())
        expect(screen.queryByText('Juan Dela Cruz')).not.toBeInTheDocument()
    })
})
