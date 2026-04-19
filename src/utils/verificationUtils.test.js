import { describe, it, expect, vi, afterEach } from 'vitest'
import { getVerificationMetadata, isVerificationExpired } from './verificationUtils'

describe('getVerificationMetadata', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns verified_for_year equal to the current Manila year', () => {
        // Fix time to a known date: 2025-06-15 in UTC (still 2025 in Manila)
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2025-06-15T10:00:00Z'))

        const meta = getVerificationMetadata()

        expect(meta.verified_for_year).toBe(2025)
    })

    it('returns verification_expires_at as Jan 1 of the following year in +08:00', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2025-06-15T10:00:00Z'))

        const meta = getVerificationMetadata()

        expect(meta.verification_expires_at).toBe('2026-01-01T00:00:00+08:00')
    })

    it('correctly computes year when UTC date is Dec 31 but Manila is already Jan 1', () => {
        // 2025-12-31 16:01 UTC = 2026-01-01 00:01 Manila (UTC+8)
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2025-12-31T16:01:00Z'))

        const meta = getVerificationMetadata()

        expect(meta.verified_for_year).toBe(2026)
        expect(meta.verification_expires_at).toBe('2027-01-01T00:00:00+08:00')
    })
})

describe('isVerificationExpired', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns false for an admin regardless of verified_for_year', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

        expect(isVerificationExpired({ role: 'admin', verified_for_year: 2025 })).toBe(false)
    })

    it('returns false for a homeowner regardless of verified_for_year', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

        expect(isVerificationExpired({ role: 'user', subtype: 'homeowner', verified_for_year: 2025 })).toBe(false)
        expect(isVerificationExpired({ role: 'individual', verified_for_year: 2025 })).toBe(false)
    })

    it('returns false when verified_for_year is null', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

        expect(isVerificationExpired({ role: 'employer', verified_for_year: null })).toBe(false)
        expect(isVerificationExpired({ role: 'user', subtype: 'jobseeker', verified_for_year: undefined })).toBe(false)
    })

    it('returns true for an employer verified in a previous year', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

        expect(isVerificationExpired({ role: 'employer', verified_for_year: 2025 })).toBe(true)
    })

    it('returns false for an employer verified in the current year', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))

        expect(isVerificationExpired({ role: 'employer', verified_for_year: 2026 })).toBe(false)
    })

    it('returns true for a jobseeker verified in a previous year', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-03-01T10:00:00Z'))

        expect(isVerificationExpired({ role: 'user', subtype: 'jobseeker', verified_for_year: 2025 })).toBe(true)
    })

    it('returns false for a jobseeker verified in the current year', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-03-01T10:00:00Z'))

        expect(isVerificationExpired({ role: 'user', subtype: 'jobseeker', verified_for_year: 2026 })).toBe(false)
    })

    it('returns false for null user', () => {
        expect(isVerificationExpired(null)).toBe(false)
    })
})
