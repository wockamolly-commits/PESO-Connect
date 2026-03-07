import { MessageSquare } from 'lucide-react'

const EmptyState = () => {
    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center px-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                    Select a conversation from the list or start a new one by messaging an employer or applicant.
                </p>
            </div>
        </div>
    )
}

export default EmptyState
