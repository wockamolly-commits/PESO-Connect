import { beforeEach, describe, expect, it, vi } from 'vitest'

const createSignedUrl = vi.fn()

vi.mock('../config/supabase', () => ({
    supabase: {
        storage: {
            from: vi.fn(() => ({ createSignedUrl })),
        },
    },
}))

describe('resumeUtils', () => {
    beforeEach(() => {
        createSignedUrl.mockReset()
    })

    it('normalizes legacy public resume URLs to storage paths', async () => {
        const { normalizeResumePath } = await import('./resumeUtils')

        expect(normalizeResumePath('https://example.supabase.co/storage/v1/object/public/resumes/user-1/resume.pdf?t=1'))
            .toBe('user-1/resume.pdf')
    })

    it('returns signed URLs for private resume paths', async () => {
        const { getResumeSignedUrl } = await import('./resumeUtils')
        createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.test/resume' }, error: null })

        await expect(getResumeSignedUrl('user-1/resume.pdf')).resolves.toBe('https://signed.test/resume')
        expect(createSignedUrl).toHaveBeenCalledWith('user-1/resume.pdf', 600)
    })
})
