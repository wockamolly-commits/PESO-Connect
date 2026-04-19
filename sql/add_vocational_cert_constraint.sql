-- Sanitize legacy rows before adding the constraint.
-- Any training entry without a persisted certificate_path is removed so the
-- new DB rule can be applied without failing on historical data.
UPDATE public.jobseeker_profiles
SET vocational_training = (
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(vocational_training, '[]'::jsonb)) AS elem
  WHERE (elem->>'certificate_path') IS NOT NULL
    AND btrim(elem->>'certificate_path') <> ''
)
WHERE vocational_training IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_vocational_training_has_certificates(training jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (
      SELECT bool_and(
        (elem->>'certificate_path') IS NOT NULL
        AND btrim(elem->>'certificate_path') <> ''
      )
      FROM jsonb_array_elements(COALESCE(training, '[]'::jsonb)) AS elem
    ),
    true
  );
$$;

ALTER TABLE public.jobseeker_profiles
DROP CONSTRAINT IF EXISTS chk_vocational_training_has_cert;

ALTER TABLE public.jobseeker_profiles
ADD CONSTRAINT chk_vocational_training_has_cert
CHECK (public.fn_vocational_training_has_certificates(vocational_training));
