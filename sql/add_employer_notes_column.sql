-- Add optional employer_notes column to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employer_notes text;
