# Admin Notifications Implementation Plan

## Goal Description

Build a dedicated, enterprise-level admin notification system for the PESO Connect admin dashboard that delivers real-time operational alerts, supports actionable routing, and helps administrators respond faster to verification queues, moderation events, and platform issues.

### Business value

- Reduces response time for employer and jobseeker verification workflows.
- Gives admins a single, always-available alert surface inside the dashboard.
- Improves operational awareness through categorized, prioritized notifications.
- Prevents missed work items by combining persistent in-app notifications with real-time toasts.
- Scales better than ad hoc polling because Supabase Realtime pushes updates instantly.

## Current-State Notes

- The project already has a general-purpose `public.notifications` table for end-user notifications in [sql/create_notifications_table.sql](/C:/Users/Steven/Desktop/PESO-Connect/sql/create_notifications_table.sql).
- The app also already uses:
  - a notification bell component at [src/components/common/NotificationBell.jsx](/C:/Users/Steven/Desktop/PESO-Connect/src/components/common/NotificationBell.jsx)
  - a notification service at [src/services/notificationService.js](/C:/Users/Steven/Desktop/PESO-Connect/src/services/notificationService.js)
- Admin UI currently lives inside [src/pages/admin/Dashboard.jsx](/C:/Users/Steven/Desktop/PESO-Connect/src/pages/admin/Dashboard.jsx) with [src/components/admin/AdminSidebar.jsx](/C:/Users/Steven/Desktop/PESO-Connect/src/components/admin/AdminSidebar.jsx), but there is no dedicated admin notification center yet.

## Recommended Architecture

- Create a separate `public.admin_notifications` table instead of reusing the end-user `notifications` table.
- Target notifications to either:
  - all eligible admins
  - a specific admin user
- Use database triggers and helper SQL functions to create notifications automatically when key admin-relevant events occur.
- Use a dedicated React hook, `useAdminNotifications`, to manage fetch, unread counts, realtime subscriptions, mark-as-read behavior, and toast creation.
- Render a dashboard-specific notification bell in the admin header/topbar area rather than reusing the end-user navbar bell unchanged.

## Notification Model

### Notification categories

- `user_verification_pending`
- `job_posting_approval`
- `system_alert`
- `user_report`
- `application_flagged`
- `admin_account_event`

### Priority levels

- `low`
- `medium`
- `high`
- `critical`

### Core behavior

- Every notification must include a clickable `reference_link`.
- Notifications support `read`, `unread`, and `mark all as read`.
- Unread count appears as a badge on the admin notification bell.
- A small in-app toast appears when a new notification arrives while the admin dashboard is open and active.

## Database Schema Updates

### Exact SQL

Create a new SQL file such as `sql/create_admin_notifications_table.sql` with the following:

```sql
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_admin_id uuid references public.users(id) on delete cascade,
  type text not null check (
    type in (
      'user_verification_pending',
      'job_posting_approval',
      'system_alert',
      'user_report',
      'application_flagged',
      'admin_account_event'
    )
  ),
  priority text not null default 'medium' check (
    priority in ('low', 'medium', 'high', 'critical')
  ),
  title text not null,
  message text not null,
  reference_link text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_notifications_recipient_created
  on public.admin_notifications(recipient_admin_id, created_at desc);

create index if not exists idx_admin_notifications_unread
  on public.admin_notifications(recipient_admin_id, is_read)
  where is_read = false;

create index if not exists idx_admin_notifications_type_created
  on public.admin_notifications(type, created_at desc);

alter table public.admin_notifications enable row level security;

create policy "Admins can read own admin notifications"
on public.admin_notifications
for select
to authenticated
using (
  recipient_admin_id = auth.uid()
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
);

create policy "Admins can update own admin notifications"
on public.admin_notifications
for update
to authenticated
using (
  recipient_admin_id = auth.uid()
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
)
with check (
  recipient_admin_id = auth.uid()
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
);

create policy "System can insert admin notifications"
on public.admin_notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  )
);

alter publication supabase_realtime add table public.admin_notifications;
```

### Optional but recommended SQL helper

Add an `updated_at` trigger for consistency with the rest of the schema:

