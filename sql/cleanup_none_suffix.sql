-- Clean up legacy 'None' suffix sentinel values stored as plain text.
-- These were written when the suffix dropdown included 'None' as an explicit option.
-- After this migration, empty/absent suffix is represented as NULL.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobseeker_profiles' AND column_name = 'suffix') THEN
    UPDATE public.jobseeker_profiles SET suffix = NULL WHERE suffix = 'None';
  END IF;

  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'individual_profiles' AND column_name = 'suffix') THEN
    UPDATE public.individual_profiles SET suffix = NULL WHERE suffix = 'None';
  END IF;

  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employer_profiles' AND column_name = 'suffix') THEN
    UPDATE public.employer_profiles SET suffix = NULL WHERE suffix = 'None';
  END IF;

  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'suffix') THEN
    UPDATE public.users SET suffix = NULL WHERE suffix = 'None';
  END IF;
END $$;
