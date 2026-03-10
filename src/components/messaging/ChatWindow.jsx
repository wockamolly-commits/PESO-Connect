import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Briefcase } from 'lucide-react'
import { subscribeToMessages, sendMessage, markConversationAsRead } from '../../services/messagingService'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

const ChatWindow = ({ conversation, currentUserId, onBack }) => {
    const [messages, setMessages] = useState([])
    const messagesEndRef = useRef(null)

    const otherUserId = conversation.participants.find(p => p !== currentUserId)
    const otherUser = conversation.participant_info?.[otherUserId]

    useEffect(() => {
        if (!conversation.id) return

        // Mark as read when opening
        markConversationAsRead(conversation.id, currentUserId)

        const unsubscribe = subscribeToMessages(conversation.id, (msgs) => {
            setMessages(msgs)
            // Mark as read on new messages
            markConversationAsRead(conversation.id, currentUserId)
        })

        return () => unsubscribe()
    }, [conversation.id, currentUserId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async (text) => {
        await sendMessage(
            conversation.id,
            currentUserId,
            conversation.participant_info?.[currentUserId]?.name || 'You',
            text,
            otherUserId
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="md:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {otherUser?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{otherUser?.name || 'User'}</h3>
                    <p className="text-xs text-gray-500 capitalize">{otherUser?.role || ''}</p>
                </div>
                {conversation.job_title && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        <Briefcase className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{conversation.job_title}</span>
                    </div>
                )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-1">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        isOwn={msg.sender_id === currentUserId}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <MessageInput onSend={handleSend} />
        </div>
    )
}

export default ChatWindow
