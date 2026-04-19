# Permission Label UI Implementation

This document is written so Claude can implement the same UI cleanup safely and consistently.

## Goal

Keep permission values stored as internal `snake_case` keys, but render human-readable labels anywhere those permissions appear in the admin UI.

Examples:

- `view_overview` -> `View Overview`
- `approve_jobseekers` -> `Approve Jobseekers`
- `manage_system_settings` -> `Manage System Settings`

## Problem

The current admin UI mixes internal permission keys with user-facing text:

- The invite modal previews permission chips using raw keys.
- The super-admin warning sentence lists raw keys.
- A local label map exists in one component, but it is not shared.

This creates an inconsistent UI and makes the product feel unfinished even though the underlying data is correct.

## Implementation Plan

1. Centralize permission display labels in `src/utils/adminPermissions.js`.
2. Export a helper that converts a permission key into a user-facing label.
3. Export a helper that formats an array of permission keys into a readable comma-separated string.
4. Replace raw permission rendering in the admin UI with those shared helpers.
5. Add tests for the new helpers.

## Files To Update

- `src/utils/adminPermissions.js`
- `src/utils/adminPermissions.test.js`
- `src/components/admin/InviteAdminModal.jsx`
- `src/components/admin/AdminManagementSection.jsx`

## Detailed Changes

### 1. Add shared labels and formatting helpers

In `src/utils/adminPermissions.js`:

- Add and export `PERMISSION_LABELS`.
- Add and export `getPermissionLabel(permission)`.
- Add and export `formatPermissionList(permissions)`.

Suggested behavior:

- If a key exists in `PERMISSION_LABELS`, return that exact label.
- Otherwise, humanize the key by splitting on underscores and capitalizing each word.
- `formatPermissionList` should map through `getPermissionLabel` and join with `, `.

### 2. Update the invite modal permission chips

In `src/components/admin/InviteAdminModal.jsx`:

- Import `getPermissionLabel`.
- Replace the raw chip text `{p}` with `{getPermissionLabel(p)}`.

Result:

- Permission chips become readable while keeping the same styling and underlying permission values.

### 3. Update admin access labels

In `src/components/admin/AdminManagementSection.jsx`:

- Remove the component-local `PERMISSION_LABELS` constant.
- Import `getPermissionLabel` and `formatPermissionList` from `src/utils/adminPermissions.js`.
- For delegatable permission checkboxes, render `getPermissionLabel(perm)`.
- For the super-admin-only notice, replace `SUPER_ADMIN_ONLY_PERMISSIONS.join(', ')` with `formatPermissionList(SUPER_ADMIN_ONLY_PERMISSIONS)`.

Result:

- All admin-facing permission text becomes consistent and readable.

### 4. Add tests

In `src/utils/adminPermissions.test.js`, add tests for:

- known permission labels
- unknown permission fallback formatting
- permission list formatting
- empty list handling

## Acceptance Criteria

- No admin screen displays raw `snake_case` permission keys to users.
- Stored permission values remain unchanged in the database and app logic.
- Invite modal permission chips show human-readable labels.
- Super-admin-only warning text shows human-readable labels.
- Tests cover the new helper behavior.

## Notes

- This is a presentation-layer change only; permission logic should not change.
- Do not rename database values or permission constants.
- Keep the UI copy concise and sentence case / title case consistent with the existing admin interface.
