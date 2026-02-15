import { useState, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { analyzeWithAI, tradeKeywords, getTradeSkills } from '../services/diagnosticService'
import { getOrCreateConversation } from '../services/messagingService'
import {
    Search,
    Loader2,
    User,
    CheckCircle,
    AlertCircle,
    Lightbulb,
    Wrench,
    ArrowRight,
    X,
    ShieldAlert,
    Info,
    HelpCircle,
    MessageSquare,
    Phone,
    Shield,
    Zap,
    Mail,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react'

// ─── Quick Contact Modal ────────────────────────────────────────────────────
// Shown when a non-logged-in user tries to message a worker.
// Creates a lite "individual" account in the background, then opens messaging.
const QuickContactModal = ({ worker, onClose, onAccountCreated }) => {
    const { createAccount, completeRegistration } = useAuth()
    const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) return setError('Name is required.')
        if (!form.phone.trim()) return setError('Phone number is required.')
        if (!form.email.trim()) return setError('Email is required.')
        if (form.password.length < 6) return setError('Password must be at least 6 characters.')

        setLoading(true)
        try {
            const result = await createAccount(
                form.email.trim().toLowerCase(),
                form.password,
                'individual'
            )
            await completeRegistration({
                full_name: form.name.trim(),
                name: form.name.trim(),
                contact_number: form.phone.trim(),
                individual_status: 'active',
            })
            onAccountCreated(result)
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('This email already has an account. Please sign in instead.')
            } else {
                setError(err.message || 'Something went wrong. Please try again.')
            }
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-md backdrop-blur-xl bg-white/80 border border-white/40 shadow-2xl shadow-primary-500/10 rounded-3xl p-8 animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/25 mb-3">
                        <MessageSquare className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Quick Contact</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Create a free account to message <span className="font-semibold text-gray-700">{worker?.name}</span>
                    </p>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 mb-5 pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Shield className="w-3.5 h-3.5 text-emerald-500" />
                        No documents
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        Instant access
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Your full name"
                            className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-sm"
                        />
                    </div>

                    {/* Phone */}
                    <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="09XX XXX XXXX"
                            className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-sm"
                        />
                    </div>

                    {/* Email */}
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Your email address"
                            className="w-full pl-10 pr-4 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-sm"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Create a password (6+ chars)"
                            className="w-full pl-10 pr-11 py-3 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2.5">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold py-3 rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all shadow-lg shadow-primary-500/25 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Setting up...
                            </>
                        ) : (
                            <>
                                <MessageSquare className="w-4 h-4" />
                                Create Account & Message
                            </>
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-4">
                    Already have an account?{' '}
                    <a href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">Sign in</a>
                </p>
            </div>
        </div>
    )
}

// ─── Diagnostic State Machine ────────────────────────────────────────────────
const initialDiagnosticState = {
    status: 'idle', // 'idle' | 'analyzing' | 'loadingWorkers' | 'complete' | 'error'
    results: null,
    workers: [],
    error: null,
    degraded: false,
}

const diagnosticReducer = (state, action) => {
    switch (action.type) {
        case 'ANALYZE_START':
            return { ...initialDiagnosticState, status: 'analyzing' }
        case 'ANALYZE_SUCCESS':
            return { ...state, status: 'loadingWorkers', results: action.payload, degraded: action.payload.degraded || false }
        case 'ANALYZE_FAIL':
            return { ...state, status: 'error', error: action.payload }
        case 'WORKERS_LOADED':
            return { ...state, status: 'complete', workers: action.payload }
        case 'WORKERS_FAILED':
            return { ...state, status: 'complete', workers: [] }
        case 'RESET':
            return { ...initialDiagnosticState }
        default:
            return state
    }
}

