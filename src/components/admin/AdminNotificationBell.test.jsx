import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminNotificationBell } from './AdminNotificationBell'

const xssNotification = {
    id: 'n1',
    type: 'user_report',
    priority: 'medium',
    title: '<img src=x onerror="window.xssBell=true">',
    message: '<script>window.xssBell=true</script>',
    created_at: new Date().toISOString(),
    is_read: false,
    reference_link: '/admin',
}

describe('AdminNotificationBell XSS posture', () => {
    it('renders HTML in title/message as plain text, not markup', () => {
        delete window.xssBell

        render(
            <MemoryRouter>
                <AdminNotificationBell
                    notifications={[xssNotification]}
                    unreadCount={1}
                    loading={false}
                    onMarkAsRead={vi.fn()}
                    onMarkAllAsRead={vi.fn()}
                />
            </MemoryRouter>
        )

        // Open the dropdown to render the notification row.
        fireEvent.click(screen.getByRole('button'))

        // The malicious payload must appear as literal text so a
        // jsdom-loaded component cannot set the sentinel. If someone
        // swaps in dangerouslySetInnerHTML, window.xssBell would fire
        // (for inline event handlers at least) or the <script> would
        // exist in the DOM.
        expect(
            screen.getByText('<img src=x onerror="window.xssBell=true">')
        ).toBeInTheDocument()
        expect(
            screen.getByText('<script>window.xssBell=true</script>')
        ).toBeInTheDocument()
        expect(window.xssBell).toBeUndefined()

        // Belt-and-braces: no <script> node should have been injected.
        expect(document.querySelector('script')).toBeNull()
    })
})
