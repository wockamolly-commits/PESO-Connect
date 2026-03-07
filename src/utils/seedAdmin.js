/**
 * DEPRECATED — Phase 1 Supabase Migration
 *
 * This utility previously seeded an admin account into Firebase Auth + Firestore.
 * After the migration to Supabase, admin accounts must be created manually:
 *
 * 1. Go to Supabase Dashboard → Authentication → Users → Add User
 * 2. Create the admin user with their email and password
 * 3. In the SQL Editor, run:
 *    INSERT INTO public.users (id, email, role, name, is_verified)
 *    VALUES ('<user-id-from-step-1>', 'admin@example.com', 'admin', 'Admin', true);
 */

export const seedAdmin = () => {
    throw new Error(
        'seedAdmin is deprecated. Create admin accounts manually in the Supabase dashboard. See comments in this file.'
    )
}
