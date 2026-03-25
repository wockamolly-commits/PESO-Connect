-- Per-Subtype Verification Migration
-- Adds is_verified, registration_complete, registration_step to each profile table
-- so each subtype owns its own verification/registration state independently.

-- === Add columns ===

ALTER TABLE jobseeker_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step INTEGER;

ALTER TABLE homeowner_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step INTEGER;

ALTER TABLE employer_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_step INTEGER;

-- === Backfill from users table ===

UPDATE jobseeker_profiles jp
SET is_verified = COALESCE(u.is_verified, false),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE jp.id = u.id AND u.role = 'user' AND u.subtype = 'jobseeker';

UPDATE homeowner_profiles hp
SET is_verified = COALESCE(u.is_verified, true),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE hp.id = u.id AND u.role = 'user' AND u.subtype = 'homeowner';

UPDATE employer_profiles ep
SET is_verified = COALESCE(u.is_verified, false),
    registration_complete = COALESCE(u.registration_complete, false),
    registration_step = u.registration_step
FROM users u
WHERE ep.id = u.id AND u.role = 'employer';
