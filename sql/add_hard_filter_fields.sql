-- ============================================================
-- Hard-filter fields for job_postings
--
-- Separates structured pass/fail requirements from the free-text
-- `requirements` blob, so Stage-1 matching can reject candidates
-- in SQL instead of in the scoring loop.
--
-- Adds:
--   required_skills        text[]   structured subset of `requirements`
--   required_licenses      text[]   structured parse of licenses_certifications
--   education_is_required  boolean  treat `education_level` as a hard gate
--   languages_are_required boolean  treat `required_languages` as a hard gate
--   licenses_are_required  boolean  treat `required_licenses` as a hard gate
--   hard_filters_source    text     'heuristic' | 'llm' | 'employer'
--   hard_filters_updated_at timestamptz
--
-- Idempotent - safe to re-run.
-- ============================================================

-- 1. Columns
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS required_skills         text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_licenses       text[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS education_is_required   boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS languages_are_required  boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS licenses_are_required   boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS hard_filters_source     text,
  ADD COLUMN IF NOT EXISTS hard_filters_updated_at timestamptz;

-- 2. Indexes
--   GIN on required_skills: for future `WHERE required_skills && profile_skills`
--   Partial btree on each `*_is_required` flag: cheap filter for the common
--   case where most jobs do NOT enforce a hard gate.
CREATE INDEX IF NOT EXISTS idx_job_postings_required_skills
  ON public.job_postings USING GIN (required_skills);

CREATE INDEX IF NOT EXISTS idx_job_postings_required_licenses
  ON public.job_postings USING GIN (required_licenses);

CREATE INDEX IF NOT EXISTS idx_job_postings_education_required
  ON public.job_postings (education_is_required)
  WHERE education_is_required = true;

CREATE INDEX IF NOT EXISTS idx_job_postings_languages_required
  ON public.job_postings (languages_are_required)
  WHERE languages_are_required = true;

-- 3. Heuristic backfill
--    Only runs on rows that have not yet been processed
--    (`hard_filters_updated_at IS NULL`).
--
--    Rules:
--      * required_skills  = requirements entries that (a) contain hard-gate
--        keywords ("must", "required", "minimum", "at least", "mandatory")
--        AND (b) are not education- or language-shaped phrases. Skills are
--        lower-cased and trimmed. Deduplicated per row.
--      * required_licenses = licenses_certifications split on commas/semicolons/
--        newlines, trimmed, non-empty items only.
--      * education_is_required  = filter_mode = 'strict' AND education_level IS NOT NULL
--      * languages_are_required = filter_mode = 'strict' AND cardinality(required_languages) > 0
--      * licenses_are_required  = filter_mode = 'strict' AND licenses_certifications IS NOT NULL
--
--    We are intentionally conservative: on `filter_mode='flexible'` jobs we
--    leave every `*_is_required` flag FALSE, so deploying this migration does
--    not narrow the candidate pool for any existing job. An LLM-assisted
--    re-backfill can upgrade accuracy later without touching schema.

WITH exploded AS (
  SELECT
    jp.id,
    lower(btrim(req)) AS req
  FROM public.job_postings jp
  CROSS JOIN LATERAL unnest(COALESCE(jp.requirements, '{}'::text[])) AS req
  WHERE jp.hard_filters_updated_at IS NULL
),
filtered AS (
  SELECT
    id,
    req
  FROM exploded
  WHERE req <> ''
    -- hard-gate keyword present
    AND req ~* '(must|required|mandatory|minimum|at\s+least)'
    -- exclude education-shaped phrases (parser mirrors isEducationRequirement)
    AND req !~* '(bachelor|master|doctor|phd|ph\.d|undergrad|postgrad|diploma|associate|high\s*school|senior\s*high|elementary|vocational|tesda|nc[_\s-]?ii|nc[_\s-]?iii|degree)'
    -- exclude language-shaped phrases (parser mirrors isLanguageRequirement)
    AND req !~* '(proficien|fluen|speaks?|written|spoken|read\s+and\s+write|tagalog|filipino|english|mandarin|chinese|japanese|korean|spanish|bisaya|cebuano|ilocano|hiligaynon|waray|bicol)'
),
agg AS (
  SELECT
    id,
    array_agg(DISTINCT req ORDER BY req) AS skills
  FROM filtered
  GROUP BY id
)
UPDATE public.job_postings jp
SET
  required_skills = COALESCE(agg.skills, '{}'::text[]),
  required_licenses = CASE
    WHEN jp.licenses_certifications IS NULL OR btrim(jp.licenses_certifications) = ''
      THEN '{}'::text[]
    ELSE (
      SELECT array_agg(btrim(part) ORDER BY btrim(part))
      FROM regexp_split_to_table(jp.licenses_certifications, '[,;\n]+') AS part
      WHERE btrim(part) <> ''
    )
  END,
  education_is_required   = (jp.filter_mode = 'strict' AND jp.education_level IS NOT NULL AND btrim(jp.education_level) <> ''),
  languages_are_required  = (jp.filter_mode = 'strict' AND COALESCE(cardinality(jp.required_languages), 0) > 0),
  licenses_are_required   = (jp.filter_mode = 'strict' AND jp.licenses_certifications IS NOT NULL AND btrim(jp.licenses_certifications) <> ''),
  hard_filters_source     = 'heuristic',
  hard_filters_updated_at = now()
FROM (
  -- left join: jobs with no matching requirement rows still get processed
  SELECT jp2.id AS jp_id, agg.skills
  FROM public.job_postings jp2
  LEFT JOIN agg ON agg.id = jp2.id
  WHERE jp2.hard_filters_updated_at IS NULL
) agg
WHERE jp.id = agg.jp_id;

-- 4. Sanity view (optional, for QA after running)
--    Returns one row per job showing counts of parsed hard filters.
--    Safe to DROP after verification.
CREATE OR REPLACE VIEW public.v_job_hard_filters_audit AS
SELECT
  id,
  title,
  filter_mode,
  cardinality(COALESCE(required_skills, '{}'))    AS required_skill_count,
  cardinality(COALESCE(required_licenses, '{}'))  AS required_license_count,
  education_is_required,
  languages_are_required,
  licenses_are_required,
  hard_filters_source,
  hard_filters_updated_at
FROM public.job_postings
ORDER BY hard_filters_updated_at DESC NULLS FIRST;
