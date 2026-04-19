import { supabase } from '../config/supabase'

/**
 * Fetch recent admin notifications for a given admin user.
 * @param {string} adminId
 * @param {number} limit
 */
export const getAdminNotifications = async (adminId, limit = 30) => {
    const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('recipient_admin_id', adminId)
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        console.error('Error fetching admin notifications:', error)
        return []
    }
    return data || []
}

/**
 * Get count of unread admin notifications.
 * @param {string} adminId
 */
export const getAdminUnreadCount = async (adminId) => {
    const { count, error } = await supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_admin_id', adminId)
        .eq('is_read', false)
    if (error) {
        console.error('Error getting admin unread count:', error)
        return 0
    }
    return count || 0
}

/**
 * Mark a single admin notification as read.
 * @param {string} notificationId
 * @param {string} adminId
 */
export const markAdminNotificationAsRead = async (notificationId, adminId) => {
    // read_at is filled by the DB trigger set_admin_notification_read_at
    // (see sql/admin_notifications_read_at_trigger.sql). The client
    // cannot be trusted to supply an accurate timestamp — a skewed clock
    // would pollute audit data.
    const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('recipient_admin_id', adminId)
    if (error) console.error('Error marking admin notification as read:', error)
}

/**
 * Mark all unread admin notifications as read for a given admin.
 * @param {string} adminId
 */
export const markAllAdminNotificationsAsRead = async (adminId) => {
    // read_at filled server-side; see markAdminNotificationAsRead above.
    const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('recipient_admin_id', adminId)
        .eq('is_read', false)
    if (error) console.error('Error marking all admin notifications as read:', error)
}

/**
 * Subscribe to realtime changes on admin_notifications for a specific admin.
 * @param {string} adminId
 * @param {{ onInsert: function, onUpdate: function }} handlers
 * @returns {function} unsubscribe
 */
export const subscribeToAdminNotifications = (adminId, { onInsert, onUpdate }) => {
    const channel = supabase
        .channel(`admin_notifications:${adminId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'admin_notifications',
                filter: `recipient_admin_id=eq.${adminId}`,
            },
            (payload) => onInsert?.(payload.new)
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'admin_notifications',
                filter: `recipient_admin_id=eq.${adminId}`,
            },
            (payload) => onUpdate?.(payload.new)
        )
        .subscribe()

    return () => {
        // Unsubscribe first so the server-side subscription is torn down,
        // then remove the channel from the client registry. Skipping
        // unsubscribe() leaks channels when the subscriber mounts/unmounts
        // rapidly (e.g. React StrictMode double-invoke or route changes).
        try {
            channel.unsubscribe()
        } catch (err) {
            console.error('Error unsubscribing admin notifications channel:', err)
        }
        supabase.removeChannel(channel)
    }
}
