import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockUpdate = vi.fn()
const mockOn = vi.fn()
const mockSubscribe = vi.fn()

// Build chainable query mock
function createChain(resolvedValue) {
    const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => Promise.resolve(resolvedValue)),
        update: vi.fn(() => chain),
    }
    return chain
}

let mockFromChain

vi.mock('../config/supabase', () => {
    const channelObj = {
        on: vi.fn(function () { return this }),
        subscribe: vi.fn(function () { return this }),
    }

    return {
        supabase: {
            from: vi.fn(() => mockFromChain),
            channel: vi.fn(() => channelObj),
            removeChannel: vi.fn(),
        },
    }
})

import {
    getAdminNotifications,
    getAdminUnreadCount,
    markAdminNotificationAsRead,
    markAllAdminNotificationsAsRead,
    subscribeToAdminNotifications,
} from './adminNotificationService'
import { supabase } from '../config/supabase'

describe('adminNotificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getAdminNotifications', () => {
        it('fetches notifications for the given admin with default limit', async () => {
            const mockData = [{ id: '1', title: 'Test' }]
            mockFromChain = createChain({ data: mockData, error: null })

            const result = await getAdminNotifications('admin-123')

            expect(supabase.from).toHaveBeenCalledWith('admin_notifications')
            expect(mockFromChain.select).toHaveBeenCalledWith('*')
            expect(mockFromChain.eq).toHaveBeenCalledWith('recipient_admin_id', 'admin-123')
            expect(mockFromChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
            expect(mockFromChain.limit).toHaveBeenCalledWith(30)
            expect(result).toEqual(mockData)
        })

        it('returns empty array on error', async () => {
            mockFromChain = createChain({ data: null, error: { message: 'fail' } })

            const result = await getAdminNotifications('admin-123')
            expect(result).toEqual([])
        })
    })

    describe('getAdminUnreadCount', () => {
        it('returns the unread count', async () => {
            // For count queries, the chain ends at the second eq
            const chain = {
                select: vi.fn(() => chain),
                eq: vi.fn(() => chain),
            }
            // Override the second eq call to resolve
            let callCount = 0
            chain.eq = vi.fn(() => {
                callCount++
                if (callCount >= 2) return Promise.resolve({ count: 5, error: null })
                return chain
            })
            mockFromChain = chain

            const result = await getAdminUnreadCount('admin-123')
            expect(result).toBe(5)
        })

        it('returns 0 on error', async () => {
            const chain = {
                select: vi.fn(() => chain),
                eq: vi.fn(() => chain),
            }
            let callCount = 0
            chain.eq = vi.fn(() => {
                callCount++
                if (callCount >= 2) return Promise.resolve({ count: null, error: { message: 'fail' } })
                return chain
            })
            mockFromChain = chain

            const result = await getAdminUnreadCount('admin-123')
            expect(result).toBe(0)
        })
    })

    describe('markAdminNotificationAsRead', () => {
        it('updates the notification with is_read and read_at', async () => {
            const chain = {
                update: vi.fn(() => chain),
                eq: vi.fn(() => chain),
            }
            let callCount = 0
            chain.eq = vi.fn(() => {
                callCount++
                if (callCount >= 2) return Promise.resolve({ error: null })
                return chain
            })
            mockFromChain = chain

            await markAdminNotificationAsRead('notif-1', 'admin-123')

            expect(supabase.from).toHaveBeenCalledWith('admin_notifications')
            expect(chain.update).toHaveBeenCalled()
            const updateArg = chain.update.mock.calls[0][0]
            expect(updateArg.is_read).toBe(true)
            expect(updateArg.read_at).toBeDefined()
        })
    })

    describe('markAllAdminNotificationsAsRead', () => {
        it('updates all unread notifications for the admin', async () => {
            const chain = {
                update: vi.fn(() => chain),
                eq: vi.fn(() => chain),
            }
            let callCount = 0
            chain.eq = vi.fn(() => {
                callCount++
                if (callCount >= 2) return Promise.resolve({ error: null })
                return chain
            })
            mockFromChain = chain

            await markAllAdminNotificationsAsRead('admin-123')

            expect(supabase.from).toHaveBeenCalledWith('admin_notifications')
            expect(chain.update).toHaveBeenCalled()
        })
    })

    describe('subscribeToAdminNotifications', () => {
        it('creates a realtime channel and returns an unsubscribe function', () => {
            const handlers = { onInsert: vi.fn(), onUpdate: vi.fn() }
            const unsubscribe = subscribeToAdminNotifications('admin-123', handlers)

            expect(supabase.channel).toHaveBeenCalledWith('admin_notifications:admin-123')
            expect(typeof unsubscribe).toBe('function')

            unsubscribe()
            expect(supabase.removeChannel).toHaveBeenCalled()
        })
    })
})
