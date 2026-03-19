# Status Change Notifications Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify jobseekers via in-app notifications and email (Resend) when employers change their application status to Shortlisted, Hired, or Rejected.

**Architecture:** Create a `notifications` table with Realtime enabled. Client-side `notificationService.js` handles CRUD + subscriptions. `NotificationBell.jsx` component replaces the static bell in Navbar. `JobApplicants.jsx` inserts notifications on status change. A Supabase Edge Function sends emails via Resend API, triggered by DB webhook. EmailJS is fully replaced by Resend.

**Tech Stack:** React, Supabase (Postgres, Realtime, Edge Functions), Resend API, lucide-react

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `sql/create_notifications_table.sql` | Create | Notifications table, indexes, RLS, Realtime |
| `src/services/notificationService.js` | Create | Client-side notification CRUD + Realtime subscriptions |
| `src/components/common/NotificationBell.jsx` | Create | Bell icon with badge + dropdown UI |
| `src/components/Navbar.jsx` | Modify | Replace static bell with NotificationBell component |
| `src/pages/employer/JobApplicants.jsx` | Modify | Insert notification after status change |
| `supabase/functions/send-notification-email/index.ts` | Create | Edge Function: receives notification, sends email via Resend |
| `src/services/emailService.js` | Rewrite | Replace EmailJS with `supabase.functions.invoke()` calls |
| `package.json` | Modify | Remove `@emailjs/browser` dependency |
| `.env` | Modify | Remove EmailJS vars, add notes about Resend setup |

---

## Chunk 1: Database Setup + Notification Service

### Task 1: Create Notifications Table SQL

**Files:**
- Create: `sql/create_notifications_table.sql`

- [ ] **Step 1: Write the SQL file**

```sql
-- Create notifications table
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}',
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(user_id) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert notifications (employer inserts for jobseeker)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

- [ ] **Step 2: Commit**

```bash
git add sql/create_notifications_table.sql
git commit -m "feat: add SQL for notifications table with RLS and Realtime"
```

- [ ] **Step 3: Run in Supabase Dashboard**

Copy the SQL and run it in Supabase Dashboard > SQL Editor. Verify the table appears and Realtime is enabled.

---

### Task 2: Create Notification Service

**Files:**
- Create: `src/services/notificationService.js`

This follows the same pattern as `src/services/messagingService.js` — Supabase queries + Realtime subscriptions.

- [ ] **Step 1: Create the notification service**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/notificationService.js
git commit -m "feat: add notification service with CRUD and Realtime subscriptions"
```

---

## Chunk 2: NotificationBell Component + Navbar Integration

### Task 3: Create NotificationBell Component

