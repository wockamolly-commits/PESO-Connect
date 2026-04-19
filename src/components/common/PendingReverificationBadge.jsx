import { RefreshCw } from 'lucide-react'

const PendingReverificationBadge = ({ className = '' }) => (
    <span
        title="This user's profile has recent changes under review by PESO staff."
        className={`inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 text-xs font-medium ${className}`.trim()}
    >
        <RefreshCw className="w-3 h-3" />
        Pending Re-verification
    </span>
)

export default PendingReverificationBadge
