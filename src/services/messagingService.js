import { supabase } from '../config/supabase'

/**
 * Generate a deterministic conversation ID from two user UIDs.
 */
export const getConversationId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_')
}

/**
 * Get or create a conversation between two users.
 * @param {Object} currentUser - { uid, name, role }
 * @param {Object} otherUser - { uid, name, role }
 * @param {Object|null} jobContext - { jobId, jobTitle } or null
 */
export const getOrCreateConversation = async (currentUser, otherUser, jobContext = null) => {
    const conversationId = getConversationId(currentUser.uid, otherUser.uid)

    // Try to fetch existing conversation
    const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle()
    if (fetchError) throw fetchError

    if (existing) return existing

    // Create new conversation
    const participants = [currentUser.uid, otherUser.uid].sort()

    const conversationData = {
        id: conversationId,
        participants,
        participant_info: {
            [currentUser.uid]: { name: currentUser.name, role: currentUser.role },
            [otherUser.uid]: { name: otherUser.name, role: otherUser.role }
        },
        last_message: null,
        unread_count: {
            [currentUser.uid]: 0,
            [otherUser.uid]: 0
        },
        job_id: jobContext?.jobId || null,
        job_title: jobContext?.jobTitle || null,
    }

    const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()
    if (error) throw error

    return data
}

/**
 * Send a message in a conversation.
 * Inserts the message and updates the conversation's last_message + unread count.
 */
export const sendMessage = async (conversationId, senderId, senderName, text, recipientId) => {
    // Insert message
    const { error: msgError } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            text,
            sender_id: senderId,
            sender_name: senderName,
            read_by: [senderId],
        })
    if (msgError) throw msgError

    // Fetch current unread count for recipient
    const { data: conv } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('id', conversationId)
        .single()
    const currentUnread = conv?.unread_count?.[recipientId] || 0

    // Update conversation with last message and increment unread count
    const { error: updateError } = await supabase
        .from('conversations')
        .update({
            last_message: {
                text,
                senderId,
                senderName,
                timestamp: new Date().toISOString()
            },
            unread_count: {
                ...conv?.unread_count,
                [recipientId]: currentUnread + 1
            },
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
    if (updateError) throw updateError
}

/**
 * Subscribe to all conversations for a user, ordered by updatedAt desc.
 * Returns an unsubscribe function.
 */
export const subscribeToConversations = (userId, callback, onError) => {
    // Initial fetch
    const fetchConversations = async () => {
        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .contains('participants', [userId])
            .order('updated_at', { ascending: false })
        if (error) {
            console.error('Error fetching conversations:', error)
            if (onError) onError(error)
            callback([])
            return
        }
        callback(data || [])
    }

    fetchConversations()

    // Subscribe to real-time changes
    const channel = supabase
        .channel(`conversations:${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'conversations',
            },
            (payload) => {
                // Check if this user is a participant
                const participants = payload.new?.participants || payload.old?.participants || []
                if (participants.includes(userId)) {
                    // Re-fetch full list to maintain order
                    fetchConversations()
                }
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}

/**
 * Subscribe to messages in a conversation, ordered by timestamp asc.
 * Returns an unsubscribe function.
 */
export const subscribeToMessages = (conversationId, callback) => {
    // Initial fetch
    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
        if (error) {
            console.error('Error fetching messages:', error)
            callback([])
            return
        }
        callback(data || [])
    }

    fetchMessages()

    // Subscribe to new messages in this conversation
    const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`,
            },
            () => {
                // Re-fetch to maintain ordering
                fetchMessages()
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}

/**
 * Mark a conversation as read for a user (reset unread count to 0).
 */
export const markConversationAsRead = async (conversationId, userId) => {
    try {
        // Fetch current unread_count to preserve other user's count
        const { data: conv } = await supabase
            .from('conversations')
            .select('unread_count')
            .eq('id', conversationId)
            .single()

        const { error } = await supabase
            .from('conversations')
            .update({
                unread_count: {
                    ...conv?.unread_count,
                    [userId]: 0
                }
            })
            .eq('id', conversationId)
        if (error) throw error
    } catch (error) {
        console.error('Error marking conversation as read:', error)
    }
}

/**
 * Subscribe to total unread count across all conversations for a user.
 * Returns an unsubscribe function.
 */
export const getTotalUnreadCount = (userId, callback) => {
    // Initial fetch
    const fetchUnread = async () => {
        const { data, error } = await supabase
            .from('conversations')
            .select('unread_count')
            .contains('participants', [userId])
        if (error) {
            console.error('Error getting unread count:', error)
            callback(0)
            return
        }
        let total = 0
        ;(data || []).forEach(conv => {
            total += conv.unread_count?.[userId] || 0
        })
        callback(total)
    }

    fetchUnread()

    // Subscribe to conversation updates (unread count changes)
    const channel = supabase
        .channel(`unread:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
            },
            (payload) => {
                const participants = payload.new?.participants || []
                if (participants.includes(userId)) {
                    fetchUnread()
                }
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}