// ─── Main Diagnostic Page ───────────────────────────────────────────────────
const Diagnostic = () => {
    const navigate = useNavigate()
    const { currentUser, userData } = useAuth()

    const [problemText, setProblemText] = useState('')
    const [state, dispatch] = useReducer(diagnosticReducer, initialDiagnosticState)
    const { status, results, workers, error: diagError, degraded } = state

    // Quick Contact modal state
    const [contactModal, setContactModal] = useState({ open: false, worker: null })
    const [messagingWorker, setMessagingWorker] = useState(null)

    const handleAnalyze = async () => {
        if (!problemText.trim()) return

        dispatch({ type: 'ANALYZE_START' })

        try {
            const analysisResults = await analyzeWithAI(problemText)
            dispatch({ type: 'ANALYZE_SUCCESS', payload: analysisResults })

            if (analysisResults.primaryTrade) {
                try {
                    const matchingWorkers = await fetchMatchingWorkers(analysisResults.primaryTrade.id)
                    dispatch({ type: 'WORKERS_LOADED', payload: matchingWorkers })
                } catch {
                    dispatch({ type: 'WORKERS_FAILED' })
                }
            } else {
                dispatch({ type: 'WORKERS_LOADED', payload: [] })
            }
        } catch (error) {
            console.error('Analysis failed:', error)
            dispatch({ type: 'ANALYZE_FAIL', payload: error.message || 'Analysis failed. Please try again.' })
        }
    }

    const fetchMatchingWorkers = async (tradeId) => {
        const requiredSkills = getTradeSkills(tradeId)

        const usersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'jobseeker'),
            where('is_verified', '==', true)
        )
        const snapshot = await getDocs(usersQuery)

        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => {
                if (!user.skills || user.skills.length === 0) return false
                const userSkillsLower = user.skills.map(s => s.toLowerCase())
                return requiredSkills.some(reqSkill =>
                    userSkillsLower.some(userSkill =>
                        userSkill.includes(reqSkill.toLowerCase()) ||
                        reqSkill.toLowerCase().includes(userSkill)
                    )
                )
            })
    }

    // Handle "Message Worker" click
    const handleMessageWorker = async (worker) => {
        if (!currentUser || !userData) {
            // Not logged in — show quick contact modal
            setContactModal({ open: true, worker })
            return
        }

        // Already logged in — navigate to messages
        await navigateToMessages(worker, currentUser.uid, userData)
    }

    // After quick-contact account creation, navigate to messaging
    const handleAccountCreated = async (result) => {
        const { user, userData: newUserData } = result
        setContactModal({ open: false, worker: null })
        await navigateToMessages(contactModal.worker, user.uid, newUserData)
    }

    // Create/get conversation and navigate to the messages page
    const navigateToMessages = async (worker, userId, userDataObj) => {
        setMessagingWorker(worker.id)
        try {
            const conversation = await getOrCreateConversation(
                { uid: userId, name: userDataObj.name, role: userDataObj.role },
                { uid: worker.id, name: worker.name, role: worker.role || 'jobseeker' }
            )
            navigate(`/messages/${conversation.id}`)
        } catch (err) {
            console.error('Failed to start conversation:', err)
            // Fallback: navigate with query params
            navigate(`/messages?startWith=${worker.id}`)
        } finally {
            setMessagingWorker(null)
        }
    }

    const clearResults = () => {
        setProblemText('')
        dispatch({ type: 'RESET' })
    }

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-100 text-blue-700 border-blue-200',
            yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            orange: 'bg-orange-100 text-orange-700 border-orange-200',
            gray: 'bg-gray-100 text-gray-700 border-gray-200',
            brown: 'bg-amber-100 text-amber-700 border-amber-200'
        }
        return colors[color] || colors.gray
    }

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'emergency': return 'bg-red-100 text-red-700 border-red-200'
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'low': return 'bg-green-100 text-green-700 border-green-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    const examples = [
        'My toilet is leaking and there is water on the floor',
        'The light switch in my kitchen does not work and I see sparks',
        'I need to fix the cracked wall and replace some tiles',
        'The metal gate is rusty and does not close properly'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-xl shadow-primary-500/25 mb-4">
                        <Wrench className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Worker Finder</h1>
                    <p className="text-gray-600 max-w-lg mx-auto">
                        Describe your household problem and our AI will identify the type of worker you need
                        and recommend verified professionals.
                    </p>
                </div>

                {/* Input Section */}
                <div className="card mb-6">
                    <label className="label flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        Describe your problem
                    </label>
                    <textarea
                        value={problemText}
                        onChange={(e) => setProblemText(e.target.value)}
                        placeholder="Example: My toilet is leaking and there is water everywhere..."
                        className="input-field min-h-[120px] mb-4"
                    />

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleAnalyze}
                            disabled={status === 'analyzing' || !problemText.trim()}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {status === 'analyzing' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Analyzing with AI...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Diagnose & Find Workers
                                </>
                            )}
                        </button>
                        {results && (
                            <button onClick={clearResults} className="btn-secondary flex items-center justify-center gap-2">
                                <X className="w-5 h-5" />
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Example Prompts */}
                    {!results && (
                        <div className="mt-6">
                            <p className="text-sm text-gray-500 mb-3">Try these examples:</p>
                            <div className="flex flex-wrap gap-2">
                                {examples.map((example, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setProblemText(example)
                                        }}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors text-left"
                                    >
                                        {example.substring(0, 40)}...
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {results && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Diagnostic Report */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center justify-between mb-4 pb-4 border-b">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-primary-600" />
                                    Diagnostic Report
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getSeverityColor(results.severity)}`}>
                                    {results.severity} Severity
                                </span>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 uppercase mb-1">AI Summary</p>
                                        <p className="text-gray-900 leading-relaxed font-medium">
                                            {results.diagnosticSummary || "We've analyzed your problem and identified matching trades."}
                                        </p>
                                    </div>

                                    {results.safetyAdvice && results.safetyAdvice.length > 0 && (
                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                                            <p className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-2">
                                                <Info className="w-4 h-4" />
                                                Recommended Actions
                                            </p>
                                            <ul className="space-y-1">
                                                {results.safetyAdvice.map((advice, i) => (
                                                    <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                                                        <span className="w-1 h-1 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                                                        {advice}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {results.requiresFollowUp && results.followUpQuestion && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                            <p className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
                                                <HelpCircle className="w-4 h-4" />
                                                Need more info?
                                            </p>
                                            <p className="text-sm text-blue-700 mb-3">{results.followUpQuestion}</p>
                                            <button
                                                onClick={() => setProblemText(prev => `${prev}\n\nRE: ${results.followUpQuestion}`)}
                                                className="text-xs font-bold text-blue-600 underline hover:text-blue-800"
                                            >
                                                Add clarification to my description
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <p className="text-sm font-medium text-gray-500 uppercase">Recommended Trades</p>
                                    {results.trades.length === 0 ? (
                                        <div className="text-center py-4 bg-gray-50 rounded-xl">
                                            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-xs text-gray-500">Unclear trade</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {results.trades.map((trade, index) => (
                                                <div
                                                    key={trade.id}
                                                    className={`p-3 rounded-xl border ${index === 0 ? 'border-primary-200 bg-primary-50' : 'border-gray-100 bg-white'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-2xl">{trade.icon}</span>
                                                            <div>
                                                                <h4 className="text-sm font-bold text-gray-900">{trade.name}</h4>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                                                                    {index === 0 ? 'Primary' : 'Alternative'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-primary-600">{trade.confidence}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Matching Workers */}
                        {results.primaryTrade && (
                            <div className="card">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary-600" />
                                    Verified {results.primaryTrade.name} Professionals
                                </h2>

                                {status === 'loadingWorkers' ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
                                        <p className="text-gray-600">Finding verified workers...</p>
                                    </div>
                                ) : workers.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed">
                                        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-2 font-medium">No verified workers found in this trade</p>
                                        <p className="text-gray-400 text-sm">We're expanding our network. Try a broader search or check back later.</p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {workers.map((worker) => (
                                            <div
                                                key={worker.id}
                                                className="group relative flex flex-col p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 transition-all"
                                            >
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                                        {worker.name?.charAt(0).toUpperCase() || 'W'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900 truncate">{worker.name}</p>
                                                            <CheckCircle className="w-4 h-4 text-green-500 fill-current flex-shrink-0" />
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {worker.skills?.slice(0, 2).map((skill, i) => (
                                                                <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {worker.skills?.length > 2 && (
                                                                <span className="text-[10px] text-gray-400 font-medium self-center">+{worker.skills.length - 2} more</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Message Worker Button */}
                                                <button
                                                    onClick={() => handleMessageWorker(worker)}
                                                    disabled={messagingWorker === worker.id}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary-500 to-primary-700 text-white text-sm font-semibold rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all shadow-md shadow-primary-500/20 disabled:opacity-50"
                                                >
                                                    {messagingWorker === worker.id ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Connecting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MessageSquare className="w-4 h-4" />
                                                            Message Worker
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Trade Categories Reference */}
                {!results && status === 'idle' && (
                    <div className="card">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 ">Available Services</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {Object.entries(tradeKeywords).map(([id, trade]) => (
                                <div key={id} className="text-center p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-primary-100 group">
                                    <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{trade.icon}</span>
                                    <p className="text-xs font-bold text-gray-900">{trade.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Contact Modal */}
            {contactModal.open && (
                <QuickContactModal
                    worker={contactModal.worker}
                    onClose={() => setContactModal({ open: false, worker: null })}
                    onAccountCreated={handleAccountCreated}
                />
            )}
        </div>
    )
}

export default Diagnostic
