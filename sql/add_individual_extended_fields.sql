-- Add extended fields to individual_profiles
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE public.individual_profiles ADD COLUMN IF NOT EXISTS barangay text default '';
ALTER TABLE public.individual_profiles ADD COLUMN IF NOT EXISTS city text default '';
ALTER TABLE public.individual_profiles ADD COLUMN IF NOT EXISTS province text default '';
ALTER TABLE public.individual_profiles ADD COLUMN IF NOT EXISTS bio text default '';
ALTER TABLE public.individual_profiles ADD COLUMN IF NOT EXISTS service_preferences text[] default '{}';