**Files:**
- Create: `src/components/common/NotificationBell.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle, XCircle, Briefcase, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
    subscribeToNotifications,
    getNotifications,
    markAsRead,
    markAllAsRead
} from '../../services/notificationService'

const STATUS_CONFIG = {
    shortlisted: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    hired: { icon: Briefcase, color: 'text-green-500', bg: 'bg-green-50' },
    rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
}

function timeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
}

export default function NotificationBell() {
    const { currentUser } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef(null)

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!currentUser) return

        const unsubscribe = subscribeToNotifications(
            currentUser.uid,
            (newNotification) => {
                setNotifications(prev => [newNotification, ...prev].slice(0, 20))
            },
            (count) => {
                setUnreadCount(count)
            }
        )

        return () => unsubscribe()
    }, [currentUser])

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (open && currentUser) {
            setLoading(true)
            getNotifications(currentUser.uid, 10).then(data => {
                setNotifications(data)
                setLoading(false)
            })
        }
    }, [open, currentUser])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
        setOpen(false)

        // Navigate based on notification type
        if (notification.type === 'application_status_change') {
            navigate('/my-applications')
        }
    }

    const handleMarkAllRead = async () => {
        if (!currentUser) return
        await markAllAsRead(currentUser.uid)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    const getNotificationIcon = (notification) => {
        const status = notification.data?.status
        const config = STATUS_CONFIG[status]
        if (config) {
            const Icon = config.icon
            return <Icon className={`w-5 h-5 ${config.color}`} />
        }
        return <Bell className="w-5 h-5 text-gray-400" />
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                                        !notification.is_read ? 'bg-primary-50/50' : ''
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        STATUS_CONFIG[notification.data?.status]?.bg || 'bg-gray-100'
                                    }`}>
                                        {getNotificationIcon(notification)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {timeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/NotificationBell.jsx
git commit -m "feat: add NotificationBell component with dropdown and Realtime"
```

---

### Task 4: Integrate NotificationBell into Navbar

**Files:**
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Add import**

At the top of the file (after the existing imports around line 18), add:

```javascript
import NotificationBell from './common/NotificationBell'
```

- [ ] **Step 2: Replace the static bell button**

Find lines 121-124 in Navbar.jsx:

```jsx
{/* Notification Bell */}
<button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
    <Bell className="w-5 h-5" />
</button>
```

Replace with:

```jsx
{/* Notification Bell */}
<NotificationBell />
```

- [ ] **Step 3: Remove unused Bell import**

In the lucide-react import block (lines 3-16), remove `Bell` from the import since it's no longer used directly by Navbar. The import should change from:

```javascript
import {
    Home, Briefcase, Users, Settings, LogOut, Menu, X,
    Bell, User, Search, Shield, MessageSquare
} from 'lucide-react'
```

To:

```javascript
import {
    Home, Briefcase, Users, Settings, LogOut, Menu, X,
    User, Search, Shield, MessageSquare
} from 'lucide-react'
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.jsx
git commit -m "feat: integrate NotificationBell into Navbar replacing static bell"
```

---

## Chunk 3: Trigger Notifications from JobApplicants

### Task 5: Add Notification Trigger to Status Updates

**Files:**
- Modify: `src/pages/employer/JobApplicants.jsx`

- [ ] **Step 1: Add import**

At the top of the file (after existing imports around line 20), add:

```javascript
import { insertNotification } from '../../services/notificationService'
```

- [ ] **Step 2: Add notification helper**

After the `fetchJobAndApplicants` function (after line 49), add a helper that builds and inserts the notification:

```javascript
const NOTIFICATION_CONFIG = {
    shortlisted: {
        title: (jobTitle) => `You've been shortlisted for ${jobTitle}`,
        message: (employerName, jobTitle) =>
            `${employerName} has shortlisted your application for ${jobTitle}. Log in to view details.`,
    },
    hired: {
        title: (jobTitle) => `Congratulations! You've been hired for ${jobTitle}`,
        message: (employerName, jobTitle) =>
            `${employerName} has accepted your application for ${jobTitle}!`,
    },
    rejected: {
        title: (jobTitle) => `Update on your application for ${jobTitle}`,
        message: (employerName, jobTitle) =>
            `Unfortunately, your application for ${jobTitle} was not selected at this time. Keep applying!`,
    },
}

const sendStatusNotification = async (applicant, newStatus) => {
    const config = NOTIFICATION_CONFIG[newStatus]
    if (!config || !job) return

    const employerName = job.company_name || 'An employer'

    try {
        await insertNotification(
            applicant.user_id,
            'application_status_change',
            config.title(job.title),
            config.message(employerName, job.title),
            {
                application_id: applicant.id,
                job_id: jobId,
                job_title: job.title,
                status: newStatus,
                employer_name: employerName,
            }
        )
    } catch (err) {
        // Don't block status update if notification fails
        console.error('Failed to send notification:', err)
    }
}
```

- [ ] **Step 3: Call notification after successful status update**

In the `updateStatus` function (lines 51-67), add the notification call after the successful database update. The function currently looks like:

```javascript
const updateStatus = async (appId, newStatus) => {
    setActionLoading(appId)
    try {
        const { error } = await supabase
            .from('applications')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', appId)
        if (error) throw error
        setApplicants(applicants.map(app =>
            app.id === appId ? { ...app, status: newStatus } : app
        ))
    } catch (error) {
```

After `setApplicants(...)` (line 60) and before the `} catch`, add:

```javascript
        // Send notification for key status changes
        if (['shortlisted', 'hired', 'rejected'].includes(newStatus)) {
            const applicant = applicants.find(app => app.id === appId)
            if (applicant) sendStatusNotification(applicant, newStatus)
        }
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/employer/JobApplicants.jsx
git commit -m "feat: trigger in-app notifications on application status change"
```

---

## Chunk 4: Supabase Edge Function + Resend Email

### Task 6: Create Supabase Edge Function for Sending Emails

**Files:**
- Create: `supabase/functions/send-notification-email/index.ts`

This Edge Function is called by a Supabase Database Webhook when a new row is inserted into `notifications`. It checks the user's notification preferences and sends an email via Resend.

- [ ] **Step 1: Initialize Supabase CLI project (if not done)**

Run from the project root:

```bash
npx supabase init
```

This creates the `supabase/` directory structure. If prompted about existing config, keep defaults.

- [ ] **Step 2: Create the Edge Function**

```bash
npx supabase functions new send-notification-email
```

Then write the function at `supabase/functions/send-notification-email/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'PESO Connect <noreply@pesoconnect.com>'

interface NotificationPayload {
  type: 'INSERT'
  table: 'notifications'
  record: {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    data: Record<string, unknown>
    is_read: boolean
    created_at: string
  }
}

interface WebhookPayload {
  type: string
  table: string
  record: NotificationPayload['record']
}

const EMAIL_TEMPLATES: Record<string, (data: Record<string, unknown>, title: string, message: string) => { subject: string; html: string }> = {
  application_status_change: (data, title, message) => ({
    subject: title,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">PESO Connect</h1>
          <p style="color: #6B7280; margin: 5px 0 0 0;">San Carlos City</p>
        </div>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; border: 1px solid #E5E7EB;">
          <h2 style="color: #111827; margin-top: 0;">${title}</h2>
          <p style="color: #374151; line-height: 1.6;">${message}</p>
          ${data.job_title ? `<p style="color: #6B7280; font-size: 14px;"><strong>Position:</strong> ${data.job_title}</p>` : ''}
          ${data.employer_name ? `<p style="color: #6B7280; font-size: 14px;"><strong>Company:</strong> ${data.employer_name}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${Deno.env.get('APP_URL') || 'https://pesoconnect.com'}/my-applications"
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
            View My Applications
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">
          You're receiving this because you have application update notifications enabled.
          You can change this in your Settings.
        </p>
      </div>
    `,
  }),
}

// Generic email template for registration/verification emails sent via invoke()
const GENERIC_TEMPLATE = (subject: string, html: string) => ({ subject, html })

Deno.serve(async (req) => {
  try {
    const body = await req.json()

    // Handle direct invocation (from emailService.js for registration/verification emails)
    if (body.type === 'direct') {
      const { to, subject, html } = body
      if (!to || !subject || !html) {
        return new Response(JSON.stringify({ error: 'Missing to, subject, or html' }), { status: 400 })
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
      })

      const result = await res.json()
      if (!res.ok) {
        console.error('Resend error:', result)
        return new Response(JSON.stringify({ error: result }), { status: res.status })
      }

      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle webhook payload (from DB webhook on notifications table)
    const payload = body as WebhookPayload
    const record = payload.record

    if (!record?.user_id || !record?.type) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Create admin client to read user preferences
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch user email and notification preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, notification_preferences')
      .eq('id', record.user_id)
      .single()

    if (userError || !user?.email) {
      console.error('User not found:', userError)
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Check notification preferences
    const prefs = user.notification_preferences || {}
    // Default: email_notifications and application_updates are both true if not set
    const emailEnabled = prefs.email_notifications !== false
    const typeEnabled = record.type === 'application_status_change'
      ? prefs.application_updates !== false
      : true

    if (!emailEnabled || !typeEnabled) {
      console.log('Email notifications disabled for user:', record.user_id)
      return new Response(JSON.stringify({ skipped: true, reason: 'notifications_disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build email from template
    const templateFn = EMAIL_TEMPLATES[record.type]
    if (!templateFn) {
      console.log('No email template for notification type:', record.type)
      return new Response(JSON.stringify({ skipped: true, reason: 'no_template' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const email = templateFn(record.data || {}, record.title, record.message)

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject: email.subject,
        html: email.html,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(JSON.stringify({ error: result }), { status: res.status })
    }

    console.log('Email sent:', result.id, 'to', user.email)
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-notification-email/index.ts
git commit -m "feat: add Edge Function for sending notification emails via Resend"
```

- [ ] **Step 4: Deploy the Edge Function**

```bash
npx supabase functions deploy send-notification-email --project-ref YOUR_PROJECT_REF
```

Set the required secrets:

```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
npx supabase secrets set FROM_EMAIL="PESO Connect <noreply@yourdomain.com>"
npx supabase secrets set APP_URL=http://localhost:5173
```

Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in Edge Functions.

- [ ] **Step 5: Create Database Webhook in Supabase Dashboard**

Go to Supabase Dashboard > Database > Webhooks > Create Webhook:

1. **Name:** `send-notification-email`
2. **Table:** `notifications`
3. **Events:** `INSERT`
4. **Type:** Supabase Edge Function
5. **Function:** `send-notification-email`

This makes every notification insert automatically trigger the email function.

---

### Task 7: Migrate EmailService from EmailJS to Resend

**Files:**
- Rewrite: `src/services/emailService.js`
- Modify: `package.json` (remove @emailjs/browser)

- [ ] **Step 1: Rewrite emailService.js**

Replace the entire contents of `src/services/emailService.js` with:

```javascript
// Email Service for PESO Connect
// Sends emails via Supabase Edge Function (Resend on the backend)

import { supabase } from '../config/supabase'

const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === 'true'

/**
 * Send an email via the send-notification-email Edge Function.
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} html - email HTML body
 * @returns {Promise<boolean>} success
 */
const sendEmailViaEdgeFunction = async (to, subject, html) => {
    if (!EMAIL_ENABLED) {
        console.log('📧 Email notifications disabled. Would send:', subject, 'to', to)
        return false
    }

    try {
        const { data, error } = await supabase.functions.invoke('send-notification-email', {
            body: { type: 'direct', to, subject, html },
        })

        if (error) {
            console.error('❌ Edge function error:', error)
            return false
        }

        console.log('✅ Email sent:', subject, 'to', to)
        return true
    } catch (error) {
        console.error('❌ Error sending email:', error)
        return false
    }
}

// ── Template builders ────────────────────────────────────

const wrap = (content) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4F46E5; margin: 0;">PESO Connect</h1>
        <p style="color: #6B7280; margin: 5px 0 0 0;">San Carlos City</p>
    </div>
    <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; border: 1px solid #E5E7EB;">
        ${content}
    </div>
    <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">
        PESO Connect - San Carlos City Public Employment Service Office
    </p>
</div>
`

// ── Jobseeker emails ─────────────────────────────────────

export const sendJobseekerRegistrationEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'Welcome to PESO Connect - Registration Received',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Welcome to PESO Connect!</h2>
            <p>Dear ${data.full_name},</p>
            <p>Thank you for registering with PESO Connect San Carlos City.</p>
            <p>Your jobseeker account has been created and is currently <strong>pending verification</strong> by our PESO personnel.</p>
            <h3>What happens next?</h3>
            <ul>
                <li>Our PESO team will review your profile and documents</li>
                <li>You will receive an email notification once your account is verified</li>
                <li>After verification, you can start applying for jobs</li>
            </ul>
            <p>This process typically takes 1-3 business days.</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendJobseekerVerifiedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'Your PESO Connect Account Has Been Verified!',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Congratulations! Your Account is Verified</h2>
            <p>Dear ${data.full_name},</p>
            <p>Great news! Your PESO Connect account has been <strong>verified and activated</strong>.</p>
            <h3>You can now:</h3>
            <ul>
                <li>Browse all available job listings</li>
                <li>Submit job applications</li>
                <li>Update your profile and skills</li>
                <li>Track your application status</li>
            </ul>
            <p>We wish you success in your job search!</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendJobseekerRejectedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'PESO Connect Registration Update',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Registration Status Update</h2>
            <p>Dear ${data.full_name},</p>
            <p>We have reviewed your PESO Connect registration.</p>
            <p>Unfortunately, we were unable to approve your account at this time.</p>
            ${data.rejection_reason ? `
                <h3>Reason:</h3>
                <p style="background-color: #FEF3C7; padding: 10px; border-left: 4px solid #F59E0B; border-radius: 5px;">
                    ${data.rejection_reason}
                </p>
            ` : ''}
            <h3>Next Steps:</h3>
            <ul>
                <li>Please contact PESO San Carlos City for more information</li>
                <li>You may resubmit your registration after addressing the issues mentioned</li>
            </ul>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

// ── Employer emails ──────────────────────────────────────

export const sendEmployerRegistrationEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'PESO Connect - Employer Registration Received',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Welcome to PESO Connect</h2>
            <p>Dear ${data.representative_name},</p>
            <p>Thank you for registering <strong>${data.company_name}</strong> with PESO Connect.</p>
            <p>Your employer account is currently <strong>pending verification</strong> by PESO San Carlos City.</p>
            <h3>What happens next?</h3>
            <ul>
                <li>Our team will verify your business documents</li>
                <li>We will contact you if additional information is needed</li>
                <li>You will receive approval notification via email</li>
                <li>Once approved, you can post job openings</li>
            </ul>
            <p>Verification typically takes 2-5 business days.</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendEmployerApprovedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'Your PESO Connect Employer Account is Approved!',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Employer Account Approved!</h2>
            <p>Dear ${data.representative_name},</p>
            <p>Excellent news! Your employer account for <strong>${data.company_name}</strong> has been approved.</p>
            <h3>You can now:</h3>
            <ul>
                <li>Post unlimited job openings</li>
                <li>Review applications from verified jobseekers</li>
                <li>Manage your job listings</li>
                <li>Connect with qualified candidates</li>
            </ul>
            <p>Thank you for partnering with PESO San Carlos City!</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendEmployerRejectedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'PESO Connect Employer Registration Update',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Registration Status Update</h2>
            <p>Dear ${data.representative_name},</p>
            <p>We have reviewed the employer registration for <strong>${data.company_name}</strong>.</p>
            <p>Unfortunately, we were unable to approve your account at this time.</p>
            ${data.rejection_reason ? `
                <h3>Reason:</h3>
                <p style="background-color: #FEF3C7; padding: 10px; border-left: 4px solid #F59E0B; border-radius: 5px;">
                    ${data.rejection_reason}
                </p>
            ` : ''}
            <h3>Next Steps:</h3>
            <ul>
                <li>Please contact PESO San Carlos City for clarification</li>
                <li>Prepare any required additional documentation</li>
                <li>You may resubmit after addressing the concerns</li>
            </ul>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

// ── Legacy compatibility ─────────────────────────────────
// sendEmail is kept for any code that uses the generic interface
export const sendEmail = async (templateType, data) => {
    const handlers = {
        JOBSEEKER_REGISTRATION: sendJobseekerRegistrationEmail,
        JOBSEEKER_VERIFIED: sendJobseekerVerifiedEmail,
        JOBSEEKER_REJECTED: sendJobseekerRejectedEmail,
        EMPLOYER_REGISTRATION: sendEmployerRegistrationEmail,
        EMPLOYER_APPROVED: sendEmployerApprovedEmail,
        EMPLOYER_REJECTED: sendEmployerRejectedEmail,
    }
    const handler = handlers[templateType]
    if (!handler) {
        console.error('❌ Invalid email template type:', templateType)
        return false
    }
    return handler(data)
}

export default {
    sendEmail,
    sendJobseekerRegistrationEmail,
    sendJobseekerVerifiedEmail,
    sendJobseekerRejectedEmail,
    sendEmployerRegistrationEmail,
    sendEmployerApprovedEmail,
    sendEmployerRejectedEmail
}
```

- [ ] **Step 2: Remove @emailjs/browser from package.json**

```bash
npm uninstall @emailjs/browser
```

- [ ] **Step 3: Remove EmailJS env vars from .env**

Remove these lines from `.env`:
- `VITE_EMAILJS_SERVICE_ID=...`
- `VITE_EMAILJS_PUBLIC_KEY=...`

Keep `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` (still used by the new service).

- [ ] **Step 4: Update .env.example**

Remove EmailJS vars and add note about Resend:

```
# Email (Resend - configured as Supabase Edge Function secret)
# Set RESEND_API_KEY via: npx supabase secrets set RESEND_API_KEY=re_xxxxx
VITE_EMAIL_NOTIFICATIONS_ENABLED=true
```

- [ ] **Step 5: Commit**

```bash
git add src/services/emailService.js package.json package-lock.json .env.example
git commit -m "feat: migrate email service from EmailJS to Resend via Edge Function"
```

---

## Chunk 5: Manual Testing

### Task 8: Manual Testing Checklist

- [ ] **Step 1: Verify notifications table exists**

Go to Supabase Dashboard > Table Editor. Confirm `notifications` table is listed with correct columns.

- [ ] **Step 2: Verify Realtime is enabled**

Go to Supabase Dashboard > Database > Replication. Confirm `notifications` is in the `supabase_realtime` publication.

- [ ] **Step 3: Test in-app notification flow**

1. Open two browser windows (or incognito)
2. Log in as employer in window 1 (e.g., `techsolutions.hr@test.com` / `Test1234!`)
3. Log in as jobseeker in window 2 (e.g., `maria.santos@test.com` / `Test1234!`)
4. In window 1, go to My Listings > View Applicants for a job
5. Click "Shortlist" on the jobseeker's application
6. In window 2, the bell icon should show a red badge with "1"
7. Click the bell — dropdown should show "You've been shortlisted for {job title}"
8. Click the notification — should navigate to My Applications and mark as read
9. Badge should disappear

- [ ] **Step 4: Test notification preferences**

1. As the jobseeker, go to Settings
2. Turn off "Application Updates" toggle
3. Have the employer change status again (e.g., Hired)
4. The in-app notification should still appear (preferences only affect email)
5. Check Edge Function logs — should see "notifications_disabled" skip

- [ ] **Step 5: Test Mark All as Read**

1. Generate multiple notifications (change status on several applications)
2. Click bell — see multiple notifications
3. Click "Mark all as read" — all should lose bold styling, badge should show 0

- [ ] **Step 6: Test email sending (if Resend configured)**

1. Ensure RESEND_API_KEY is set in Edge Function secrets
2. Have employer shortlist a jobseeker
3. Check jobseeker's email inbox for the notification email
4. Verify email content matches the template

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during notification testing"
```
