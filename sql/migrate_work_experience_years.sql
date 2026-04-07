-- Migration: Replace "months" field with "year_started" and "year_ended" in work_experiences JSONB
-- The work_experiences column stores a JSONB array of objects.
-- Each object previously had a "months" key; we now use "year_started" and "year_ended".
-- This migration removes the old "months" key and adds empty year fields where missing.

UPDATE jobseeker_profiles
SET work_experiences = (
  SELECT jsonb_agg(
    (elem - 'months')  -- remove old months key
    || jsonb_build_object(
         'year_started', COALESCE(elem->>'year_started', ''),
         'year_ended',   COALESCE(elem->>'year_ended', '')
       )
  )
  FROM jsonb_array_elements(work_experiences) AS elem
)
WHERE jsonb_array_length(work_experiences) > 0;
