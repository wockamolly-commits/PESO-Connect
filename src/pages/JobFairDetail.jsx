import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
    Calendar,
    MapPin,
    Building2,
    ExternalLink,
    Bookmark,
    BookmarkCheck,
    ChevronLeft,
    Clock,
    Loader2,
    AlertCircle,
    Star,
    CalendarDays
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
    getEvent,
    toggleBookmark,
    listBookmarks,
    deriveStatus
} from '../services/jobFairService'

const STATUS_CONFIG = {
    open: { label: 'Registration Open', classes: 'bg-green-100 text-green-700 border border-green-200' },
    upcoming: { label: 'Upcoming', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
    closed: { label: 'Registration Closed', classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

function formatDateRange(event) {
    const opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    const start = new Date(event.event_date).toLocaleDateString('en-PH', opts)
    if (!event.end_date) return start
    const end = new Date(event.end_date).toLocaleDateString('en-PH', opts)
    return `${start} – ${end}`
}

export default function JobFairDetail() {
    const { id } = useParams()
    const { currentUser } = useAuth()
    const navigate = useNavigate()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isBookmarked, setIsBookmarked] = useState(false)
    const [toggling, setToggling] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const data = await getEvent(id)
                setEvent(data)
            } catch {
                setError('Event not found or failed to load.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    useEffect(() => {
        if (!currentUser) return
        listBookmarks(currentUser.id)
            .then(ids => setIsBookmarked(ids.has(id)))
            .catch(console.error)
    }, [currentUser, id])

    const handleBookmark = async () => {
        if (!currentUser) {
            navigate('/login')
            return
        }
        setToggling(true)
        try {
            const { bookmarked } = await toggleBookmark(currentUser.id, id)
            setIsBookmarked(bookmarked)
        } catch (err) {
            console.error('Bookmark error:', err)
        } finally {
            setToggling(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        )
    }

    if (error || !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-gray-600">{error || 'Event not found.'}</p>
                <Link to="/job-fairs" className="btn-primary">Back to Events</Link>
            </div>
        )
    }

    const status = deriveStatus(event)
    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.closed
    const canRegister = status !== 'closed' && event.is_registration_open && event.google_form_url

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Banner */}
            {event.banner_url ? (
                <div className="w-full h-56 sm:h-72 overflow-hidden">
                    <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-full h-56 sm:h-72 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                    <CalendarDays className="w-16 h-16 text-white/25" />
                </div>
            )}

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back link */}
                <Link
                    to="/job-fairs"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-6"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Job Fairs
                </Link>

                <div className="card p-6 sm:p-8">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                            {event.is_highlighted && (
                                <div className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold mb-2">
                                    <Star className="w-3.5 h-3.5" />
                                    Featured Event
                                </div>
                            )}
                            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                        </div>
                        <button
                            onClick={handleBookmark}
                            disabled={toggling}
                            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this event'}
                            className="shrink-0 p-2 rounded-lg border border-gray-200 hover:border-primary-300 hover:text-primary-600 text-gray-400 transition-colors"
                        >
                            {isBookmarked
                                ? <BookmarkCheck className="w-5 h-5 text-primary-600" />
                                : <Bookmark className="w-5 h-5" />
                            }
                        </button>
                    </div>

                    {/* Status badge */}
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-6 ${statusCfg.classes}`}>
                        {statusCfg.label}
                    </span>

                    {/* Meta */}
                    <div className="flex flex-col gap-3 mb-6 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                            <span>{formatDateRange(event)}</span>
                        </div>
                        {event.registration_deadline && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary-500 shrink-0" />
                                <span>
                                    Registration deadline:{' '}
                                    {new Date(event.registration_deadline).toLocaleDateString('en-PH', {
                                        month: 'long', day: 'numeric', year: 'numeric'
                                    })}
                                </span>
                            </div>
                        )}
                        {event.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                                <span>{event.location}</span>
                            </div>
                        )}
                    </div>

                    {/* Pre-register button */}
                    <div className="mb-8">
                        {canRegister ? (
                            <a
                                href={event.google_form_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                Pre-Register Now
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        ) : (
                            <div>
                                <button
                                    disabled
                                    className="btn-primary opacity-50 cursor-not-allowed inline-flex items-center gap-2"
                                >
                                    Pre-Register Now
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                                <p className="text-xs text-gray-400 mt-2">
                                    {!event.google_form_url
                                        ? 'No registration link available.'
                                        : 'Registration is currently closed.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {event.description && (
                        <div className="mb-8">
                            <h2 className="text-base font-semibold text-gray-900 mb-3">About This Event</h2>
                            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Participating companies */}
                    {event.companies?.length > 0 && (
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary-500" />
                                Participating Companies
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {event.companies.map(c => (
                                    <span
                                        key={c}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                                    >
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
