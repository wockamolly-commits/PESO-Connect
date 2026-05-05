import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createEvent, updateEvent } from '../../services/jobFairService'

const EMPTY_FORM = {
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    registration_deadline: '',
    location: '',
    companies: '',
    google_form_url: '',
    banner_url: '',
    is_registration_open: true,
    is_highlighted: false,
}

function toFormValues(event) {
    if (!event) return EMPTY_FORM
    const toDatetimeLocal = (iso) => {
        if (!iso) return ''
        return iso.slice(0, 16)
    }
    return {
        title: event.title || '',
        description: event.description || '',
        event_date: toDatetimeLocal(event.event_date),
        end_date: toDatetimeLocal(event.end_date),
        registration_deadline: toDatetimeLocal(event.registration_deadline),
        location: event.location || '',
        companies: (event.companies || []).join(', '),
        google_form_url: event.google_form_url || '',
        banner_url: event.banner_url || '',
        is_registration_open: event.is_registration_open ?? true,
        is_highlighted: event.is_highlighted ?? false,
    }
}

export function JobFairFormModal({ event, onClose, onSaved }) {
    const isEdit = Boolean(event)
    const [form, setForm] = useState(toFormValues(event))
    const [saving, setSaving] = useState(false)

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) {
            toast.error('Title is required.')
            return
        }
        if (!form.event_date) {
            toast.error('Event date is required.')
            return
        }
        setSaving(true)
        try {
            const payload = {
                title: form.title.trim(),
                description: form.description.trim() || null,
                event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
                end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
                registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
                location: form.location.trim() || null,
                companies: form.companies
                    ? form.companies.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                google_form_url: form.google_form_url.trim() || null,
                banner_url: form.banner_url.trim() || null,
                is_registration_open: form.is_registration_open,
                is_highlighted: form.is_highlighted,
            }

            const saved = isEdit
                ? await updateEvent(event.id, payload)
                : await createEvent(payload)

            toast.success(isEdit ? 'Event updated.' : 'Event created.')
            onSaved(saved)
        } catch (err) {
            console.error(err)
            toast.error('Failed to save event.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? 'Edit Job Fair Event' : 'New Job Fair Event'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g. Mega Job Fair 2026"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            rows={4}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            placeholder="Describe the event..."
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={form.event_date}
                                onChange={e => set('event_date', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="datetime-local"
                                value={form.end_date}
                                onChange={e => set('end_date', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Registration deadline + location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                            <input
                                type="datetime-local"
                                value={form.registration_deadline}
                                onChange={e => set('registration_deadline', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                value={form.location}
                                onChange={e => set('location', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. San Carlos City Coliseum"
                            />
                        </div>
                    </div>

                    {/* Companies */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Participating Companies
                        </label>
                        <input
                            type="text"
                            value={form.companies}
                            onChange={e => set('companies', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="ACME Corp, TechCo, GreenBuild (comma-separated)"
                        />
                    </div>

                    {/* Google Form URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Google Form URL</label>
                        <input
                            type="url"
                            value={form.google_form_url}
                            onChange={e => set('google_form_url', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="https://forms.google.com/..."
                        />
                    </div>

                    {/* Banner URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image URL</label>
                        <input
                            type="url"
                            value={form.banner_url}
                            onChange={e => set('banner_url', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="https://..."
                        />
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                onClick={() => set('is_registration_open', !form.is_registration_open)}
                                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.is_registration_open ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_registration_open ? 'translate-x-5' : 'translate-x-1'}`} />
                            </div>
                            <span className="text-sm text-gray-700">Registration Open</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                onClick={() => set('is_highlighted', !form.is_highlighted)}
                                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.is_highlighted ? 'bg-amber-400' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_highlighted ? 'translate-x-5' : 'translate-x-1'}`} />
                            </div>
                            <span className="text-sm text-gray-700">Featured / Highlighted</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary px-5 py-2 text-sm inline-flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default JobFairFormModal
