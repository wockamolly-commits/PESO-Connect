# Delete User Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow super-admins and sub-admins with the `delete_users` permission to permanently delete non-super-admin users, with every deletion recorded in an audit log.

**Architecture:** A `delete-user` Supabase Edge Function handles all server-side work — auth verification, permission check, deletion ordering, and audit logging. The UI adds a delete button + confirmation modal to `UserManagementSection`, with an optimistic update removing the row immediately on success. A new `admin_audit_log` DB table stores a JSONB snapshot of each deleted user alongside the actor's email so the record survives even if the actor is later deleted.

**Tech Stack:** React 18, Supabase JS client, Supabase Edge Functions (Deno/TypeScript), Tailwind CSS, `sonner` (toast), `lucide-react` (icons), Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/utils/adminPermissions.js` | Modify | Remove `delete_users` from `SUPER_ADMIN_ONLY_PERMISSIONS` |
| `src/utils/adminPermissions.test.js` | Modify | Update tests for new permission model |
| `src/components/admin/InviteAdminModal.jsx` | Modify | Restore `delete_users` to moderator template |
| `supabase/functions/invite-admin/index.ts` | Modify | Add `delete_users` to `ALL_DELEGATABLE_PERMISSIONS` |
| `sql/add_admin_audit_log.sql` | Create | Migration for `admin_audit_log` table + RLS |
| `supabase/functions/delete-user/index.ts` | Create | Edge Function — auth, guards, delete, audit |
| `src/components/admin/DeleteUserModal.jsx` | Create | Confirmation modal component |
| `src/components/admin/index.js` | Modify | Export `DeleteUserModal` |
| `src/components/admin/UserManagementSection.jsx` | Modify | Add delete button per row + wire modal |
| `src/pages/admin/Dashboard.jsx` | Modify | Fetch admin_access rows, pass delete props, handle optimistic removal |

---

## Task 1: Update Permission Model

**Files:**
- Modify: `src/utils/adminPermissions.js`
- Modify: `src/utils/adminPermissions.test.js`
- Modify: `src/components/admin/InviteAdminModal.jsx`
- Modify: `supabase/functions/invite-admin/index.ts`

- [ ] **Step 1: Remove `delete_users` from `SUPER_ADMIN_ONLY_PERMISSIONS`**

In `src/utils/adminPermissions.js`, change:
```js
export const SUPER_ADMIN_ONLY_PERMISSIONS = [
    'manage_admins',
    'manage_system_settings',
    'delete_users',
]
```
to:
```js
export const SUPER_ADMIN_ONLY_PERMISSIONS = [
    'manage_admins',
    'manage_system_settings',
]
```

- [ ] **Step 2: Restore moderator template in `InviteAdminModal.jsx`**

In `src/components/admin/InviteAdminModal.jsx`, change the moderator entry:
```js
    {
        id: 'moderator',
        label: 'Moderator',
        description: 'Views all users across all roles.',
        permissions: ['view_overview', 'view_users'],
    },
```
to:
```js
    {
        id: 'moderator',
        label: 'Moderator',
        description: 'Views all users and can remove accounts.',
        permissions: ['view_overview', 'view_users', 'delete_users'],
    },
