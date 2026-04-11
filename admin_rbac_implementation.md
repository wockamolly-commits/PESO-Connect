# Admin RBAC Implementation Plan

## Goal

Introduce role-based access control inside the admin dashboard so `admin` users keep full access while `sub-admin` users are limited to explicitly granted capabilities.

## Current State

- The application currently protects `/admin` with `allowedRoles={['admin']}` in `src/App.jsx`.
- `ProtectedRoute` already supports matching both `role` and `subtype`, but there is no admin permission layer.
- `src/pages/admin/Dashboard.jsx` fetches all users and exposes approval, rejection, and user-management actions from one screen.
- `src/components/admin/AdminSidebar.jsx` renders a fixed list of admin sections without checking capabilities.
- The existing two-level role migration only allows `employer`, `user`, and `admin` in `public.users.role`.

## Recommended Approach

- Keep `public.users.role = 'admin'` for both super-admins and sub-admins.
- Add an `admin_level` discriminator plus explicit permission flags on a dedicated admin-access table.
- Gate both UI navigation and write operations with shared permission helpers.
- Preserve the current `/admin` route and login flow so this stays aligned with project patterns.

## Permission Model

### Admin levels

- `admin`: full access, cannot be restricted by per-permission toggles.
- `sub-admin`: restricted access, only sees and executes allowed actions.

### Initial permission set

- `view_overview`
- `view_employers`
- `approve_employers`
- `reject_employers`
- `view_jobseekers`
- `approve_jobseekers`
- `reject_jobseekers`
- `view_users`
- `export_jobseekers`
- `manage_admins`
- `manage_system_settings`
- `delete_users`

### Baseline policy

- Super-admins receive all permissions implicitly.
- Sub-admins default to read-only access until specific permissions are granted.
- Destructive or sensitive actions such as `delete_users`, `manage_admins`, and `manage_system_settings` remain super-admin-only even if the UI later adds more admin screens.

## Step-by-Step Breakdown

### Phase 1: Schema and policy foundation

1. Create a new `admin_access` table keyed by `users.id`.
2. Add `admin_level` with allowed values `admin` and `sub-admin`.
3. Add a `permissions` `text[]` column or `jsonb` map for granted capabilities.
4. Backfill existing admin users as `admin` with full permission coverage.
5. Add RLS policies so:
   - admins can read their own `admin_access` row
   - only super-admins can insert or update other admin-access rows

### Phase 2: Shared frontend permission helpers

1. Create a small utility module for admin permission checks.
2. Add helpers such as:
   - `isSuperAdmin(userData, adminAccess)`
   - `hasAdminPermission(userData, adminAccess, permission)`
   - `getVisibleAdminSections(userData, adminAccess)`
3. Extend auth loading so admin sessions fetch `admin_access` together with `users`.

### Phase 3: Route and layout gating

1. Keep `/admin` protected by `role === 'admin'`.
2. Inside `src/pages/admin/Dashboard.jsx`, derive the current admin capabilities before rendering sections.
3. Update `src/components/admin/AdminSidebar.jsx` to only show sections allowed for the current admin.
4. Add a reusable unauthorized state for admins who can log in but lack access to a specific section.

### Phase 4: Action-level enforcement

1. Gate `handleApprove` and `handleReject` in `src/pages/admin/Dashboard.jsx`.
2. Hide or disable approve/reject buttons when the permission is missing.
3. Add server-side checks before every sensitive mutation so direct client calls cannot bypass the UI.
4. Block future destructive actions such as deleting users unless the permission explicitly exists.

### Phase 5: Admin management UI

1. Add a super-admin-only panel to create or update sub-admin access.
2. Let super-admins assign:
   - admin level
   - granted sections
   - allowed actions
3. Display a read-only summary for sub-admins so they understand their current scope.

### Phase 6: Testing and rollout

1. Add tests for permission helpers and section visibility.
2. Verify a super-admin can still access all current dashboard areas.
3. Verify a sub-admin cannot:
   - approve or reject users without permission
   - see hidden sections
   - call protected write actions directly

## Database Schema Changes

### New table

```sql
create table if not exists public.admin_access (
  user_id uuid primary key references public.users(id) on delete cascade,
  admin_level text not null check (admin_level in ('admin', 'sub-admin')),
  permissions text[] not null default '{}',
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Optional constraints

- Add a trigger or check process ensuring `admin_access.user_id` belongs to `public.users.role = 'admin'`.
- Keep `public.users.role` unchanged to avoid breaking the current auth and route model.

### RLS changes

- `SELECT`: admin can read their own row; super-admins can read all rows.
- `INSERT` / `UPDATE` / `DELETE`: super-admin only.

## Code Changes Required

### SQL

- Create `sql/admin_rbac.sql` for the new table, RLS, and backfill.
- If desired, update `sql/migration_two_level_roles.sql` only if role constraints must document `sub-admin` behavior. Preferred approach is no role-column change.

### Auth and shared utilities

- Update `src/contexts/AuthContext.jsx` to fetch and cache `admin_access` for admin users.
- Create `src/utils/adminPermissions.js` for capability helpers.

### Routing and guards

- Update `src/pages/admin/Dashboard.jsx` to derive `canView` and `canManage` checks before rendering sections or firing mutations.
- Keep `src/App.jsx` route protection as `allowedRoles={['admin']}`.
- Optionally add an `adminPermissions` prop path to `ProtectedRoute` only if the project later needs route-level admin gating outside the dashboard.

### Admin UI

- Update `src/components/admin/AdminSidebar.jsx` so nav items are filtered by permission.
- Update `src/components/admin/EmployerVerificationSection.jsx` and `src/components/admin/JobseekerVerificationSection.jsx` so action buttons only render when allowed.
- Update `src/components/admin/UserManagementSection.jsx` for read-only or hidden destructive actions.

### Future admin management screen

- Add a super-admin-only section in `src/pages/admin/Dashboard.jsx` or a dedicated admin-management component.

## Suggested File Deliverables

- `sql/admin_rbac.sql`
- `src/utils/adminPermissions.js`
- `src/contexts/AuthContext.jsx`
- `src/pages/admin/Dashboard.jsx`
- `src/components/admin/AdminSidebar.jsx`
- `src/components/admin/EmployerVerificationSection.jsx`
- `src/components/admin/JobseekerVerificationSection.jsx`
- `src/components/admin/UserManagementSection.jsx`

## Risks and Notes

- Do not overload `users.role` with `sub-admin`; that would break current admin route checks and existing SQL assumptions.
- UI-only hiding is not sufficient. Sensitive mutations in `src/pages/admin/Dashboard.jsx` must also verify permissions before writing to Supabase.
- Existing admin RLS policies currently assume any `role = 'admin'` can read and update broadly; those policies need refinement if sub-admin restrictions must be enforced at the database layer rather than only in the client.
