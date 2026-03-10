import { useState } from 'react'
import { Search } from 'lucide-react'

const ConversationList = ({ conversations, currentUserId, activeConversationId, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('')

    const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now - date

        if (diff < 60000) return 'Just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
        if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' })
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    const filtered = conversations.filter(conv => {
        if (!searchQuery.trim()) return true
        const otherUserId = conv.participants.find(p => p !== currentUserId)
        const otherName = conv.participant_info?.[otherUserId]?.name || ''
        return otherName.toLowerCase().includes(searchQuery.toLowerCase())
    })

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Messages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <p className="text-gray-400 text-sm">
                            {searchQuery ? 'No conversations found' : 'No conversations yet'}
                        </p>
                    </div>
                ) : (
                    filtered.map((conv) => {
                        const otherUserId = conv.participants.find(p => p !== currentUserId)
                        const otherUser = conv.participant_info?.[otherUserId]
                        const unread = conv.unread_count?.[currentUserId] || 0
                        const isActive = conv.id === activeConversationId

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv)}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                                    isActive ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''
                                }`}
                            >
                                {/* Avatar */}
                                <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                                    {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                                            {otherUser?.name || 'User'}
                                        </span>
                                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                            {formatTime(conv.last_message?.timestamp || conv.updated_at)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                                            {conv.last_message
                                                ? `${conv.last_message.senderId === currentUserId ? 'You: ' : ''}${conv.last_message.text}`
                                                : 'No messages yet'
                                            }
                                        </p>
                                        {unread > 0 && (
                                            <span className="flex-shrink-0 ml-2 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                                {unread > 9 ? '9+' : unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default ConversationList