```

- [ ] **Step 3: Add `delete_users` to `ALL_DELEGATABLE_PERMISSIONS` in the Edge Function**

In `supabase/functions/invite-admin/index.ts`, change:
```ts
const ALL_DELEGATABLE_PERMISSIONS = [
  'view_overview', 'view_employers', 'approve_employers', 'reject_employers',
  'view_jobseekers', 'approve_jobseekers', 'reject_jobseekers', 'view_users',
  'export_jobseekers', 'reverify_profiles', 'reverify_jobseeker_profiles',
  'reverify_employer_profiles', 'view_skill_insights',
]
```
to:
```ts
const ALL_DELEGATABLE_PERMISSIONS = [
  'view_overview', 'view_employers', 'approve_employers', 'reject_employers',
  'view_jobseekers', 'approve_jobseekers', 'reject_jobseekers', 'view_users',
  'export_jobseekers', 'reverify_profiles', 'reverify_jobseeker_profiles',
  'reverify_employer_profiles', 'view_skill_insights', 'delete_users',
]
```

- [ ] **Step 4: Update tests for the new permission model**

In `src/utils/adminPermissions.test.js`, inside `describe('hasAdminPermission', ...)`:

1. Find the existing test:
```js
it('sub-admin fails for permissions not in their list', () => {
    expect(hasAdminPermission(subAdminApproveEmployers, 'approve_jobseekers')).toBe(false)
    expect(hasAdminPermission(subAdminApproveEmployers, 'manage_admins')).toBe(false)
})
```
Add a new test after it:
```js
it('sub-admin with delete_users in their list can exercise it', () => {
    const row = { admin_level: 'sub-admin', permissions: ['view_users', 'delete_users'] }
    expect(hasAdminPermission(row, 'delete_users')).toBe(true)
})

it('sub-admin without delete_users in their list is denied', () => {
    const row = { admin_level: 'sub-admin', permissions: ['view_users'] }
    expect(hasAdminPermission(row, 'delete_users')).toBe(false)
})
```

2. Add at the end of `describe('hasAdminPermission', ...)`:
```js
it('delete_users is NOT in SUPER_ADMIN_ONLY_PERMISSIONS', () => {
    expect(SUPER_ADMIN_ONLY_PERMISSIONS).not.toContain('delete_users')
})
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/utils/adminPermissions.test.js
```

Expected: all tests pass (30 tests, up from 28).

- [ ] **Step 6: Commit**

```bash
git add src/utils/adminPermissions.js src/utils/adminPermissions.test.js src/components/admin/InviteAdminModal.jsx supabase/functions/invite-admin/index.ts
git commit -m "feat: make delete_users a delegatable permission"
```

---

## Task 2: DB Migration

**Files:**
- Create: `sql/add_admin_audit_log.sql`

- [ ] **Step 1: Create migration file**

Create `sql/add_admin_audit_log.sql` with this content:
```sql
-- admin_audit_log: immutable record of admin actions (currently: user deletion).
-- All writes go through the service-role Edge Function — no client insert policy needed.

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  actor_id    uuid references public.users(id) on delete set null,
  actor_email text not null,
  target_id   uuid,
  snapshot    jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

create policy "super-admins can read audit log"
  on public.admin_audit_log
  for select
  using (
    exists (
      select 1 from public.admin_access
      where user_id = auth.uid() and admin_level = 'admin'
    )
  );
