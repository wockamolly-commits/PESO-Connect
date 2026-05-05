import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Calendar,
    MapPin,
    Search,
    Bookmark,
    BookmarkCheck,
    Building2,
    CalendarDays,
    Star,
    Loader2,
    AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
    listEvents,
    listBookmarks,
    toggleBookmark,
    deriveStatus
} from '../services/jobFairService'

const STATUS_CONFIG = {
    open: { label: 'Open', classes: 'bg-green-100 text-green-700 border border-green-200' },
    upcoming: { label: 'Upcoming', classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
    closed: { label: 'Closed', classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

const FILTERS = ['All', 'Upcoming', 'Open', 'Closed', 'Bookmarked']
const SORTS = [
    { value: 'date_asc', label: 'Soonest First' },
    { value: 'date_desc', label: 'Latest First' },
    { value: 'newest', label: 'Recently Added' },
]

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.closed
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
            {cfg.label}
        </span>
    )
}

export default function JobFairs() {
    const { currentUser } = useAuth()
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeFilter, setActiveFilter] = useState('All')
    const [sort, setSort] = useState('date_asc')
    const [togglingId, setTogglingId] = useState(null)

    useEffect(() => {
        async function load() {
            try {
                const data = await listEvents()
                setEvents(data || [])
            } catch (err) {
                setError('Failed to load job fair events.')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    useEffect(() => {
        if (!currentUser) return
        listBookmarks(currentUser.id).then(setBookmarkedIds).catch(console.error)
    }, [currentUser])

    const handleBookmark = async (e, eventId) => {
        e.preventDefault()
        e.stopPropagation()
        if (!currentUser) {
            navigate('/login')
            return
        }
        setTogglingId(eventId)
        try {
            const { bookmarked } = await toggleBookmark(currentUser.id, eventId)
            setBookmarkedIds(prev => {
                const next = new Set(prev)
                if (bookmarked) next.add(eventId)
                else next.delete(eventId)
                return next
            })
        } catch (err) {
            console.error('Bookmark error:', err)
        } finally {
            setTogglingId(null)
        }
    }

    const enriched = events.map(ev => ({ ...ev, _status: deriveStatus(ev) }))

    const filtered = enriched.filter(ev => {
        const matchesSearch =
            !searchTerm ||
            ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ev.location && ev.location.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesFilter =
            activeFilter === 'All' ||
            (activeFilter === 'Bookmarked' ? bookmarkedIds.has(ev.id) : ev._status === activeFilter.toLowerCase())

        return matchesSearch && matchesFilter
    })

    const sorted = [...filtered].sort((a, b) => {
        if (sort === 'date_asc') return new Date(a.event_date) - new Date(b.event_date)
        if (sort === 'date_desc') return new Date(b.event_date) - new Date(a.event_date)
        return new Date(b.created_at) - new Date(a.created_at)
    })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 mb-3">
                        <CalendarDays className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">Job Fair Events</h1>
                    </div>
                    <p className="text-primary-100 text-lg">
                        Discover upcoming job fairs and connect with employers in person.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search + Sort */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or location..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                        {SORTS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 flex-wrap mb-8">
                    {FILTERS.map(f => {
                        const isBookmarked = f === 'Bookmarked'
                        const disabled = isBookmarked && !currentUser
                        return (
                            <button
                                key={f}
                                disabled={disabled}
                                onClick={() => !disabled && setActiveFilter(f)}
                                title={disabled ? 'Log in to view bookmarks' : undefined}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    activeFilter === f
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                {f}
                            </button>
                        )
                    })}
                </div>

                {/* States */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && sorted.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">No events found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}

                {/* Event grid */}
                {!loading && !error && sorted.length > 0 && (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {sorted.map(ev => (
                            <EventCard
                                key={ev.id}
                                event={ev}
                                isBookmarked={bookmarkedIds.has(ev.id)}
                                toggling={togglingId === ev.id}
                                onBookmark={handleBookmark}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function EventCard({ event, isBookmarked, toggling, onBookmark }) {
    const status = event._status
    const dateLabel = new Date(event.event_date).toLocaleDateString('en-PH', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    })

    return (
        <Link
            to={`/job-fairs/${event.id}`}
            className="card card-hover relative flex flex-col overflow-hidden"
        >
            {/* Highlight ribbon */}
            {event.is_highlighted && (
                <div className="absolute top-3 left-0 bg-amber-400 text-amber-900 text-xs font-semibold px-3 py-0.5 flex items-center gap-1 rounded-r-full shadow">
                    <Star className="w-3 h-3" />
                    Featured
                </div>
            )}

            {/* Banner */}
            {event.banner_url ? (
                <img
                    src={event.banner_url}
                    alt={event.title}
                    className="w-full h-36 object-cover"
                />
            ) : (
                <div className="w-full h-36 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                    <CalendarDays className="w-10 h-10 text-white/40" />
                </div>
            )}

            <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                        {event.title}
                    </h3>
                    <button
                        onClick={e => onBookmark(e, event.id)}
                        disabled={toggling}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark event'}
                        className="shrink-0 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                        {isBookmarked
                            ? <BookmarkCheck className="w-5 h-5 text-primary-600" />
                            : <Bookmark className="w-5 h-5" />
                        }
                    </button>
                </div>

                <StatusBadge status={status} />

                <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {dateLabel}
                    </span>
                    {event.location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {event.location}
                        </span>
                    )}
                </div>

                {event.companies?.length > 0 && (
                    <div className="mt-auto pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 mb-1.5">
                            <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-400">Companies</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {event.companies.slice(0, 3).map(c => (
                                <span key={c} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    {c}
                                </span>
                            ))}
                            {event.companies.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">
                                    +{event.companies.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Link>
    )
}
