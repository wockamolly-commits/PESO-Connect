import { useEffect, useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { getResumeSignedUrl } from '../../utils/resumeUtils'

export default function ResumeLink({
    resumePath,
    children = 'View Resume',
    className = 'flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium text-sm',
}) {
    const [url, setUrl] = useState('')

    useEffect(() => {
        let isCancelled = false
        const loadUrl = async () => {
            if (!resumePath) {
                setUrl('')
                return
            }
            try {
                const signedUrl = await getResumeSignedUrl(resumePath)
                if (!isCancelled) setUrl(signedUrl)
            } catch {
                if (!isCancelled) setUrl('')
            }
        }

        loadUrl()
        return () => { isCancelled = true }
    }, [resumePath])

    if (!resumePath) return null

    return (
        <a
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            aria-disabled={!url}
            onClick={(event) => {
                if (!url) event.preventDefault()
            }}
        >
            <FileText className="w-4 h-4" />
            {children}
            <ExternalLink className="w-3 h-3" />
        </a>
    )
}