```

- [ ] **Step 2: Apply migration in Supabase**

Run the SQL in the Supabase dashboard SQL editor (or via CLI):
```bash
supabase db push
```
Or paste the contents of `sql/add_admin_audit_log.sql` directly into the Supabase SQL editor and execute.

- [ ] **Step 3: Verify table exists**

In the Supabase dashboard, confirm `admin_audit_log` appears in the Table Editor with columns: `id`, `action`, `actor_id`, `actor_email`, `target_id`, `snapshot`, `created_at`.

- [ ] **Step 4: Commit**

```bash
git add sql/add_admin_audit_log.sql
git commit -m "feat: add admin_audit_log migration"
```

---

## Task 3: Edge Function `delete-user`

**Files:**
- Create: `supabase/functions/delete-user/index.ts`

- [ ] **Step 1: Create the Edge Function file**

Create `supabase/functions/delete-user/index.ts`:
```ts
// delete-user — permanently removes a user account (super-admin or sub-admin with delete_users).
//
// Request body:
//   target_id  string  — UUID of the user to delete
//
// Sequence:
//   1. Validate target_id
//   2. Verify caller JWT → super-admin OR sub-admin with delete_users permission
//   3. Fetch target from public.users
//   4. Guard: block if target is a super-admin
//   5. Guard: block self-deletion
//   6. Delete role profile row
//   7. Delete public.users row
//   8. Delete auth.users row
//   9. Insert audit log record

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { ...corsHeaders, ...(init.headers ?? {}) } })
const handleCorsPreflightRequest = () => new Response('ok', { headers: corsHeaders })

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ROLE_PROFILE_TABLE: Record<string, string> = {
  jobseeker: 'jobseeker_profiles',
  employer: 'employer_profiles',
  individual: 'individual_profiles',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()

  try {
    // ----------------------------------------------------------------
    // Parse & validate body
    // ----------------------------------------------------------------
    const { target_id } = await req.json() as { target_id: string }

    if (!target_id || typeof target_id !== 'string') {
      return jsonResponse({ error: 'Missing required field: target_id.' }, { status: 400 })
    }
    if (!UUID_REGEX.test(target_id)) {
      return jsonResponse({ error: 'Invalid target_id format.' }, { status: 400 })
    }

    // ----------------------------------------------------------------
    // Verify caller identity and permission
    // ----------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerToken = authHeader.replace(/^Bearer\s+/i, '')
    if (!callerToken) {
      return jsonResponse({ error: 'Missing authorization token.' }, { status: 401 })
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: callerUser }, error: callerError } = await adminClient.auth.getUser(callerToken)
    if (callerError || !callerUser) {
      return jsonResponse({ error: 'Could not verify caller identity.' }, { status: 401 })
    }

    const { data: callerAccess, error: accessError } = await adminClient
      .from('admin_access')
      .select('admin_level, permissions')
      .eq('user_id', callerUser.id)
      .maybeSingle()

    if (accessError) {
      console.error('[delete-user] admin_access lookup failed:', accessError)
      return jsonResponse({ error: 'Permission check failed.' }, { status: 500 })
    }

    const isSuperAdmin = callerAccess?.admin_level === 'admin'
    const isSubAdminWithDeletePermission =
      callerAccess?.admin_level === 'sub-admin' &&
      Array.isArray(callerAccess?.permissions) &&
      callerAccess.permissions.includes('delete_users')

    if (!isSuperAdmin && !isSubAdminWithDeletePermission) {
      return jsonResponse({ error: 'You do not have permission to delete users.' }, { status: 403 })
    }

    // ----------------------------------------------------------------
    // Self-deletion guard
    // ----------------------------------------------------------------
    if (target_id === callerUser.id) {
      return jsonResponse({ error: 'You cannot delete your own account.' }, { status: 403 })
    }

    // ----------------------------------------------------------------
    // Fetch target user
    // ----------------------------------------------------------------
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, name, email, role, subtype, is_verified, created_at')
      .eq('id', target_id)
      .maybeSingle()

    if (targetError || !targetUser) {
      return jsonResponse({ error: 'User not found.' }, { status: 404 })
    }

    // ----------------------------------------------------------------
    // Super-admin protection guard
    // ----------------------------------------------------------------
    if (targetUser.role === 'admin') {
      const { data: targetAccess } = await adminClient
        .from('admin_access')
        .select('admin_level')
        .eq('user_id', target_id)
        .maybeSingle()

      if (targetAccess?.admin_level === 'admin') {
        return jsonResponse({ error: 'Super-admin accounts cannot be deleted.' }, { status: 403 })
      }
    }

    // ----------------------------------------------------------------
    // Build snapshot before any deletion
    // ----------------------------------------------------------------
    const snapshot = {
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      subtype: targetUser.subtype,
      is_verified: targetUser.is_verified,
      created_at: targetUser.created_at,
    }

    // ----------------------------------------------------------------
    // Delete role profile → public.users → auth.users
    // ----------------------------------------------------------------
    const profileTable = ROLE_PROFILE_TABLE[targetUser.role] ?? null
    if (profileTable) {
      const { error: profileError } = await adminClient
        .from(profileTable)
        .delete()
        .eq('id', target_id)
      if (profileError) {
        console.error('[delete-user] profile delete failed:', profileError)
      }
    }

    await adminClient.from('users').delete().eq('id', target_id)

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target_id)
    if (authDeleteError) {
      console.error('[delete-user] auth.admin.deleteUser failed:', authDeleteError)
      return jsonResponse({ error: 'Failed to delete user account.' }, { status: 500 })
    }

    // ----------------------------------------------------------------
    // Insert audit log
    // ----------------------------------------------------------------
    const { error: auditError } = await adminClient.from('admin_audit_log').insert({
      action: 'delete_user',
      actor_id: callerUser.id,
      actor_email: callerUser.email,
      target_id,
      snapshot,
    })

    if (auditError) {
      // User is already deleted — log to console for manual recovery.
      console.error('[delete-user] audit log insert failed:', auditError, JSON.stringify({
        actor: callerUser.email,
        target: targetUser.email,
        timestamp: new Date().toISOString(),
      }))
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    console.error('[delete-user] unexpected error:', err)
    return jsonResponse({ error: 'Internal server error.' }, { status: 500 })
  }
})
```

- [ ] **Step 2: Deploy the Edge Function**

```bash
supabase functions deploy delete-user
```

Expected output: `Deployed Edge Function delete-user`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/delete-user/index.ts
git commit -m "feat: add delete-user Edge Function with audit log"
```

