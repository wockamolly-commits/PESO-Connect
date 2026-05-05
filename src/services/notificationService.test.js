import { describe, it, expect, vi, beforeEach } from 'vitest'

const invoke = vi.fn()

vi.mock('../config/supabase', () => ({
    supabase: {
        functions: { invoke },
        from: vi.fn(),
        channel: vi.fn(),
        removeChannel: vi.fn(),
    },
}))

describe('notificationService', () => {
    beforeEach(() => {
        invoke.mockReset()
        invoke.mockResolvedValue({ data: { success: true }, error: null })
    })

    it('creates notifications through the validated edge function', async () => {
        const { insertNotification } = await import('./notificationService')

        await insertNotification('user-1', 'application_status_change', 'Title', 'Message', {
            application_id: 'app-1',
            status: 'shortlisted',
        })

        expect(invoke).toHaveBeenCalledWith('create-notification', {
            body: {
                userId: 'user-1',
                type: 'application_status_change',
                title: 'Title',
                message: 'Message',
                data: {
                    application_id: 'app-1',
                    status: 'shortlisted',
                },
            },
        })
    })

    it('throws when the validated edge function rejects the notification', async () => {
        const error = new Error('Forbidden')
        invoke.mockResolvedValue({ data: null, error })
        const { insertNotification } = await import('./notificationService')

        await expect(insertNotification('victim', 'account_status', 'Forged', 'Forged', {}))
            .rejects
            .toThrow('Forbidden')
    })
})
