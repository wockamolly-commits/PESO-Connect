import { supabase } from '../config/supabase'

export const RESUME_BUCKET = 'resumes'
export const RESUME_SIGNED_URL_TTL = 600

export const normalizeResumePath = (value = '') => {
    if (!value || typeof value !== 'string') return ''
    if (!/^https?:\/\//i.test(value)) return value.split('?')[0]

    try {
        const url = new URL(value)
        const marker = `/storage/v1/object/public/${RESUME_BUCKET}/`
        const markerIndex = url.pathname.indexOf(marker)
        if (markerIndex === -1) return value
        return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    } catch {
        return value
    }
}

export const getResumeSignedUrl = async (pathOrUrl, expiresIn = RESUME_SIGNED_URL_TTL) => {
    const path = normalizeResumePath(pathOrUrl)
    if (!path) return ''
    if (/^https?:\/\//i.test(path)) return path

    const { data, error } = await supabase.storage
        .from(RESUME_BUCKET)
        .createSignedUrl(path, expiresIn)
    if (error) throw error
    return data?.signedUrl || ''
}
