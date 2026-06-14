import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

function isTemporaryFacebookCdnUrl(url) {
    if (!url) return false
    try {
        const { hostname } = new URL(url)
        return hostname.includes('fbcdn.net') || hostname.startsWith('scontent.')
    } catch {
        return false
    }
}

export default function JobFairBanner({ src, title, variant = 'card' }) {
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        setFailed(false)
    }, [src])

    const imageUnavailable = !src || failed || isTemporaryFacebookCdnUrl(src)
    const isDetail = variant === 'detail'
    const wrapperClasses = isDetail
        ? 'w-full h-56 sm:h-72'
        : 'w-full h-36'
    const iconClasses = isDetail
        ? 'w-16 h-16 text-white/25'
        : 'w-10 h-10 text-white/40'

    if (imageUnavailable) {
        return (
            <div
                className={`${wrapperClasses} bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center`}
                role="img"
                aria-label={`${title} banner placeholder`}
            >
                <CalendarDays className={iconClasses} />
            </div>
        )
    }

    return (
        <div className={`${wrapperClasses} overflow-hidden`}>
            <img
                src={src}
                alt={title}
                className="w-full h-full object-cover"
                loading={isDetail ? 'eager' : 'lazy'}
                onError={() => setFailed(true)}
            />
        </div>
    )
}
