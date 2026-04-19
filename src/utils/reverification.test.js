import { describe, expect, it } from 'vitest'
import {
    countLicenseCertificates,
    countTrainingCertificates,
    getCivilServiceCertificateRecord,
    getLicenseCertificateRecord,
    hasCivilServiceCertificate,
} from './reverification'

describe('reverification helpers', () => {
    it('counts only licenses with uploaded proof', () => {
        expect(countLicenseCertificates([
            { name: 'PRC Nurse', license_copy_path: 'user/license-1.pdf' },
            { name: 'PRC Teacher', license_copy_path: '   ' },
            { name: 'PRC Engineer' },
        ])).toBe(1)
    })

    it('builds a single-file record for a stored license certificate', () => {
        expect(getLicenseCertificateRecord({
            license_copy_path: 'user/license-proof.pdf',
            license_file_name: 'license-proof.pdf',
            license_file_size: 1024,
        }, 0)).toEqual([
            { path: 'user/license-proof.pdf', name: 'license-proof.pdf', size: 1024 }
        ])
    })

    it('detects civil service proof only when a path is present', () => {
        expect(hasCivilServiceCertificate({ civil_service_cert_path: 'user/cse.pdf' })).toBe(true)
        expect(hasCivilServiceCertificate({ civil_service_cert_path: '   ' })).toBe(false)
    })

    it('builds a record for civil service proof uploads', () => {
        expect(getCivilServiceCertificateRecord({ civil_service_cert_path: 'user/cse-proof.pdf' })).toEqual([
            { path: 'user/cse-proof.pdf', name: 'cse-proof.pdf', size: null }
        ])
    })

    it('keeps the existing training proof count behavior intact', () => {
        expect(countTrainingCertificates([
            { course: 'TESDA', certificate_path: 'user/training.pdf' },
            { course: 'Safety', certificate_path: '' },
        ])).toBe(1)
    })
})
