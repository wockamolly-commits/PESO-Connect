# Status Change Notifications — Design Spec

**Date:** 2026-03-10
**Enhancement:** #2 of 9 (Job Application Flow Improvements)

## Goal

Notify jobseekers when an employer changes their application status (Shortlisted, Hired, Rejected) via in-app notifications and email.

## Architecture

```
Employer changes status → updates applications table
                        → inserts row into notifications table
                              ↓
                    DB webhook fires on insert
                              ↓
                    Supabase Edge Function (send-notification-email)
                        → checks user's notification_preferences
                        → sends email via Resend API (if application_updates enabled)

Meanwhile:
Jobseeker's navbar ← Realtime subscription on notifications table
                   ← bell badge updates instantly
```

### Key Decisions

- **Notification channels:** Both in-app + email
- **Triggers:** Shortlisted, Hired, Rejected only (not "Reviewed" — low signal)
- **Database:** General-purpose `notifications` table (reusable for future notification types)
- **Email provider:** Resend (replacing EmailJS). Server-side only via Supabase Edge Function.
- **Email trigger:** DB webhook on `notifications` insert → Edge Function → Resend. Client never touches email logic directly.
- **UI:** Bell icon in navbar with unread badge + dropdown list

## Database Schema

```sql
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;
```

RLS policies:
- SELECT: users read own notifications (`user_id = auth.uid()`)
- UPDATE: users update own notifications (`user_id = auth.uid()`)
- INSERT: authenticated users can insert (employer inserts notification for jobseeker)

Realtime: enabled on `notifications` table for INSERT events.

## Components

### 1. `notifications` table + RLS + Realtime
General-purpose table. `type` field distinguishes notification kinds. `data` jsonb stores context (application_id, job_title, status, employer_name).

### 2. Supabase Edge Function: `send-notification-email`
- Triggered by DB webhook on `notifications` INSERT
- Looks up user's `notification_preferences` from `users` table
- If `application_updates` is enabled (or preferences not set — default to enabled), sends email via Resend
- Resend API key stored as Edge Function secret
- Handles all notification types (switch on `type` field)

### 3. `src/services/notificationService.js`
Client-side service:
- `insertNotification(userId, type, title, message, data)` — insert into notifications table
- `subscribeToNotifications(userId, callback)` — Supabase Realtime subscription for new notifications
- `getUnreadCount(userId)` — count of unread notifications
- `getNotifications(userId, limit)` — fetch recent notifications
- `markAsRead(notificationId)` — set is_read = true
- `markAllAsRead(userId)` — bulk update

### 4. `src/components/common/NotificationBell.jsx`
- Bell icon (from lucide-react) in navbar
- Red badge with unread count
- Click opens dropdown with last 10 notifications
- Each item: status icon + title + relative time + read/unread styling
- Click item → mark as read → navigate to `/my-applications`
- "Mark all as read" link at bottom
- Subscribes to Realtime on mount, unsubscribes on unmount

### 5. Modify `src/pages/employer/JobApplicants.jsx`
After successful status update to Shortlisted/Hired/Rejected:
- Call `insertNotification()` with jobseeker's user_id, type, title, message, and data containing application_id, job_title, status, employer_name

### 6. Email Migration (EmailJS → Resend)
- Remove `@emailjs/browser` from package.json
- Rewrite `src/services/emailService.js` to use `supabase.functions.invoke('send-notification-email', ...)` for existing registration/verification emails
- All email sending moves server-side to the Edge Function
- Remove EmailJS env vars from .env

## Email Content

| Status | Subject | Body |
|--------|---------|------|
| Shortlisted | "You've been shortlisted for {job_title}" | "{employer_name} has shortlisted your application for {job_title}. Log in to view details." |
| Hired | "Congratulations! You've been hired for {job_title}" | "{employer_name} has accepted your application for {job_title}!" |
| Rejected | "Update on your application for {job_title}" | "Unfortunately, your application for {job_title} was not selected at this time. Keep applying!" |

## Notification Bell Behavior

- Visible to all logged-in users in navbar
- Unread count badge: red circle with number (hidden when 0)
- Dropdown: max 10 recent notifications, sorted newest first
- Unread items: slightly highlighted background
- Click item: mark as read + navigate to relevant page
- "Mark all as read" at dropdown bottom
- Empty state: "No notifications yet"
