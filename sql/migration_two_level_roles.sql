-- ============================================
-- PESO Connect: Two-Level Role Migration
-- Run as a single transaction in Supabase SQL Editor
-- ============================================
-- PRE-CHECK: Audit RLS policies on individual_profiles before running.
-- If any exist, add ALTER POLICY statements inside this transaction.

BEGIN;

-- Step 1: Rename table + column
ALTER TABLE individual_profiles RENAME TO homeowner_profiles;
ALTER TABLE homeowner_profiles
  RENAME COLUMN individual_status TO homeowner_status;

-- Step 2: Drop existing role constraint that only allows old values
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Add subtype column
ALTER TABLE public.users ADD COLUMN subtype text;

-- Step 4: Backfill existing data
UPDATE public.users
  SET role = 'user', subtype = 'jobseeker'
  WHERE role = 'jobseeker';

UPDATE public.users
  SET role = 'user', subtype = 'homeowner'
  WHERE role = 'individual';

-- Step 5: Add new constraints
ALTER TABLE public.users
  ADD CONSTRAINT chk_valid_role
  CHECK (role IN ('employer', 'user', 'admin'));

ALTER TABLE public.users
  ADD CONSTRAINT chk_valid_subtype
  CHECK (subtype IN ('jobseeker', 'homeowner') OR subtype IS NULL);

ALTER TABLE public.users
  ADD CONSTRAINT chk_role_subtype_integrity
  CHECK (
    (role = 'user' AND subtype IS NOT NULL) OR
    (role != 'user' AND subtype IS NULL)
  );

-- Step 6: Update trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, subtype, is_verified)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'subtype',
    (new.raw_user_meta_data->>'role' = 'user'
     AND new.raw_user_meta_data->>'subtype' = 'homeowner')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
