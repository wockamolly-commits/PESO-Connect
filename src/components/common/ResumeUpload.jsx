import { useState, useRef } from 'react'
import { supabase } from '../../config/supabase'
import { Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Reusable resume upload component.
 *
 * Props:
 *   userId       — current user's UUID (required)
 *   storagePath  — path within resumes bucket, e.g. "{userId}/resume.pdf" (required)
 *   currentUrl   — existing resume URL to display (optional)
 *   onUploaded   — callback(publicUrl) after successful upload (required)
 *   onRemoved    — callback() after resume removed (optional)
 *   label        — display label (default: "Resume")
 *   optional     — show "(optional)" text (default: true)
 */
export default function ResumeUpload({
    userId,
    storagePath,
    currentUrl,
    onUploaded,
    onRemoved,
    label = 'Resume',
    optional = true,
}) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const [fileName, setFileName] = useState('')
    const fileRef = useRef(null)

    const validate = (file) => {
        if (!file) return 'No file selected'
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            return 'Only PDF files are accepted'
        }
        if (file.size > MAX_SIZE) {
            return `File too large. Maximum size is 5MB (yours: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
        }
        return null
    }

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const validationError = validate(file)
        if (validationError) {
            setError(validationError)
            if (fileRef.current) fileRef.current.value = ''
            return
        }

        setError('')
        setUploading(true)
        setFileName(file.name)

        try {
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: true,
                })

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(storagePath)

            // Append timestamp to bust cache
            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
            onUploaded(publicUrl)
        } catch (err) {
            setError(`Upload failed: ${err.message}`)
            setFileName('')
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const handleRemove = async () => {
        setUploading(true)
        try {
            await supabase.storage.from('resumes').remove([storagePath])
            setFileName('')
            onRemoved?.()
        } catch (err) {
            setError(`Remove failed: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }

    const displayUrl = currentUrl
    const displayName = fileName || (displayUrl ? 'resume.pdf' : '')

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} {optional && <span className="text-gray-400">(optional)</span>}
            </label>

            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {displayUrl ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 hover:underline truncate flex-1"
                    >
                        {displayName}
                    </a>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
                            Replace
                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleUpload}
                                className="hidden"
                                ref={fileRef}
                                disabled={uploading}
                            />
                        </label>
                        {onRemoved && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={uploading}
                                className="text-red-500 hover:text-red-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                }`}>
                    {uploading ? (
                        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                    ) : (
                        <Upload className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">
                        {uploading ? 'Uploading...' : 'Click to upload PDF (max 5MB)'}
                    </span>
                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleUpload}
                        className="hidden"
                        ref={fileRef}
                        disabled={uploading}
                    />
                </label>
            )}
        </div>
    )
}
