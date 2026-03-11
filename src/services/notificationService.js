import { supabase } from '../config/supabase'

/**
 * Insert a notification for a user.
 * @param {string} userId - recipient's user ID
 * @param {string} type - notification type (e.g. 'application_status_change')
 * @param {string} title - short title
 * @param {string} message - notification message
 * @param {object} data - extra context (application_id, job_title, status, etc.)
 */
export const insertNotification = async (userId, type, title, message, data = {}) => {
    const { error } = await supabase
        .from('notifications')
        .insert({ user_id: userId, type, title, message, data })
    if (error) {
        console.error('Error inserting notification:', error)
        throw error
    }
}

/**
 * Fetch recent notifications for a user.
 * @param {string} userId
 * @param {number} limit - max notifications to return (default 20)
 */
export const getNotifications = async (userId, limit = 20) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        console.error('Error fetching notifications:', error)
        return []
    }
    return data || []
}

/**
 * Get count of unread notifications for a user.
 * @param {string} userId
 */
export const getUnreadNotificationCount = async (userId) => {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    if (error) {
        console.error('Error getting unread count:', error)
        return 0
    }
    return count || 0
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 */
export const markAsRead = async (notificationId) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
    if (error) console.error('Error marking notification as read:', error)
}

/**
 * Mark all notifications as read for a user.
 * @param {string} userId
 */
export const markAllAsRead = async (userId) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    if (error) console.error('Error marking all as read:', error)
}

/**
 * Subscribe to new notifications for a user via Supabase Realtime.
 * Calls `onNew(notification)` for each new notification.
 * Calls `onCountChange(count)` with updated unread count.
 * Returns an unsubscribe function.
 *
 * @param {string} userId
 * @param {function} onNew - callback for new notifications
 * @param {function} onCountChange - callback with updated unread count
 */
export const subscribeToNotifications = (userId, onNew, onCountChange) => {
    // Get initial unread count
    getUnreadNotificationCount(userId).then(onCountChange)

    const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            (payload) => {
                onNew(payload.new)
                // Re-fetch unread count
                getUnreadNotificationCount(userId).then(onCountChange)
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            },
            () => {
                // Re-fetch unread count when notifications are marked as read
                getUnreadNotificationCount(userId).then(onCountChange)
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}
