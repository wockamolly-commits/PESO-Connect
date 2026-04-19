import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../config/supabase'
import { X, Mail, Loader2, ShieldCheck, ChevronDown, Check } from 'lucide-react'
import { getPermissionLabel } from '../../utils/adminPermissions'

const ROLE_TEMPLATES = [
    {
        id: 'employer_validator',
        label: 'Employer Validator',
        description: 'Reviews and approves/rejects employer registrations.',
        permissions: ['view_overview', 'view_employers', 'approve_employers', 'reject_employers'],
    },
    {
        id: 'jobseeker_support',
        label: 'Jobseeker Support',
        description: 'Reviews and approves/rejects jobseeker accounts.',
        permissions: ['view_overview', 'view_jobseekers', 'approve_jobseekers', 'reject_jobseekers'],
    },
    {
        id: 'moderator',
        label: 'Moderator',
        description: 'Views all users and can remove accounts.',
        permissions: ['view_overview', 'view_users', 'delete_users'],
    },
]

const RoleTemplateSelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState(null)
    const containerRef = useRef(null)
    const triggerRef = useRef(null)
    const dropdownRef = useRef(null)
    const selectedTemplate = ROLE_TEMPLATES.find((template) => template.id === value) || null

    useEffect(() => {
        const handleClickOutside = (event) => {
            const clickedTrigger = containerRef.current?.contains(event.target)
            const clickedDropdown = dropdownRef.current?.contains(event.target)
            if (!clickedTrigger && !clickedDropdown) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            setDropdownStyle(null)
            return
        }

        const updateDropdownPosition = () => {
            const triggerRect = triggerRef.current?.getBoundingClientRect()
            const dropdownHeight = dropdownRef.current?.offsetHeight || 260
            if (!triggerRect) return

            const spaceBelow = window.innerHeight - triggerRect.bottom
            const spaceAbove = triggerRect.top
            const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow
            const top = shouldOpenUpward
                ? Math.max(12, triggerRect.top - dropdownHeight - 8)
                : Math.min(window.innerHeight - dropdownHeight - 12, triggerRect.bottom + 8)

            setDropdownStyle({
                top,
                left: triggerRect.left,
                width: triggerRect.width,
            })
        }

        updateDropdownPosition()
        window.addEventListener('resize', updateDropdownPosition)
        window.addEventListener('scroll', updateDropdownPosition, true)

        return () => {
            window.removeEventListener('resize', updateDropdownPosition)
            window.removeEventListener('scroll', updateDropdownPosition, true)
        }
    }, [isOpen])

    return (
        <div className="relative" ref={containerRef}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    isOpen
                        ? 'border-indigo-500/60 bg-slate-800 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label={selectedTemplate ? `Role template: ${selectedTemplate.label}` : 'Select a role template'}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className={`block text-sm font-medium ${selectedTemplate ? 'text-slate-100' : 'text-slate-400'}`}>
                            {selectedTemplate?.label || 'Select a role...'}
                        </span>
                        <span className="block text-xs text-slate-500 mt-1">
                            {selectedTemplate?.description || 'Choose the permission template for this sub-admin'}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && dropdownStyle && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[1200] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
                    style={dropdownStyle}
                    role="listbox"
                >
                    <div className="border-b border-slate-800 px-3 py-2 bg-slate-900">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Role Template</p>
                    </div>
                    <div className="p-2">
                        {ROLE_TEMPLATES.map((template) => {
                            const isSelected = template.id === value

                            return (
                                <button
                                    key={template.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-label={`${template.label}: ${template.description}`}
                                    onClick={() => {
                                        onChange(template.id)
                                        setIsOpen(false)
                                    }}
                                    className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                                        isSelected
                                            ? 'bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-500/30'
                                            : 'text-slate-200 hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <span className="block text-sm font-semibold">{template.label}</span>
                                        <span className="mt-1 block text-xs text-slate-400">{template.description}</span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />}
                                </button>
                            )
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

const InviteAdminModal = ({ onClose, onSuccess }) => {
    const [email, setEmail] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const template = ROLE_TEMPLATES.find(t => t.id === selectedTemplate) || null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!email.trim()) { setError('Please enter an email address.'); return }
        if (!selectedTemplate) { setError('Please select a role template.'); return }
        setLoading(true)
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
            if (sessionError || !session?.access_token) {
                throw new Error('Your session has expired. Please log in again.')
            }

            const res = await supabase.functions.invoke('invite-admin', {
                body: {
                    email: email.trim().toLowerCase(),
                    templateId: selectedTemplate,
                    permissions: template.permissions,
                },
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (res.error) {
                let message = 'Invite failed.'
                try {
                    const errBody = await res.error.context?.json?.()
                    if (errBody?.error) message = errBody.error
                    else message = res.error.message || message
                } catch {
                    message = res.error.message || message
                }
                throw new Error(message)
            }

            if (res.data?.error) throw new Error(res.data.error)
            onSuccess(email.trim())
        } catch (err) {
            setError(err.message || 'Failed to send invite.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Invite Sub-Admin</h2>
                            <p className="text-xs text-slate-500">Send a secure invite link</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="official@organization.gov.ph"
                                required
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                            />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                            Must be an official email not linked to any jobseeker or employer account.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Role Template
                        </label>
                        <RoleTemplateSelect
                            value={selectedTemplate}
                            onChange={setSelectedTemplate}
                        />

                        {template && (
                            <div className="mt-3 p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                                <p className="text-xs text-slate-300 font-medium mb-2">{template.description}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {template.permissions.map(p => (
                                        <span
                                            key={p}
                                            className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md text-xs font-mono"
                                        >
                                            {getPermissionLabel(p)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !email.trim() || !selectedTemplate}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            Send Invite
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export { InviteAdminModal }
export default InviteAdminModal
