# Delete User — Design Spec

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

Super-admins and sub-admins with the `delete_users` permission can permanently delete any non-super-admin user account from the platform. Every deletion is recorded in an immutable audit log with a full snapshot of the deleted user.

---

## Permission Model Changes

`delete_users` is removed from `SUPER_ADMIN_ONLY_PERMISSIONS`. It becomes a delegatable permission that can be granted to sub-admins (e.g. the Moderator role template).

**Files to update:**
- `src/utils/adminPermissions.js` — remove `delete_users` from `SUPER_ADMIN_ONLY_PERMISSIONS`
- `supabase/functions/invite-admin/index.ts` — add `delete_users` to `ALL_DELEGATABLE_PERMISSIONS`
- `src/components/admin/InviteAdminModal.jsx` — restore `delete_users` to the moderator template with description: `"Views all users and can remove accounts."`

---

## Database

### New table: `admin_audit_log`

```sql
create table public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  actor_id    uuid references public.users(id) on delete set null,
  actor_email text not null,
  target_id   uuid,
  snapshot    jsonb not null,
  created_at  timestamptz default now()
);

alter table public.admin_audit_log enable row level security;

create policy "super-admins can read audit log"
  on public.admin_audit_log for select
  using (
    exists (
      select 1 from public.admin_access
      where user_id = auth.uid() and admin_level = 'admin'
    )
  );
```

**Columns:**
- `actor_id` — FK to `public.users`, set null on delete (actor may later be removed)
- `actor_email` — copied at deletion time; preserved even if actor account is later deleted
- `target_id` — plain uuid, no FK (target is gone by the time the row is inserted)
- `snapshot` — JSONB with: `name`, `email`, `role`, `subtype`, `is_verified`, `created_at` of the deleted user

Migration file: `sql/add_admin_audit_log.sql`

---

## Edge Function: `delete-user`

**File:** `supabase/functions/delete-user/index.ts`

**Request body:** `{ target_id: string }`

### Execution sequence

1. Parse & validate — `target_id` must be present and a valid UUID
2. Verify caller — extract JWT, resolve to caller user via `adminClient.auth.getUser()`, then check `admin_access`: caller must be `admin_level = 'admin'` (super-admin) OR `admin_level = 'sub-admin'` with `delete_users` in `permissions[]`; otherwise 403
3. Fetch target — load target row from `public.users` (name, email, role, subtype, is_verified, created_at); 404 if not found
4. Guard: super-admin protection — check `admin_access` for target; if `admin_level = 'admin'`, reject with 403
5. Guard: self-deletion — reject if `target_id === caller_id` with 403
6. Build snapshot — construct JSONB from target data
7. Delete role profile — delete from `jobseeker_profiles`, `employer_profiles`, or `individual_profiles` based on target role
8. Delete `public.users` row
9. Delete auth account — `auth.admin.deleteUser(target_id)`
10. Insert audit log — write to `admin_audit_log` with `actor_id`, `actor_email`, `target_id`, `snapshot`, `action = 'delete_user'`
11. Return `{ ok: true }`

**On audit log failure (step 10):** Log full deletion details (actor email, target email, timestamp) to Edge Function console. Do not block or roll back — the user is already deleted. The console log serves as a fallback recovery source.

**CORS:** Same pattern as `invite-admin` — wildcard origin, POST + OPTIONS.

---

## UI Changes

### `UserManagementSection.jsx`

**Delete button:**
- Rendered as a red trash icon at the end of each table row
- Only shown when `hasPermission('delete_users')` is true (passed as prop from Dashboard)
- Hidden on rows where:
  - The target is a super-admin (`admin_level = 'admin'` in their access record)
  - The target is the currently logged-in admin (`target.id === currentUser.id`)

**Data requirements:**
- `UserManagementSection` needs `adminAccess` rows passed alongside `allUsers` so it can identify super-admin rows
- `currentUser.id` passed as prop (or pulled from `useAuth`)

**Confirmation modal (inline component):**
- Triggered on trash icon click
- Displays: user's name, email, role badge
- Warning copy: "This action is permanent and cannot be undone."
- Buttons: Cancel (neutral) + "Delete User" (red, destructive styling)
- Loading state on "Delete User" while Edge Function call is in flight

**Post-deletion (optimistic update):**
- On success, remove the deleted user from local `allUsers` state immediately — no full refetch required
- Show a brief success toast

**On error:**
- Display the error message from the Edge Function response inside the modal (do not close it)

---

## What Is Not In Scope

- A dashboard UI for viewing the audit log (can be added as a follow-up)
- Bulk deletion
- Restoring deleted users
