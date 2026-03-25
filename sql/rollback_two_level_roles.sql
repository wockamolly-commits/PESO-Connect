-- Rollback: reverses the two-level role migration
BEGIN;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_role_subtype_integrity;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_valid_subtype;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_valid_role;

UPDATE public.users SET role = 'jobseeker', subtype = NULL WHERE subtype = 'jobseeker';
UPDATE public.users SET role = 'individual', subtype = NULL WHERE subtype = 'homeowner';

ALTER TABLE public.users DROP COLUMN subtype;

-- Restore original role constraint
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('employer', 'jobseeker', 'individual', 'admin'));

ALTER TABLE homeowner_profiles RENAME COLUMN homeowner_status TO individual_status;
ALTER TABLE homeowner_profiles RENAME TO individual_profiles;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, is_verified)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    (new.raw_user_meta_data->>'role' = 'individual')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
