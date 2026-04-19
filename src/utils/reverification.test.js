import { describe, expect, it } from 'vitest'
import {
    buildVerifiedSnapshot,
    countTrainingCertificates,
    getChangedProfileFields,
    normalizeComparableValue,
} from './reverification'

describe('reverification helpers', () => {
    it('normalizes strings case-insensitively and trims whitespace', () => {
        expect(normalizeComparableValue('  Google  ')).toBe('google')
    })

    it('counts only non-empty training certificate paths', () => {
        expect(countTrainingCertificates([
            { certificate_path: 'user/cert-1.pdf' },
            { certificate_path: '   ' },
            {},
        ])).toBe(1)
    })

    it('builds snapshots using watched fields only', () => {
        const snapshot = buildVerifiedSnapshot('employer', {
            company_name: 'Acme',
            tin: '123',
            business_reg_number: 'SEC-1',
            owner_name: 'Owner',
            representative_name: 'Rep',
            ignored: 'value',
        })

        expect(snapshot).toEqual({
            company_name: 'Acme',
            tin: '123',
            business_reg_number: 'SEC-1',
            owner_name: 'Owner',
            representative_name: 'Rep',
        })
    })

    it('detects only changed watched fields', () => {
        const changes = getChangedProfileFields(
            'jobseeker',
            { first_name: 'Juan', surname: 'Dela Cruz', work_experiences: [] },
            { first_name: 'juan', surname: 'Santos', work_experiences: [{ company: 'ABC' }] }
        )

        expect(changes.map((change) => change.field)).toEqual(['surname', 'work_experiences'])
    })
})
