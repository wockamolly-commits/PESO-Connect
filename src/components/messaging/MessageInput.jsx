import { useState } from 'react'
import { Send } from 'lucide-react'

const MessageInput = ({ onSend, disabled }) => {
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = async () => {
        const trimmed = text.trim()
        if (!trimmed || sending) return

        setSending(true)
        try {
            await onSend(trimmed)
            setText('')
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex items-end gap-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    disabled={disabled || sending}
                    className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 max-h-32"
                    style={{ minHeight: '42px' }}
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending || disabled}
                    className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export default MessageInput
