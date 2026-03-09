-- ============================================================
-- Fix Phase 2 RLS: allow anonymous (unauthenticated) reads
-- so PublicProfile works for logged-out visitors
-- ============================================================

-- Drop the authenticated-only read policies created in phase2_public_read_policies.sql
DROP POLICY IF EXISTS "Authenticated users can read all user rows" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read all jobseeker profiles" ON public.jobseeker_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all employer profiles" ON public.employer_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all individual profiles" ON public.individual_profiles;

-- Recreate as fully public reads (matches original Firebase behaviour)
CREATE POLICY "Anyone can read user rows"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Anyone can read jobseeker profiles"
  ON public.jobseeker_profiles FOR SELECT USING (true);

CREATE POLICY "Anyone can read employer profiles"
  ON public.employer_profiles FOR SELECT USING (true);

CREATE POLICY "Anyone can read individual profiles"
  ON public.individual_profiles FOR SELECT USING (true);
