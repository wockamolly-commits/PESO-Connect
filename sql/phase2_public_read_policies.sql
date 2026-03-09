-- ============================================================
-- Phase 2: allow authenticated users to read any user's profile
-- and ensure notification/privacy columns exist on public.users
-- ============================================================

-- 1. Ensure settings columns exist (safe to run even if already present)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb,
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb;

-- 2. Allow any authenticated user to read any row in public.users
--    (privacy enforcement is done at the app layer in PublicProfile.jsx)
CREATE POLICY "Authenticated users can read all user rows"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Allow any authenticated user to read any jobseeker profile
CREATE POLICY "Authenticated users can read all jobseeker profiles"
  ON public.jobseeker_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Allow any authenticated user to read any employer profile
CREATE POLICY "Authenticated users can read all employer profiles"
  ON public.employer_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Allow any authenticated user to read any individual profile
CREATE POLICY "Authenticated users can read all individual profiles"
  ON public.individual_profiles FOR SELECT
  USING (auth.role() = 'authenticated');