```sql
create or replace function public.set_admin_notifications_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_admin_notifications_updated_at on public.admin_notifications;

create trigger trg_set_admin_notifications_updated_at
before update on public.admin_notifications
for each row
execute function public.set_admin_notifications_updated_at();
```

## Proposed Changes By Component

## Backend/Supabase

### 1. New table

- Add `public.admin_notifications`.
- Keep it separate from `public.notifications` to avoid mixing admin workflows with end-user messaging.

### 2. SQL helper functions

Create helper functions to reduce trigger duplication:

- `public.create_admin_notification(...)`
- `public.create_admin_notification_for_all_admins(...)`

Recommended behavior:

- One helper inserts a single row for a specific admin.
- One helper fans out a notification to all active admin users.
- Helpers should accept `type`, `priority`, `title`, `message`, `reference_link`, and `metadata`.

### 3. Automatic notification triggers

Create database triggers for key events:

- New employer registration
  - Trigger when a new employer profile is created or when `employer_status = 'pending'`.
  - Create a `user_verification_pending` notification linking to the employer verification section.
- New jobseeker registration requiring verification
  - Trigger when a jobseeker profile enters pending verification.
  - Create a `user_verification_pending` notification linking to the jobseeker verification section.
- Optional future triggers
  - reported users
  - reported jobs
  - system-level failures or scheduled-task alerts

### 4. Preferred trigger strategy

- Keep triggers focused on clear state transitions.
- Avoid generating duplicate notifications on every profile update.
- Use transition-aware conditions such as:
  - only notify when status changes into `pending`
  - only notify on first insert if the inserted row is pending

### 5. Realtime subscriptions

- Use Supabase Realtime on `public.admin_notifications`.
- Subscribe by `recipient_admin_id = auth.uid()` in the admin client.
- Listen to both:
  - `INSERT` for new notifications
  - `UPDATE` for read-state synchronization

## Frontend UI

### 1. Admin topbar/header

Add a dedicated admin topbar/header component if one does not already exist. This should sit within the admin layout rather than the public navbar.

Responsibilities:

- notification bell icon
- unread badge counter
- current admin identity summary
- optional quick action controls

Suggested file:

- `src/components/admin/AdminTopbar.jsx`

### 2. Notification Bell

Create an admin-specific bell component rather than extending the public one too aggressively.

Suggested file:

- `src/components/admin/AdminNotificationBell.jsx`

Responsibilities:

- toggle dropdown
- show unread badge
- display category/priority-aware styling
- show loading and empty states
- handle notification click and routing
- support mark all as read

### 3. Notification Dropdown List

Suggested file:

- `src/components/admin/AdminNotificationDropdown.jsx`

Responsibilities:

- grouped list rendering
- category iconography
- priority color treatment
- read/unread visual distinction
- clickable row navigation using `reference_link`

### 4. Toast Provider

Add a global toast layer for admin pages.

Suggested implementation:

- if a toast library already exists, reuse it
- if none exists, add a lightweight provider and keep the dependency minimal

Suggested options:

- `sonner`
- `react-hot-toast`

Preferred choice:

- `sonner` for a compact API and clean admin toast UX

### 5. Route behavior

When a notification is clicked:

- mark it as read first
- navigate using `reference_link`
- preserve admin context where appropriate, such as routing to `/admin?section=employers&userId=<id>`

## State & Hooks

### `useAdminNotifications`

Create:

- `src/hooks/useAdminNotifications.js`

Responsibilities:

- fetch initial notifications
- fetch unread count
- subscribe to realtime changes
- prepend new notifications to local state
- expose `markAsRead`
- expose `markAllAsRead`
- expose `refresh`
- trigger toast on new inserts while the admin dashboard is active

Suggested API:

```js
const {
  notifications,
  unreadCount,
  loading,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  refreshNotifications,
} = useAdminNotifications()
```

### Supporting service layer

Create:

- `src/services/adminNotificationService.js`

Responsibilities:

- Supabase CRUD helpers
- realtime subscription helpers
- keep SQL table access isolated from UI components

Recommended methods:

- `getAdminNotifications(adminId, limit)`
- `getAdminUnreadCount(adminId)`
- `markAdminNotificationAsRead(notificationId, adminId)`
- `markAllAdminNotificationsAsRead(adminId)`
- `subscribeToAdminNotifications(adminId, handlers)`

