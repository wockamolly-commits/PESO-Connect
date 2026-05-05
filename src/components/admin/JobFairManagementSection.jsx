import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
    CalendarDays, Plus, Pencil, Trash2, Loader2,
    Star, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react'
import { listEvents, deleteEvent, updateEvent, deriveStatus } from '../../services/jobFairService'
import { JobFairFormModal } from './JobFairFormModal'

const STATUS_CONFIG = {
    open: { label: 'Open', classes: 'bg-green-100 text-green-700' },
    upcoming: { label: 'Upcoming', classes: 'bg-yellow-100 text-yellow-700' },
    closed: { label: 'Closed', classes: 'bg-gray-100 text-gray-500' },
}

function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

export function JobFairManagementSection() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalEvent, setModalEvent] = useState(undefined)
    const [showModal, setShowModal] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [togglingId, setTogglingId] = useState(null)

    const fetchEvents = useCallback(async () => {
        try {
            const data = await listEvents()
            setEvents(data || [])
        } catch (err) {
            console.error(err)
            toast.error('Failed to load events.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    const handleNew = () => {
        setModalEvent(undefined)
        setShowModal(true)
    }

    const handleEdit = (ev) => {
        setModalEvent(ev)
        setShowModal(true)
    }

    const handleSaved = (saved) => {
        setShowModal(false)
        setEvents(prev => {
            const idx = prev.findIndex(e => e.id === saved.id)
            if (idx >= 0) {
                const next = [...prev]
                next[idx] = saved
                return next
            }
            return [saved, ...prev]
        })
    }

    const handleDeleteConfirm = async (id) => {
        setDeletingId(id)
        try {
            await deleteEvent(id)
            setEvents(prev => prev.filter(e => e.id !== id))
            toast.success('Event deleted.')
        } catch (err) {
            console.error(err)
            toast.error('Failed to delete event.')
        } finally {
            setDeletingId(null)
            setConfirmDeleteId(null)
        }
    }

    const handleToggle = async (ev, field) => {
        setTogglingId(`${ev.id}-${field}`)
        try {
            const updated = await updateEvent(ev.id, { [field]: !ev[field] })
            setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
        } catch (err) {
            console.error(err)
            toast.error('Failed to update event.')
        } finally {
            setTogglingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <CalendarDays className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100">Job Fair Events</h2>
                        <p className="text-xs text-slate-500">{events.length} total events</p>
                    </div>
                </div>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Event
                </button>
            </div>

            {/* Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                        <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No events yet. Create one to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">Event</th>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-center">Registration</th>
                                    <th className="px-4 py-3 text-center">Featured</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {events.map(ev => {
                                    const status = deriveStatus(ev)
                                    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.closed
                                    const isTogglingReg = togglingId === `${ev.id}-is_registration_open`
                                    const isTogglingHL = togglingId === `${ev.id}-is_highlighted`

                                    return (
                                        <tr key={ev.id} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-200 max-w-xs truncate">
                                                    {ev.title}
                                                </div>
                                                {ev.location && (
                                                    <div className="text-xs text-slate-500 mt-0.5">{ev.location}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                                {formatDate(ev.event_date)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.classes}`}>
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleToggle(ev, 'is_registration_open')}
                                                    disabled={isTogglingReg}
                                                    title={ev.is_registration_open ? 'Click to close registration' : 'Click to open registration'}
                                                    className="inline-flex items-center justify-center transition-opacity disabled:opacity-40"
                                                >
                                                    {isTogglingReg
                                                        ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                        : ev.is_registration_open
                                                            ? <CheckCircle className="w-5 h-5 text-green-400" />
                                                            : <XCircle className="w-5 h-5 text-gray-500" />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleToggle(ev, 'is_highlighted')}
                                                    disabled={isTogglingHL}
                                                    title={ev.is_highlighted ? 'Remove featured status' : 'Mark as featured'}
                                                    className="inline-flex items-center justify-center transition-opacity disabled:opacity-40"
                                                >
                                                    {isTogglingHL
                                                        ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                        : <Star className={`w-5 h-5 ${ev.is_highlighted ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(ev)}
                                                        title="Edit event"
                                                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    {confirmDeleteId === ev.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-red-400">Delete?</span>
                                                            <button
                                                                onClick={() => handleDeleteConfirm(ev.id)}
                                                                disabled={deletingId === ev.id}
                                                                className="text-xs text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 hover:bg-red-500/10 rounded"
                                                            >
                                                                {deletingId === ev.id ? '...' : 'Yes'}
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(null)}
                                                                className="text-xs text-slate-500 hover:text-slate-300 px-1.5 py-0.5 hover:bg-slate-700 rounded"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDeleteId(ev.id)}
                                                            title="Delete event"
                                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form modal */}
            {showModal && (
                <JobFairFormModal
                    event={modalEvent}
                    onClose={() => setShowModal(false)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    )
}

export default JobFairManagementSection
