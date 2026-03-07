import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    writeBatch,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

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
    const conversationRef = doc(db, 'conversations', conversationId)

    const conversationSnap = await getDoc(conversationRef)

    if (conversationSnap.exists()) {
        return { id: conversationId, ...conversationSnap.data() }
    }

    const participants = [currentUser.uid, otherUser.uid].sort()

    const conversationData = {
        participants,
        participantInfo: {
            [currentUser.uid]: { name: currentUser.name, role: currentUser.role },
            [otherUser.uid]: { name: otherUser.name, role: otherUser.role }
        },
        lastMessage: null,
        unreadCount: {
            [currentUser.uid]: 0,
            [otherUser.uid]: 0
        },
        jobId: jobContext?.jobId || null,
        jobTitle: jobContext?.jobTitle || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }

    await setDoc(conversationRef, conversationData)

    return { id: conversationId, ...conversationData }
}

/**
 * Send a message in a conversation.
 * Uses a batch write to atomically add the message and update the conversation.
 */
export const sendMessage = async (conversationId, senderId, senderName, text, recipientId) => {
    const batch = writeBatch(db)

    // Add message to subcollection
    const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'))
    batch.set(messageRef, {
        text,
        senderId,
        senderName,
        timestamp: serverTimestamp(),
        readBy: [senderId]
    })

    // Update conversation with last message and increment unread count for recipient
    const conversationRef = doc(db, 'conversations', conversationId)
    const conversationSnap = await getDoc(conversationRef)
    const currentUnread = conversationSnap.data()?.unreadCount?.[recipientId] || 0

    batch.update(conversationRef, {
        lastMessage: {
            text,
            senderId,
            senderName,
            timestamp: Timestamp.now()
        },
        [`unreadCount.${recipientId}`]: currentUnread + 1,
        updatedAt: serverTimestamp()
    })

    await batch.commit()
}

/**
 * Subscribe to all conversations for a user, ordered by updatedAt desc.
 */
export const subscribeToConversations = (userId, callback, onError) => {
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    )

    return onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        callback(conversations)
    }, (error) => {
        console.error('Error subscribing to conversations:', error)
        if (onError) onError(error)
        // Still call back with empty array so UI doesn't hang on loading
        callback([])
    })
}

/**
 * Subscribe to messages in a conversation, ordered by timestamp asc.
 */
export const subscribeToMessages = (conversationId, callback) => {
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('timestamp', 'asc')
    )

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        callback(messages)
    }, (error) => {
        console.error('Error subscribing to messages:', error)
        callback([])
    })
}

/**
 * Mark a conversation as read for a user (reset unread count to 0).
 */
export const markConversationAsRead = async (conversationId, userId) => {
    try {
        const conversationRef = doc(db, 'conversations', conversationId)
        await updateDoc(conversationRef, {
            [`unreadCount.${userId}`]: 0
        })
    } catch (error) {
        console.error('Error marking conversation as read:', error)
    }
}

/**
 * Subscribe to total unread count across all conversations for a user.
 */
export const getTotalUnreadCount = (userId, callback) => {
    const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
    )

    return onSnapshot(q, (snapshot) => {
        let total = 0
        snapshot.docs.forEach(doc => {
            const data = doc.data()
            total += data.unreadCount?.[userId] || 0
        })
        callback(total)
    }, (error) => {
        console.error('Error getting unread count:', error)
        callback(0)
    })
}