---

## Task 4: `DeleteUserModal` Component

**Files:**
- Create: `src/components/admin/DeleteUserModal.jsx`
- Modify: `src/components/admin/index.js`

- [ ] **Step 1: Create the component**

Create `src/components/admin/DeleteUserModal.jsx`:
```jsx
import { createPortal } from 'react-dom'
import { useState } from 'react'
import { supabase } from '../../config/supabase'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'

const DeleteUserModal = ({ user, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleDelete = async () => {
        setError('')
        setLoading(true)
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.refreshSession()
            if (sessionError || !session?.access_token) {
                throw new Error('Your session has expired. Please log in again.')
            }

            const res = await supabase.functions.invoke('delete-user', {
                body: { target_id: user.id },
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (res.error) {
                let message = 'Delete failed.'
                try {
                    const errBody = await res.error.context?.json?.()
                    if (errBody?.error) message = errBody.error
                    else message = res.error.message || message
                } catch {
                    message = res.error.message || message
                }
                throw new Error(message)
            }

            if (res.data?.error) throw new Error(res.data.error)
            onSuccess(user.id)
        } catch (err) {
            setError(err.message || 'Failed to delete user.')
        } finally {
            setLoading(false)
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-white">Delete User</h2>
                            <p className="text-xs text-slate-500">This action cannot be undone</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
                        <p className="text-sm font-medium text-slate-200">{user.name || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                        <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                            user.role === 'employer'
                                ? 'bg-violet-500/15 text-violet-400'
                                : user.role === 'admin'
                                    ? 'bg-indigo-500/15 text-indigo-400'
                                    : 'bg-blue-500/15 text-blue-400'
                        }`}>
                            {user.subtype || user.role}
                        </span>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">
                            This will permanently delete the user's account, profile, and all associated data. This action cannot be undone.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            {loading
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />
                            }
                            Delete User
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export { DeleteUserModal }
export default DeleteUserModal
```

- [ ] **Step 2: Export from admin index**

In `src/components/admin/index.js`, add after the last export line:
```js
export { DeleteUserModal } from './DeleteUserModal'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/DeleteUserModal.jsx src/components/admin/index.js
git commit -m "feat: add DeleteUserModal component"
```

---

## Task 5: Update `UserManagementSection`

**Files:**
- Modify: `src/components/admin/UserManagementSection.jsx`

The component needs three new props:
- `canDeleteUsers` — boolean, whether the logged-in admin can delete users
- `adminAccessRows` — array of `{ user_id, admin_level }` from `admin_access` table, used to identify super-admin rows
- `currentUserId` — the logged-in admin's own user id, to hide the delete button on their own row
- `onDeleteUser` — callback `(deletedUserId: string) => void` called on successful deletion

- [ ] **Step 1: Rewrite `UserManagementSection.jsx`**

Replace the entire file content with:
```jsx
import { useState } from 'react'
import { Shield, Building2, User, Trash2 } from 'lucide-react'
import PendingReverificationBadge from '../common/PendingReverificationBadge'
import { DeleteUserModal } from './DeleteUserModal'

