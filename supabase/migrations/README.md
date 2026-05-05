# Production Migration Order

Apply migrations in filename order. These hardening migrations assume the base
schema, admin RBAC helpers, profile tables, notifications table, and storage
buckets already exist.

1. `202605060001_public_profile_lockdown.sql` locks public profile access behind an allowlisted RPC.
2. `202605060002_private_resumes.sql` makes resume storage private and limits access to owners, admins, and application employers.
3. `202605060003_notifications_security.sql` removes broad authenticated notification inserts.
4. `202605060004_admin_scoped_dashboard_counts.sql` adds scoped admin dashboard aggregate RPCs.
5. `202605060005_admin_search_users_scope.sql` makes the admin user directory RPC enforce role-scope permissions server-side.

After applying SQL, deploy the matching Edge Functions from this branch and run
smoke checks for public profile, resume upload/view, job matching, notifications,
email templates, and admin overview counts.
