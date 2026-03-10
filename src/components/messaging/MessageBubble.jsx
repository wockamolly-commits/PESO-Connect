const MessageBubble = ({ message, isOwn }) => {
    const formatTime = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
            <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isOwn
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-br-md'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}
            >
                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                <p
                    className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-100' : 'text-gray-400'
                    }`}
                >
                    {formatTime(message.created_at)}
                </p>
            </div>
        </div>
    )
}

export default MessageBubble
