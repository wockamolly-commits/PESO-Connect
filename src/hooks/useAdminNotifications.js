import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import {
    getAdminNotifications,
    getAdminUnreadCount,
    markAdminNotificationAsRead,
    markAllAdminNotificationsAsRead,
    subscribeToAdminNotifications,
} from '../services/adminNotificationService'

const NOTIFICATION_LIMIT = 30

export function useAdminNotifications() {
    const { currentUser } = useAuth()
    const adminId = currentUser?.id
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    // Track whether the initial fetch has completed so we only toast for
    // genuinely new realtime inserts, not for notifications that were already
    // in the database before the hook mounted.
    const initialFetchDone = useRef(false)

    const fetchNotifications = useCallback(async () => {
        if (!adminId) return
        setLoading(true)
        try {
            const [data, count] = await Promise.all([
                getAdminNotifications(adminId, NOTIFICATION_LIMIT),
                getAdminUnreadCount(adminId),
            ])
            setNotifications(data)
            setUnreadCount(count)
        } finally {
            setLoading(false)
            initialFetchDone.current = true
        }
    }, [adminId])

    // Initial fetch
    useEffect(() => {
        initialFetchDone.current = false
        fetchNotifications()
    }, [fetchNotifications])

    // Reconcile the unread badge against the DB. The optimistic / local
    // derivations in the realtime callbacks and mark-as-read handlers only
    // see the last NOTIFICATION_LIMIT rows, so they drift once the unread
    // pool exceeds that window. This call returns the authoritative count.
    const refreshUnreadCount = useCallback(async () => {
        if (!adminId) return
        try {
            const count = await getAdminUnreadCount(adminId)
            setUnreadCount(count)
        } catch (err) {
            console.error('Failed to refresh unread count:', err)
        }
    }, [adminId])

    // Realtime subscription
    useEffect(() => {
        if (!adminId) return

        const unsubscribe = subscribeToAdminNotifications(adminId, {
            onInsert: (newRow) => {
                setNotifications(prev => [newRow, ...prev].slice(0, NOTIFICATION_LIMIT))
                setUnreadCount(prev => prev + 1)
                // Reconcile with DB so the badge is correct even if we
                // missed an event or another tab already read the row.
                refreshUnreadCount()
                // Only toast for notifications that arrive after initial load
                if (initialFetchDone.current) {
                    toast(newRow.title, {
                        description: newRow.message,
                        duration: 5000,
                    })
                }
            },
            onUpdate: (updatedRow) => {
                setNotifications(prev =>
                    prev.map(n => n.id === updatedRow.id ? updatedRow : n)
                )
                // Always ask the DB — deriving from the 30-row window can
                // under- or over-count when old unreads exist.
                refreshUnreadCount()
            },
        })

        return unsubscribe
    }, [adminId, refreshUnreadCount])

    const markNotificationAsRead = useCallback(async (notificationId) => {
        if (!adminId) return
        // Optimistic update for instant UI feedback.
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        await markAdminNotificationAsRead(notificationId, adminId)
        // Reconcile after the write so the badge matches the DB even if
        // the row was already read in another session.
        refreshUnreadCount()
    }, [adminId, refreshUnreadCount])

    const markAllNotificationsAsRead = useCallback(async () => {
        if (!adminId) return
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
        setUnreadCount(0)
        await markAllAdminNotificationsAsRead(adminId)
        refreshUnreadCount()
    }, [adminId, refreshUnreadCount])

    return {
        notifications,
        unreadCount,
        loading,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications: fetchNotifications,
    }
}