## Proposed File-Level Changes

### SQL

- `sql/create_admin_notifications_table.sql`
- `sql/create_admin_notification_functions.sql`
- `sql/create_admin_notification_triggers.sql`

### Frontend

- `src/components/admin/AdminTopbar.jsx`
- `src/components/admin/AdminNotificationBell.jsx`
- `src/components/admin/AdminNotificationDropdown.jsx`
- `src/hooks/useAdminNotifications.js`
- `src/services/adminNotificationService.js`
- `src/pages/admin/Dashboard.jsx`
- `src/components/admin/index.js`

### Optional provider

- `src/main.jsx`
- `src/App.jsx`

Only needed if the toast provider is mounted globally there.

## Step-by-Step Execution Plan

### Phase 1: Database foundation

1. Create `public.admin_notifications`.
2. Add indexes, RLS, and Realtime publication.
3. Add `updated_at` trigger.

### Phase 2: Notification creation helpers

1. Create SQL helper function for single-recipient notifications.
2. Create SQL helper function for fan-out notifications to all admins.
3. Add deduplication logic where appropriate for repeated events.

### Phase 3: Business-event triggers

1. Add trigger for employer verification pending events.
2. Add trigger for jobseeker verification pending events.
3. Validate trigger behavior against current profile creation and approval flows.

### Phase 4: Frontend service and hook

1. Create `adminNotificationService.js`.
2. Create `useAdminNotifications.js`.
3. Implement initial fetch, unread counts, read actions, and realtime subscription.
4. Add toast-on-insert behavior for active admin sessions.

### Phase 5: UI integration

1. Create admin topbar/header if needed.
2. Add admin bell and dropdown components.
3. Integrate unread badge and mark-all-as-read action.
4. Add notification click routing using `reference_link`.

### Phase 6: Dashboard integration

1. Mount the topbar in `src/pages/admin/Dashboard.jsx`.
2. Ensure bell and dropdown are visible across admin sections.
3. Sync section navigation so notification links can open the correct module directly.

### Phase 7: Hardening and polish

1. Add category icons and priority styling.
2. Add empty, loading, and error states.
3. Verify accessibility:
   - focus handling
   - aria labels
   - keyboard navigation

## Verification Plan

### Manual verification

1. Create a new employer registration.
   - Confirm an admin notification row is created.
   - Confirm the bell badge increments immediately without refresh.
   - Confirm a toast appears while the admin dashboard is open.
2. Click the notification.
   - Confirm it is marked as read.
   - Confirm routing lands on the correct admin module.
3. Create a jobseeker pending verification event.
   - Confirm the correct category and priority render.
4. Use "Mark all as read".
   - Confirm badge count resets to zero.
   - Confirm rows visually change from unread to read.
5. Open two admin sessions.
   - Confirm read/unread changes synchronize via Realtime.

### Automated verification

#### Frontend tests

- Hook tests for `useAdminNotifications`
  - initial fetch
  - realtime insert handling
  - mark-as-read state updates
  - mark-all-as-read state updates
- Component tests for:
  - bell badge rendering
  - dropdown open/close
  - toast trigger on new notification
  - click routing behavior

#### SQL verification

Run SQL checks in Supabase:

```sql
select * from public.admin_notifications order by created_at desc limit 20;

select recipient_admin_id, count(*) filter (where is_read = false) as unread_count
from public.admin_notifications
group by recipient_admin_id;
```

#### RLS verification

- Confirm admins can only read their own notification rows.
- Confirm non-admin authenticated users cannot read from `admin_notifications`.
- Confirm update policies only allow marking the recipient's notifications as read.

## Best-Practice Notes

- Prefer a dedicated admin notification table over overloading the user-facing `notifications` table.
- Keep trigger logic transition-aware to avoid duplicate alert spam.
- Keep notification rendering logic out of the page component by centralizing it in a hook and service layer.
- Use `reference_link` as the canonical routing target so notifications stay actionable and decoupled from the dropdown UI.
- Treat toast notifications as supplemental, not as the source of truth. Persistent rows in `admin_notifications` remain authoritative.
