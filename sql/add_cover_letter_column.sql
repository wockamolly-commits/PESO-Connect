-- Add optional cover_letter column to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS cover_letter text;