const UserManagementSection = ({
    allUsers,
    searchQuery,
    setSearchQuery,
    canDeleteUsers = false,
    adminAccessRows = [],
    currentUserId = null,
    onDeleteUser,
}) => {
    const [pendingDelete, setPendingDelete] = useState(null)

    const filteredUsers = allUsers.filter(u => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    })

    const isSuperAdminRow = (userId) =>
        adminAccessRows.some(r => r.user_id === userId && r.admin_level === 'admin')

    const showDeleteButton = (user) =>
        canDeleteUsers &&
        user.id !== currentUserId &&
        !isSuperAdminRow(user.id)

    const handleDeleteSuccess = (deletedUserId) => {
        setPendingDelete(null)
        if (onDeleteUser) onDeleteUser(deletedUserId)
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">User Management</h2>
                <p className="text-slate-400 text-sm">All registered users on the platform</p>
            </div>

            {/* User search */}
            <div className="relative mb-6">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                />
            </div>

            {/* Users table */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">User</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Role</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Status</th>
                                <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Joined</th>
                                {canDeleteUsers && (
                                    <th className="text-left text-xs uppercase tracking-wider text-slate-500 font-semibold px-5 py-4">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                user.role === 'admin' ? 'bg-indigo-500/15'
                                                : user.role === 'employer' ? 'bg-violet-500/15'
                                                : 'bg-blue-500/15'
                                            }`}>
                                                {user.role === 'admin'
                                                    ? <Shield className="w-4 h-4 text-indigo-400" />
                                                    : user.role === 'employer'
                                                        ? <Building2 className="w-4 h-4 text-violet-400" />
                                                        : <User className="w-4 h-4 text-blue-400" />
                                                }
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{user.name || '—'}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                                            user.role === 'admin' ? 'bg-indigo-500/15 text-indigo-400'
                                            : user.role === 'employer' ? 'bg-violet-500/15 text-violet-400'
                                            : 'bg-blue-500/15 text-blue-400'
                                        }`}>
                                            {user.subtype || user.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`flex items-center gap-1.5 text-xs font-medium ${
                                                user.is_verified ? 'text-emerald-400' : 'text-amber-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    user.is_verified ? 'bg-emerald-400' : 'bg-amber-400'
                                                }`} />
                                                {user.is_verified ? 'Verified' : 'Pending'}
                                            </span>
                                            {user.is_verified && user.profile_modified_since_verification && (
                                                <PendingReverificationBadge />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                                    </td>
                                    {canDeleteUsers && (
                                        <td className="px-5 py-4">
                                            {showDeleteButton(user) && (
                                                <button
                                                    onClick={() => setPendingDelete(user)}
                                                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {pendingDelete && (
                <DeleteUserModal
                    user={pendingDelete}
                    onClose={() => setPendingDelete(null)}
                    onSuccess={handleDeleteSuccess}
                />
            )}
        </div>
    )
}

export { UserManagementSection }
export default UserManagementSection
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/UserManagementSection.jsx
git commit -m "feat: add delete button and modal to UserManagementSection"
```

---

## Task 6: Wire Up Dashboard

**Files:**
- Modify: `src/pages/admin/Dashboard.jsx`

Dashboard needs to:
1. Fetch `admin_access` rows in `fetchData()` and store in state
2. Derive `canDeleteUsers` from the logged-in admin's access
3. Pass `adminAccessRows`, `canDeleteUsers`, `currentUserId`, and `onDeleteUser` to `UserManagementSection`
4. Handle the optimistic removal of the deleted user from `sectionRows.users` and `allUsers`

- [ ] **Step 1: Add `adminAccessRows` state**

Find in `Dashboard.jsx` (around line 173):
```js
    const [allUsers, setAllUsers] = useState([])
    const [loading, setLoading] = useState(true)
```

Add after `const [allUsers, setAllUsers] = useState([])`:
```js
    const [adminAccessRows, setAdminAccessRows] = useState([])
```

- [ ] **Step 2: Fetch `admin_access` inside `fetchData`**

Find in `fetchData` (around line 297):
```js
    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: users, error } = await supabase.from('users').select('*')
            if (error) throw error
```

Add the admin_access fetch right after `if (error) throw error`:
```js
            const { data: accessRows } = await supabase
                .from('admin_access')
                .select('user_id, admin_level')
            setAdminAccessRows(accessRows || [])
```

- [ ] **Step 3: Derive `canDeleteUsers`**

Find in `Dashboard.jsx` (around line 217) where the other permission constants are derived:
```js
    const canApproveEmployers = hasAdminPermission(adminAccess, 'approve_employers')
```

Add after that block (after `const allowedReverificationRoles = [...]`):
```js
    const canDeleteUsers = hasAdminPermission(adminAccess, 'delete_users')
```

- [ ] **Step 4: Add `handleDeleteUser` callback**

Find `getKnownUserById` (around line 383) and add this function right after it:
```js
    const handleDeleteUser = (deletedUserId) => {
        setAllUsers(prev => prev.filter(u => u.id !== deletedUserId))
        setSectionRows(prev => ({
            ...prev,
            users: prev.users.filter(u => u.id !== deletedUserId),
        }))
        setSectionTotals(prev => ({ ...prev, users: Math.max(0, prev.users - 1) }))
        toast.success('User deleted successfully.')
    }
```

- [ ] **Step 5: Pass new props to `UserManagementSection`**

Find the `UserManagementSection` render (around line 865):
```jsx
                        hasAdminPermission(adminAccess, 'view_users')
                            ? <UserManagementSection
                                allUsers={filteredUsers}
                                totalCount={sectionTotals.users}
                                hasMore={sectionHasMore.users}
                                isFetching={sectionLoading.users}
                                isLoadingMore={sectionLoadingMore.users}
                                onLoadMore={() => loadSectionData('users', { append: true, offset: sectionRows.users.length })}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                showFilters={showFilters}
                                setShowFilters={setShowFilters}
                                filters={filters}
                                setFilters={setFilters}
                                sortOrder={sortOrder}
                                setSortOrder={setSortOrder}
                            />
```

Add three props before the closing `/>`:
```jsx
                                canDeleteUsers={canDeleteUsers}
                                adminAccessRows={adminAccessRows}
                                currentUserId={currentUser?.id}
                                onDeleteUser={handleDeleteUser}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Dashboard.jsx
git commit -m "feat: wire delete user into Dashboard"
```

---

## Task 7: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Log in as a super-admin and go to User Management**

Confirm:
- Delete (trash) icon appears on non-admin and sub-admin rows
- Delete icon does NOT appear on super-admin rows
- Delete icon does NOT appear on the currently logged-in admin's own row

- [ ] **Step 3: Click delete on a test user**

- Confirmation modal appears with correct name, email, role badge, and warning text
- Clicking Cancel closes the modal without any change
- Clicking "Delete User" shows a spinner, then closes the modal
- The deleted row disappears from the table immediately (optimistic update)
- A success toast appears: "User deleted successfully."

- [ ] **Step 4: Verify the audit log in Supabase**

In the Supabase Table Editor, open `admin_audit_log` and confirm a row exists with:
- `action = 'delete_user'`
- `actor_email` = the super-admin's email
- `snapshot` containing the deleted user's name, email, role, and `created_at`

- [ ] **Step 5: Test as a Moderator sub-admin**

Invite a new sub-admin using the Moderator template. Log in as that sub-admin and confirm:
- The delete button appears (sub-admin has `delete_users` permission)
- Deletion works end-to-end

- [ ] **Step 6: Verify super-admin protection**

Attempt to delete a super-admin row via the UI — the button should be absent entirely. Optionally test via direct API call; the Edge Function should return 403.
