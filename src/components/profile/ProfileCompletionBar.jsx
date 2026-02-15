import { Link } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'

const ProfileCompletionBar = ({ percentage, missing, editPath }) => {
    const colorClass = percentage >= 67
        ? 'bg-green-500'
        : percentage >= 34
            ? 'bg-yellow-500'
            : 'bg-red-500'

    const bgColorClass = percentage >= 67
        ? 'bg-green-50 border-green-200'
        : percentage >= 34
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'

    return (
        <div className={`rounded-xl border p-4 ${bgColorClass}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    data-testid="completion-fill"
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {missing.length > 0 ? (
                <div className="mt-3 space-y-1.5">
                    {missing.map((item) => (
                        <Link
                            key={item.key}
                            to={editPath}
                            className="flex items-center gap-2 text-xs text-gray-600 hover:text-primary-600 transition-colors"
                        >
                            <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {item.label}
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Profile complete!
                </div>
            )}
        </div>
    )
}

export default ProfileCompletionBar
