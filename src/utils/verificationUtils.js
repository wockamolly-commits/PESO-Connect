/**
 * Annual verification utilities for PESO Connect.
 *
 * Applies to employers and jobseekers only.
 * Homeowners and admins are excluded from annual verification.
 *
 * Semantics of `verified_for_year`:
 *   - null / 0 / undefined → user has NEVER been verified (pending or rejected).
 *     Treat as unverified in all UI. `isVerificationExpired` returns false
 *     here because "never verified" is a different state from "expired" —
 *     use `is_verified` + status fields to distinguish pending/rejected.
 *   - number equal to current Manila year → currently verified.
 *   - number less than current Manila year → expired; must re-verify.
 */

/**
 * Returns the verification metadata for the current year in Asia/Manila time.
 * Used when approving an employer or jobseeker so that the expiry year is stored
 * alongside is_verified = true.
 *
 * @returns {{ verified_for_year: number, verification_expires_at: string }}
 */
export const getVerificationMetadata = () => {
    const manilaDateStr = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
    })
    const currentYear = parseInt(manilaDateStr, 10)
    // Expiry is midnight Jan 1 of the following year, Asia/Manila (+08:00)
    const expiresAt = `${currentYear + 1}-01-01T00:00:00+08:00`
    return { verified_for_year: currentYear, verification_expires_at: expiresAt }
}

/**
 * Returns true if the given verification metadata indicates the record has
 * expired relative to the current year in Asia/Manila time.
 *
 * Only applies to roles subject to annual verification (employer, jobseeker).
 * Always returns false for homeowners and admins.
 *
 * @param {{ role: string, subtype?: string, verified_for_year?: number | null }} user
 * @returns {boolean}
 */
export const isVerificationExpired = (user) => {
    if (!user) return false
    const { role, subtype, verified_for_year } = user
    // Homeowners and admins are never subject to annual expiry
    if (role === 'admin') return false
    if (role === 'user' && subtype === 'homeowner') return false
    if (role === 'individual') return false

    if (verified_for_year == null) return false

    const manilaDateStr = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
    })
    const currentYear = parseInt(manilaDateStr, 10)
    return verified_for_year < currentYear
}
