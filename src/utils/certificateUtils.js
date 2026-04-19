import { supabase } from '../config/supabase'

export const CERTIFICATE_BUCKET = 'certificates'
export const MAX_CERTIFICATE_SIZE = 5 * 1024 * 1024
export const CERTIFICATE_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
export const CERTIFICATE_SIGNED_URL_TTL = 600

// The bucket is private (see sql/make_certificates_bucket_private.sql).
// Use this to mint short-lived signed URLs instead of public URLs.
export const getCertificateSignedUrl = async (path, expiresIn = CERTIFICATE_SIGNED_URL_TTL) => {
    if (!path) return ''
    const { data, error } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .createSignedUrl(path, expiresIn)
    if (error) throw error
    return data?.signedUrl || ''
}

const ALLOWED_CERTIFICATE_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
])

const normalizeFileName = (fileName = 'certificate') =>
    fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:')

export const validateCertificateFile = (file) => {
    if (!file) return 'No file selected.'

    const fileName = file.name?.toLowerCase() || ''
    const hasAllowedExtension = /\.(pdf|jpe?g|png)$/.test(fileName)
    const hasAllowedType = !file.type || ALLOWED_CERTIFICATE_TYPES.has(file.type)

    if (!hasAllowedExtension || !hasAllowedType) {
        return 'Only PDF, JPG, and PNG files are allowed.'
    }

    if (file.size > MAX_CERTIFICATE_SIZE) {
        return `File too large. Maximum size is 5MB (received ${(file.size / 1024 / 1024).toFixed(1)}MB).`
    }

    return null
}

export const normalizeCertificateRecord = (record, index = 0) => {
    if (!record) return null

    if (typeof record === 'string') {
        return {
            name: `Certificate ${index + 1}`,
            url: record,
            type: '',
            path: '',
            size: null,
            uploaded_at: null,
        }
    }

    const data = typeof record.data === 'string' && isDataUrl(record.data) ? record.data : ''
    const url = typeof record.url === 'string'
        ? record.url
        : (typeof record.publicUrl === 'string'
            ? record.publicUrl
            : (typeof record.data === 'string' && !isDataUrl(record.data) ? record.data : ''))

    return {
        name: record.name || record.file_name || `Certificate ${index + 1}`,
        url,
        data,
        type: record.type || '',
        path: record.path || record.storage_path || '',
        size: typeof record.size === 'number' ? record.size : null,
        uploaded_at: record.uploaded_at || null,
    }
}

export const normalizeCertificateRecords = (records) =>
    (Array.isArray(records) ? records : [])
        .map((record, index) => normalizeCertificateRecord(record, index))
        .filter(Boolean)

export const getCertificateSource = (record) => {
    const normalized = normalizeCertificateRecord(record)
    return normalized?.url || normalized?.data || ''
}

export const stripCertificatePayloads = (records) =>
    normalizeCertificateRecords(records)
        .map(({ name, url, type, path, size, uploaded_at }) => ({
            name,
            url,
            type,
            path,
            size,
            uploaded_at,
        }))
        .filter((record) => record.url || record.path)

export const buildCertificateStoragePath = (userId, file, index = 0) => {
    const extension = (file.name?.split('.').pop() || 'bin').toLowerCase()
    const safeName = normalizeFileName(file.name?.replace(/\.[^.]+$/, '') || `certificate-${index + 1}`) || `certificate-${index + 1}`
    const uniqueId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${index}`

    return `${userId}/${uniqueId}-${safeName}.${extension}`
}

export const buildCertificateFingerprint = (fileOrRecord) => {
    if (!fileOrRecord) return ''

    const name = (fileOrRecord.name || fileOrRecord.file_name || '').trim().toLowerCase()
    const size = typeof fileOrRecord.size === 'number'
        ? fileOrRecord.size
        : Number(fileOrRecord.size || 0)

    if (!name || !size) return ''
    return `${name}:${size}`
}
