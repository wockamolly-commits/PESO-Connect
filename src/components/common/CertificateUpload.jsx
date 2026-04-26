import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Award, Loader2, X } from 'lucide-react'
import { supabase } from '../../config/supabase'
import {
    buildCertificateStoragePath,
    CERTIFICATE_ACCEPT,
    CERTIFICATE_BUCKET,
    buildCertificateFingerprint,
    getCertificateSignedUrl,
    getCertificateSource,
    normalizeCertificateRecords,
    validateCertificateFile,
} from '../../utils/certificateUtils'

const toUploadMessage = (error) => {
    const message = error?.message || 'Upload failed.'
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('bucket')) {
        return 'Certificate storage is not configured yet. Create the Supabase "certificates" bucket and apply its policies first.'
    }

    if (lowerMessage.includes('row-level security') || lowerMessage.includes('policy')) {
        return 'Certificate upload is blocked by storage permissions. Please apply the certificates bucket policies in Supabase.'
    }

    return message
}

export default function CertificateUpload({
    userId,
    value,
    onChange,
    inputId = 'certificate-upload',
    maxFiles = null,
    removeFromStorage = true,
    uploadLabel = 'Click to upload certificates',
    helperText = 'PDF, JPG, PNG - max 5MB each',
    disallowedFingerprints = [],
    duplicateErrorMessage = 'This certificate is already attached to another training entry.',
}) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    // Map of storage path -> freshly-minted signed URL for rendering.
    // The stored record intentionally carries only `path`; signed URLs expire,
    // so we re-sign on mount / when the record list changes.
    const [signedUrls, setSignedUrls] = useState({})
    const inputRef = useRef(null)
    const certificates = normalizeCertificateRecords(value)

    useEffect(() => {
        let cancelled = false
        const paths = certificates.map((c) => c.path).filter(Boolean)
        if (!paths.length) return
        const missing = paths.filter((p) => !signedUrls[p])
        if (!missing.length) return
        ;(async () => {
            const next = {}
            for (const path of missing) {
                try {
                    next[path] = await getCertificateSignedUrl(path)
                } catch {
                    // Leave missing; UI falls back to the file name without a link.
                }
            }
            if (!cancelled && Object.keys(next).length) {
                setSignedUrls((prev) => ({ ...prev, ...next }))
            }
        })()
        return () => { cancelled = true }
        // Intentionally depend on the stringified path list so we don't
        // re-run on every parent re-render with a new `value` array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certificates.map((c) => c.path).join('|')])

    const handleUpload = async (event) => {
        const selectedFiles = Array.from(event.target.files || [])
        const files = maxFiles === 1 ? selectedFiles.slice(0, 1) : selectedFiles
        if (!files.length || !userId) return

        setError('')

        const validationError = files.map(validateCertificateFile).find(Boolean)
        if (validationError) {
            setError(validationError)
            if (inputRef.current) inputRef.current.value = ''
            return
        }

        const blockedFingerprints = new Set((disallowedFingerprints || []).filter(Boolean))
        const duplicateSelected = files.find((file) => blockedFingerprints.has(buildCertificateFingerprint(file)))
        if (duplicateSelected) {
            setError(duplicateErrorMessage)
            if (inputRef.current) inputRef.current.value = ''
            return
        }

        setUploading(true)
        try {
            const uploadedCertificates = []

            for (const [index, file] of files.entries()) {
                const storagePath = buildCertificateStoragePath(userId, file, index)
                const { error: uploadError } = await supabase.storage
                    .from(CERTIFICATE_BUCKET)
                    .upload(storagePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                    })

                if (uploadError) throw uploadError

                // Bucket is private — mint a short-lived signed URL for
                // immediate in-session preview. Persisted record carries
                // only `path`; URLs are re-signed on render.
                let signedUrl = ''
                try {
                    signedUrl = await getCertificateSignedUrl(storagePath)
                } catch {
                    // Best-effort; the list-effect will retry on next render.
                }

                uploadedCertificates.push({
                    name: file.name,
                    type: file.type,
                    path: storagePath,
                    size: file.size,
                    uploaded_at: new Date().toISOString(),
                })

                if (signedUrl) {
                    setSignedUrls((prev) => ({ ...prev, [storagePath]: signedUrl }))
                }
            }

            const nextCertificates = [...(certificates || []), ...uploadedCertificates]
            onChange?.(maxFiles ? nextCertificates.slice(0, maxFiles) : nextCertificates)
        } catch (uploadError) {
            setError(toUploadMessage(uploadError))
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const handleRemove = async (index) => {
        const target = certificates[index]
        if (!target) return

        setError('')
        setUploading(true)

        try {
            if (removeFromStorage && target.path) {
                const { error: removeError } = await supabase.storage
                    .from(CERTIFICATE_BUCKET)
                    .remove([target.path])

                if (removeError) throw removeError
            }

            onChange?.(certificates.filter((_, currentIndex) => currentIndex !== index))
        } catch (removeError) {
            setError(removeError?.message || 'Failed to remove certificate.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div>
            {error && (
                <div className="mb-3 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                <input
                    ref={inputRef}
                    type="file"
                    accept={CERTIFICATE_ACCEPT}
                    multiple={maxFiles !== 1}
                    onChange={handleUpload}
                    className="hidden"
                    id={inputId}
                    disabled={uploading || !userId}
                />
                <label htmlFor={inputId} className={`cursor-pointer ${uploading || !userId ? 'pointer-events-none opacity-70' : ''}`}>
                    {uploading ? (
                        <Loader2 className="w-10 h-10 text-primary-500 mx-auto mb-2 animate-spin" />
                    ) : (
                        <Award className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-gray-500">
                        {uploading ? 'Uploading certificates...' : uploadLabel}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{helperText}</p>
                </label>
            </div>

            {certificates.length > 0 && (
                <div className="mt-3 space-y-2">
                    {certificates.map((file, index) => {
                        const href = signedUrls[file.path] || getCertificateSource(file)
                        return (
                        <div key={`${file.path || file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg gap-3">
                            <div className="min-w-0 flex-1">
                                {href ? (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-gray-700 truncate hover:text-primary-600 hover:underline block"
                                    >
                                        {file.name}
                                    </a>
                                ) : (
                                    <span className="text-sm text-gray-700 truncate block">{file.name}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                disabled={uploading}
                                className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
