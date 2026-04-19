import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies
vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn(() => ({ currentUser: { id: 'admin-1' } })),
}))

const mockNotifications = [
    { id: 'n1', title: 'Test 1', is_read: false, created_at: new Date().toISOString() },
    { id: 'n2', title: 'Test 2', is_read: true, created_at: new Date().toISOString() },
]

let mockUnsubscribe
let capturedHandlers

vi.mock('../services/adminNotificationService', () => ({
    getAdminNotifications: vi.fn(() => Promise.resolve(mockNotifications)),
    getAdminUnreadCount: vi.fn(() => Promise.resolve(1)),
    markAdminNotificationAsRead: vi.fn(() => Promise.resolve()),
    markAllAdminNotificationsAsRead: vi.fn(() => Promise.resolve()),
    subscribeToAdminNotifications: vi.fn((adminId, handlers) => {
        capturedHandlers = handlers
        mockUnsubscribe = vi.fn()
        return mockUnsubscribe
    }),
}))

vi.mock('sonner', () => ({
    toast: vi.fn(),
}))

import { useAdminNotifications } from './useAdminNotifications'
import {
    getAdminNotifications,
    getAdminUnreadCount,
    markAdminNotificationAsRead,
    markAllAdminNotificationsAsRead,
    subscribeToAdminNotifications,
} from '../services/adminNotificationService'
import { toast } from 'sonner'

describe('useAdminNotifications', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        capturedHandlers = null
    })

    it('fetches notifications and unread count on mount', async () => {
        const { result } = renderHook(() => useAdminNotifications())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        expect(getAdminNotifications).toHaveBeenCalledWith('admin-1', 30)
        expect(getAdminUnreadCount).toHaveBeenCalledWith('admin-1')
        expect(result.current.notifications).toEqual(mockNotifications)
        expect(result.current.unreadCount).toBe(1)
    })

    it('subscribes to realtime on mount and unsubscribes on unmount', async () => {
        const { unmount } = renderHook(() => useAdminNotifications())

        await waitFor(() => {
            expect(subscribeToAdminNotifications).toHaveBeenCalledWith('admin-1', expect.any(Object))
        })

        unmount()
        expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('prepends new notifications from realtime inserts and shows toast', async () => {
        const { result } = renderHook(() => useAdminNotifications())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        const newNotif = { id: 'n3', title: 'New alert', message: 'Details', is_read: false, created_at: new Date().toISOString() }

        act(() => {
            capturedHandlers.onInsert(newNotif)
        })

        expect(result.current.notifications[0]).toEqual(newNotif)
        expect(result.current.unreadCount).toBe(2)
        expect(toast).toHaveBeenCalledWith('New alert', { description: 'Details', duration: 5000 })
    })

    it('markNotificationAsRead optimistically updates state', async () => {
        const { result } = renderHook(() => useAdminNotifications())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        await act(async () => {
            await result.current.markNotificationAsRead('n1')
        })

        expect(result.current.notifications.find(n => n.id === 'n1').is_read).toBe(true)
        expect(result.current.unreadCount).toBe(0)
        expect(markAdminNotificationAsRead).toHaveBeenCalledWith('n1', 'admin-1')
    })

    it('markAllNotificationsAsRead optimistically updates all', async () => {
        const { result } = renderHook(() => useAdminNotifications())

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
        })

        await act(async () => {
            await result.current.markAllNotificationsAsRead()
        })

        expect(result.current.notifications.every(n => n.is_read)).toBe(true)
        expect(result.current.unreadCount).toBe(0)
        expect(markAllAdminNotificationsAsRead).toHaveBeenCalledWith('admin-1')
    })
})
